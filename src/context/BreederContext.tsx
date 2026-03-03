import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { isBeta } from '@/config/appVariant';

interface BreederContextType {
  isBreeder: boolean;
  isNoAds: boolean;
  setBreeder: (val: boolean) => void;
  setNoAds: (val: boolean) => void;
}

const BreederContext = createContext<BreederContextType | null>(null);

export function BreederProvider({ children }: { children: React.ReactNode }) {
  // In beta mode, all breeder features are unlocked by default.
  const [isBreeder, setIsBreeder] = useState(isBeta);
  const [isNoAds, setIsNoAds] = useState(isBeta);

  const setBreeder = useCallback((val: boolean) => {
    setIsBreeder(val);
    if (val) {
      setIsNoAds(true); // Breeder includes no-ads
    }
  }, []);

  const setNoAds = useCallback((val: boolean) => {
    setIsNoAds(val);
  }, []);

  const value = useMemo(() => ({
    isBreeder,
    isNoAds,
    setBreeder,
    setNoAds,
  }), [isBreeder, isNoAds, setBreeder, setNoAds]);

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
