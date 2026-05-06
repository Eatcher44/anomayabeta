import { parseDateOnly } from './dateOnly';

/**
 * Compute the precise age (in elapsed milliseconds) of a litter
 * from its birth date and optional birth time (HH:MM, local).
 */
export function getLitterAgeMs(birthDate?: string | null, birthTime?: string | null, now: Date = new Date()): number {
  const d = parseDateOnly(birthDate);
  if (!d) return 0;
  if (birthTime && /^\d{2}:\d{2}$/.test(birthTime)) {
    const [h, m] = birthTime.split(':').map((x) => parseInt(x, 10));
    d.setHours(h, m, 0, 0);
  } else {
    // Default to start of day if no time provided
    d.setHours(0, 0, 0, 0);
  }
  return Math.max(0, now.getTime() - d.getTime());
}

/**
 * Format an elapsed-ms duration into the litter age label rules:
 * - <7d : "X jour(s)"
 * - 7d..<30d : "X semaine(s)" + " et Y jour(s)"
 * - >=30d : "X mois" + " et Y jour(s)" (using 30-day months)
 */
export function formatLitterAge(ms: number): string {
  const totalDays = Math.floor(ms / 86400000);
  if (totalDays <= 0) {
    // Less than a full day elapsed
    return '0 jour';
  }
  if (totalDays < 7) {
    return `${totalDays} jour${totalDays > 1 ? 's' : ''}`;
  }
  if (totalDays < 30) {
    const weeks = Math.floor(totalDays / 7);
    const rest = totalDays - weeks * 7;
    const wPart = `${weeks} semaine${weeks > 1 ? 's' : ''}`;
    if (rest === 0) return wPart;
    return `${wPart} et ${rest} jour${rest > 1 ? 's' : ''}`;
  }
  const months = Math.floor(totalDays / 30);
  const rest = totalDays - months * 30;
  const mPart = `${months} mois`;
  if (rest === 0) return mPart;
  return `${mPart} et ${rest} jour${rest > 1 ? 's' : ''}`;
}

export function getLitterAgeText(birthDate?: string | null, birthTime?: string | null): string {
  return formatLitterAge(getLitterAgeMs(birthDate, birthTime));
}
