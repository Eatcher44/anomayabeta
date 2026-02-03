export interface WeightEntry {
  id: string;
  poids: number;
  date: string; // ISO string
}

export interface SoinEntry {
  id: string;
  type: 'Vaccin' | 'Vermifuge' | 'Antipuce' | 'Traitement';
  nom: string;
  date?: string; // ISO string
  produit?: string | null;
  
  // For vaccines
  rappelMois?: number;
  prochain?: string;
  obligatoire?: boolean;
  
  // For treatments
  doseValue?: number;
  doseUnit?: 'comprimé' | 'ml';
  dosesPerDay?: number;
  debut?: string;
  fin?: string;
  times?: string[];
  notifIds?: string[];
}

export interface Animal {
  id: string;
  nom: string;
  type: string; // 'Chat', 'Chien', or custom
  sexe: 'Mâle' | 'Femelle';
  race?: string;
  photo?: string | null;
  naissance?: string; // ISO string
  sterilise?: boolean;
  puce?: string;
  poids: WeightEntry[];
  soins: SoinEntry[];
  consultations?: any[];
  createdAt: string;
}

export interface RendezVous {
  id: string;
  date: string; // ISO string
  heure?: string; // HH:MM
  heureHHMM?: string; // HH:MM (alternative field name)
  objet: string;
  notes?: string;
  lieu?: string;
  animalIds: string[];
  createdAt: string;
}

export interface AnimalsContextType {
  loading: boolean;
  animaux: Animal[];
  setAnimaux: React.Dispatch<React.SetStateAction<Animal[]>>;
  updateAnimal: (id: string, patchOrFn: Partial<Animal> | ((a: Animal) => Animal)) => void;
  deleteAnimal: (id: string) => void;
  rendezvous: RendezVous[];
  addRendezVous: (entry: RendezVous) => void;
  updateRdv: (id: string, patchOrFn: Partial<RendezVous> | ((r: RendezVous) => RendezVous)) => void;
  removeRendezVous: (id: string) => void;
}
