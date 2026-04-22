export function formatDate(value?: string | null) {
  if (!value) {
    return 'Non renseigné';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  if (diffMs >= 0 && diffMs < sevenDaysMs) {
    const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
    const minutes = Math.round(diffMs / (60 * 1000));
    if (minutes < 60) return rtf.format(-minutes, 'minute');

    const hours = Math.round(diffMs / (60 * 60 * 1000));
    if (hours < 24) return rtf.format(-hours, 'hour');

    const days = Math.round(diffMs / (24 * 60 * 60 * 1000));
    return rtf.format(-days, 'day');
  }

  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
}

export function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0';
  }

  return new Intl.NumberFormat('fr-FR').format(value);
}
