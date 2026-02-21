import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useElevageData } from '@/hooks/useElevageData';
import ElevageDashboard from '@/components/elevage/ElevageDashboard';
import ElevageReproducteurs from '@/components/elevage/ElevageReproducteurs';
import ElevageGestations from '@/components/elevage/ElevageGestations';
import ElevagePortees from '@/components/elevage/ElevagePortees';

export default function ElevagePage() {
  const navigate = useNavigate();
  const data = useElevageData();

  if (data.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-primary">Élevage</h1>
          <Button variant="ghost" size="sm" onClick={() => navigate('/stats-elevage')} className="gap-1 text-muted-foreground">
            <BarChart3 className="w-4 h-4" />
            Stats
          </Button>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Section 1: Dashboard */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Dashboard élevage</h2>
          <ElevageDashboard
            females={data.females.length}
            males={data.males.length}
            activeGestations={data.activeGestations.length}
            activeLitters={data.activeLitters.length}
            availableKittens={data.availableKittens.length}
            soldPending={data.soldPendingKittens.length}
            alerts={data.alerts}
            stats={data.globalStats}
          />
        </section>

        {/* Section 2: Reproducteurs */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Reproducteurs</h2>
          <ElevageReproducteurs
            eligible={data.eligible}
            litters={data.litters}
            reproductions={data.reproductions}
            animaux={data.animaux}
          />
        </section>

        {/* Section 3: Gestations */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Gestations & Saillies</h2>
          <ElevageGestations
            reproductions={data.reproductions}
            animaux={data.animaux}
            getGestationDays={data.getGestationDays}
          />
        </section>

        {/* Section 4: Portées */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Portées</h2>
          <ElevagePortees
            activeLitters={data.activeLitters}
            archivedLitters={data.archivedLitters}
            getAnimalName={data.getAnimalName}
          />
        </section>
      </div>
    </div>
  );
}
