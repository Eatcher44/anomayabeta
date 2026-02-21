import { normalizeType } from './normalize';

/** Breeder features are only available for cats and dogs */
export function isBreederEligible(type: string): boolean {
  const t = normalizeType(type).toLowerCase();
  return t === 'chat' || t === 'chien';
}
