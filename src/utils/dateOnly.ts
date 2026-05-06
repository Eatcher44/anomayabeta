/**
 * Helpers for date-only fields (no UTC shifting).
 * Use these for breeding/litter dates where we want the picked
 * day to remain the same after save and reload.
 */

/** Convert a Date (interpreted as local) to "YYYY-MM-DD". */
export function toDateOnlyString(d: Date): string {
  if (!(d instanceof Date) || isNaN(+d)) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parse a "YYYY-MM-DD" or any ISO-ish string in a way that does NOT
 * shift the day. For pure date-only strings we build a Date in local time
 * at noon to avoid DST/UTC edge cases.
 */
export function parseDateOnly(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const day = parseInt(m[3], 10);
    return new Date(y, mo, day, 12, 0, 0, 0);
  }
  const d = new Date(s);
  return isNaN(+d) ? null : d;
}

/** Format a date-only string "YYYY-MM-DD" as "JJ/MM/AAAA" without UTC drift. */
export function formatDateOnlyFr(s: string | null | undefined): string {
  const d = parseDateOnly(s);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
