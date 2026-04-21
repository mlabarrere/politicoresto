export function safeNextPath(
  next: string | null | undefined,
  fallback = '/',
): string {
  if (!next) return fallback;
  if (!next.startsWith('/')) return fallback;
  if (next.startsWith('//')) return fallback;
  if (next.includes('://')) return fallback;

  try {
    const url = new URL(next, 'http://localhost');
    if (url.origin !== 'http://localhost') return fallback;
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}
