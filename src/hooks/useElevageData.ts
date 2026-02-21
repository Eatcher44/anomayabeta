import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAnimals } from '@/context/AnimalsContext';
import { isBreederEligible } from '@/utils/breederUtils';
import { getSpeciesConfig } from '@/utils/speciesConfig';
import { normalizeType } from '@/utils/normalize';
import { supabase } from '@/integrations/supabase/client';

export interface Reproduction {
  id: string;
  animal_id: string;
  date_saillie: string;
  status: string;
  confirmed: boolean;
  father_animal_id: string | null;
  father_external_name: string | null;
  notes: string | null;
}

export interface Litter {
  id: string;
  mother_id: string;
  father_id: string | null;
  father_name: string | null;
  birth_date: string;
  newborn_count: number;
  alive_count: number;
  transferred_count: number;
  deceased_count: number;
}

export type ElevageAlert = { text: string; severity: 'urgent' | 'warning' | 'info' };

export function useElevageData(species: string) {
  const { user } = useAuth();
  const { animaux } = useAnimals();
  const [reproductions, setReproductions] = useState<Reproduction[]>([]);
  const [litters, setLitters] = useState<Litter[]>([]);
  const [loading, setLoading] = useState(true);

  const speciesKey = normalizeType(species).toLowerCase();

  const isSpecies = useCallback((type: string) => normalizeType(type).toLowerCase() === speciesKey, [speciesKey]);

  const getGestationDays = useCallback((animalId: string) => {
    const animal = animaux.find(a => a.id === animalId);
    return getSpeciesConfig(animal?.type || species).gestationAvgDays;
  }, [animaux, species]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [reproRes, litterRes] = await Promise.all([
      supabase.from('reproductions').select('*').eq('user_id', user.id).order('date_saillie', { ascending: false }),
      supabase.from('litters').select('*').eq('user_id', user.id).order('birth_date', { ascending: false }),
    ]);

    if (reproRes.data) setReproductions(reproRes.data as Reproduction[]);

    if (litterRes.data) {
      const withCounts = await Promise.all(
        (litterRes.data as any[]).map(async (l) => {
          const { data: newborns } = await supabase
            .from('animals')
            .select('id, paradis')
            .eq('litter_id', l.id);

          const all = newborns || [];
          const alive = all.filter(n => !n.paradis);

          const { count: transferredCount } = await supabase
            .from('transfer_codes')
            .select('id', { count: 'exact', head: true })
            .in('animal_id', all.length > 0 ? all.map(n => n.id) : ['__none__'])
            .not('claimed_at', 'is', null);

          return {
            ...l,
            newborn_count: all.length,
            alive_count: alive.length,
            transferred_count: transferredCount || 0,
            deceased_count: all.filter(n => n.paradis).length,
          } as Litter;
        })
      );
      setLitters(withCounts);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // All eligible animals of this species
  const eligible = useMemo(
    () => animaux.filter(a => !a.paradis && a.breeder_visible !== false && isBreederEligible(a.type) && isSpecies(a.type)),
    [animaux, isSpecies]
  );
  const females = useMemo(() => eligible.filter(a => a.sexe?.toLowerCase().startsWith('f')), [eligible]);
  const males = useMemo(() => eligible.filter(a => a.sexe?.toLowerCase().startsWith('m')), [eligible]);

  // Reproductions where the mother is this species
  const speciesAnimalIds = useMemo(() => new Set(animaux.filter(a => isSpecies(a.type)).map(a => a.id)), [animaux, isSpecies]);

  const speciesReproductions = useMemo(
    () => reproductions.filter(r => speciesAnimalIds.has(r.animal_id)),
    [reproductions, speciesAnimalIds]
  );

  const activeGestations = useMemo(() => {
    const now = Date.now();
    return speciesReproductions.filter(r => {
      if (r.status !== 'active') return false;
      const gDays = getGestationDays(r.animal_id);
      const start = new Date(r.date_saillie).getTime();
      const days = Math.floor((now - start) / 86400000);
      return days >= 0 && days <= gDays;
    });
  }, [speciesReproductions, getGestationDays]);

  // Litters where mother is this species
  const speciesLitters = useMemo(
    () => litters.filter(l => speciesAnimalIds.has(l.mother_id)),
    [litters, speciesAnimalIds]
  );

  const activeLitters = useMemo(() => {
    const threeMonthsAgo = Date.now() - 90 * 86400000;
    return speciesLitters.filter(l => new Date(l.birth_date).getTime() > threeMonthsAgo);
  }, [speciesLitters]);

  const archivedLitters = useMemo(() => {
    const threeMonthsAgo = Date.now() - 90 * 86400000;
    return speciesLitters.filter(l => new Date(l.birth_date).getTime() <= threeMonthsAgo);
  }, [speciesLitters]);

  const speciesNewborns = useMemo(
    () => animaux.filter(a => a.litter_id && isSpecies(a.type)),
    [animaux, isSpecies]
  );

  const availableKittens = useMemo(
    () => speciesNewborns.filter(a => !a.paradis && (a.commercial_status === 'available' || !a.commercial_status)),
    [speciesNewborns]
  );

  const soldPendingKittens = useMemo(
    () => speciesNewborns.filter(a => !a.paradis && (a.commercial_status === 'sold' || a.commercial_status === 'reserved')),
    [speciesNewborns]
  );

  // Stats
  const globalStats = useMemo(() => {
    const totalLitters = speciesLitters.length;
    const totalKittens = speciesLitters.reduce((s, l) => s + l.newborn_count, 0);
    const avgPerLitter = totalLitters > 0 ? +(totalKittens / totalLitters).toFixed(1) : 0;
    const totalDeceased = speciesLitters.reduce((s, l) => s + l.deceased_count, 0);
    const totalTransferred = speciesLitters.reduce((s, l) => s + l.transferred_count, 0);

    const maleCount = speciesNewborns.filter(a => a.sexe?.toLowerCase().startsWith('m')).length;
    const femaleCount = speciesNewborns.filter(a => a.sexe?.toLowerCase().startsWith('f')).length;
    const sexRatio = maleCount + femaleCount > 0 ? `${maleCount}♂ / ${femaleCount}♀` : '—';

    const transferRate = totalKittens > 0 ? Math.round((totalTransferred / totalKittens) * 100) : 0;
    const paradisRate = totalKittens > 0 ? Math.round((totalDeceased / totalKittens) * 100) : 0;

    const currentYear = new Date().getFullYear();
    const yearLitters = speciesLitters.filter(l => new Date(l.birth_date).getFullYear() === currentYear);
    const yearProduction = yearLitters.reduce((s, l) => s + l.newborn_count, 0);

    return { totalLitters, totalKittens, avgPerLitter, sexRatio, transferRate, paradisRate, yearLitters: yearLitters.length, yearProduction };
  }, [speciesLitters, speciesNewborns]);

  // Alerts
  const alerts = useMemo(() => {
    const result: ElevageAlert[] = [];
    const config = getSpeciesConfig(species);

    activeGestations.forEach(g => {
      const days = Math.floor((Date.now() - new Date(g.date_saillie).getTime()) / 86400000);
      const mother = animaux.find(a => a.id === g.animal_id);
      const name = mother?.nom || 'Femelle';
      if (days > config.gestationMaxDays) {
        result.push({ text: `${name} : mise-bas dépassée (J${days}/${config.gestationAvgDays})`, severity: 'urgent' });
      } else if (days >= config.gestationMinDays) {
        result.push({ text: `${name} : mise-bas imminente (J${days}/${config.gestationAvgDays})`, severity: 'urgent' });
      } else if (days >= config.gestationAvgDays - 18) {
        result.push({ text: `${name} : gestation à surveiller (J${days}/${config.gestationAvgDays})`, severity: 'warning' });
      }
    });

    const kittensDue = speciesNewborns.filter(a => {
      if (a.paradis) return false;
      const birth = a.naissance ? new Date(a.naissance) : null;
      if (!birth) return false;
      const ageWeeks = Math.floor((Date.now() - birth.getTime()) / (7 * 86400000));
      const hasVaccine = a.soins?.some(s => s.type === 'vaccin' || s.type === 'Vaccin');
      return ageWeeks >= 8 && !hasVaccine;
    });
    if (kittensDue.length > 0) {
      result.push({ text: `${kittensDue.length} petit(s) en attente de primo-vaccination`, severity: 'warning' });
    }

    const needDeworm = speciesNewborns.filter(a => {
      if (a.paradis) return false;
      const birth = a.naissance ? new Date(a.naissance) : null;
      if (!birth) return false;
      const ageDays = Math.floor((Date.now() - birth.getTime()) / 86400000);
      if (ageDays < config.dewormIntervalDays) return false;
      return !a.soins?.some(s => s.type === 'Vermifuge');
    });
    if (needDeworm.length > 0) {
      result.push({ text: `${needDeworm.length} petit(s) à vermifuger`, severity: 'warning' });
    }

    return result;
  }, [activeGestations, speciesNewborns, animaux, species]);

  // Count urgent alerts per species (for badge on tabs)
  const urgentCount = useMemo(() => alerts.filter(a => a.severity === 'urgent').length, [alerts]);

  const getAnimalName = useCallback((id: string) => animaux.find(a => a.id === id)?.nom || 'Inconnu', [animaux]);

  return {
    loading,
    animaux,
    eligible,
    females,
    males,
    reproductions: speciesReproductions,
    activeGestations,
    litters: speciesLitters,
    activeLitters,
    archivedLitters,
    availableKittens,
    soldPendingKittens,
    globalStats,
    alerts,
    urgentCount,
    getAnimalName,
    getGestationDays,
  };
}

/** Lightweight hook to just count urgent alerts for a species without full data loading */
export function useSpeciesUrgentCount(species: string) {
  const { animaux } = useAnimals();
  const speciesKey = normalizeType(species).toLowerCase();

  return useMemo(() => {
    const config = getSpeciesConfig(species);
    let count = 0;
    // Check newborns needing vaccines
    const newborns = animaux.filter(a => a.litter_id && !a.paradis && normalizeType(a.type).toLowerCase() === speciesKey);
    const needVax = newborns.filter(a => {
      const birth = a.naissance ? new Date(a.naissance) : null;
      if (!birth) return false;
      const ageWeeks = Math.floor((Date.now() - birth.getTime()) / (7 * 86400000));
      return ageWeeks >= 8 && !a.soins?.some(s => s.type === 'vaccin' || s.type === 'Vaccin');
    });
    if (needVax.length > 0) count++;
    return count;
  }, [animaux, speciesKey, species]);
}
