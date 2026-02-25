import React from 'react';
import { BOTTOM_NAV_HEIGHT } from '@/components/BreederBottomNav';
import { isBeta } from '@/config/appVariant';

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
      {isBeta && (
        <div className="bg-primary text-primary-foreground text-center text-xs font-semibold py-1.5 sticky top-0 z-50">
          Version Bêta privée
        </div>
      )}
      {children}
    </div>
  );
}
