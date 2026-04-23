"""Agrège la donnée INSEE RP 2021 (table individus à la région) en
marges et croisés pondérés pour la calibration, puis écrit un fichier
SQL idempotent qu'on commit en tant que migration Supabase.

Pré-requis :
    * pynsee installé (déclaré dans pyproject.toml)
    * le fichier RP_INDREG_2021 téléchargé localement — soit via
      `pynsee.download.download_file("RP_INDREG_2021")`, soit via
      curl (URL dans la sortie de `get_file_list()`).

Sortie :
    supabase/migrations/<timestamp>_seed_insee_ref_rp2021.sql

Ce fichier est idempotent : il DELETE d'abord les lignes "placeholder"
de la phase 1, puis INSERT les vraies marges. Rerunnable à volonté.

Usage :
    uv run python scripts/seed_insee_reference.py \
        --parquet data/insee_raw/RP2021_indreg.parquet \
        --output  ../supabase/migrations/20260424110000_seed_insee_ref_rp2021.sql
"""

from __future__ import annotations

import argparse
import datetime as dt
from pathlib import Path
from typing import Final

import pandas as pd

# ────────────────────────────────────────────────────────────────
# Mappings INSEE → labels PoliticoResto.
# Référence : INSEE "Dictionnaire des variables du RP" 2021.
# ────────────────────────────────────────────────────────────────

# SEXE: 1=Homme, 2=Femme. INSEE n'a pas de 3ᵉ modalité ; on ne produit
# PAS de cible pour "other" (respondents avec sex="other" seront
# traités comme unknown-bucket à la calibration).
SEXE_MAP: Final[dict[str, str]] = {"1": "M", "2": "F"}

# CS1: catégorie socioprofessionnelle à 8 postes.
CS1_MAP: Final[dict[str, str]] = {
    "1": "agriculteurs",
    "2": "artisans_commercants_chefs",
    "3": "cadres_professions_intellectuelles",
    "4": "professions_intermediaires",
    "5": "employes",
    "6": "ouvriers",
    "7": "retraites",
    "8": "sans_activite",
}

# DIPL (niveau de diplôme, codage INSEE RP) mappé vers notre grille à 4
# niveaux. "ZZ" = non renseigné → on exclut du calcul des marges (même
# traitement que les unknown-bucket chez nous).
DIPL_MAP: Final[dict[str, str]] = {
    # Aucun diplôme / certificat d'études / BEPC → "none"
    "01": "none", "02": "none", "03": "none",
    # Bac (général, techno, pro) → "bac"
    "11": "bac", "12": "bac", "13": "bac",
    # Bac+2 → "bac2"
    "14": "bac2", "15": "bac2",
    # Bac+3 et plus (licence, master, doctorat, grandes écoles) → "bac3_plus"
    "16": "bac3_plus", "17": "bac3_plus", "18": "bac3_plus", "19": "bac3_plus",
}

# REGION: codes INSEE officiels (métropole + DOM) gardés tels quels.
# Les user-facing labels sont résolus ailleurs (via region_by_postal).
REGION_CODES_METRO: Final[set[str]] = {
    "11",  # Île-de-France
    "24",  # Centre-Val de Loire
    "27",  # Bourgogne-Franche-Comté
    "28",  # Normandie
    "32",  # Hauts-de-France
    "44",  # Grand Est
    "52",  # Pays de la Loire
    "53",  # Bretagne
    "75",  # Nouvelle-Aquitaine
    "76",  # Occitanie
    "84",  # Auvergne-Rhône-Alpes
    "93",  # Provence-Alpes-Côte d'Azur
    "94",  # Corse
}
REGION_CODES_DOM: Final[set[str]] = {"01", "02", "03", "04"}  # Guadeloupe, Martinique, Guyane, La Réunion
REGION_CODES_ALL: Final[set[str]] = REGION_CODES_METRO | REGION_CODES_DOM

AS_OF: Final[str] = "2021-01-01"
SOURCE: Final[str] = "INSEE RP 2021"
SOURCE_URL: Final[str] = "https://www.insee.fr/fr/statistiques/fichier/8205946/RP2021_indreg.parquet"


def age_bucket(age: int) -> str | None:
    """Mappe l'âge révolu vers nos 5 buckets. < 18 → None (exclu)."""
    if age < 18:
        return None
    if age < 25:
        return "18_24"
    if age < 35:
        return "25_34"
    if age < 50:
        return "35_49"
    if age < 65:
        return "50_64"
    return "65_plus"


def load_and_prepare(parquet_path: Path) -> pd.DataFrame:
    df = pd.read_parquet(
        parquet_path,
        columns=["IPONDI", "SEXE", "AGEREV", "CS1", "DIPL", "REGION"],
    )
    # Cast numerics (pynsee returns string-typed columns for categorical codes).
    df["IPONDI"] = df["IPONDI"].astype(float)
    df["AGEREV"] = pd.to_numeric(df["AGEREV"], errors="coerce")
    # Filtre 18+ et ménages ordinaires (IPONDI > 0).
    df = df[df["AGEREV"].ge(18) & df["IPONDI"].gt(0)].copy()
    # Dérivations
    df["age_bucket"] = df["AGEREV"].map(age_bucket)
    df["sex"] = df["SEXE"].map(SEXE_MAP)
    df["csp"] = df["CS1"].map(CS1_MAP)
    df["education"] = df["DIPL"].map(DIPL_MAP)
    df["region"] = df["REGION"].where(df["REGION"].isin(REGION_CODES_ALL))
    return df


