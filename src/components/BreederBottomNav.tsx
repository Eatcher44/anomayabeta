import React, { useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PawPrint, Stethoscope, Lock } from 'lucide-react';
import { useBreeder } from '@/context/BreederContext';
import { toast } from '@/hooks/use-toast';

/** Fixed height of the bottom nav (excluding safe-area). Use for offset calculations. */
export const BOTTOM_NAV_HEIGHT = 64;

export default function BreederBottomNav() {
  const { isBreeder } = useBreeder();
  const navigate = useNavigate();
  const location = useLocation();
  const gateRef = useRef(false);

  // Hide on full-screen / paywall routes
  const HIDDEN_ROUTES = ['/abonnement', '/reset-password', '/feedback'];
  if (HIDDEN_ROUTES.some(r => location.pathname.startsWith(r))) return null;

  const handleElevageClick = () => {
    if (isBreeder) {
      navigate('/elevage');
    } else {
      if (gateRef.current) return;
      gateRef.current = true;
      toast({ title: '🔒 Fonction Pack Éleveur', description: 'Accédez à toutes les fonctionnalités éleveur' });
      setTimeout(() => {
        navigate('/abonnement?plan=breeder');
        gateRef.current = false;
      }, 1500);
    }
  };

  const isElevageLocked = !isBreeder;

  const tabs = [
    { path: '/', label: 'Ma famille', icon: PawPrint, onClick: () => navigate('/') },
    { path: '/elevage', label: 'Élevage', icon: Stethoscope, onClick: handleElevageClick, locked: isElevageLocked },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div
        className="flex items-center justify-around max-w-lg mx-auto relative"
        style={{ height: `${BOTTOM_NAV_HEIGHT}px` }}
      >
        {tabs.map(tab => {
          const active = tab.path === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={tab.onClick}
              className={`relative flex flex-col items-center gap-0.5 py-2 px-6 transition-colors ${
                active && !tab.locked ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {active && !tab.locked && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
              )}
              <div className="relative">
                <tab.icon className="w-5 h-5" />
                {tab.locked && (
                  <Lock className="absolute -top-1 -right-2.5 w-3 h-3 text-primary" />
                )}
              </div>
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
