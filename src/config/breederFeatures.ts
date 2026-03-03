/**
 * Breeder module feature flags.
 * Only breeder_core is active. Others are prepared for future activation.
 */

export interface BreederModules {
  breeder_core: boolean;
  breeder_finance: boolean;
  breeder_documents: boolean;
  breeder_advanced_stats: boolean;
  breeder_exports: boolean;
}

const BREEDER_MODULES: BreederModules = {
  breeder_core: true,
  breeder_finance: false,
  breeder_documents: false,
  breeder_advanced_stats: false,
  breeder_exports: false,
};

export function isModuleEnabled(module: keyof BreederModules): boolean {
  return BREEDER_MODULES[module];
}

export function getEnabledModules(): (keyof BreederModules)[] {
  return (Object.keys(BREEDER_MODULES) as (keyof BreederModules)[]).filter(k => BREEDER_MODULES[k]);
}

/** Future module labels for placeholder UI */
export const FUTURE_MODULES: { key: keyof BreederModules; label: string }[] = [
  { key: 'breeder_finance', label: 'Comptabilité & Finances' },
  { key: 'breeder_documents', label: 'Documents & Contrats' },
  { key: 'breeder_advanced_stats', label: 'Statistiques avancées' },
  { key: 'breeder_exports', label: 'Exports & Rapports' },
];
