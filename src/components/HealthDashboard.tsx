import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllAlerts, type HealthAlert } from '@/utils/insights';
import type { Animal, RendezVous } from '@/types/animal';

interface HealthDashboardProps {
  animals: Animal[];
  rendezvous: RendezVous[];
}

function AlertCard({ alert, onClick }: { alert: HealthAlert; onClick: () => void }) {
  const severityClasses = {
    urgent: 'border-destructive/40 bg-destructive/5',
    warning: 'border-[hsl(var(--status-orange))]/40 bg-[hsl(var(--status-orange))]/5',
    info: 'border-primary/20 bg-accent/50',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl p-3 border ${severityClasses[alert.severity]} transition-colors active:opacity-80`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{alert.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground">{alert.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
        </div>
        {alert.severity === 'urgent' && (
          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-destructive mt-1.5" />
        )}
        {alert.severity === 'warning' && (
          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[hsl(var(--status-orange))] mt-1.5" />
        )}
      </div>
    </button>
  );
}

export default function HealthDashboard({ animals, rendezvous }: HealthDashboardProps) {
  const navigate = useNavigate();

  const alerts = useMemo(() => getAllAlerts(animals, rendezvous), [animals, rendezvous]);

  // Only show urgent + warning alerts in the compact home dashboard (no weight change, no "no consultation")
  const filteredAlerts = useMemo(() => 
    alerts.filter((a) => a.severity === 'urgent' || a.severity === 'warning'),
    [alerts]
  );

  const handleAlertClick = (alert: HealthAlert) => {
    if (!alert.animalId) return;
    switch (alert.type) {
      case 'vaccine':
        navigate(`/vaccins/${alert.animalId}`);
        break;
      case 'treatment':
        navigate(`/vermifuge/${alert.animalId}`);
        break;
      case 'weight':
      case 'insight':
        navigate(`/poids/${alert.animalId}`);
        break;
      case 'checkup':
      case 'appointment':
        navigate(`/consultation/${alert.animalId}`);
        break;
      default:
        navigate(`/profil/${alert.animalId}`);
    }
  };

  if (filteredAlerts.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-4 border border-border shadow-sm text-center">
        <p className="text-2xl mb-1">🐾</p>
        <p className="font-bold text-foreground text-sm">Tous vos animaux sont à jour 🐾</p>
      </div>
    );
  }

  const urgent = filteredAlerts.filter((a) => a.severity === 'urgent');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-sm text-foreground">Alertes santé</h2>
        {urgent.length > 0 && (
          <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
            {urgent.length} urgent{urgent.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {filteredAlerts.slice(0, 3).map((a) => (
          <AlertCard key={a.id} alert={a} onClick={() => handleAlertClick(a)} />
        ))}
        {filteredAlerts.length > 3 && (
          <p className="text-xs text-muted-foreground text-center py-1">
            +{filteredAlerts.length - 3} autre{filteredAlerts.length - 3 > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
