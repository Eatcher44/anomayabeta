import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { isBeta, isDev } from '@/config/appVariant';
import { IS_BETA_MODE } from '@/utils/premium';
import { useUserPlan, setUserPlan, canAccessBreederFeatures, hasNoAdsAccess } from '@/utils/userPlan';

interface BreederContextType {
  isBreeder: boolean;
  isNoAds: boolean;
  /** True if breeder access is granted via beta or dev override (not subscription) */
  isBetaAccess: boolean;
  setBreeder: (val: boolean) => void;
  setNoAds: (val: boolean) => void;
}

const BreederContext = createContext<BreederContextType | null>(null);

export function BreederProvider({ children }: { children: React.ReactNode }) {
  const plan = useUserPlan();

  const isBreeder = canAccessBreederFeatures(plan);
  const isNoAds = hasNoAdsAccess(plan);
  const isBetaAccess = isDev || isBeta || IS_BETA_MODE;

  // Backward-compat setters: map to simulated plan, never deletes data.
  const setBreeder = useCallback((val: boolean) => {
    setUserPlan(val ? 'breeder' : 'free');
  }, []);

  const setNoAds = useCallback((val: boolean) => {
    setUserPlan(val ? 'no_ads' : 'free');
  }, []);

  const value = useMemo(() => ({
    isBreeder,
    isNoAds,
    isBetaAccess,
    setBreeder,
    setNoAds,
  }), [isBreeder, isNoAds, isBetaAccess, setBreeder, setNoAds]);

  return (
    <BreederContext.Provider value={value}>
      {children}
    </BreederContext.Provider>
  );
}

export function useBreeder() {
  const context = useContext(BreederContext);
  if (!context) throw new Error('useBreeder must be used within BreederProvider');
  return context;
}
