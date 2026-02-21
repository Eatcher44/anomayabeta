import type { Animal } from '@/types/animal';

export interface ChecklistItem {
  key: string;
  label: string;
  completed: boolean;
  auto: boolean; // auto-computed vs manual
}

export function computeDepartureChecklist(animal: Animal): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  // 1. Puce enregistrée
  items.push({
    key: 'chip',
    label: 'Puce enregistrée',
    completed: !!animal.puce && animal.puce.trim().length > 0,
    auto: true,
  });

  // 2. Vaccins à jour
  const vaccines = (animal.soins || []).filter(s => s.type === 'Vaccin' || s.type === 'vaccin');
  const hasVaccine = vaccines.length > 0 && vaccines.some(v => !!v.date);
  items.push({
    key: 'vaccines',
    label: 'Vaccins à jour',
    completed: hasVaccine,
    auto: true,
  });

  // 3. Vermifuge à jour
  const vermifuges = (animal.soins || []).filter(s => s.type === 'Vermifuge');
  const hasVermifuge = vermifuges.length > 0 && vermifuges.some(v => !!v.date);
  items.push({
    key: 'deworm',
    label: 'Vermifuge à jour',
    completed: hasVermifuge,
    auto: true,
  });

  // 4. Poids récent (< 7 jours)
  const weights = animal.poids || [];
  const recentWeight = weights.some(w => {
    const d = new Date(w.date);
    return (Date.now() - d.getTime()) < 7 * 86400000;
  });
  items.push({
    key: 'weight',
    label: 'Poids récent (< 7 jours)',
    completed: recentWeight,
    auto: true,
  });

  // 5. Photo
  items.push({
    key: 'photo',
    label: 'Photo',
    completed: !!animal.photo,
    auto: true,
  });

  // 6. Carnet PDF (manual)
  items.push({
    key: 'pdf',
    label: 'Carnet PDF généré',
    completed: false,
    auto: false,
  });

  // 7. Profil prêt à transférer
  const readyToTransfer = !!animal.puce && hasVaccine && !!animal.photo;
  items.push({
    key: 'transfer_ready',
    label: 'Profil prêt à transférer',
    completed: readyToTransfer,
    auto: true,
  });

  return items;
}

export function getChecklistCompletion(animal: Animal): { done: number; total: number } {
  const items = computeDepartureChecklist(animal);
  return { done: items.filter(i => i.completed).length, total: items.length };
}

export function getDepartureUrgency(plannedDate: string | null | undefined): 'none' | 'soon' | 'imminent' | 'urgent' {
  if (!plannedDate) return 'none';
  const days = Math.floor((new Date(plannedDate).getTime() - Date.now()) / 86400000);
  if (days <= 0) return 'urgent';
  if (days <= 3) return 'imminent';
  if (days <= 7) return 'soon';
  return 'none';
}
