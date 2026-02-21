import { normalizeType } from './normalize';

export interface SpeciesConfig {
  key: string;
  label: string;
  gestationMinDays: number;
  gestationAvgDays: number;
  gestationMaxDays: number;
  pubertyMonths: number;
  heatCycleAvgDays: number;
  dewormIntervalDays: number;
  vaccineTemplate: string;
}

const SPECIES_REGISTRY: Record<string, SpeciesConfig> = {
  chat: {
    key: 'chat',
    label: 'Chat',
    gestationMinDays: 60,
    gestationAvgDays: 63,
    gestationMaxDays: 66,
    pubertyMonths: 6,
    heatCycleAvgDays: 18,
    dewormIntervalDays: 30,
    vaccineTemplate: 'kitten',
  },
  chien: {
    key: 'chien',
    label: 'Chien',
    gestationMinDays: 58,
    gestationAvgDays: 63,
    gestationMaxDays: 68,
    pubertyMonths: 8,
    heatCycleAvgDays: 180,
    dewormIntervalDays: 21,
    vaccineTemplate: 'puppy',
  },
};

const DEFAULT_CONFIG: SpeciesConfig = {
  key: 'default',
  label: 'Autre',
  gestationMinDays: 60,
  gestationAvgDays: 63,
  gestationMaxDays: 68,
  pubertyMonths: 6,
  heatCycleAvgDays: 30,
  dewormIntervalDays: 30,
  vaccineTemplate: 'generic',
};

/**
 * Get species config by animal type string.
 * Falls back to DEFAULT_CONFIG for unknown species.
 */
export function getSpeciesConfig(type: string): SpeciesConfig {
  const key = normalizeType(type).toLowerCase();
  return SPECIES_REGISTRY[key] || DEFAULT_CONFIG;
}

/** Register a new species at runtime (for future extensibility). */
export function registerSpecies(config: SpeciesConfig) {
  SPECIES_REGISTRY[config.key.toLowerCase()] = config;
}

/** Get all registered species configs. */
export function getAllSpeciesConfigs(): SpeciesConfig[] {
  return Object.values(SPECIES_REGISTRY);
}
