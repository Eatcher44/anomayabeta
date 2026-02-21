import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Stethoscope } from 'lucide-react';
import { useBreeder } from '@/context/BreederContext';

/** Fixed height of the bottom nav (excluding safe-area). Use for offset calculations. */
export const BOTTOM_NAV_HEIGHT = 64;

export default function BreederBottomNav() {
  const { isBreeder } = useBreeder();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isBreeder) return null;

  const tabs = [
    { path: '/', label: 'Accueil', icon: Home },
    { path: '/elevage', label: 'Élevage', icon: Stethoscope },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div
        className="flex items-center justify-around max-w-lg mx-auto"
        style={{ height: `${BOTTOM_NAV_HEIGHT}px` }}
      >
        {tabs.map(tab => {
          const active = tab.path === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 py-2 px-6 transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
