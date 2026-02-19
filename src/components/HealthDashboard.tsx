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

  if (alerts.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm text-center">
        <p className="text-3xl mb-2">🐾</p>
        <p className="font-bold text-foreground">Tous vos animaux sont à jour 🐾</p>
        <p className="text-sm text-muted-foreground mt-1">Aucune alerte pour le moment</p>
      </div>
    );
  }

  const urgent = alerts.filter((a) => a.severity === 'urgent');
  const warnings = alerts.filter((a) => a.severity === 'warning');
  const infos = alerts.filter((a) => a.severity === 'info');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-foreground">Tableau de bord santé</h2>
        {urgent.length > 0 && (
          <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
            {urgent.length} urgent{urgent.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {urgent.map((a) => (
          <AlertCard key={a.id} alert={a} onClick={() => handleAlertClick(a)} />
        ))}
        {warnings.map((a) => (
          <AlertCard key={a.id} alert={a} onClick={() => handleAlertClick(a)} />
        ))}
        {infos.slice(0, 5).map((a) => (
          <AlertCard key={a.id} alert={a} onClick={() => handleAlertClick(a)} />
        ))}
        {infos.length > 5 && (
          <p className="text-xs text-muted-foreground text-center py-1">
            +{infos.length - 5} autre{infos.length - 5 > 1 ? 's' : ''} notification{infos.length - 5 > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
