import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAnimals } from '@/context/AnimalsContext';
import { isBreederEligible } from '@/utils/breederUtils';
import { supabase } from '@/integrations/supabase/client';

const GESTATION_DAYS = 63;

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

export function useElevageData() {
  const { user } = useAuth();
  const { animaux } = useAnimals();
  const [reproductions, setReproductions] = useState<Reproduction[]>([]);
  const [litters, setLitters] = useState<Litter[]>([]);
  const [loading, setLoading] = useState(true);

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

          // Count transferred
          const { count: transferredCount } = await supabase
            .from('transfer_codes')
            .select('id', { count: 'exact', head: true })
            .in('animal_id', all.map(n => n.id))
            .not('claimed_at', 'is', null);

          const deceased = all.filter(n => n.paradis).length;
          const transferred = transferredCount || 0;

          return {
            ...l,
            newborn_count: all.length,
            alive_count: alive.length,
            transferred_count: transferred,
            deceased_count: deceased,
          } as Litter;
        })
      );
      setLitters(withCounts);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const eligible = useMemo(
    () => animaux.filter(a => !a.paradis && a.breeder_visible !== false && isBreederEligible(a.type)),
    [animaux]
  );
  const females = useMemo(() => eligible.filter(a => a.sexe?.toLowerCase().startsWith('f')), [eligible]);
  const males = useMemo(() => eligible.filter(a => a.sexe?.toLowerCase().startsWith('m')), [eligible]);

  const activeGestations = useMemo(() => {
    const now = Date.now();
    return reproductions.filter(r => {
      if (r.status !== 'active') return false;
      const start = new Date(r.date_saillie).getTime();
      const days = Math.floor((now - start) / 86400000);
      return days >= 0 && days <= GESTATION_DAYS;
    });
  }, [reproductions]);

  const activeLitters = useMemo(() => {
    const threeMonthsAgo = Date.now() - 90 * 86400000;
    return litters.filter(l => new Date(l.birth_date).getTime() > threeMonthsAgo);
  }, [litters]);

  const archivedLitters = useMemo(() => {
    const threeMonthsAgo = Date.now() - 90 * 86400000;
    return litters.filter(l => new Date(l.birth_date).getTime() <= threeMonthsAgo);
  }, [litters]);

  const availableKittens = useMemo(
    () => animaux.filter(a =>
      a.litter_id && !a.paradis &&
      (a.commercial_status === 'available' || !a.commercial_status)
    ),
    [animaux]
  );

  const soldPendingKittens = useMemo(
    () => animaux.filter(a =>
      a.litter_id && !a.paradis &&
      (a.commercial_status === 'sold' || a.commercial_status === 'reserved')
    ),
    [animaux]
  );

  // Global stats
  const globalStats = useMemo(() => {
    const totalLitters = litters.length;
    const totalKittens = litters.reduce((s, l) => s + l.newborn_count, 0);
    const avgPerLitter = totalLitters > 0 ? +(totalKittens / totalLitters).toFixed(1) : 0;
    const totalDeceased = litters.reduce((s, l) => s + l.deceased_count, 0);
    const survivalRate = totalKittens > 0 ? Math.round(((totalKittens - totalDeceased) / totalKittens) * 100) : 100;

    const allNewborns = animaux.filter(a => a.litter_id);
    const maleCount = allNewborns.filter(a => a.sexe?.toLowerCase().startsWith('m')).length;
    const femaleCount = allNewborns.filter(a => a.sexe?.toLowerCase().startsWith('f')).length;
    const sexRatio = maleCount + femaleCount > 0 ? `${maleCount}♂ / ${femaleCount}♀` : '—';

    const currentYear = new Date().getFullYear();
    const yearLitters = litters.filter(l => new Date(l.birth_date).getFullYear() === currentYear);
    const yearProduction = yearLitters.reduce((s, l) => s + l.newborn_count, 0);

    return { totalLitters, totalKittens, avgPerLitter, survivalRate, sexRatio, yearProduction };
  }, [litters, animaux]);

  // Alerts
  const alerts: { text: string; severity: 'urgent' | 'warning' | 'info' }[] = [];
  activeGestations.forEach(g => {
    const days = Math.floor((Date.now() - new Date(g.date_saillie).getTime()) / 86400000);
    if (days >= 55) {
      const mother = animaux.find(a => a.id === g.animal_id);
      alerts.push({ text: `${mother?.nom || 'Femelle'} : mise-bas imminente (J${days}/${GESTATION_DAYS})`, severity: 'urgent' });
    } else if (days >= 45) {
      const mother = animaux.find(a => a.id === g.animal_id);
      alerts.push({ text: `${mother?.nom || 'Femelle'} : gestation à surveiller (J${days}/${GESTATION_DAYS})`, severity: 'warning' });
    }
  });

  // Kitten vaccine alerts
  const kittensDue = animaux.filter(a => {
    if (!a.litter_id || a.paradis) return false;
    const birth = a.naissance ? new Date(a.naissance) : null;
    if (!birth) return false;
    const ageWeeks = Math.floor((Date.now() - birth.getTime()) / (7 * 86400000));
    const hasVaccine = a.soins?.some(s => s.type === 'vaccin');
    return ageWeeks >= 8 && !hasVaccine;
  });
  if (kittensDue.length > 0) {
    alerts.push({ text: `${kittensDue.length} chaton(s) en attente de primo-vaccination`, severity: 'warning' });
  }

  const getAnimalName = (id: string) => animaux.find(a => a.id === id)?.nom || 'Inconnu';

  return {
    loading,
    animaux,
    eligible,
    females,
    males,
    reproductions,
    activeGestations,
    litters,
    activeLitters,
    archivedLitters,
    availableKittens,
    soldPendingKittens,
    globalStats,
    alerts,
    getAnimalName,
    GESTATION_DAYS,
  };
}
