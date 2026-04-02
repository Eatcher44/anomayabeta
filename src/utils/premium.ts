/**
 * Subscription model: Free / No-Ads / Breeder
 */

export type AppMode = 'free' | 'noads' | 'breeder';

export interface FeatureAccess {
  // Core (all plans)
  basicTracking: boolean;
  reminders: boolean;
  weightHistory: boolean;
  vaccines: boolean;
  healthDashboard: boolean;

  // Free limits
  maxFreeAnimals: number;
  adsEnabled: boolean;

  // Breeder features
  reproductionTracking: boolean;
  gestationTracking: boolean;
  litterManagement: boolean;
  parentLinking: boolean;
  birthHistory: boolean;
  lineage: boolean;
  expectedBirthCalc: boolean;
  heatCycleTracking: boolean;
  qrTransfer: boolean;
}

const FEATURES: Record<AppMode, FeatureAccess> = {
  free: {
    basicTracking: true,
    reminders: true,
    weightHistory: true,
    vaccines: true,
    healthDashboard: true,
    maxFreeAnimals: 3,
    adsEnabled: true,
    reproductionTracking: false,
    gestationTracking: false,
    litterManagement: false,
    parentLinking: false,
    birthHistory: false,
    lineage: false,
    expectedBirthCalc: false,
    heatCycleTracking: false,
    qrTransfer: false,
  },
  noads: {
    basicTracking: true,
    reminders: true,
    weightHistory: true,
    vaccines: true,
    healthDashboard: true,
    maxFreeAnimals: Infinity,
    adsEnabled: false,
    reproductionTracking: false,
    gestationTracking: false,
    litterManagement: false,
    parentLinking: false,
    birthHistory: false,
    lineage: false,
    expectedBirthCalc: false,
    heatCycleTracking: false,
    qrTransfer: false,
  },
  breeder: {
    basicTracking: true,
    reminders: true,
    weightHistory: true,
    vaccines: true,
    healthDashboard: true,
    maxFreeAnimals: Infinity,
    adsEnabled: false,
    reproductionTracking: true,
    gestationTracking: true,
    litterManagement: true,
    parentLinking: true,
    birthHistory: true,
    lineage: true,
    expectedBirthCalc: true,
    heatCycleTracking: true,
    qrTransfer: true,
  },
};

import { isBeta } from '@/config/appVariant';

/** True when the app is in beta mode — unlocks all features */
export const IS_BETA_MODE = isBeta;

// For now, grant free plan until subscription is implemented
const CURRENT_MODE: AppMode = 'free';

export function getFeatures(): FeatureAccess {
  return FEATURES[CURRENT_MODE];
}

export function getCurrentMode(): AppMode {
  return CURRENT_MODE;
}

export function isFeatureEnabled(feature: keyof FeatureAccess): boolean {
  const val = FEATURES[CURRENT_MODE][feature];
  return typeof val === 'boolean' ? val : true;
}

export function getPlanName(mode: AppMode): string {
  switch (mode) {
    case 'free': return 'Gratuit';
    case 'noads': return 'Sans publicités';
    case 'breeder': return 'Pack Éleveur';
  }
}

export function getPlanFeatures(mode: AppMode): string[] {
  switch (mode) {
    case 'free':
      return [
        'Toutes les fonctionnalités de base',
        '3 premiers animaux gratuits',
        'Publicités activées',
        'Suivi de poids, vaccins, soins',
        'Tableau de bord santé',
        'Rappels',
      ];
    case 'noads':
      return [
        'Tout du plan Gratuit',
        'Sans publicités',
        'Animaux illimités',
      ];
    case 'breeder':
      return [
        'Tout du plan Sans publicités',
        'Suivi de gestation',
        'Date de naissance prévue automatique',
        'Gestion des portées',
        'Lien parents-descendants',
        'Historique de reproduction',
        'Suivi des chaleurs',
        'Transfert QR des profils',
      ];
  }
}
