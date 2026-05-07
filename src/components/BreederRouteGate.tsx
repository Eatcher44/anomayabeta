import React from 'react';
import { useBreeder } from '@/context/BreederContext';
import BreederGate from './BreederGate';

/** Wraps a route to show the Pack Éleveur gate when access is not granted. */
export default function BreederRouteGate({ children }: { children: React.ReactNode }) {
  const { isBreeder } = useBreeder();
  if (!isBreeder) return <BreederGate />;
  return <>{children}</>;
}
