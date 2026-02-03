import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Animal, RendezVous, AnimalsContextType } from '@/types/animal';

const AnimalsContext = createContext<AnimalsContextType | null>(null);

const LOCAL_KEY = '@anomaya_animaux';

function safeParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch (e) {
    console.warn('Erreur de parsing localStorage', e);
    return fallback;
  }
}

export function AnimalsProvider({ children }: { children: React.ReactNode }) {
  const [animaux, setAnimaux] = useState<Animal[]>([]);
  const [rendezvous, setRendezvous] = useState<RendezVous[]>([]);
  const [loading, setLoading] = useState(true);

  // Chargement initial depuis localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      const parsed = safeParse<{ animaux?: Animal[]; rendezvous?: RendezVous[] }>(raw, {});
      setAnimaux(Array.isArray(parsed.animaux) ? parsed.animaux : []);
      setRendezvous(Array.isArray(parsed.rendezvous) ? parsed.rendezvous : []);
    } catch (e) {
      console.warn('Erreur de chargement des données locales', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sauvegarde systématique dès que animaux / rendezvous changent
  useEffect(() => {
    if (loading) return;
    try {
      const payload = JSON.stringify({ animaux, rendezvous });
      localStorage.setItem(LOCAL_KEY, payload);
    } catch (e) {
      console.warn('Erreur de sauvegarde des données locales', e);
    }
  }, [animaux, rendezvous, loading]);

  function updateAnimal(id: string, patchOrFn: Partial<Animal> | ((a: Animal) => Animal)) {
    setAnimaux((current) =>
      (current || []).map((a) => {
        if (a.id !== id) return a;
        if (typeof patchOrFn === 'function') {
          return patchOrFn(a);
        }
        return { ...a, ...(patchOrFn || {}) };
      })
    );
  }

  function deleteAnimal(id: string) {
    setAnimaux((current) => (current || []).filter((a) => a.id !== id));
    setRendezvous((current) =>
      (current || []).map((r) => ({
        ...r,
        animalIds: (r.animalIds || []).filter((aid) => aid !== id),
      }))
    );
  }

  function addRendezVous(entry: RendezVous) {
    setRendezvous((current) => [...(current || []), entry]);
  }

  function updateRdv(id: string, patchOrFn: Partial<RendezVous> | ((r: RendezVous) => RendezVous)) {
    setRendezvous((current) =>
      (current || []).map((r) => {
        if (r.id !== id) return r;
        if (typeof patchOrFn === 'function') {
          return patchOrFn(r);
        }
        return { ...r, ...(patchOrFn || {}) };
      })
    );
  }

  function removeRendezVous(id: string) {
    setRendezvous((current) => (current || []).filter((r) => r.id !== id));
  }

  const value = useMemo(
    () => ({
      loading,
      animaux,
      setAnimaux,
      updateAnimal,
      deleteAnimal,
      rendezvous,
      addRendezVous,
      updateRdv,
      removeRendezVous,
    }),
    [loading, animaux, rendezvous]
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
