import { normalizeType } from './normalize';

/** Breeder features are only available for cats and dogs */
export function isBreederEligible(type: string): boolean {
  const t = normalizeType(type).toLowerCase();
  return t === 'chat' || t === 'chien';
}

/** True if the animal is currently an active breeder (not sterilised, not paradis, breeder visible) */
export function isActiveBreeder(a: { sterilise?: boolean | null; paradis?: boolean | null; breeder_visible?: boolean | null; type: string }): boolean {
  if (!isBreederEligible(a.type)) return false;
  if (a.paradis) return false;
  if (a.sterilise) return false;
  if (a.breeder_visible === false) return false;
  return true;
}
