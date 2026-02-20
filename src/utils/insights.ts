import type { Animal, SoinEntry } from '@/types/animal';
import { addMonths, diffDays } from '@/utils/date';

export interface HealthAlert {
  id: string;
  animalId: string;
  animalName: string;
  type: 'vaccine' | 'treatment' | 'weight' | 'appointment' | 'birthday' | 'checkup' | 'insight';
  severity: 'info' | 'warning' | 'urgent';
  title: string;
  description: string;
  icon: string;
}

function getVaccineAlerts(animal: Animal, today: Date): HealthAlert[] {
  const alerts: HealthAlert[] = [];
  const soins = animal.soins || [];
  const vaccines = soins.filter((s) => s.type === 'Vaccin');

  for (const v of vaccines) {
    if (!v.prochain) continue;
    const next = new Date(v.prochain);
    const days = diffDays(next, today);
    if (days < 0) {
      alerts.push({
        id: `vac-${animal.id}-${v.id}`,
        animalId: animal.id,
        animalName: animal.nom,
        type: 'vaccine',
        severity: 'urgent',
        title: `Vaccin en retard : ${v.nom}`,
        description: `${animal.nom} - rappel dépassé depuis ${Math.abs(days)} jours`,
        icon: '💉',
      });
    } else if (days <= 30) {
      alerts.push({
        id: `vac-${animal.id}-${v.id}`,
        animalId: animal.id,
        animalName: animal.nom,
        type: 'vaccine',
        severity: days <= 7 ? 'warning' : 'info',
        title: `Vaccin bientôt : ${v.nom}`,
        description: `${animal.nom} - rappel dans ${days} jours`,
        icon: '💉',
      });
    }
  }
  return alerts;
}

function getTreatmentAlerts(animal: Animal, today: Date): HealthAlert[] {
  const alerts: HealthAlert[] = [];
  const soins = animal.soins || [];
  const treatments = soins.filter((s) => s.type === 'Traitement');

  for (const t of treatments) {
    if (!t.debut || !t.fin) continue;
    const start = new Date(t.debut);
    const end = new Date(t.fin);
    if (start <= today && today <= end) {
      const daysLeft = diffDays(end, today);
      alerts.push({
        id: `trt-${animal.id}-${t.id}`,
        animalId: animal.id,
        animalName: animal.nom,
        type: 'treatment',
        severity: daysLeft <= 3 ? 'warning' : 'info',
        title: `Traitement en cours : ${t.nom}`,
        description: `${animal.nom} - ${daysLeft} jours restants`,
        icon: '💊',
      });
    }
  }

  // Anti-puce & Vermifuge alerts
  for (const type of ['Antipuce', 'Vermifuge'] as const) {
    const entries = soins.filter((s) => s.type === type).sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());
    if (entries.length > 0) {
      const last = new Date(entries[0].date!);
      const next = addMonths(last, 3);
      const days = diffDays(next, today);
      if (days < 0) {
        alerts.push({
          id: `${type}-${animal.id}`,
          animalId: animal.id,
          animalName: animal.nom,
          type: 'treatment',
          severity: 'urgent',
          title: `${type === 'Antipuce' ? 'Anti-puce' : 'Vermifuge'} en retard`,
          description: `${animal.nom} - dépassé depuis ${Math.abs(days)} jours`,
          icon: type === 'Antipuce' ? '🐛' : '💊',
        });
      } else if (days <= 14) {
        alerts.push({
          id: `${type}-${animal.id}`,
          animalId: animal.id,
          animalName: animal.nom,
          type: 'treatment',
          severity: 'warning',
          title: `${type === 'Antipuce' ? 'Anti-puce' : 'Vermifuge'} bientôt`,
          description: `${animal.nom} - dans ${days} jours`,
          icon: type === 'Antipuce' ? '🐛' : '💊',
        });
      }
    }
  }

  return alerts;
}

