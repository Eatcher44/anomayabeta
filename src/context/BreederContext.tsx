import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { isBeta, isDev } from '@/config/appVariant';
import { IS_BETA_MODE } from '@/utils/premium';

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
  // In dev mode or beta mode, breeder is ON by default
  const defaultBreeder = isDev || isBeta || IS_BETA_MODE;
  const [isBreeder, setIsBreeder] = useState<boolean>(defaultBreeder);
  const [isNoAds, setIsNoAds] = useState<boolean>(defaultBreeder);

  const isBetaAccess = isDev || isBeta || IS_BETA_MODE;

  const setBreeder = useCallback((val: boolean) => {
    setIsBreeder(val);
    if (val) {
      setIsNoAds(true);
    }
  }, []);

  const setNoAds = useCallback((val: boolean) => {
    setIsNoAds(val);
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
