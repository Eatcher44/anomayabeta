/**
 * Inbreeding coefficient calculation (simplified)
 * Based on Wright's coefficient of inbreeding (F)
 */

import { Animal } from '@/types/animal';

/**
 * Calculates the inbreeding coefficient for a given animal.
 * This is a simplified version assuming we have access to the full pedigree.
 * F = sum((1/2)^(n+1) * (1 + Fa))
 * where n is the number of generations between parents and common ancestor.
 */
export function calculateInbreedingCoefficient(
  animal: Animal,
  allAnimals: Animal[]
): number {
  if (!animal.mother_id) return 0;

  const father = allAnimals.find((a) => a.id === getFatherId(animal, allAnimals));
  const mother = allAnimals.find((a) => a.id === animal.mother_id);

  if (!father || !mother) return 0;

  // Find common ancestors
  const fatherAncestors = getAncestors(father, allAnimals);
  const motherAncestors = getAncestors(mother, allAnimals);

  const commonAncestors = fatherAncestors.filter((fa) =>
    motherAncestors.some((ma) => ma.id === fa.id)
  );

  let coefficient = 0;

  for (const ancestor of commonAncestors) {
    const n1 = getGenerationDistance(father, ancestor, allAnimals);
    const n2 = getGenerationDistance(mother, ancestor, allAnimals);
    
    const fa = calculateInbreedingCoefficient(ancestor, allAnimals);
    coefficient += Math.pow(0.5, n1 + n2 + 1) * (1 + fa);
  }

  return Math.min(coefficient, 1);
}

function getFatherId(animal: Animal, allAnimals: Animal[]): string | null {
  // In a real app, you'd have a father_id field. 
  // Assuming it's stored in commercial_notes or a custom field if not explicit.
  return (animal as any).father_id || null;
}

function getAncestors(animal: Animal, allAnimals: Animal[]): Animal[] {
  const ancestors: Animal[] = [];
  const fatherId = getFatherId(animal, allAnimals);
  const motherId = animal.mother_id;

  if (fatherId) {
    const father = allAnimals.find((a) => a.id === fatherId);
    if (father) {
      ancestors.push(father);
      ancestors.push(...getAncestors(father, allAnimals));
    }
  }

  if (motherId) {
    const mother = allAnimals.find((a) => a.id === motherId);
    if (mother) {
      ancestors.push(mother);
      ancestors.push(...getAncestors(mother, allAnimals));
    }
  }

  return Array.from(new Set(ancestors));
}

function getGenerationDistance(
  animal: Animal,
  ancestor: Animal,
  allAnimals: Animal[],
  depth: number = 0
): number {
  if (animal.id === ancestor.id) return depth;

  const fatherId = getFatherId(animal, allAnimals);
  const motherId = animal.mother_id;

  let minDistance = Infinity;

  if (fatherId) {
    const father = allAnimals.find((a) => a.id === fatherId);
    if (father) {
      const d = getGenerationDistance(father, ancestor, allAnimals, depth + 1);
      if (d < minDistance) minDistance = d;
    }
  }

  if (motherId) {
    const mother = allAnimals.find((a) => a.id === motherId);
    if (mother) {
      const d = getGenerationDistance(mother, ancestor, allAnimals, depth + 1);
      if (d < minDistance) minDistance = d;
    }
  }

  return minDistance;
}
