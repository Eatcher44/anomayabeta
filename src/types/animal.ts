export interface WeightEntry {
  id: string;
  poids: number;
  date: string; // ISO string
}

export interface SoinEntry {
  id: string;
  type: string;
  nom?: string;
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
  notes?: string;
  dureeValide?: number;
}

export interface ConsultationEntry {
  id: string;
  date: string;
  motif: string;
  notes?: string;
  veterinaire?: string;
}

export type CommercialStatus = 'available' | 'option' | 'reserved' | 'sold' | 'kept';

export interface Animal {
  id: string;
  nom: string;
  type: string; // 'Chat', 'Chien', or custom
  sexe: string;
  race?: string;
  photo?: string | null;
  naissance?: string; // ISO string
  sterilise?: boolean;
  puce?: string;
  couleur?: string | null;
  paradis?: boolean;
  mother_id?: string | null;
  litter_id?: string | null;
  breeder_visible?: boolean;
  // Commercial fields (newborns)
  commercial_status?: CommercialStatus;
  buyer_name?: string | null;
  buyer_phone?: string | null;
  buyer_email?: string | null;
  deposit_received?: boolean;
  planned_departure_date?: string | null;
  commercial_notes?: string | null;
  poids: WeightEntry[];
  soins: SoinEntry[];
  consultations: ConsultationEntry[];
  createdAt?: string;
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
  createdAt?: string;
}

export interface AnimalsContextType {
  loading: boolean;
  animaux: Animal[];
  setAnimaux: React.Dispatch<React.SetStateAction<Animal[]>>;
  addAnimal: (animal: Omit<Animal, 'id' | 'createdAt'>) => Promise<void>;
  updateAnimal: (id: string, patchOrFn: Partial<Animal> | ((a: Animal) => Animal)) => void | Promise<void>;
  deleteAnimal: (id: string) => void | Promise<void>;
  rendezvous: RendezVous[];
  addRendezVous: (entry: Omit<RendezVous, 'id' | 'createdAt'>) => void | Promise<void>;
  updateRdv: (id: string, patchOrFn: Partial<RendezVous> | ((r: RendezVous) => RendezVous)) => void | Promise<void>;
  removeRendezVous: (id: string) => void | Promise<void>;
}
