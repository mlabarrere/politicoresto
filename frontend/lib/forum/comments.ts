export function getIndentPx(
  depth: number,
  maxInlineDepth: number,
  compactMode: boolean,
) {
  const hardCap = compactMode ? Math.min(maxInlineDepth, 3) : maxInlineDepth;
  const level = Math.min(depth, hardCap);
  return level * (compactMode ? 10 : 14);
}
