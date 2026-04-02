import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import type { Animal, RendezVous, AnimalsContextType, WeightEntry, SoinEntry, ConsultationEntry, RepasEntry } from '@/types/animal';
import type { Json } from '@/integrations/supabase/types';
import { normalizeType } from '@/utils/normalize';

const AnimalsContext = createContext<AnimalsContextType | null>(null);

function parseJsonArray<T>(json: Json | null | undefined, fallback: T[]): T[] {
  if (!json) return fallback;
  if (Array.isArray(json)) return json as unknown as T[];
  return fallback;
}

export function AnimalsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [animaux, setAnimaux] = useState<Animal[]>([]);
  const [rendezvous, setRendezvous] = useState<RendezVous[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnimals = useCallback(async () => {
    if (!user) {
      setAnimaux([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: Animal[] = (data || []).map((a) => ({
        id: a.id,
        nom: a.nom,
        type: normalizeType(a.type),
        sexe: a.sexe,
        race: a.race || undefined,
        photo: a.photo || undefined,
        naissance: a.naissance ? new Date(a.naissance).toISOString() : undefined,
        sterilise: a.sterilise || false,
        puce: a.puce || undefined,
        couleur: (a as any).couleur || null,
        particularite: (a as any).particularite || null,
        robe: (a as any).robe || null,
        paradis: (a as any).paradis || false,
        mother_id: (a as any).mother_id || null,
        litter_id: (a as any).litter_id || null,
        breeder_visible: (a as any).breeder_visible ?? true,
        commercial_status: (a as any).commercial_status || 'available',
        buyer_name: (a as any).buyer_name || null,
        buyer_phone: (a as any).buyer_phone || null,
        buyer_email: (a as any).buyer_email || null,
        deposit_received: (a as any).deposit_received || false,
        planned_departure_date: (a as any).planned_departure_date || null,
        commercial_notes: (a as any).commercial_notes || null,
        deposit_amount: null,
        sale_price: null,
        payment_status: null,
        breeder_status: null,
        reservation_date: null,
        poids: parseJsonArray<WeightEntry>(a.poids, []),
        soins: parseJsonArray<SoinEntry>(a.soins, []),
        consultations: parseJsonArray<ConsultationEntry>(a.consultations, []),
        repas: parseJsonArray<RepasEntry>((a as any).repas, []),
        createdAt: a.created_at,
      }));

      setAnimaux(mapped);
    } catch (error) {
      console.error('Error fetching animals:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchRendezvous = useCallback(async () => {
    if (!user) {
      setRendezvous([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('rendezvous')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;

      const mapped: RendezVous[] = (data || []).map((r) => ({
        id: r.id,
        date: r.date,
        heure: r.heure || undefined,
        objet: r.objet,
        notes: r.notes || undefined,
        animalIds: r.animal_ids || [],
        createdAt: r.created_at,
      }));

      setRendezvous(mapped);
    } catch (error) {
      console.error('Error fetching rendezvous:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchAnimals();
    fetchRendezvous();
  }, [fetchAnimals, fetchRendezvous]);

  const addAnimal = useCallback(async (animal: Omit<Animal, 'id' | 'createdAt'>) => {
    if (!user) return;

    try {
      const insertPayload: any = {
        user_id: user.id,
        nom: animal.nom,
        type: normalizeType(animal.type),
        sexe: animal.sexe,
        race: animal.race || null,
        photo: animal.photo || null,
        naissance: animal.naissance ? new Date(animal.naissance).toISOString().split('T')[0] : null,
        sterilise: animal.sterilise || false,
        puce: animal.puce || null,
        poids: (animal.poids || []) as unknown as Json,
        soins: (animal.soins || []) as unknown as Json,
        consultations: (animal.consultations || []) as unknown as Json,
        repas: (animal.repas || []) as unknown as Json,
      };
      if ('breeder_visible' in animal && animal.breeder_visible === false) {
        insertPayload.breeder_visible = false;
      }
      const { data, error } = await supabase
        .from('animals')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newAnimal: Animal = {
          id: data.id,
          nom: data.nom,
          type: normalizeType(data.type),
          sexe: data.sexe,
          race: data.race || undefined,
          photo: data.photo || undefined,
          naissance: data.naissance ? new Date(data.naissance).toISOString() : undefined,
          sterilise: data.sterilise || false,
          puce: data.puce || undefined,
          couleur: (data as any).couleur || null,
          breeder_visible: (data as any).breeder_visible ?? true,
          poids: parseJsonArray<WeightEntry>(data.poids, []),
          soins: parseJsonArray<SoinEntry>(data.soins, []),
          consultations: parseJsonArray<ConsultationEntry>(data.consultations, []),
          repas: parseJsonArray<RepasEntry>((data as any).repas, []),
          createdAt: data.created_at,
        };
        setAnimaux((prev) => [newAnimal, ...prev]);
      }
    } catch (error) {
      console.error('Error adding animal:', error);
      throw error;
    }
  }, [user]);

  const updateAnimal = useCallback(async (id: string, patchOrFn: Partial<Animal> | ((a: Animal) => Animal)) => {
    const currentAnimal = animaux.find((a) => a.id === id);
    if (!currentAnimal) return;

    const patch = typeof patchOrFn === 'function' ? patchOrFn(currentAnimal) : { ...currentAnimal, ...patchOrFn };

    try {
      const updatePayload: any = {
        nom: patch.nom,
        type: normalizeType(patch.type),
        sexe: patch.sexe,
        race: patch.race || null,
        photo: patch.photo || null,
        naissance: patch.naissance ? new Date(patch.naissance).toISOString().split('T')[0] : null,
        sterilise: patch.sterilise || false,
        puce: patch.puce || null,
        poids: (patch.poids || []) as unknown as Json,
        soins: (patch.soins || []) as unknown as Json,
        consultations: (patch.consultations || []) as unknown as Json,
        repas: (patch.repas || []) as unknown as Json,
      };
      if ('paradis' in patch) {
        updatePayload.paradis = (patch as any).paradis;
      }
      if ('breeder_visible' in patch) {
        updatePayload.breeder_visible = (patch as any).breeder_visible;
      }
      if ('couleur' in patch) {
        updatePayload.couleur = (patch as any).couleur;
      }
      if ('litter_id' in patch) {
        updatePayload.litter_id = (patch as any).litter_id;
      }
      if ('mother_id' in patch) {
        updatePayload.mother_id = (patch as any).mother_id;
      }
      // Commercial & breeder fields (only columns that exist in DB)
      for (const key of ['commercial_status', 'buyer_name', 'buyer_phone', 'buyer_email', 'deposit_received', 'planned_departure_date', 'commercial_notes', 'particularite', 'robe'] as const) {
        if (key in patch) {
          updatePayload[key] = (patch as any)[key];
        }
      }
      const { error } = await supabase
        .from('animals')
        .update(updatePayload)
        .eq('id', id);

      if (error) throw error;

      setAnimaux((current) =>
        current.map((a) => (a.id === id ? { ...a, ...patch } : a))
      );
    } catch (error) {
      console.error('Error updating animal:', error);
      throw error;
    }
  }, [animaux]);

  const deleteAnimal = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('animals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAnimaux((current) => current.filter((a) => a.id !== id));
      setRendezvous((current) =>
        current.map((r) => ({
          ...r,
          animalIds: r.animalIds.filter((aid) => aid !== id),
        }))
      );
    } catch (error) {
      console.error('Error deleting animal:', error);
      throw error;
    }
  }, []);

  const addRendezVous = useCallback(async (entry: Omit<RendezVous, 'id' | 'createdAt'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('rendezvous')
        .insert({
          user_id: user.id,
          date: entry.date,
          heure: entry.heure || null,
          objet: entry.objet,
          notes: entry.notes || null,
          animal_ids: entry.animalIds || [],
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newRdv: RendezVous = {
          id: data.id,
          date: data.date,
          heure: data.heure || undefined,
          objet: data.objet,
          notes: data.notes || undefined,
          animalIds: data.animal_ids || [],
          createdAt: data.created_at,
        };
        setRendezvous((prev) => [...prev, newRdv]);
      }
    } catch (error) {
      console.error('Error adding rendezvous:', error);
      throw error;
    }
  }, [user]);

  const updateRdv = useCallback(async (id: string, patchOrFn: Partial<RendezVous> | ((r: RendezVous) => RendezVous)) => {
    const currentRdv = rendezvous.find((r) => r.id === id);
    if (!currentRdv) return;

    const patch = typeof patchOrFn === 'function' ? patchOrFn(currentRdv) : { ...currentRdv, ...patchOrFn };

    try {
      const { error } = await supabase
        .from('rendezvous')
        .update({
          date: patch.date,
          heure: patch.heure || null,
          objet: patch.objet,
          notes: patch.notes || null,
          animal_ids: patch.animalIds || [],
        })
        .eq('id', id);

      if (error) throw error;

      setRendezvous((current) =>
        current.map((r) => (r.id === id ? { ...r, ...patch } : r))
      );
    } catch (error) {
      console.error('Error updating rendezvous:', error);
      throw error;
    }
  }, [rendezvous]);

  const removeRendezVous = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('rendezvous')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRendezvous((current) => current.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Error removing rendezvous:', error);
      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({
      loading,
      animaux,
      setAnimaux,
      addAnimal,
      updateAnimal,
      deleteAnimal,
      rendezvous,
      addRendezVous,
      updateRdv,
      removeRendezVous,
    }),
    [loading, animaux, rendezvous, addAnimal, updateAnimal, deleteAnimal, addRendezVous, updateRdv, removeRendezVous]
  );

  return (
    <AnimalsContext.Provider value={value}>
      {children}
    </AnimalsContext.Provider>
  );
}

export function useAnimals() {
  const context = useContext(AnimalsContext);
  if (!context) {
    throw new Error('useAnimals must be used within AnimalsProvider');
  }
  return context;
}
