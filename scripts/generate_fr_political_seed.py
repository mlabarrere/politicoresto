from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
import re


BASE_DIR = Path(__file__).resolve().parents[1]
OUTPUT_PATH = BASE_DIR / "supabase" / "seed" / "french_political_conversation_seed_2026.sql"


def slugify(value: str) -> str:
    value = value.lower()
    replacements = {
        "a": r"[àáâãäå]",
        "c": r"[ç]",
        "e": r"[èéêë]",
        "i": r"[ìíîï]",
        "n": r"[ñ]",
        "o": r"[òóôõö]",
        "u": r"[ùúûü]",
        "y": r"[ýÿ]",
        "oe": r"[œ]",
        "ae": r"[æ]",
    }
    for repl, pattern in replacements.items():
        value = re.sub(pattern, repl, value)
    value = value.replace("'", " ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def sql(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value).replace("'", "''")
    return f"'{text}'"


@dataclass(frozen=True)
class Territory:
    scope: str
    territory_name: str
    country_code: str
    region_name: str | None = None
    city_name: str | None = None
    department_name: str | None = None
    level: str = "country"
    anchor_phrase: str = "en France"


TERRITORIES = {
    "france": Territory("national", "France", "FR", level="country", anchor_phrase="en France"),
    "paris": Territory("city", "Paris", "FR", region_name="Ile-de-France", city_name="Paris", department_name="Paris", level="city", anchor_phrase="a Paris"),
    "marseille": Territory("city", "Marseille", "FR", region_name="Provence-Alpes-Cote d'Azur", city_name="Marseille", department_name="Bouches-du-Rhone", level="city", anchor_phrase="a Marseille"),
    "lyon": Territory("city", "Lyon", "FR", region_name="Auvergne-Rhone-Alpes", city_name="Lyon", department_name="Rhone", level="city", anchor_phrase="a Lyon"),
    "toulouse": Territory("city", "Toulouse", "FR", region_name="Occitanie", city_name="Toulouse", department_name="Haute-Garonne", level="city", anchor_phrase="a Toulouse"),
    "lille": Territory("city", "Lille", "FR", region_name="Hauts-de-France", city_name="Lille", department_name="Nord", level="city", anchor_phrase="a Lille"),
    "nantes": Territory("city", "Nantes", "FR", region_name="Pays de la Loire", city_name="Nantes", department_name="Loire-Atlantique", level="city", anchor_phrase="a Nantes"),
    "bordeaux": Territory("city", "Bordeaux", "FR", region_name="Nouvelle-Aquitaine", city_name="Bordeaux", department_name="Gironde", level="city", anchor_phrase="a Bordeaux"),
    "nice": Territory("city", "Nice", "FR", region_name="Provence-Alpes-Cote d'Azur", city_name="Nice", department_name="Alpes-Maritimes", level="city", anchor_phrase="a Nice"),
    "strasbourg": Territory("city", "Strasbourg", "FR", region_name="Grand Est", city_name="Strasbourg", department_name="Bas-Rhin", level="city", anchor_phrase="a Strasbourg"),
    "rennes": Territory("city", "Rennes", "FR", region_name="Bretagne", city_name="Rennes", department_name="Ille-et-Vilaine", level="city", anchor_phrase="a Rennes"),
    "grenoble": Territory("city", "Grenoble", "FR", region_name="Auvergne-Rhone-Alpes", city_name="Grenoble", department_name="Isere", level="city", anchor_phrase="a Grenoble"),
    "seine-saint-denis": Territory("department", "Seine-Saint-Denis", "FR", region_name="Ile-de-France", department_name="Seine-Saint-Denis", level="department", anchor_phrase="en Seine-Saint-Denis"),
    "bouches-du-rhone": Territory("department", "Bouches-du-Rhone", "FR", region_name="Provence-Alpes-Cote d'Azur", department_name="Bouches-du-Rhone", level="department", anchor_phrase="dans les Bouches-du-Rhone"),
    "nord": Territory("department", "Nord", "FR", region_name="Hauts-de-France", department_name="Nord", level="department", anchor_phrase="dans le Nord"),
    "haute-garonne": Territory("department", "Haute-Garonne", "FR", region_name="Occitanie", department_name="Haute-Garonne", level="department", anchor_phrase="en Haute-Garonne"),
    "gironde": Territory("department", "Gironde", "FR", region_name="Nouvelle-Aquitaine", department_name="Gironde", level="department", anchor_phrase="en Gironde"),
    "bas-rhin": Territory("department", "Bas-Rhin", "FR", region_name="Grand Est", department_name="Bas-Rhin", level="department", anchor_phrase="dans le Bas-Rhin"),
    "finistere": Territory("department", "Finistere", "FR", region_name="Bretagne", department_name="Finistere", level="department", anchor_phrase="dans le Finistere"),
    "creuse": Territory("department", "Creuse", "FR", region_name="Nouvelle-Aquitaine", department_name="Creuse", level="department", anchor_phrase="dans la Creuse"),
    "cantal": Territory("department", "Cantal", "FR", region_name="Auvergne-Rhone-Alpes", department_name="Cantal", level="department", anchor_phrase="dans le Cantal"),
    "aisne": Territory("department", "Aisne", "FR", region_name="Hauts-de-France", department_name="Aisne", level="department", anchor_phrase="dans l'Aisne"),
    "bretagne": Territory("region", "Bretagne", "FR", region_name="Bretagne", level="region", anchor_phrase="en Bretagne"),
    "grand-est": Territory("region", "Grand Est", "FR", region_name="Grand Est", level="region", anchor_phrase="dans le Grand Est"),
    "occitanie": Territory("region", "Occitanie", "FR", region_name="Occitanie", level="region", anchor_phrase="en Occitanie"),
    "hauts-de-france": Territory("region", "Hauts-de-France", "FR", region_name="Hauts-de-France", level="region", anchor_phrase="dans les Hauts-de-France"),
    "nouvelle-aquitaine": Territory("region", "Nouvelle-Aquitaine", "FR", region_name="Nouvelle-Aquitaine", level="region", anchor_phrase="en Nouvelle-Aquitaine"),
    "auvergne-rhone-alpes": Territory("region", "Auvergne-Rhone-Alpes", "FR", region_name="Auvergne-Rhone-Alpes", level="region", anchor_phrase="en Auvergne-Rhone-Alpes"),
    "paca": Territory("region", "Provence-Alpes-Cote d'Azur", "FR", region_name="Provence-Alpes-Cote d'Azur", level="region", anchor_phrase="en Provence-Alpes-Cote d'Azur"),
    "guadeloupe": Territory("overseas", "Guadeloupe", "FR", region_name="Guadeloupe", level="region", anchor_phrase="en Guadeloupe"),
    "martinique": Territory("overseas", "Martinique", "FR", region_name="Martinique", level="region", anchor_phrase="en Martinique"),
    "guyane": Territory("overseas", "Guyane", "FR", region_name="Guyane", level="region", anchor_phrase="en Guyane"),
    "la-reunion": Territory("overseas", "La Reunion", "FR", region_name="La Reunion", level="region", anchor_phrase="a La Reunion"),
    "mayotte": Territory("overseas", "Mayotte", "FR", region_name="Mayotte", level="region", anchor_phrase="a Mayotte"),
    "nouvelle-caledonie": Territory("overseas", "Nouvelle-Caledonie", "FR", region_name="Nouvelle-Caledonie", level="region", anchor_phrase="en Nouvelle-Caledonie"),
    "europe": Territory("europe", "Europe", "EU", level="macro", anchor_phrase="en Europe"),
    "world": Territory("world", "Monde", "ZZ", level="macro", anchor_phrase="dans le monde"),
    "evian": Territory("city", "Evian-les-Bains", "FR", region_name="Auvergne-Rhone-Alpes", city_name="Evian-les-Bains", department_name="Haute-Savoie", level="city", anchor_phrase="a Evian"),
}


SOURCES = {
    "service_public_calendar": ("official", "Service Public", "Calendrier electoral francais", "https://www.service-public.fr/particuliers/vosdroits/F34852/5_0", "2026-01-01", 0.95),
    "service_public_presidentielle": ("official", "Service Public", "Election presidentielle : mode d'emploi", "https://www.service-public.fr/particuliers/vosdroits/F1940", "2026-01-01", 0.95),
    "senatoriales_2026": ("official", "Senat", "Portail officiel des senatoriales 2026", "https://senatoriales2026.senat.fr/", "2026-01-15", 0.96),
    "assemblee_calendar": ("official", "Assemblee nationale", "Calendrier de la session 2025-2026", "https://www2.assemblee-nationale.fr/static/17/seance/calendrier.pdf", "2025-10-01", 0.93),
    "assemblee_seances": ("official", "Assemblee nationale", "Seances publiques de l'Assemblee nationale", "https://www.assemblee-nationale.fr/dyn/seance-publique", "2026-04-01", 0.93),
    "senate_agenda": ("official", "Senat", "Ordre du jour du Senat", "https://www.senat.fr/ordre-du-jour/ordre-du-jour.html", "2026-04-01", 0.94),
    "cc_agenda": ("official", "Conseil constitutionnel", "Agenda du Conseil constitutionnel", "https://www.conseil-constitutionnel.fr/agenda", "2026-04-01", 0.94),
    "cc_pending": ("official", "Conseil constitutionnel", "Affaires en instance", "https://www.conseil-constitutionnel.fr/decisions/affaires-en-instances", "2026-04-01", 0.94),
    "ce_hearings": ("official", "Conseil d'Etat", "Audiences importantes", "https://www.conseil-etat.fr/decisions-de-justice/audiences-importantes", "2026-04-01", 0.94),
    "g7_portal": ("official", "Direction generale du Tresor", "Presidence francaise du G7 en 2026", "https://www.tresor.economie.gouv.fr/tresor-international/le-g7", "2026-02-01", 0.95),
    "g7_evian_press": ("official", "Direction generale du Tresor", "Materiel presse sur le sommet du G7 a Evian", "https://www.tresor.economie.gouv.fr/Institutionnel/Niveau2/Pages/a845c89b-4a26-42ca-b0fb-836df3927531/files/9366fb6e-4115-477d-9596-21483bce7c86", "2026-02-10", 0.95),
    "jj_2026": ("think_tank", "Fondation Jean-Jaures", "Calendrier des evenements de 2026", "https://www.jean-jaures.org/publication/calendrier-des-evenements-de-2026/", "2026-01-01", 0.82),
    "jj_winter_spring": ("think_tank", "Fondation Jean-Jaures", "Calendrier hiver et printemps 2026", "https://www.jean-jaures.org/publication/calendrier-hiver-et-printemps-2026/", "2026-01-15", 0.82),
    "ipsos_enquete": ("polling", "Ipsos / CEVIPOF / Fondation Jean-Jaures / Le Monde", "Enquete electorale francaise 2026", "https://www.ipsos.com/sites/default/files/ct/news/documents/2026-03/enquete-electorale-francaise-2026-rapport-complet.pdf", "2026-03-01", 0.9),
    "ipsos_municipales": ("polling", "Ipsos", "Comprendre le vote des Francais aux municipales 2026", "https://www.ipsos.com/sites/default/files/ct/news/documents/2026-03/ipsos-bva-comprendre-le-vote-des-francais-t2-2026-rapport-complet.pdf", "2026-03-25", 0.9),
    "arcom_info": ("polling", "Arcom", "Les Francais et l'information", "https://www.arcom.fr/se-documenter/etudes-et-donnees/etudes-bilans-et-rapports-de-larcom/les-francais-et-linformation-2eme-edition", "2025-11-01", 0.88),
    "ifes_guide": ("international_database", "IFES Election Guide", "Election Guide", "https://www.electionguide.org/", "2026-04-01", 0.84),
    "ifes_upcoming": ("international_database", "IFES Election Guide", "Upcoming elections", "https://www.electionguide.org/elections/type/upcoming/", "2026-04-01", 0.84),
}


THEMES = [
    {
        "slug": "elections_and_campaigns",
        "name": "Elections et campagnes",
        "description": "La politique vue par les rapports de force electoraux, les candidatures et les campagnes qui touchent le quotidien.",
        "topics_per_subtheme": 5,
        "subthemes": [
            ("possible_candidatures", "Candidatures possibles", "les candidatures possibles a la presidentielle de 2027", "les electeurs", "les partis", "une candidature credibilisee", ["france", "paris", "lyon", "marseille"], ["service_public_presidentielle", "ipsos_enquete", "jj_2026"]),
            ("alliances_et_ralliements", "Alliances et ralliements", "les alliances, accords et refus d'union avant 2027", "les blocs concurrents", "les appareils politiques", "un accord entre rivaux", ["france", "lille", "nantes", "bordeaux"], ["service_public_presidentielle", "ipsos_enquete", "jj_winter_spring"]),
            ("primaires_ou_selection", "Primaires ou selection", "les methodes de selection des candidats, entre primaire, congres et designation d'en haut", "les sympathisants", "les directions partisanes", "une methode de selection acceptee", ["france", "strasbourg", "rennes", "toulouse"], ["service_public_presidentielle", "ipsos_enquete", "jj_2026"]),
            ("scenarios_second_tour", "Scenarios de second tour", "les hypotheses de duel final et leurs effets sur le vote utile", "les abstentionnistes", "les sondeurs", "un scenario de second tour dominant", ["france", "hauts-de-france", "occitanie", "grand-est"], ["service_public_presidentielle", "ipsos_enquete", "jj_2026"]),
            ("effet_des_affaires_judiciaires", "Affaires judiciaires et campagne", "l'effet des procedures judiciaires sur les candidatures et les recits de campagne", "les candidats mis en cause", "les juges", "une affaire qui rebat la campagne", ["france", "paris", "seine-saint-denis", "marseille"], ["cc_agenda", "cc_pending", "ipsos_enquete"]),
            ("maires_parrainages", "Maires, parrains et reseaux locaux", "le role des maires et des petits elus dans la credibilite des candidatures", "les maires", "les reseaux locaux", "des parrainages difficiles", ["france", "creuse", "cantal", "finistere"], ["service_public_presidentielle", "senatoriales_2026", "ipsos_enquete"]),
            ("grandes_villes_apres_municipales", "Grandes villes apres les municipales", "la lecture politique des resultats municipaux dans les grandes villes", "les habitants des grandes villes", "les nouveaux maires", "une ville symbole qui change de camp", ["paris", "marseille", "lyon", "toulouse"], ["service_public_calendar", "ipsos_municipales", "jj_2026"]),
            ("periurbain_abstention", "Periurbain et abstention", "les zones periurbaines ou l'abstention et le vote de colere pesent lourd", "les classes moyennes et modestes", "les elus locaux", "une abstention durable", ["aisne", "gironde", "haute-garonne", "bouches-du-rhone"], ["ipsos_enquete", "ipsos_municipales", "jj_winter_spring"]),
            ("senatoriales_2026_watch", "Senatoriales 2026", "la campagne senatoriale vue depuis les mairies et les grands electeurs", "les maires et adjoints", "les reseaux senatoriaux", "un rapport de force territorial au Senat", ["france", "nord", "bas-rhin", "guadeloupe"], ["senatoriales_2026", "ipsos_municipales", "jj_2026"]),
            ("opinion_shifts", "Deplacements d'opinion", "les glissements de priorites qui changent les themes de campagne", "les classes populaires", "les partis", "une priorite d'opinion qui remonte", ["france", "grand-est", "paca", "nouvelle-aquitaine"], ["ipsos_enquete", "arcom_info", "jj_2026"]),
        ],
    },
    {
        "slug": "local_public_life",
        "name": "Vie publique locale",
        "description": "Les conflits de voisinage politique, les services de proximite et les projets qui structurent la vie publique locale.",
        "topics_per_subtheme": 4,
        "subthemes": [
            ("pouvoir_reel_du_maire", "Pouvoir reel du maire", "ce que les habitants pensent que leur maire peut encore faire", "les habitants", "les maires", "un pouvoir local juge impuissant", ["rennes", "nantes", "lille", "paris"], ["ipsos_municipales", "jj_2026"]),
            ("classes_et_ecoles_de_proximite", "Classes et ecoles de proximite", "les fermetures de classes et les arbitrages entre economie et presence publique", "les parents", "les mairies", "une fermeture de classe contestee", ["creuse", "cantal", "finistere", "guyane"], ["ipsos_enquete", "ipsos_municipales"]),
            ("eau_dechets_proprete", "Eau, dechets et proprete", "les sujets de proprete, d'eau et de ramassage qui deviennent politiques", "les riverains", "les intercommunalites", "un service local qui se degrade", ["marseille", "paris", "nice", "guadeloupe"], ["ipsos_municipales", "jj_winter_spring"]),
            ("polices_municipales", "Polices municipales", "la montee des attentes securitaires a l'echelle municipale", "les habitants", "les maires", "une police municipale plus visible", ["nice", "marseille", "bordeaux", "nantes"], ["ipsos_municipales", "ipsos_enquete"]),
            ("zones_commerciales_centres_villes", "Centres-villes et zones commerciales", "le declin des commerces de centre-ville face aux zones de peripherie", "les commercants", "les maires", "un centre-ville qui se vide", ["cantal", "lille", "bordeaux", "strasbourg"], ["ipsos_municipales", "jj_2026"]),
            ("impots_locaux_et_services", "Impots locaux et services", "le lien entre taxes locales et qualite visible des services", "les proprietaires et locataires", "les collectivites", "une hausse locale mal comprise", ["paris", "marseille", "grenoble", "la-reunion"], ["ipsos_enquete", "ipsos_municipales"]),
            ("participation_citoyenne", "Participation citoyenne", "les budgets participatifs, consultations et sentiment de ne pas etre ecoute", "les habitants", "les executifs locaux", "une consultation sans effet visible", ["lyon", "strasbourg", "rennes", "martinique"], ["ipsos_municipales", "arcom_info"]),
            ("intercommunalites_et_decisions", "Intercommunalites et decisions", "ce qui se decide hors du regard public dans les structures intercommunales", "les habitants", "les executifs intercommunaux", "une decision jugee lointaine", ["france", "bretagne", "occitanie", "nouvelle-aquitaine"], ["ipsos_municipales", "senatoriales_2026"]),
        ],
    },
    {
        "slug": "justice_and_public_affairs",
        "name": "Justice et affaires publiques",
        "description": "Les affaires, contentieux et decisions de justice qui changent la confiance politique ou la sequence publique.",
        "topics_per_subtheme": 4,
        "subthemes": [
            ("affaires_touchant_les_dirigeants", "Affaires touchant les dirigeants", "les procedures visant des responsables qui peuvent changer l'agenda politique", "les dirigeants", "les juridictions", "une affaire a impact politique", ["france", "paris", "marseille", "lyon"], ["cc_agenda", "ce_hearings", "jj_2026"]),
            ("contentieux_electoraux", "Contentieux electoraux", "les recours apres election et les batailles sur la regularite du vote", "les candidats battus", "les juges administratifs", "un resultat conteste", ["paris", "marseille", "lille", "guadeloupe"], ["service_public_calendar", "ce_hearings"]),
            ("liberte_publique_et_maintien_de_l_ordre", "Libertes publiques et maintien de l'ordre", "les litiges sur les interdictions, manifestations et usages de la force", "les manifestants", "l'Etat", "une decision de justice qui change la doctrine", ["france", "paris", "strasbourg", "guyane"], ["ce_hearings", "cc_pending", "jj_winter_spring"]),
            ("corruption_prise_illegale_d_interets", "Corruption et prise illegale d'interets", "les soupcons qui touchent la confiance dans les elus", "les elus locaux", "les parquets", "une affaire locale qui remonte nationalement", ["marseille", "nice", "bordeaux", "nouvelle-caledonie"], ["ce_hearings", "jj_2026"]),
            ("fin_de_vie_bioethique_et_recours", "Fin de vie, bioethique et recours", "les sujets de societe qui finissent devant le juge ou le Conseil constitutionnel", "les familles", "le Parlement", "un arbitrage moral et juridique", ["france", "lyon", "nantes", "la-reunion"], ["senate_agenda", "cc_agenda", "assemblee_seances"]),
            ("terrorisme_proces_et_memoire", "Proces terrorisme et memoire", "les grands proces qui ramennent justice, securite et memoire dans le debat public", "les victimes", "les cours speciales", "un proces qui ravive le debat securitaire", ["strasbourg", "paris", "lille", "france"], ["jj_2026", "ce_hearings"]),
            ("juges_contre_politique", "Qui decide : juges ou politique ?", "la critique du gouvernement des juges et la contre-critique de l'impunite", "les citoyens", "les institutions", "un sentiment de dessaisissement democratique", ["france", "grand-est", "hauts-de-france", "mayotte"], ["cc_agenda", "cc_pending", "arcom_info"]),
            ("affaires_sociales_et_travail", "Affaires sociales et travail", "les litiges lourds sur licenciements, fermetures et responsabilites publiques", "les salaries", "les tribunaux", "une decision qui pese sur un bassin d'emploi", ["nord", "hauts-de-france", "bordeaux", "martinique"], ["ce_hearings", "jj_winter_spring"]),
        ],
    },
    {
        "slug": "cost_of_living_and_daily_economy",
        "name": "Cout de la vie et economie du quotidien",
        "description": "Prix, energie, budget des menages et arbitrages publics vus depuis leurs effets concrets.",
        "topics_per_subtheme": 4,
        "subthemes": [
            ("prix_alimentaires", "Prix alimentaires", "les hausses durables sur les courses et leurs effets politiques", "les menages", "les distributeurs et l'Etat", "des prix encore trop hauts", ["france", "lille", "marseille", "guyane"], ["ipsos_enquete", "jj_winter_spring"]),
            ("energie_et_carburants", "Energie et carburants", "la facture d'energie et le prix a la pompe comme thermometre politique", "les automobilistes", "le gouvernement", "une nouvelle poussee des prix", ["france", "aisne", "cantal", "paca"], ["ipsos_enquete", "g7_portal", "ifes_upcoming"]),
            ("loyers_et_depenses_fixes", "Loyers et depenses fixes", "le poids du loyer, des charges et des assurances", "les locataires", "les bailleurs et pouvoirs publics", "des depenses fixes qui mangent tout", ["paris", "lyon", "bordeaux", "la-reunion"], ["ipsos_enquete", "ipsos_municipales"]),
            ("finances_publiques_traduites_en_effets", "Dette et finances publiques vues par leurs effets", "les economies a venir vues depuis les menages, retraites, collectivites et services", "les menages", "Bercy et les collectivites", "qui paiera les ajustements", ["france", "marseille", "rennes", "guadeloupe"], ["ipsos_enquete", "g7_portal", "jj_2026"]),
            ("emploi_local_et_fermetures", "Emploi local et fermetures", "les fermetures d'usine ou de site vues depuis les territoires", "les salaries", "les employeurs et l'Etat", "un bassin d'emploi fragilise", ["nord", "hauts-de-france", "strasbourg", "guyane"], ["jj_2026", "ipsos_enquete"]),
            ("tourisme_saisonnier", "Tourisme et saisonniers", "les tensions sur les prix et l'emploi dans les territoires touristiques", "les saisonniers", "les elus locaux", "une economie locale trop dependante", ["nice", "evian", "bretagne", "la-reunion"], ["jj_winter_spring", "ipsos_enquete"]),
            ("petits_commercants_et_charges", "Petits commercants et charges", "la fatigue des independants face aux couts fixes et a la concurrence", "les independants", "les pouvoirs publics", "des commerces qui tiennent a peine", ["nantes", "bordeaux", "lille", "martinique"], ["ipsos_enquete", "ipsos_municipales"]),
        ],
    },
    {
        "slug": "health_and_access_to_care",
        "name": "Sante et acces aux soins",
        "description": "L'hopital, les medecins, l'attente et les inegalites d'acces aux soins comme questions politiques concretes.",
        "topics_per_subtheme": 4,
        "subthemes": [
            ("deserts_medicaux", "Deserts medicaux", "les communes et cantons qui perdent des medecins", "les patients", "l'Etat et les agences de sante", "un territoire qui decroche", ["creuse", "cantal", "haute-garonne", "guadeloupe"], ["ipsos_enquete", "jj_winter_spring"]),
            ("urgences_saturees", "Urgences saturees", "les fermetures temporaires et l'angoisse de devoir aller plus loin", "les familles", "les hopitaux", "des urgences qui ferment la nuit", ["marseille", "nord", "guyane", "la-reunion"], ["ipsos_enquete", "jj_2026"]),
            ("medecine_de_ville", "Medecine de ville", "la difficulte a obtenir un rendez-vous chez un generaliste ou un specialiste", "les patients", "les professionnels de sante", "des delais qui explosent", ["paris", "lyon", "bordeaux", "strasbourg"], ["ipsos_enquete"]),
            ("sante_mentale", "Sante mentale", "la montee des besoins chez les jeunes, les femmes et les actifs", "les jeunes et les familles", "les pouvoirs publics", "une offre tres insuffisante", ["france", "lille", "rennes", "martinique"], ["ipsos_enquete", "jj_winter_spring"]),
            ("maternites_et_petites_structures", "Maternites et petites structures", "le debat entre securite, distance et fermeture des petites maternites", "les familles", "les ARS", "une fermeture tres mal vecue", ["finistere", "creuse", "guadeloupe", "mayotte"], ["ipsos_enquete", "jj_2026"]),
            ("ehpad_et_vieillissement", "Ehpad et vieillissement", "le cout de la dependance et le manque de places de qualite", "les personnes agees et leurs proches", "les gestionnaires et l'Etat", "un vieillissement mal anticipe", ["france", "bretagne", "nantes", "la-reunion"], ["ipsos_enquete", "jj_winter_spring"]),
            ("sante_outre_mer", "Sante outre-mer", "les distances, couts et manque de specialites dans les territoires ultramarins", "les habitants d'outre-mer", "l'Etat", "un acces aux soins plus tardif", ["guadeloupe", "martinique", "guyane", "mayotte"], ["ipsos_enquete", "jj_2026"]),
        ],
    },
    {
        "slug": "safety_immigration_and_order",
        "name": "Securite, immigration et ordre",
        "description": "Les sujets de securite et d'immigration traduits en consequences locales, perceptions et arbitrages concrets.",
        "topics_per_subtheme": 4,
        "subthemes": [
            ("insecurite_du_quotidien", "Insecurite du quotidien", "les cambriolages, agressions et trafics vus depuis la vie ordinaire", "les habitants", "l'Etat et les mairies", "une insecurite qui change les habitudes", ["marseille", "seine-saint-denis", "nice", "lille"], ["ipsos_enquete", "ipsos_municipales"]),
            ("trafics_et_points_de_deal", "Trafics et points de deal", "les quartiers ou le trafic structure l'image publique du pouvoir", "les riverains", "la police et la justice", "un point de deal jamais traite durablement", ["marseille", "paris", "lille", "guyane"], ["ipsos_enquete", "jj_2026"]),
            ("immigration_accueil_et_tension_locale", "Immigration, accueil et tension locale", "l'ecart entre principes nationaux et pression locale sur l'hebergement", "les habitants et associations", "l'Etat et les maires", "un centre d'accueil qui divise", ["mayotte", "paris", "strasbourg", "nantes"], ["ipsos_enquete", "arcom_info", "jj_winter_spring"]),
            ("frontieres_et_outre_mer", "Frontieres et outre-mer", "les frontieres maritimes et terrestres ou la question migratoire devient quotidienne", "les habitants", "l'Etat", "une frontiere poreuse ou ressentie comme telle", ["mayotte", "guyane", "nouvelle-caledonie", "guadeloupe"], ["ipsos_enquete", "jj_2026"]),
            ("violences_contre_les_elus_et_agents", "Violences contre les elus et agents publics", "les agressions qui changent la maniere d'exercer un mandat local", "les maires et agents", "l'Etat", "un mandat local plus expose", ["france", "creuse", "hauts-de-france", "bouches-du-rhone"], ["ipsos_municipales", "jj_2026"]),
            ("videosurveillance_et_libertes", "Videosurveillance et libertes", "l'extension des cameras face a la contestation sur les libertes", "les habitants", "les mairies", "plus de surveillance, mais pour quels resultats", ["nice", "marseille", "lyon", "rennes"], ["ipsos_municipales", "ce_hearings"]),
            ("attentat_risque_et_preparation", "Risque attentat et preparation", "ce que les Francais attendent en prevention, coordination et protection", "les habitants", "l'Etat", "une alerte qui remet tout au premier plan", ["france", "strasbourg", "paris", "lille"], ["jj_2026", "ipsos_enquete"]),
        ],
    },
    {
        "slug": "schools_youth_and_family",
        "name": "Ecole, jeunesse et famille",
        "description": "L'ecole, la garde, les jeunes et les tensions familiales vues depuis leurs effets quotidiens.",
        "topics_per_subtheme": 4,
        "subthemes": [
            ("fermetures_classes", "Fermetures de classes", "les pertes d'effectifs et fermetures de classes qui deviennent des conflits publics", "les parents", "l'Education nationale et les maires", "une classe qui ferme malgre la mobilisation", ["creuse", "cantal", "finistere", "guyane"], ["ipsos_enquete", "ipsos_municipales"]),
            ("niveau_scolaire_et_inquietude", "Niveau scolaire et inquietude", "les peurs sur le niveau reel des eleves", "les parents", "l'institution scolaire", "des resultats juges insuffisants", ["france", "paris", "lille", "marseille"], ["ipsos_enquete", "arcom_info"]),
            ("orientation_et_metiers", "Orientation et metiers", "l'ecart entre discours sur les metiers et choix reels des familles", "les lyceens", "l'Education nationale", "une orientation percue comme subie", ["lyon", "toulouse", "nantes", "la-reunion"], ["ipsos_enquete", "jj_winter_spring"]),
            ("jeunesse_logement_mobilite", "Jeunesse, logement et mobilite", "ce qui bloque les etudiants et jeunes actifs au debut de vie", "les jeunes", "les collectivites", "une entree dans la vie adulte retardee", ["paris", "bordeaux", "strasbourg", "martinique"], ["ipsos_enquete", "ipsos_municipales"]),
            ("cantines_periscolaire", "Cantines et periscolaire", "les inegalites visibles dans les tarifs, horaires et qualite de service", "les familles", "les communes", "un service local trop inegal", ["paris", "rennes", "nantes", "guadeloupe"], ["ipsos_municipales"]),
            ("harcelement_et_climat_scolaire", "Harcelement et climat scolaire", "la place de la prevention, des sanctions et du soutien", "les eleves et parents", "les etablissements", "une prise en charge jugee trop lente", ["france", "marseille", "lille", "mayotte"], ["ipsos_enquete", "arcom_info"]),
            ("politisation_de_l_ecole", "Politisation de l'ecole", "les querelles sur les programmes, la laicite et l'autorite", "les parents", "le ministere", "l'ecole comme terrain de guerre culturelle", ["france", "strasbourg", "lyon", "nouvelle-caledonie"], ["ipsos_enquete", "arcom_info"]),
        ],
    },
    {
        "slug": "transport_housing_and_infrastructure",
        "name": "Transports, logement et infrastructures",
        "description": "Les retards, blocages et projets visibles qui changent la vie quotidienne sur le terrain.",
        "topics_per_subtheme": 4,
        "subthemes": [
            ("retards_ferroviaires", "Retards ferroviaires", "les lignes du quotidien qui accumulent pannes et retards", "les usagers", "l'Etat et les operateurs", "une ligne locale toujours en retard", ["hauts-de-france", "occitanie", "grand-est", "bretagne"], ["ipsos_enquete", "jj_2026"]),
            ("transports_urbains_satures", "Transports urbains satures", "les reseaux de metro, bus et tram a bout de souffle", "les navetteurs", "les metropoles", "des rames pleines et des travaux sans fin", ["paris", "marseille", "lyon", "toulouse"], ["ipsos_municipales", "jj_winter_spring"]),
            ("zfe_et_reculs", "ZFE et reculs politiques", "la contestation des zones a faibles emissions et les reculs possibles", "les automobilistes", "les maires et l'Etat", "une mesure verte percue comme punitive", ["lyon", "marseille", "strasbourg", "nice"], ["ipsos_enquete", "ipsos_municipales"]),
            ("autoroutes_et_contournements", "Autoroutes et contournements", "les projets routiers contestes, retardes ou rencheris", "les riverains", "l'Etat et les collectivites", "un chantier routier qui n'en finit plus", ["toulouse", "nantes", "bordeaux", "strasbourg"], ["jj_2026", "ce_hearings"]),
            ("logement_neuf_et_blocages", "Logement neuf et blocages", "la chute de construction et le manque de logements abordables", "les menages", "les promoteurs et mairies", "des permis sans logements reels", ["paris", "bordeaux", "nantes", "la-reunion"], ["ipsos_enquete", "ipsos_municipales"]),
            ("renovation_energetique", "Renovation energetique", "les promesses de renovation vues par les coproprietes et petites communes", "les proprietaires", "l'Etat et les artisans", "une renovation trop chere ou trop lente", ["france", "grenoble", "creuse", "guadeloupe"], ["ipsos_enquete", "g7_portal"]),
            ("eau_reseaux_et_resilience", "Eau, reseaux et resilience", "les canalisations, fuites et travaux invisibles qui coutent cher", "les habitants", "les intercommunalites", "des reseaux vieillissants", ["bretagne", "martinique", "guyane", "paca"], ["jj_winter_spring", "ipsos_municipales"]),
            ("littoral_montagne_et_tourisme", "Littoral, montagne et tourisme", "les tensions entre habitat, saison et infrastructures", "les habitants permanents", "les elus locaux", "une pression touristique mal geree", ["nice", "evian", "bretagne", "paca"], ["jj_2026", "ipsos_enquete"]),
        ],
    },
    {
        "slug": "territories_agriculture_and_rural_life",
        "name": "Territoires, agriculture et ruralite",
        "description": "La vie rurale, agricole et periurbaine vue par ses contraintes concretes, ses coleres et ses arbitrages.",
        "topics_per_subtheme": 4,
        "subthemes": [
            ("revenu_agricole", "Revenu agricole", "le sentiment de travailler plus pour gagner moins dans l'agriculture", "les agriculteurs", "l'Etat et les filieres", "un revenu toujours trop instable", ["finistere", "occitanie", "nouvelle-aquitaine", "guadeloupe"], ["ipsos_enquete", "jj_2026"]),
            ("eau_irrigation", "Eau et irrigation", "les conflits locaux sur l'eau et les arbitrages entre usages", "les agriculteurs et riverains", "les prefectures", "une ressource jugee mal partagee", ["haute-garonne", "occitanie", "nouvelle-aquitaine", "guyane"], ["jj_winter_spring", "ce_hearings"]),
            ("loups_faune_et_protection", "Faune, predateurs et protection", "les conflits sur le loup, la chasse et la biodiversite", "les eleveurs", "l'Etat", "une protection vue comme un abandon", ["auvergne-rhone-alpes", "grand-est", "bretagne", "creuse"], ["jj_2026"]),
            ("services_publics_ruraux", "Services publics ruraux", "poste, gares, ecoles, gendarmeries : le sentiment de recul", "les habitants ruraux", "l'Etat", "un territoire qui se sent oublie", ["creuse", "cantal", "aisne", "finistere"], ["ipsos_enquete", "ipsos_municipales"]),
            ("maires_ruraux_et_normes", "Maires ruraux et normes", "le sentiment de ne plus pouvoir decider ni recruter", "les maires ruraux", "l'Etat", "un mandat local qui s'use", ["creuse", "cantal", "finistere", "guadeloupe"], ["senatoriales_2026", "ipsos_municipales"]),
            ("foncier_terres_et_heritage", "Foncier, terres et heritage", "la transmission des exploitations et la pression fonciere", "les familles agricoles", "les Safer et collectivites", "des terres qui changent d'usage", ["nouvelle-aquitaine", "occitanie", "bretagne", "martinique"], ["jj_winter_spring", "ipsos_enquete"]),
            ("ruralite_numerique", "Ruralite numerique", "reseau mobile, fibre et demarches en ligne dans les zones peu denses", "les habitants ruraux", "les operateurs et l'Etat", "une connexion encore insuffisante", ["aisne", "creuse", "cantal", "guyane"], ["ipsos_enquete", "arcom_info"]),
        ],
    },
    {
        "slug": "institutions_and_power",
        "name": "Institutions et pouvoir",
        "description": "Qui decide vraiment, avec quelles marges et avec quels effets concrets pour les citoyens et les territoires.",
        "topics_per_subtheme": 5,
        "subthemes": [
            ("balance_du_senat", "Balance du Senat", "le rapport de force attendu au Senat apres les senatoriales", "les territoires", "les groupes senatoriaux", "une majorite territoriale renforcee", ["france", "grand-est", "hauts-de-france", "guadeloupe"], ["senatoriales_2026", "ipsos_municipales", "jj_2026"]),
            ("grands_electeurs", "Grands electeurs", "ce que pese vraiment le college electoral senatorial", "les maires et conseillers", "les appareils locaux", "un scrutin discret mais decisif", ["france", "creuse", "bas-rhin", "martinique"], ["senatoriales_2026", "service_public_calendar"]),
            ("reseaux_locaux_de_pouvoir", "Reseaux locaux de pouvoir", "les alliances entre mairies, departements et senateurs", "les elus locaux", "les notables territoriaux", "un reseau local qui verrouille", ["nord", "bouches-du-rhone", "bas-rhin", "guadeloupe"], ["senatoriales_2026", "ipsos_municipales"]),
            ("assemblee_agenda_et_vie_reelle", "Agenda parlementaire et vie reelle", "ce que les calendriers parlementaires changent ou ne changent pas au quotidien", "les citoyens", "le Parlement", "un calendrier institutionnel loin du terrain", ["france", "paris", "strasbourg", "la-reunion"], ["assemblee_calendar", "assemblee_seances", "senate_agenda"]),
            ("conseil_constitutionnel_impact", "Conseil constitutionnel et impact concret", "les dossiers qui peuvent bloquer, corriger ou valider des textes sensibles", "les citoyens", "le Conseil constitutionnel", "une censure qui change la vie reelle", ["france", "paris", "mayotte", "nouvelle-caledonie"], ["cc_agenda", "cc_pending"]),
            ("conseil_d_etat_et_politiques_publiques", "Conseil d'Etat et politiques publiques", "quand le juge administratif devient central sur un projet visible", "les riverains", "le Conseil d'Etat", "un grand projet suspendu", ["france", "toulouse", "nantes", "guyane"], ["ce_hearings"]),
            ("paris_vs_territoires", "Paris contre territoires", "le sentiment que tout remonte a Paris puis redescend trop tard", "les habitants", "le pouvoir central", "une decision verticale tres mal recue", ["france", "hauts-de-france", "bretagne", "la-reunion"], ["ipsos_enquete", "senatoriales_2026"]),
            ("collectivites_et_budgets", "Collectivites et budgets", "comment les arbitrages budgetaires se traduisent en piscines, voiries ou mediatheques", "les habitants", "les collectivites", "des services locaux rabotes", ["france", "nantes", "grenoble", "guadeloupe"], ["ipsos_enquete", "g7_portal"]),
            ("outre_mer_et_statut", "Outre-mer et statut", "les debats sur la representation, l'autonomie et le lien avec Paris", "les habitants d'outre-mer", "l'Etat", "un statut juge inadapte", ["nouvelle-caledonie", "mayotte", "martinique", "guyane"], ["jj_2026", "service_public_calendar"]),
            ("gouverner_par_crise", "Gouverner par crise", "la facon dont une crise exterieure ou interieure rebat les priorites et concentre le pouvoir", "les citoyens", "l'executif", "une sequence d'urgence qui ecrase le reste", ["france", "europe", "world", "evian"], ["g7_portal", "g7_evian_press", "jj_2026"]),
        ],
    },
    {
        "slug": "europe_and_world_events",
        "name": "Europe et evenements du monde",
        "description": "Les crises, elections et sommets exterieurs vus depuis leurs effets sur le debat francais.",
        "topics_per_subtheme": 4,
        "subthemes": [
            ("g7_evian_2026", "G7 Evian 2026", "la presidence francaise du G7 et l'effet de vitrine ou de pression politique", "les Francais", "l'executif", "un sommet international qui change l'agenda national", ["evian", "france", "europe", "world"], ["g7_portal", "g7_evian_press", "jj_2026"]),
            ("guerres_et_prix", "Guerres et prix", "le lien entre conflits internationaux, energie et inflation", "les menages", "les gouvernements", "une crise lointaine avec facture concrete", ["france", "europe", "marseille", "la-reunion"], ["g7_portal", "ifes_upcoming", "ipsos_enquete"]),
            ("elections_etrangeres_et_debat_francais", "Elections etrangeres et debat francais", "les elections a l'etranger qui servent de miroir ou de repoussoir en France", "les partis francais", "les medias", "un scrutin exterieur surinterprete en France", ["europe", "world", "paris", "strasbourg"], ["ifes_guide", "ifes_upcoming", "arcom_info"]),
            ("europe_defense_et_rearmement", "Europe, defense et rearmement", "ce que la defense europeenne change dans le debat sur les priorites publiques", "les contribuables", "les gouvernements europeens", "plus de defense, mais au prix de quoi", ["europe", "strasbourg", "france", "grand-est"], ["g7_portal", "ifes_upcoming", "jj_winter_spring"]),
            ("commerce_international_et_industrie", "Commerce mondial et industrie", "droits de douane, sanctions et pression sur les sites industriels francais", "les salaries", "l'Etat et l'UE", "un choc exterieur sur l'emploi local", ["nord", "hauts-de-france", "strasbourg", "france"], ["g7_portal", "ifes_upcoming"]),
            ("migrations_internationales", "Migrations internationales", "comment les crises externes nourrissent les tensions internes sur l'accueil", "les habitants", "les Etats", "une crise humanitaire qui devient crise politique", ["europe", "mayotte", "paris", "strasbourg"], ["ifes_upcoming", "ipsos_enquete"]),
            ("climat_catastrophes_et_assurances", "Climat, catastrophes et assurances", "les inondations, secheresses et couts assurantiels qui montent dans le debat", "les assures", "les pouvoirs publics", "des risques climatiques plus concrets", ["bretagne", "paca", "guyane", "france"], ["g7_portal", "jj_2026"]),
        ],
    },
    {
        "slug": "media_opinion_and_information_wars",
        "name": "Medias, opinion et guerres de l'information",
        "description": "Le role des chaines, plateformes, reseaux et recits concurrents dans la formation des priorites publiques.",
        "topics_per_subtheme": 4,
        "subthemes": [
            ("fatigue_informationnelle", "Fatigue informationnelle", "le decrochage d'une partie du public face au flux permanent", "les citoyens", "les medias et plateformes", "une information qui epuise plus qu'elle n'eclaire", ["france", "paris", "lille", "la-reunion"], ["arcom_info", "ipsos_enquete"]),
            ("reseaux_sociaux_et_biais", "Reseaux sociaux et biais", "la sensation que les reseaux deforment l'ordre des priorites", "les internautes", "les plateformes", "un agenda public capte par quelques sequences", ["france", "marseille", "lyon", "toulouse"], ["arcom_info", "ipsos_enquete"]),
            ("audiovisuel_public_et_confiance", "Audiovisuel public et confiance", "ce que les reformes et critiques changent dans la confiance", "les telespectateurs", "les dirigeants de l'audiovisuel", "un service public juge trop loin ou trop fragile", ["france", "paris", "strasbourg", "guadeloupe"], ["arcom_info", "assemblee_seances", "jj_2026"]),
            ("desinformation_en_campagne", "Desinformation en campagne", "les intox, montages et rumeurs autour des campagnes", "les electeurs", "les plateformes et partis", "une rumeur qui pese sur le vote", ["france", "paris", "marseille", "nouvelle-caledonie"], ["arcom_info", "ipsos_enquete"]),
            ("chaines_d_info_et_emotion", "Chaines d'info et politique emotionnelle", "la facon dont la repetition d'images peut deformer l'importance reelle des sujets", "les telespectateurs", "les chaines d'info", "une sequence qui ecrase tout", ["france", "paris", "nice", "lille"], ["arcom_info", "ipsos_enquete"]),
            ("sondages_et_usage_politique", "Sondages et usage politique", "comment les chiffres sont utilises pour fabriquer une dynamique ou une peur", "les electeurs", "les instituts et partis", "un sondage qui devient evenement", ["france", "paris", "lyon", "bordeaux"], ["ipsos_enquete", "arcom_info"]),
            ("territoires_invisibles_dans_les_medias", "Territoires invisibles dans les medias", "ceux qui ont le sentiment de n'exister qu'en cas de crise", "les habitants des territoires eloignes", "les grands medias", "une France peripherique peu racontee", ["creuse", "guyane", "mayotte", "nouvelle-caledonie"], ["arcom_info", "ipsos_enquete"]),
        ],
    },
]

TOPIC_TYPES = [
    "explainer",
    "local_conflict",
    "election_watch",
    "judicial_watch",
    "policy_consequence",
    "infrastructure_delay",
    "public_service_access",
    "territorial_tension",
    "media_controversy",
    "geopolitical_impact",
    "prediction_market",
    "debate_prompt",
]


def title_variants(issue: str, actor: str, conflict: str, anchor: str, theme_slug: str, idx: int) -> str:
    generic = [
        f"Pourquoi {issue} devient-il un test politique {anchor} ?",
        f"{actor.capitalize()} peut-il encore peser sur {issue} {anchor} ?",
        f"{issue.capitalize()} : qui paie, qui decide, qui assume {anchor} ?",
        f"{conflict.capitalize()} va-t-il rebattre les cartes politiques {anchor} ?",
        f"Que change vraiment {issue} pour les habitants {anchor} ?",
    ]
    electoral = [
        f"Qui peut vraiment s'imposer sur {issue} {anchor} ?",
        f"{issue.capitalize()} peut-il changer la course a l'Elysee {anchor} ?",
        f"Les maires, les sondages ou les juges feront-ils bouger {issue} ?",
        f"{conflict.capitalize()} peut-il refaire les alliances {anchor} ?",
        f"Pourquoi {issue} compte deja pour la presidentielle {anchor} ?",
    ]
    institutional = [
        f"Pourquoi {issue} donne-t-il le sentiment que tout se decide loin du terrain ?",
        f"Qui tient vraiment la main sur {issue} {anchor} ?",
        f"{conflict.capitalize()} peut-il renforcer le pouvoir territorial {anchor} ?",
        f"{issue.capitalize()} : Paris, les maires, les juges ou le Senat ?",
        f"Ce que {issue} change vraiment pour le rapport de force {anchor}",
    ]
    if theme_slug == "elections_and_campaigns":
        return electoral[idx % len(electoral)]
    if theme_slug == "institutions_and_power":
        return institutional[idx % len(institutional)]
    return generic[idx % len(generic)]


def summary_text(issue: str, actor: str, owner: str, conflict: str, anchor: str, source_names: list[str]) -> str:
    return (
        f"Sujet ancre dans le debat public autour de {issue}. "
        f"L'angle retenu part des effets concrets pour {actor} et remonte vers les responsabilites de {owner}. "
        f"La controverse centrale porte sur {conflict}. "
        f"Le cadrage editorial privilegie ce que les habitants peuvent observer {anchor}, "
        f"avec un appui sur {', '.join(source_names[:2])}."
    )


def topic_type_for(theme_slug: str, idx: int) -> str:
    cycles = {
        "elections_and_campaigns": ["election_watch", "prediction_market", "debate_prompt", "policy_consequence", "media_controversy"],
        "justice_and_public_affairs": ["judicial_watch", "explainer", "territorial_tension", "debate_prompt"],
        "transport_housing_and_infrastructure": ["infrastructure_delay", "local_conflict", "policy_consequence", "prediction_market"],
        "europe_and_world_events": ["geopolitical_impact", "prediction_market", "media_controversy", "explainer"],
    }
    cycle = cycles.get(theme_slug, TOPIC_TYPES)
    return cycle[idx % len(cycle)]


def make_prediction_question(issue: str, anchor: str, idx: int) -> tuple[str, str]:
    templates = [
        (f"Une annonce officielle majeure sur {issue} interviendra-t-elle avant la cloture du sujet ?", f"Resolution Oui si une annonce publique explicite concernant {issue} est publiee avant la date de cloture."),
        (f"{issue.capitalize()} dominera-t-il le debat politique pendant au moins une semaine ?", f"Resolution Oui si la sequence publique documentee par la source de resolution reste centree sur {issue} pendant une semaine consecutive."),
        (f"Une decision institutionnelle visible changera-t-elle la donne sur {issue} ?", f"Resolution Oui si une decision officielle modifie clairement le cadre politique ou administratif de {issue}."),
        (f"Le rapport de force public sur {issue} basculera-t-il {anchor} ?", f"Resolution Oui si un resultat, vote, sondage ou arbitrage officialise un changement net de rapport de force sur {issue}."),
    ]
    question, criteria = templates[idx % len(templates)]
    return question, criteria


def make_prompt(issue: str, actor: str, conflict: str, anchor: str, idx: int) -> tuple[str, str, str]:
    prompts = [
        (f"Dans votre experience, qui a vraiment la main sur {issue} {anchor} ?", "responsibility", "direct"),
        (f"Est-ce que {actor} paient le prix politique de {conflict} ?", "fairness", "argumentative"),
        (f"Pourquoi {issue} parait-il si lent a bouger {anchor} ?", "lived_experience", "grounded"),
        (f"Faut-il juger {issue} d'abord a ses effets concrets plutot qu'aux discours ?", "priority", "calm"),
    ]
    return prompts[idx % len(prompts)]


def build_sql() -> str:
    lines: list[str] = []
    lines.append("-- Generation strategy: lived issues first, then conflict, responsibility and institutional layer.")
    lines.append("-- The corpus is grounded in the provided official, polling, think tank and international URLs.")
    lines.append("-- Dates remain broad when the brief does not establish a precise official deadline.")
    lines.append("")

    theme_rows: list[str] = []
    subtheme_rows: list[str] = []
    topic_rows: list[str] = []
    source_rows: list[str] = []
    tag_rows: list[str] = []
    territory_rows: list[str] = []
    prediction_rows: list[str] = []
    prompt_rows: list[str] = []

    theme_id = 1
    subtheme_id = 1
    topic_id = 1
    source_id = 1
    tag_id = 1
    territory_id = 1
    prediction_id = 1
    prompt_id = 1

    base_created = datetime(2026, 4, 3, 8, 0, 0)

    for theme_index, theme in enumerate(THEMES, start=1):
        theme_rows.append(
            f"({theme_id}, {sql(theme['slug'])}, {sql(theme['name'])}, {sql(theme['description'])}, {theme_index}, TRUE)"
        )
        for sub_index, (sub_slug, sub_name, issue, actor, owner, conflict, territory_keys, source_keys) in enumerate(theme["subthemes"], start=1):
            full_sub_slug = f"{theme['slug']}__{sub_slug}"
            subtheme_rows.append(
                f"({subtheme_id}, {theme_id}, {sql(full_sub_slug)}, {sql(sub_name)}, {sql(issue)}, {sub_index}, TRUE)"
            )
            for local_idx in range(theme["topics_per_subtheme"]):
                territory_key = territory_keys[local_idx % len(territory_keys)]
                territory = TERRITORIES[territory_key]
                title = title_variants(issue, actor, conflict, territory.anchor_phrase, theme["slug"], local_idx)
                summary = summary_text(issue, actor, owner, conflict, territory.anchor_phrase, [SOURCES[key][1] for key in source_keys])
                local_slug = slugify(f"{full_sub_slug}-{territory.territory_name}-{local_idx + 1}-{title}")
                status = ["active", "active", "active", "ongoing", "expected"][local_idx % 5]
                salience = 62 + ((theme_index * 5 + sub_index * 3 + local_idx * 4) % 34)
                concreteness = 68 + ((sub_index * 7 + local_idx * 5) % 29)
                controversy = 55 + ((theme_index * 9 + local_idx * 8) % 40)
                editorial_priority = 60 + ((theme_index * 8 + sub_index * 4 + local_idx * 6) % 36)
                starts_at = base_created + timedelta(days=(theme_index - 1) * 3 + sub_index, hours=local_idx * 4)
                ends_at = starts_at + timedelta(days=45 + ((theme_index + sub_index + local_idx) % 90))
                is_time_sensitive = local_idx % 2 == 0 or theme["slug"] in {"elections_and_campaigns", "institutions_and_power", "europe_and_world_events"}
                is_prediction_enabled = (local_idx == 0) or (theme["slug"] in {"elections_and_campaigns", "institutions_and_power"} and local_idx == 2)
                source_confidence = round(0.68 + ((theme_index + sub_index + local_idx) % 21) / 100, 2)
                topic_type = topic_type_for(theme["slug"], local_idx + sub_index)

                topic_rows.append(
                    "(" + ", ".join([
                        str(topic_id),
                        str(subtheme_id),
                        sql(local_slug),
                        sql(title),
                        sql(summary),
                        sql(topic_type),
                        sql(territory.scope),
                        sql(territory.territory_name),
                        sql(territory.country_code),
                        sql(territory.region_name),
                        sql(territory.city_name),
                        sql(status),
                        str(salience),
                        str(concreteness),
                        str(controversy),
                        str(editorial_priority),
                        sql(starts_at.strftime("%Y-%m-%d %H:%M:%S+00")),
                        sql(ends_at.strftime("%Y-%m-%d %H:%M:%S+00")),
                        sql(is_time_sensitive),
                        sql(is_prediction_enabled),
                        str(source_confidence),
                        sql(base_created.strftime("%Y-%m-%d %H:%M:%S+00")),
                    ]) + ")"
                )

                selected_sources = source_keys[: 3 if theme["slug"] in {"elections_and_campaigns", "institutions_and_power"} else 2]
                for order, source_key in enumerate(selected_sources):
                    source_type, source_name, source_title, source_url, publication_date, reliability = SOURCES[source_key]
                    source_rows.append(
                        "(" + ", ".join([
                            str(source_id),
                            str(topic_id),
                            sql(source_type),
                            sql(source_name),
                            sql(source_title),
                            sql(source_url),
                            sql(publication_date),
                            str(reliability),
                            sql(order == 0),
                        ]) + ")"
                    )
                    source_id += 1

                tags = [theme["slug"], sub_slug, territory.scope, slugify(issue)]
                if theme["slug"] in {"elections_and_campaigns", "institutions_and_power"}:
                    tags.append("presidentielle-2027" if "president" in issue or "elysee" in title.lower() else "senatoriales-2026")
                for tag in tags:
                    tag_rows.append(f"({tag_id}, {topic_id}, {sql(tag)})")
                    tag_id += 1

                territory_rows.append(
                    "(" + ", ".join([
                        str(territory_id),
                        str(topic_id),
                        sql(territory.level),
                        sql(territory.territory_name),
                        sql(territory.country_code),
                        sql(territory.region_name),
                        sql(territory.department_name),
                        sql(territory.city_name),
                        "TRUE",
                    ]) + ")"
                )
                territory_id += 1
                if territory.territory_name != "France":
                    territory_rows.append(f"({territory_id}, {topic_id}, 'country', 'France', 'FR', NULL, NULL, NULL, FALSE)")
                    territory_id += 1

                if is_prediction_enabled:
                    primary_source_url = SOURCES[selected_sources[0]][3]
                    question, criteria = make_prediction_question(issue, territory.anchor_phrase, local_idx + sub_index)
                    closes_at = min(ends_at - timedelta(days=4), starts_at + timedelta(days=60))
                    prediction_rows.append(
                        "(" + ", ".join([
                            str(prediction_id),
                            str(topic_id),
                            sql(question),
                            sql("prediction_market"),
                            sql(criteria),
                            sql(primary_source_url),
                            sql(closes_at.strftime("%Y-%m-%d %H:%M:%S+00")),
                        ]) + ")"
                    )
                    prediction_id += 1

                if local_idx < 2:
                    prompt, prompt_type, tone = make_prompt(issue, actor, conflict, territory.anchor_phrase, local_idx + sub_index)
                    prompt_rows.append(f"({prompt_id}, {topic_id}, {sql(prompt)}, {sql(prompt_type)}, {sql(tone)})")
                    prompt_id += 1

                topic_id += 1
            subtheme_id += 1
        theme_id += 1

    sections = [
        ("themes(id, slug, name, description, priority_rank, is_active)", theme_rows),
        ("subthemes(id, theme_id, slug, name, description, priority_rank, is_active)", subtheme_rows),
        ("topics(id, subtheme_id, slug, title, summary, topic_type, geographic_scope, territory_name, country_code, region_name, city_name, status, salience_score, concreteness_score, controversy_score, editorial_priority, starts_at, ends_at, is_time_sensitive, is_prediction_enabled, source_confidence, created_at)", topic_rows),
        ("topic_sources(id, topic_id, source_type, source_name, source_title, source_url, publication_date, reliability_score, is_primary)", source_rows),
        ("topic_tags(id, topic_id, tag)", tag_rows),
        ("topic_territories(id, topic_id, territory_level, territory_name, country_code, region_name, department_name, city_name, is_primary)", territory_rows),
        ("prediction_questions(id, topic_id, question, prediction_type, resolution_criteria, resolution_source_url, closes_at)", prediction_rows),
        ("discussion_prompts(id, topic_id, prompt, prompt_type, tone)", prompt_rows),
    ]
    for header, rows in sections:
        lines.append(f"INSERT INTO {header} VALUES")
        lines.append(",\n".join(rows) + ";")
        lines.append("")
    return "\n".join(lines)


def main() -> None:
    OUTPUT_PATH.write_text(build_sql(), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