function getWeightAlerts(animal: Animal): HealthAlert[] {
  const alerts: HealthAlert[] = [];
  const poids = animal.poids || [];
  if (poids.length === 0) return alerts;

  const sorted = [...poids].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const lastEntry = sorted[sorted.length - 1];
  const daysSinceLast = diffDays(new Date(), new Date(lastEntry.date));

  // No weight for 8+ weeks
  if (daysSinceLast > 56) {
    alerts.push({
      id: `wt-stale-${animal.id}`,
      animalId: animal.id,
      animalName: animal.nom,
      type: 'weight',
      severity: 'warning',
      title: 'Pesée à mettre à jour',
      description: `${animal.nom} - dernière pesée il y a ${Math.floor(daysSinceLast / 7)} semaines`,
      icon: '⚖️',
    });
  }

  return alerts;
}

function getBirthdayAlerts(animal: Animal, today: Date): HealthAlert[] {
  if (!animal.naissance) return [];
  const birth = new Date(animal.naissance);
  const nextBday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (nextBday < today) nextBday.setFullYear(nextBday.getFullYear() + 1);
  const days = diffDays(nextBday, today);
  if (days <= 14) {
    const age = nextBday.getFullYear() - birth.getFullYear();
    return [{
      id: `bday-${animal.id}`,
      animalId: animal.id,
      animalName: animal.nom,
      type: 'birthday',
      severity: 'info',
      title: days === 0 ? `🎂 Joyeux anniversaire ${animal.nom} !` : `Anniversaire bientôt`,
      description: days === 0 ? `${animal.nom} fête ses ${age} ans aujourd'hui !` : `${animal.nom} aura ${age} ans dans ${days} jours`,
      icon: '🎂',
    }];
  }
  return [];
}

function getCheckupAlerts(animal: Animal, today: Date): HealthAlert[] {
  const consults = animal.consultations || [];
  // Only alert if there ARE consultations but the last one is >1 year old
  if (consults.length === 0) return [];
  const sorted = [...consults].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const lastDate = new Date(sorted[0].date);
  const daysSince = diffDays(today, lastDate);
  if (daysSince > 365) {
    return [{
      id: `checkup-${animal.id}`,
      animalId: animal.id,
      animalName: animal.nom,
      type: 'checkup',
      severity: 'warning',
      title: 'Bilan annuel à prévoir',
      description: `${animal.nom} - dernière consultation il y a ${Math.floor(daysSince / 30)} mois`,
      icon: '🏥',
    }];
  }
  return [];
}

export function getAppointmentAlerts(animals: Animal[], rendezvous: { date: string; heure?: string; objet: string; animalIds: string[] }[]): HealthAlert[] {
  const today = new Date();
  const alerts: HealthAlert[] = [];
  for (const r of rendezvous) {
    const rdvDate = new Date(r.date);
    const days = diffDays(rdvDate, today);
    if (days >= 0 && days <= 7) {
      const names = r.animalIds.map((id) => animals.find((a) => a.id === id)?.nom).filter(Boolean).join(', ');
      alerts.push({
        id: `rdv-${r.date}-${r.objet}`,
        animalId: r.animalIds[0] || '',
        animalName: names || '',
        type: 'appointment',
        severity: days <= 1 ? 'warning' : 'info',
        title: days === 0 ? `RDV aujourd'hui` : `RDV dans ${days} jour${days > 1 ? 's' : ''}`,
        description: `${r.objet}${r.heure ? ` à ${r.heure}` : ''}${names ? ` — ${names}` : ''}`,
        icon: '📅',
      });
    }
  }
  return alerts;
}

export function getAllAlerts(animals: Animal[], rendezvous: { date: string; heure?: string; objet: string; animalIds: string[] }[]): HealthAlert[] {
  const today = new Date();
  const alerts: HealthAlert[] = [];

  for (const animal of animals) {
    alerts.push(...getVaccineAlerts(animal, today));
    alerts.push(...getTreatmentAlerts(animal, today));
    alerts.push(...getWeightAlerts(animal));
    alerts.push(...getBirthdayAlerts(animal, today));
    alerts.push(...getCheckupAlerts(animal, today));
  }

  alerts.push(...getAppointmentAlerts(animals, rendezvous));

  // Sort: urgent first, then warning, then info
  const severityOrder = { urgent: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts;
}
