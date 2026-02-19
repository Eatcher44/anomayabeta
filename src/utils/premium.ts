/**
 * Premium & Breeder mode structure.
 * This module defines the feature gating architecture.
 * Currently all features are unlocked (no subscription yet).
 */

export type AppMode = 'standard' | 'premium' | 'breeder';

export interface FeatureAccess {
  smartDashboard: boolean;
  reminders: boolean;
  weightHistory: boolean;
  vaccines: boolean;
  medications: boolean;
  timeline: boolean;
  smartInsights: boolean;
  exportPdf: boolean;
  advancedReminders: boolean;
  reproductionTracking: boolean;
  litterManagement: boolean;
  parentLinking: boolean;
  birthHistory: boolean;
  lineage: boolean;
  customColors: boolean;
}

const FEATURES: Record<AppMode, FeatureAccess> = {
  standard: {
    smartDashboard: true,
    reminders: true,
    weightHistory: true,
    vaccines: true,
    medications: false,
    timeline: false,
    smartInsights: false,
    exportPdf: false,
    advancedReminders: false,
    reproductionTracking: false,
    litterManagement: false,
    parentLinking: false,
    birthHistory: false,
    lineage: false,
    customColors: false,
  },
  premium: {
    smartDashboard: true,
    reminders: true,
    weightHistory: true,
    vaccines: true,
    medications: true,
    timeline: true,
    smartInsights: true,
    exportPdf: true,
    advancedReminders: true,
    reproductionTracking: false,
    litterManagement: false,
    parentLinking: false,
    birthHistory: false,
    lineage: false,
    customColors: true,
  },
  breeder: {
    smartDashboard: true,
    reminders: true,
    weightHistory: true,
    vaccines: true,
    medications: true,
    timeline: true,
    smartInsights: true,
    exportPdf: true,
    advancedReminders: true,
    reproductionTracking: true,
    litterManagement: true,
    parentLinking: true,
    birthHistory: true,
    lineage: true,
    customColors: true,
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
