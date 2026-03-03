import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, BarChart3, Cat, Dog, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useElevageData } from '@/hooks/useElevageData';
import ElevageDashboard from '@/components/elevage/ElevageDashboard';
import ElevageReproducteurs from '@/components/elevage/ElevageReproducteurs';
import ElevageGestations from '@/components/elevage/ElevageGestations';
import ElevagePortees from '@/components/elevage/ElevagePortees';
import { FUTURE_MODULES } from '@/config/breederFeatures';

const SPECIES_TABS = [
  { key: 'chat', label: 'Chats', icon: Cat, youngLabel: 'chatons' },
  { key: 'chien', label: 'Chiens', icon: Dog, youngLabel: 'chiots' },
] as const;

const STORAGE_KEY = 'elevage-species-tab';

export default function ElevagePage() {
  const navigate = useNavigate();
  const [species, setSpecies] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'chat'; } catch { return 'chat'; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, species); } catch {}
  }, [species]);

  const data = useElevageData(species);
  const otherSpecies = species === 'chat' ? 'chien' : 'chat';
  const otherData = useElevageData(otherSpecies);

  const currentTab = SPECIES_TABS.find(t => t.key === species) || SPECIES_TABS[0];

  if (data.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background" style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 24px)' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-primary">Élevage</h1>
          <Button variant="ghost" size="sm" onClick={() => navigate('/stats-elevage')} className="gap-1 text-muted-foreground">
            <BarChart3 className="w-4 h-4" />
            Stats
          </Button>
        </div>
      </div>

      {/* Species Tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 bg-muted/60 rounded-xl p-1">
          {SPECIES_TABS.map(tab => {
            const isActive = tab.key === species;
            const urgentCount = tab.key === species ? data.urgentCount : otherData.urgentCount;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setSpecies(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {urgentCount > 0 && (
                  <Badge variant="destructive" className="text-[9px] px-1.5 py-0 min-w-[18px] h-4 leading-none">
                    {urgentCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick access */}
      <div className="px-4 pb-1">
        <Button variant="outline" className="w-full justify-start gap-2 text-sm font-semibold" onClick={() => navigate('/departs-reservations')}>
          <CalendarCheck className="w-4 h-4 text-primary" />
          Départs & Réservations
        </Button>
      </div>

      <div className="px-4 space-y-6">
        {/* Dashboard */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Dashboard</h2>
          <ElevageDashboard
            females={data.females.length}
            males={data.males.length}
            activeGestations={data.activeGestations.length}
            activeLitters={data.activeLitters.length}
            availableKittens={data.availableKittens.length}
            soldPending={data.soldPendingKittens.length}
            alerts={data.alerts}
            youngLabel={currentTab.youngLabel}
          />
        </section>

        {/* Reproducteurs */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Reproducteurs</h2>
          <ElevageReproducteurs
            eligible={data.eligible}
            litters={data.litters}
            reproductions={data.reproductions}
          />
        </section>

        {/* Gestations */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Gestations & Saillies</h2>
          <ElevageGestations
            reproductions={data.reproductions}
            animaux={data.animaux}
            getGestationDays={data.getGestationDays}
          />
        </section>

        {/* Portées */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Portées</h2>
          <ElevagePortees
            activeLitters={data.activeLitters}
            archivedLitters={data.archivedLitters}
            getAnimalName={data.getAnimalName}
          />
        </section>

        {/* Future modules placeholder */}
        <section className="pb-4">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Modules avancés</h2>
          <div className="space-y-2">
            {FUTURE_MODULES.map(m => (
              <div
                key={m.key}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-3"
              >
                <Lock className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground/70">{m.label}</p>
                  <p className="text-[10px] text-muted-foreground/50">Bientôt disponible</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
