/**
 * Animal age calculation utilities.
 */

export interface AnimalAge {
  known: boolean;
  weeks: number;
  months: number;
  days: number;
  label: string;
}

/**
 * Compute age from a birth date string (ISO).
 * Returns { known: false } if birth date is missing/invalid.
 */
export function getAnimalAge(birthDate: string | null | undefined, referenceDate?: Date): AnimalAge {
  const ref = referenceDate || new Date();

  if (!birthDate) {
    return { known: false, weeks: 0, months: 0, days: 0, label: 'Âge inconnu' };
  }

  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) {
    return { known: false, weeks: 0, months: 0, days: 0, label: 'Âge inconnu' };
  }

  const diffMs = ref.getTime() - birth.getTime();
  if (diffMs < 0) {
    return { known: true, weeks: 0, months: 0, days: 0, label: '< 1 jour' };
  }

  const totalDays = Math.floor(diffMs / 86400000);
  const weeks = Math.floor(totalDays / 7);
  
  // Month calculation
  let months = (ref.getFullYear() - birth.getFullYear()) * 12 + (ref.getMonth() - birth.getMonth());
  if (ref.getDate() < birth.getDate()) months -= 1;
  if (months < 0) months = 0;

  let label: string;
  if (totalDays < 7) {
    label = `${totalDays} jour${totalDays > 1 ? 's' : ''}`;
  } else if (weeks < 16) {
    label = `${weeks} semaine${weeks > 1 ? 's' : ''}`;
  } else if (months < 24) {
    label = `${months} mois`;
  } else {
    const years = Math.floor(months / 12);
    label = `${years} an${years > 1 ? 's' : ''}`;
  }

  return { known: true, weeks, months, days: totalDays, label };
}

/**
 * Check if animal is too young for a treatment.
 * Returns null if age is unknown (don't block).
 */
export function isTooYoung(birthDate: string | null | undefined, minAgeWeeks: number | null): boolean | null {
  if (minAgeWeeks === null || minAgeWeeks === undefined) return false;
  const age = getAnimalAge(birthDate);
  if (!age.known) return null; // unknown → don't block
  return age.weeks < minAgeWeeks;
}

/**
 * Weeks until the animal reaches a given age.
 */
export function weeksUntilAge(birthDate: string | null | undefined, targetWeeks: number): number | null {
  const age = getAnimalAge(birthDate);
  if (!age.known) return null;
  return Math.max(0, targetWeeks - age.weeks);
}

/**
 * Days until the animal reaches a given age in weeks.
 */
export function daysUntilAge(birthDate: string | null | undefined, targetWeeks: number): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const targetDate = new Date(birth.getTime() + targetWeeks * 7 * 86400000);
  const diffMs = targetDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / 86400000));
}
