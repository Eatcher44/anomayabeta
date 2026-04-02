/**
 * Simple inbreeding / consanguinity detection utility.
 */

import type { Animal } from '@/types/animal';

export type InbreedingRisk = 'none' | 'moderate' | 'high';

export interface InbreedingResult {
  risk: InbreedingRisk;
  title: string;
  subtitle: string;
  details: string[];
}

interface AncestorMap {
  motherId: string | null;
  fatherId: string | null;
}

function getParents(
  animalId: string,
  animals: Animal[],
  litters: { mother_id: string; father_id: string | null; id: string }[],
): AncestorMap {
  const animal = animals.find(a => a.id === animalId);
  if (!animal) return { motherId: null, fatherId: null };
  const motherId = animal.mother_id || null;
  let fatherId: string | null = null;
  if (animal.litter_id) {
    const litter = litters.find(l => l.id === animal.litter_id);
    if (litter?.father_id) fatherId = litter.father_id;
  }
  return { motherId, fatherId };
}

function getGrandparents(
  animalId: string,
  animals: Animal[],
  litters: { mother_id: string; father_id: string | null; id: string }[],
): string[] {
  const parents = getParents(animalId, animals, litters);
  const gps: string[] = [];
  for (const pid of [parents.motherId, parents.fatherId]) {
    if (!pid) continue;
    const pp = getParents(pid, animals, litters);
    if (pp.motherId) gps.push(pp.motherId);
    if (pp.fatherId) gps.push(pp.fatherId);
  }
  return gps;
}

export function checkInbreeding(
  animalAId: string,
  animalBId: string,
  animals: Animal[],
  litters: { mother_id: string; father_id: string | null; id: string }[],
): InbreedingResult {
  if (!animalAId || !animalBId || animalAId === animalBId) {
    return { risk: 'none', title: '', subtitle: '', details: [] };
  }

  const details: string[] = [];
  let risk: InbreedingRisk = 'none';

  const parentsA = getParents(animalAId, animals, litters);
  const parentsB = getParents(animalBId, animals, litters);
  const nameOf = (id: string) => animals.find(a => a.id === id)?.nom || 'Inconnu';

  if (parentsA.motherId === animalBId || parentsA.fatherId === animalBId) {
    details.push(`${nameOf(animalBId)} est un parent direct de ${nameOf(animalAId)}.`);
    risk = 'high';
  }
  if (parentsB.motherId === animalAId || parentsB.fatherId === animalAId) {
    details.push(`${nameOf(animalAId)} est un parent direct de ${nameOf(animalBId)}.`);
    risk = 'high';
  }
  if (parentsA.motherId && parentsA.motherId === parentsB.motherId) {
    details.push('Les deux animaux partagent la même mère.');
    risk = risk === 'none' ? 'high' : risk;
  }
  if (parentsA.fatherId && parentsA.fatherId === parentsB.fatherId) {
    details.push('Les deux animaux partagent le même père.');
    risk = risk === 'none' ? 'high' : risk;
  }
  if (risk === 'none') {
    if (parentsA.motherId && parentsA.motherId === parentsB.fatherId) {
      details.push('Un parent en commun a été détecté (demi-fratrie).');
      risk = 'high';
    }
    if (parentsA.fatherId && parentsA.fatherId === parentsB.motherId) {
      details.push('Un parent en commun a été détecté (demi-fratrie).');
      risk = 'high';
    }
  }
  if (risk === 'none') {
    const gpsA = getGrandparents(animalAId, animals, litters);
    const gpsB = getGrandparents(animalBId, animals, litters);
    if (gpsA.includes(animalBId) || gpsB.includes(animalAId)) {
      details.push('Un lien grand-parent a été détecté.');
      risk = 'high';
    }
    if (risk === 'none') {
      const sharedGps = gpsA.filter(gp => gpsB.includes(gp));
      if (sharedGps.length > 0) {
        details.push('Un ancêtre commun a été trouvé dans les grands-parents.');
        risk = 'moderate';
      }
    }
  }

  if (risk === 'none') {
    return { risk: 'none', title: 'Aucune parenté proche détectée', subtitle: 'Aucun lien familial proche trouvé dans la généalogie enregistrée.', details: [] };
  }
  if (risk === 'high') {
    return { risk: 'high', title: 'Risque élevé de consanguinité', subtitle: 'Un lien familial proche a été détecté.', details };
  }
  return { risk: 'moderate', title: 'Parenté connue détectée', subtitle: 'Un ancêtre commun a été trouvé. Vérifiez la généalogie.', details };
}