def weighted_shares_1d(
    df: pd.DataFrame, column: str
) -> pd.Series:
    """Renvoie les parts pondérées pour les lignes où la variable est non nulle."""
    sub = df[df[column].notna()]
    totals = sub.groupby(column)["IPONDI"].sum()
    return totals / totals.sum()


def weighted_shares_nd(df: pd.DataFrame, columns: list[str]) -> pd.Series:
    """Parts pondérées pour une cellule n-dim. Lignes où TOUTES les
    variables sont renseignées."""
    sub = df.dropna(subset=columns)
    totals = sub.groupby(columns)["IPONDI"].sum()
    return totals / totals.sum()


def sql_escape(v: str) -> str:
    return v.replace("'", "''")


def emit_sql(df: pd.DataFrame, output_path: Path) -> None:
    lines: list[str] = [
        "-- ─────────────────────────────────────────────────────────────",
        "-- Données INSEE RP 2021 — marges et croisés pondérés pour la",
        "-- calibration du worker de redressement.",
        "--",
        "-- Généré par worker/scripts/seed_insee_reference.py, lui-même",
        "-- fondé sur RP_INDREG_2021 (pynsee.download, parquet 593 Mo).",
        f"-- Regénéré : {dt.datetime.now(dt.UTC).isoformat()}",
        "--",
        "-- Idempotent : supprime d'abord les lignes 'placeholder' de la",
        "-- phase 1 (20260423150500), puis insère les vraies marges.",
        "-- ─────────────────────────────────────────────────────────────",
        "begin;",
        "",
        "-- Purge placeholder phase 1.",
        "delete from public.survey_ref_marginal",
        f"  where as_of = date '{AS_OF}' or source_label ilike '%placeholder%';",
        "delete from public.survey_ref_cell",
        f"  where as_of = date '{AS_OF}' or source_label ilike '%placeholder%';",
        "",
    ]

    # ── Marges 1D ──
    lines.append("-- ── Marges 1D ──")
    for dim_col, dim_label in [
        ("age_bucket", "age_bucket"),
        ("sex",        "sex"),
        ("region",     "region"),
        ("csp",        "csp"),
        ("education",  "education"),
    ]:
        shares = weighted_shares_1d(df, dim_col)
        lines.append(f"-- {dim_label}: {len(shares)} catégories")
        for category, share in shares.items():
            lines.append(
                f"insert into public.survey_ref_marginal (as_of, dimension, category, share, source_label, source_url) values "
                f"(date '{AS_OF}', '{sql_escape(dim_label)}', '{sql_escape(str(category))}', {share:.10f}, '{sql_escape(SOURCE)}', '{sql_escape(SOURCE_URL)}');"
            )
        lines.append("")

    # ── Cellules 2D (CALMAR pattern) ──
    lines.append("-- ── Cellules 2D croisées ──")
    cell_configs = [
        ("age_bucket × sex",   ["age_bucket", "sex"]),
        ("csp × sex",          ["csp", "sex"]),
        ("education × age",    ["education", "age_bucket"]),
        ("education × sex",    ["education", "sex"]),
        ("region × sex",       ["region", "sex"]),
        ("csp × age_bucket",   ["csp", "age_bucket"]),
    ]
    for cell_label, cols in cell_configs:
        shares = weighted_shares_nd(df, cols)
        lines.append(f"-- {cell_label}: {len(shares)} cellules")
        for idx, share in shares.items():
            categories = idx if isinstance(idx, tuple) else (idx,)
            dim_arr = "ARRAY[" + ", ".join(f"'{c}'" for c in cols) + "]"
            cat_arr = "ARRAY[" + ", ".join(f"'{sql_escape(str(c))}'" for c in categories) + "]"
            lines.append(
                f"insert into public.survey_ref_cell (as_of, dimensions, categories, share, source_label, source_url) values "
                f"(date '{AS_OF}', {dim_arr}, {cat_arr}, {share:.10f}, '{sql_escape(SOURCE)}', '{sql_escape(SOURCE_URL)}');"
            )
        lines.append("")

    lines.append("commit;")
    output_path.write_text("\n".join(lines))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--parquet", type=Path, required=True)
    parser.add_argument("--output",  type=Path, required=True)
    args = parser.parse_args()

    print(f"[seed] lecture  : {args.parquet}")
    df = load_and_prepare(args.parquet)
    print(f"[seed] 18+ rows : {len(df):,}  (pondérées = {df['IPONDI'].sum():,.0f} habitants)")
    print(f"[seed] écriture : {args.output}")
    emit_sql(df, args.output)
    lines_written = args.output.read_text().count("\n")
    print(f"[seed] {lines_written} lignes SQL générées, fichier prêt à commit.")


if __name__ == "__main__":
    main()
