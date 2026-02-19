/**
 * Normalize an animal type string for grouping/comparison.
 * Removes accents, trims, lowercases, then capitalizes first letter.
 */
export function normalizeType(raw: string): string {
  const stripped = raw
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  if (!stripped) return raw.trim();
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

/**
 * Compare two type strings for equality after normalization.
 */
export function isSameType(a: string, b: string): boolean {
  return normalizeType(a) === normalizeType(b);
}
