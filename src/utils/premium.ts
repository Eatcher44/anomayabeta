/**
 * Premium & Breeder mode structure.
 * This module defines the feature gating architecture.
 * Currently all features are unlocked (no subscription yet).
 */

export type AppMode = 'free' | 'premium' | 'breeder';

export interface FeatureAccess {
  // Free features
  basicTracking: boolean;
  reminders: boolean;
  weightHistory: boolean;
  vaccines: boolean;

  // Premium features
  smartDashboard: boolean;
  medications: boolean;
  timeline: boolean;
  smartInsights: boolean;
  exportPdf: boolean;
  advancedReminders: boolean;
  customColors: boolean;
  noAds: boolean;

  // Breeder features
  reproductionTracking: boolean;
  gestationTracking: boolean;
  litterManagement: boolean;
  parentLinking: boolean;
  birthHistory: boolean;
  lineage: boolean;
  expectedBirthCalc: boolean;
}

const FEATURES: Record<AppMode, FeatureAccess> = {
  free: {
    basicTracking: true,
    reminders: true,
    weightHistory: true,
    vaccines: true,
    smartDashboard: false,
    medications: false,
    timeline: false,
    smartInsights: false,
    exportPdf: false,
    advancedReminders: false,
    customColors: false,
    noAds: false,
    reproductionTracking: false,
    gestationTracking: false,
    litterManagement: false,
    parentLinking: false,
    birthHistory: false,
    lineage: false,
    expectedBirthCalc: false,
  },
  premium: {
    basicTracking: true,
    reminders: true,
    weightHistory: true,
    vaccines: true,
    smartDashboard: true,
    medications: true,
    timeline: true,
    smartInsights: true,
    exportPdf: true,
    advancedReminders: true,
    customColors: true,
    noAds: true,
    reproductionTracking: false,
    gestationTracking: false,
    litterManagement: false,
    parentLinking: false,
    birthHistory: false,
    lineage: false,
    expectedBirthCalc: false,
  },
  breeder: {
    basicTracking: true,
    reminders: true,
    weightHistory: true,
    vaccines: true,
    smartDashboard: true,
    medications: true,
    timeline: true,
    smartInsights: true,
    exportPdf: true,
    advancedReminders: true,
    customColors: true,
    noAds: true,
    reproductionTracking: true,
    gestationTracking: true,
    litterManagement: true,
    parentLinking: true,
    birthHistory: true,
    lineage: true,
    expectedBirthCalc: true,
  },
};

// For now, grant all features (premium) until subscription is implemented
const CURRENT_MODE: AppMode = 'premium';

export function getFeatures(): FeatureAccess {
  return FEATURES[CURRENT_MODE];
}

export function getCurrentMode(): AppMode {
  return CURRENT_MODE;
}

export function isFeatureEnabled(feature: keyof FeatureAccess): boolean {
  return FEATURES[CURRENT_MODE][feature];
}

export function getPlanName(mode: AppMode): string {
  switch (mode) {
    case 'free': return 'Gratuit';
    case 'premium': return 'Premium';
    case 'breeder': return 'Pack Éleveur';
  }
}

export function getPlanFeatures(mode: AppMode): string[] {
  switch (mode) {
    case 'free':
      return [
        'Suivi basique des animaux',
        'Rappels simples',
        'Historique de poids',
        'Suivi des vaccins',
      ];
    case 'premium':
      return [
        'Tout du plan Gratuit',
        'Sans publicités',
        'Tableau de bord santé intelligent',
        'Rappels avancés personnalisables',
        'Suivi des médicaments',
        'Timeline santé',
        'Analyses et alertes intelligentes',
        'Export PDF',
        'Couleurs personnalisées',
      ];
    case 'breeder':
      return [
        'Tout du plan Premium',
        'Suivi de gestation',
        'Date de naissance prévue automatique',
        'Gestion des portées',
        'Lien parents-descendants',
        'Historique de reproduction',
        'Arbre généalogique',
      ];
  }
}
