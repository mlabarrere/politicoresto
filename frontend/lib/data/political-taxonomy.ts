type RowLike = Record<string, unknown>;

export interface PoliticalBloc {
  slug: string;
  label: string;
  description: string;
  aliases: string[];
}

export const politicalBlocs: PoliticalBloc[] = [
  {
    slug: 'gauche-radicale',
    label: 'Gauche radicale a gauche',
    description: 'LFI, PCF et assimiles.',
    aliases: ['lfi', 'lfi-nfp', 'pcf', 'gdr', 'ges', 'rev', 'peps'],
  },
  {
    slug: 'gauche-centre-gauche',
    label: 'Gauche a centre gauche',
    description: 'PS, EELV, PRG, DVG et assimilés.',
    aliases: ['ps', 'eelv', 'prg', 'dvg', 'soc', 'ecoS', 'ecos'],
  },
  {
    slug: 'centre-gauche-centre-droit',
    label: 'Centre gauche a centre droit',
    description: 'RE, MoDem, PRV, DVC, Horizons.',
    aliases: ['re', 'modem', 'prv', 'dvc', 'hor', 'epr', 'dem'],
  },
  {
    slug: 'centre-droit-droite',
    label: 'Centre droit a droite',
    description: 'LR, UDI, DVD.',
    aliases: ['lr', 'udi', 'dvd', 'dr', 'udr'],
  },
  {
    slug: 'droite-extreme-droite',
    label: 'Droite a extreme droite',
    description: 'RN, REC, DLF, UDR et assimiles.',
    aliases: ['rn', 'rec', 'dlf', 'udr', 'laf', 'idl'],
  },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function rowTokens(row: RowLike) {
  return [
    row.bloc_slug,
    row.space_role,
    row.entity_slug,
    row.primary_taxonomy_slug,
    row.primary_taxonomy_label,
    row.space_slug,
    row.feed_reason_code,
  ]
    .flatMap((value) => (typeof value === 'string' ? [normalize(value)] : []))
    .filter(Boolean);
}

export function getPoliticalBloc(slug: string | null) {
  if (!slug) {
    return null;
  }

  const normalized = normalize(slug);

  return (
    politicalBlocs.find((bloc) => normalize(bloc.slug) === normalized) ??
    politicalBlocs.find((bloc) =>
      bloc.aliases.some((alias) => normalize(alias) === normalized),
    ) ??
    null
  );
}

export function matchesPoliticalBloc(row: RowLike, blocSlug: string | null) {
  if (!blocSlug) {
    return true;
  }

  const bloc = getPoliticalBloc(blocSlug);
  if (!bloc) {
    return true;
  }

  const tokens = new Set(rowTokens(row));

  if (tokens.has(normalize(bloc.slug))) {
    return true;
  }

  return bloc.aliases.some((alias) => tokens.has(normalize(alias)));
}
