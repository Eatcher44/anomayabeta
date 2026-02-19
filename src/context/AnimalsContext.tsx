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
import type { Animal, RendezVous, AnimalsContextType, WeightEntry, SoinEntry, ConsultationEntry } from '@/types/animal';
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

  // Fetch animals from database
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
        poids: parseJsonArray<WeightEntry>(a.poids, []),
        soins: parseJsonArray<SoinEntry>(a.soins, []),
        consultations: parseJsonArray<ConsultationEntry>(a.consultations, []),
        createdAt: a.created_at,
      }));

      setAnimaux(mapped);
    } catch (error) {
      console.error('Error fetching animals:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch rendezvous from database
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

  // Add a new animal
  const addAnimal = useCallback(async (animal: Omit<Animal, 'id' | 'createdAt'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('animals')
        .insert({
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
        } as any)
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
          poids: parseJsonArray<WeightEntry>(data.poids, []),
          soins: parseJsonArray<SoinEntry>(data.soins, []),
          consultations: parseJsonArray<ConsultationEntry>(data.consultations, []),
          createdAt: data.created_at,
        };
        setAnimaux((prev) => [newAnimal, ...prev]);
      }
    } catch (error) {
      console.error('Error adding animal:', error);
      throw error;
    }
  }, [user]);

  // Update an animal
  const updateAnimal = useCallback(async (id: string, patchOrFn: Partial<Animal> | ((a: Animal) => Animal)) => {
    const currentAnimal = animaux.find((a) => a.id === id);
    if (!currentAnimal) return;

    const patch = typeof patchOrFn === 'function' ? patchOrFn(currentAnimal) : { ...currentAnimal, ...patchOrFn };

    try {
      const { error } = await supabase
        .from('animals')
        .update({
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
        } as any)
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

  // Delete an animal
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

  // Add a rendezvous
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

  // Update a rendezvous
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

  // Remove a rendezvous
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
