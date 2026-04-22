const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

const RESERVED_USERNAMES = new Set([
  'admin',
  'api',
  'auth',
  'login',
  'logout',
  'me',
  'new',
  'post',
  'polls',
  'settings',
  'support',
]);

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string): string | null {
  const normalized = normalizeUsername(value);
  if (!USERNAME_PATTERN.test(normalized)) {
    return '3 a 24 caracteres, minuscules, chiffres et underscore uniquement.';
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return 'Ce username est reserve.';
  }
  return null;
}
