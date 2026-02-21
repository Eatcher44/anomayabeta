import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnimals } from '@/context/AnimalsContext';
import { getAllAlerts, getAnimalHealthStatus, type HealthAlert } from '@/utils/insights';
import { formatWeight } from '@/components/AnimalRow';
import type { Animal } from '@/types/animal';

function lastPoidsKg(animal: Animal): number | null {
  if (!Array.isArray(animal?.poids) || animal.poids.length === 0) return null;
  const sorted = [...animal.poids].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return typeof sorted[0]?.poids === 'number' ? sorted[0].poids : null;
}

type AnimalHealthStatus = 'green' | 'orange' | 'red';

const statusColors: Record<AnimalHealthStatus, string> = {
  green: 'bg-[hsl(var(--status-green))]',
  orange: 'bg-[hsl(var(--status-orange))]',
  red: 'bg-[hsl(var(--status-red))]',
};

const statusBorder: Record<AnimalHealthStatus, string> = {
  green: 'border-[hsl(var(--status-green))]/30',
  orange: 'border-[hsl(var(--status-orange))]/30',
  red: 'border-destructive/30',
};

const statusBg: Record<AnimalHealthStatus, string> = {
  green: 'bg-[hsl(var(--status-green))]/5',
  orange: 'bg-[hsl(var(--status-orange))]/5',
  red: 'bg-destructive/5',
};

const statusLabel: Record<AnimalHealthStatus, string> = {
  green: '✓ À jour',
  orange: '⚠ À prévoir',
  red: '✗ À faire',
};

const statusLabelColor: Record<AnimalHealthStatus, string> = {
  green: 'text-[hsl(var(--status-green))]',
  orange: 'text-[hsl(var(--status-orange))]',
  red: 'text-destructive',
};

export default function HealthDashboardPage() {
  const navigate = useNavigate();
  const { animaux, rendezvous } = useAnimals();

  const sortedAnimals = useMemo(
    () => [...animaux].sort((a, b) => (a.nom || '').localeCompare(b.nom || '')),
    [animaux]
  );

  const statusByAnimal = useMemo(() => {
    const map: Record<string, AnimalHealthStatus> = {};
    for (const animal of animaux) {
      map[animal.id] = getAnimalHealthStatus(animal, rendezvous);
    }
    return map;
  }, [animaux, rendezvous]);

  const alertsByAnimal = useMemo(() => {
    const map: Record<string, HealthAlert[]> = {};
    for (const animal of animaux) {
      const animalAlerts = getAllAlerts([animal], rendezvous.filter((r) => r.animalIds?.includes(animal.id)));
      map[animal.id] = animalAlerts;
    }
    return map;
  }, [animaux, rendezvous]);

  const handleAlertClick = (alert: HealthAlert) => {
    if (!alert.animalId) return;
    switch (alert.type) {
      case 'vaccine': navigate(`/vaccins/${alert.animalId}`); break;
      case 'treatment': navigate(`/vermifuge/${alert.animalId}`); break;
      case 'weight':
      case 'insight': navigate(`/poids/${alert.animalId}`); break;
      case 'checkup':
      case 'appointment': navigate(`/consultation/${alert.animalId}`); break;
      default: navigate(`/profil/${alert.animalId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background">
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-lg">Tableau de bord santé</h1>
      </div>

      <div className="p-4 space-y-3">
        {sortedAnimals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun animal enregistré.</p>
          </div>
        ) : (
          sortedAnimals.map((animal) => {
            const status = statusByAnimal[animal.id] || 'green';
            const alerts = alertsByAnimal[animal.id] || [];
            const urgentAlerts = alerts.filter((a) => a.severity === 'urgent');
            const warningAlerts = alerts.filter((a) => a.severity === 'warning');
            const poids = lastPoidsKg(animal);

            return (
              <div
                key={animal.id}
                className={`rounded-xl border p-4 ${statusBorder[status]} ${statusBg[status]} bg-card`}
              >
                {/* Animal header */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {animal.photo ? (
                      <img src={animal.photo} alt={animal.nom} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg">🐾</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-foreground">{animal.nom}</p>
                      <div className={`w-2.5 h-2.5 rounded-full ${statusColors[status]}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatWeight(poids)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${statusLabelColor[status]}`}>
                      {statusLabel[status]}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/profil/${animal.id}`)} className="text-primary">
                      Voir
                    </Button>
                  </div>
                </div>

                {/* Urgent alerts first */}
                {urgentAlerts.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {urgentAlerts.map((alert) => (
                      <button
                        key={alert.id}
                        onClick={() => handleAlertClick(alert)}
                        className="w-full text-left rounded-lg p-2 border border-destructive/20 bg-destructive/5 text-sm active:opacity-80"
                      >
                        <span className="mr-1.5">{alert.icon}</span>
                        <span className="font-semibold">{alert.title}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Warning alerts */}
                {warningAlerts.length > 0 && (
                  <div className="space-y-1.5">
                    {warningAlerts.map((alert) => (
                      <button
                        key={alert.id}
                        onClick={() => handleAlertClick(alert)}
                        className="w-full text-left rounded-lg p-2 border border-[hsl(var(--status-orange))]/20 bg-[hsl(var(--status-orange))]/5 text-sm active:opacity-80"
                      >
                        <span className="mr-1.5">{alert.icon}</span>
                        <span className="font-semibold">{alert.title}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                      </button>
                    ))}
                  </div>
                )}

                {status === 'green' && (
                  <p className="text-sm text-[hsl(var(--status-green))] font-medium">✓ Tout est à jour</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
