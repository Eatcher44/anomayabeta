import React from 'react';
import { BOTTOM_NAV_HEIGHT } from '@/components/BreederBottomNav';

/**
 * Wrapper for all screens that display inside the bottom navigation.
 * Applies consistent bottom padding so content is never hidden behind the nav bar.
 */
export default function AppLayout({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`min-h-screen ${className}`}
      style={{
        paddingBottom: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      {children}
    </div>
  );
}
