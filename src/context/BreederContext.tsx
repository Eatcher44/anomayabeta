import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

interface BreederContextType {
  isBreeder: boolean;
  isNoAds: boolean;
  setBreeder: (val: boolean) => void;
  setNoAds: (val: boolean) => void;
}

const BreederContext = createContext<BreederContextType | null>(null);

export function BreederProvider({ children }: { children: React.ReactNode }) {
  // For now these are local flags. Will be connected to subscription system later.
  const [isBreeder, setIsBreeder] = useState(false);
  const [isNoAds, setIsNoAds] = useState(false);

  const setBreeder = useCallback((val: boolean) => {
    setIsBreeder(val);
    if (val) setIsNoAds(true); // Breeder includes no-ads
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
