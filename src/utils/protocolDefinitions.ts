export type VaccineClassification = 'essential' | 'recommended' | 'situational';

export interface VaccineDefinition {
  id: string;
  species: 'chat' | 'chien';
  name: string;
  minAgeWeeks: number | null;
  recommendedWindowText?: string;
  isCore: boolean;
  classification: VaccineClassification;
  classificationNote?: string;
  rappelMois: number;
  notes?: string;
}

export interface ParasiteDefinition {
  id: string;
  species: 'chat' | 'chien';
  name: string;
  type: 'Antipuce' | 'Vermifuge';
  minAgeWeeks: number | null;
  notes?: string;
  productDependent?: boolean;
}

const CAT_VACCINES: VaccineDefinition[] = [
  { id: 'cat-typhus', species: 'chat', name: 'Typhus félin (Panleucopénie)', minAgeWeeks: 8, isCore: true, classification: 'essential', rappelMois: 12 },
  { id: 'cat-coryza', species: 'chat', name: 'Coryza félin', minAgeWeeks: 8, isCore: true, classification: 'essential', rappelMois: 12 },
  { id: 'cat-felv', species: 'chat', name: 'Leucose féline (FeLV)', minAgeWeeks: 8, isCore: false, classification: 'recommended', rappelMois: 12 },
  { id: 'cat-rage', species: 'chat', name: 'Rage', minAgeWeeks: 12, isCore: false, classification: 'situational', rappelMois: 12 },
  { id: 'cat-chlamydiose', species: 'chat', name: 'Chlamydiose', minAgeWeeks: 9, isCore: false, classification: 'recommended', rappelMois: 12 },
];

const DOG_VACCINES: VaccineDefinition[] = [
  { id: 'dog-parvo', species: 'chien', name: 'Parvovirose (P)', minAgeWeeks: 6, isCore: true, classification: 'essential', rappelMois: 12 },
  { id: 'dog-carre', species: 'chien', name: 'Carré (C)', minAgeWeeks: 8, isCore: true, classification: 'essential', rappelMois: 12 },
  { id: 'dog-hepatite', species: 'chien', name: 'Hépatite de Rubarth (H)', minAgeWeeks: 8, isCore: true, classification: 'essential', rappelMois: 12 },
  { id: 'dog-pi', species: 'chien', name: 'Parainfluenza (Pi)', minAgeWeeks: 8, isCore: true, classification: 'essential', rappelMois: 12 },
  { id: 'dog-lepto', species: 'chien', name: 'Leptospirose (L)', minAgeWeeks: 8, isCore: false, classification: 'recommended', rappelMois: 12 },
  { id: 'dog-rage', species: 'chien', name: 'Rage (R)', minAgeWeeks: 12, isCore: false, classification: 'situational', rappelMois: 12 },
  { id: 'dog-bordetella', species: 'chien', name: 'Toux de chenil (Bordetella bronchiseptica)', minAgeWeeks: 8, isCore: false, classification: 'recommended', rappelMois: 12 },
  { id: 'dog-leishmania', species: 'chien', name: 'Leishmaniose', minAgeWeeks: 24, isCore: false, classification: 'recommended', rappelMois: 12 },
  { id: 'dog-piroplasmose', species: 'chien', name: 'Piroplasmose (babésiose)', minAgeWeeks: 20, isCore: false, classification: 'recommended', rappelMois: 12 },
];

export function getVaccineDefinitions(species: string): VaccineDefinition[] {
  const s = (species || '').toLowerCase();
  if (s === 'chat') return CAT_VACCINES;
  if (s === 'chien') return DOG_VACCINES;
  return CAT_VACCINES;
}

export function getEssentialVaccineNames(animalType: string): string[] {
  return getVaccineDefinitions(animalType).filter(v => v.classification === 'essential').map(v => v.name);
}

export interface ProtocolOverride {
  definitionId: string;
  minAgeWeeksOverride: number | null;
  enabled: boolean;
}

const OVERRIDES_KEY = 'protocol-overrides';

export function getProtocolOverrides(): ProtocolOverride[] {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function setProtocolOverrides(overrides: ProtocolOverride[]) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
}

export function getEffectiveMinAgeWeeks(definitionId: string, defaultMinAge: number | null): number | null {
  const overrides = getProtocolOverrides();
  const override = overrides.find(o => o.definitionId === definitionId && o.enabled);
  if (override) return override.minAgeWeeksOverride;
  return defaultMinAge;
}