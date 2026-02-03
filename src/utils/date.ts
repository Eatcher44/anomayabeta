/**
 * Formate une Date -> "JJ/MM/AAAA"
 */
export function formatFrDate(d: Date): string {
  if (!(d instanceof Date) || isNaN(+d)) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Parse "JJ/MM/AAAA" -> Date (valide) ou null
 */
export function parseFrDate(txt: string): Date | null {
  const m = (txt || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yyyy = parseInt(m[3], 10);
  const d = new Date(yyyy, mm - 1, dd);
  // Vérification stricte (évite 31/02/2024 -> 02/03/2024)
  return (d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd) ? d : null;
}

/**
 * Masque HH:MM pendant la saisie (ne garde que 4 chiffres, insère ':')
 */
export function maskHHMM(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/**
 * Valide un texte "HH:MM" sur 24h (00:00 à 23:59)
 */
export function isValidHHMM(txt: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test((txt || '').trim());
}

/**
 * Ajoute des mois à une date (sans muter l'originale).
 */
export function addMonths(d: Date, m: number): Date {
  const nd = new Date(d);
  nd.setMonth(nd.getMonth() + m);
  return nd;
}

/**
 * Ajoute des semaines à une date (sans muter l'originale).
 */
export function addWeeks(d: Date, w: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + 7 * w);
  return nd;
}

/**
 * Différence en jours entiers entre deux dates (a - b).
 */
export function diffDays(a: Date, b: Date): number {
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const B = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((+A - +B) / 86400000);
}

/**
 * Calcule l'âge en texte lisible
 */
export function getAgeText(birthDate: Date | string): string {
  const d = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (isNaN(+d)) return '';
  
  const t = new Date();
  let months = (t.getFullYear() - d.getFullYear()) * 12 + (t.getMonth() - d.getMonth());
  if (t.getDate() < d.getDate()) months--;
  
  if (months < 12) return `${months} mois`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return remainingMonths ? `${years} an${years > 1 ? 's' : ''} ${remainingMonths} mois` : `${years} an${years > 1 ? 's' : ''}`;
}
