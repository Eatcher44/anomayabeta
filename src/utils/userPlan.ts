/**
 * User plan logic — beta simulation only, no real payments.
 *
 * Plans:
 *   - 'free'    → Gratuit (ads later, no breeder)
 *   - 'no_ads'  → Sans pub (no ads later, no breeder)
 *   - 'breeder' → Pack Éleveur (no ads, breeder access)
 *
 * Stored in localStorage under SIM_PLAN_KEY for safe per-device beta testing.
 * Switching plan never deletes user data — it only changes feature access.
 */
import { useEffect, useState } from 'react';
import { isBeta, isDev } from '@/config/appVariant';

export type UserPlan = 'free' | 'no_ads' | 'breeder';

export const SIM_PLAN_KEY = 'anomaya_sim_plan';

function defaultPlan(): UserPlan {
  // During beta/dev we default to breeder so existing testers keep access.
  return isBeta || isDev ? 'breeder' : 'free';
}

export function getUserPlan(): UserPlan {
  if (typeof window === 'undefined') return defaultPlan();
  try {
    const v = localStorage.getItem(SIM_PLAN_KEY);
    if (v === 'free' || v === 'no_ads' || v === 'breeder') return v;
  } catch {
    // Ignore storage errors
  }
  return defaultPlan();
}

const listeners = new Set<() => void>();

export function setUserPlan(p: UserPlan) {
  try {
    localStorage.setItem(SIM_PLAN_KEY, p);
  } catch {
    // Ignore storage errors
  }
  listeners.forEach((l) => l());
}

export function useUserPlan(): UserPlan {
  const [plan, setPlan] = useState<UserPlan>(() => getUserPlan());
  useEffect(() => {
    const update = () => setPlan(getUserPlan());
    listeners.add(update);
    const onStorage = (e: StorageEvent) => {
      if (e.key === SIM_PLAN_KEY) update();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(update);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return plan;
}

export const canAccessBreederFeatures = (p: UserPlan) => p === 'breeder';
export const hasNoAdsAccess = (p: UserPlan) => p === 'no_ads' || p === 'breeder';
/** Placeholder — no ads currently rendered. */
export const shouldShowAds = (p: UserPlan) => p === 'free';

export function getPlanLabel(p: UserPlan): string {
  switch (p) {
    case 'free': return 'Gratuit';
    case 'no_ads': return 'Sans pub';
    case 'breeder': return 'Pack Éleveur';
  }
}
