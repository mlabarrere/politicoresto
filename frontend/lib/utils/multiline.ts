export function normalizeMultilineText(
  value: string | null | undefined,
): string {
  if (!value) {
    return '';
  }

  const normalizedLineEndings = value.replace(/\r\n?/g, '\n');

  if (
    !normalizedLineEndings.includes('\\n') &&
    !normalizedLineEndings.includes('\\r')
  ) {
    return normalizedLineEndings;
  }

  return normalizedLineEndings.replace(/\\r\\n|\\n|\\r/g, '\n');
}
