import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Baby, Heart, Clock, Users, AlertTriangle, ChevronRight,
  BarChart3, ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAnimals } from '@/context/AnimalsContext';
import { useAuth } from '@/context/AuthContext';
import { isBreederEligible } from '@/utils/breederUtils';
import { supabase } from '@/integrations/supabase/client';

const GESTATION_DAYS = 63;

interface Reproduction {
  id: string;
  animal_id: string;
  date_saillie: string;
  status: string;
  confirmed: boolean;
  father_animal_id: string | null;
  father_external_name: string | null;
  notes: string | null;
}

interface Litter {
  id: string;
  mother_id: string;
  birth_date: string;
  father_name: string | null;
  newborn_count?: number;
}

export default function ElevagePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { animaux } = useAnimals();
  const [reproductions, setReproductions] = useState<Reproduction[]>([]);
  const [litters, setLitters] = useState<Litter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [reproRes, litterRes] = await Promise.all([
        supabase.from('reproductions').select('*').eq('user_id', user.id).order('date_saillie', { ascending: false }),
        supabase.from('litters').select('*').eq('user_id', user.id).order('birth_date', { ascending: false }),
      ]);

      if (reproRes.data) setReproductions(reproRes.data as Reproduction[]);

      if (litterRes.data) {
        const withCounts = await Promise.all(
          (litterRes.data as Litter[]).map(async (l) => {
            const { count } = await supabase
              .from('animals')
              .select('id', { count: 'exact', head: true })
              .eq('litter_id', l.id);
            return { ...l, newborn_count: count || 0 };
          })
        );
        setLitters(withCounts);
      }
      setLoading(false);
    })();
  }, [user]);

  // Derived data
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

  const availableKittens = useMemo(
    () => animaux.filter(a =>
      a.litter_id && !a.paradis &&
      (a.commercial_status === 'available' || !a.commercial_status)
    ),
    [animaux]
  );

  // Alerts
  const alerts: string[] = [];
  activeGestations.forEach(g => {
    const start = new Date(g.date_saillie).getTime();
    const days = Math.floor((Date.now() - start) / 86400000);
    if (days >= 55) {
      const mother = animaux.find(a => a.id === g.animal_id);
      alerts.push(`${mother?.nom || 'Femelle'} : mise-bas imminente (J${days}/${GESTATION_DAYS})`);
    }
  });

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR');
  const getAnimalName = (id: string) => animaux.find(a => a.id === id)?.nom || 'Inconnu';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-primary">Élevage</h1>
          <Button variant="ghost" size="sm" onClick={() => navigate('/stats-elevage')} className="gap-1 text-muted-foreground">
            <BarChart3 className="w-4 h-4" />
            Stats
          </Button>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* ─── SECTION 1: Dashboard ─────────────────────── */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Tableau de bord</h2>
          <div className="grid grid-cols-2 gap-3">
            <DashCard icon={<Heart className="w-4 h-4 text-[hsl(var(--female-accent))]" />} label="Femelles reproductrices" value={females.length} />
            <DashCard icon={<Users className="w-4 h-4 text-[hsl(var(--male-accent))]" />} label="Mâles reproducteurs" value={males.length} />
            <DashCard icon={<Clock className="w-4 h-4 text-[hsl(var(--status-orange))]" />} label="Gestations en cours" value={activeGestations.length} />
            <DashCard icon={<Baby className="w-4 h-4 text-primary" />} label="Portées en cours" value={activeLitters.length} />
          </div>
          <div className="grid grid-cols-1 gap-3 mt-3">
            <DashCard icon={<Baby className="w-4 h-4 text-[hsl(var(--status-green))]" />} label="Chatons disponibles" value={availableKittens.length} />
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="mt-3 space-y-2">
              {alerts.map((a, i) => (
                <div key={i} className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <span className="text-sm text-destructive font-medium">{a}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── SECTION 2: Reproducteurs ─────────────────── */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Reproducteurs</h2>
          {eligible.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun reproducteur éligible.</p>
          ) : (
            <div className="space-y-2">
              {eligible.slice(0, 6).map(a => {
                const litterCount = litters.filter(l => l.mother_id === a.id).length;
                const reproCount = reproductions.filter(r => r.animal_id === a.id || r.father_animal_id === a.id).length;
                return (
                  <button
                    key={a.id}
                    onClick={() => navigate(`/profil/${a.id}`)}
                    className="w-full flex items-center gap-3 bg-card rounded-xl border border-border p-3 shadow-sm hover:shadow-md transition-shadow text-left"
                  >
                    {a.photo ? (
                      <img src={a.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                        {a.sexe?.toLowerCase().startsWith('f') ? '♀' : '♂'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{a.nom}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.sexe?.toLowerCase().startsWith('f') ? `${litterCount} portée(s)` : `${reproCount} saillie(s)`}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
              {eligible.length > 6 && (
                <p className="text-xs text-center text-muted-foreground pt-1">
                  + {eligible.length - 6} autres
                </p>
              )}
            </div>
          )}
        </section>

        {/* ─── SECTION 3: Gestations ────────────────────── */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Gestations en cours</h2>
          {activeGestations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune gestation en cours.</p>
          ) : (
            <div className="space-y-2">
              {activeGestations.map(g => {
                const start = new Date(g.date_saillie);
                const expected = new Date(start);
                expected.setDate(expected.getDate() + GESTATION_DAYS);
                const days = Math.floor((Date.now() - start.getTime()) / 86400000);
                const mother = animaux.find(a => a.id === g.animal_id);
                const progress = Math.round((days / GESTATION_DAYS) * 100);

                return (
                  <Card key={g.id} className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-sm">{mother?.nom || 'Femelle'}</p>
                      <Badge variant="secondary" className="text-xs">J{days}/{GESTATION_DAYS}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Saillie : {fmt(g.date_saillie)} • Mise-bas estimée : {fmt(expected.toISOString())}
                    </p>
                    {/* Progress bar */}
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs text-primary p-0 h-auto"
                      onClick={() => navigate(`/reproduction/${g.animal_id}`)}
                    >
                      Voir détails <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── SECTION 4: Portées ───────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Portées</h2>
            <Button variant="ghost" size="sm" className="text-primary text-xs p-0 h-auto" onClick={() => navigate('/portees')}>
              Voir tout <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          {litters.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune portée enregistrée.</p>
          ) : (
            <div className="space-y-2">
              {litters.slice(0, 5).map(l => (
                <button
                  key={l.id}
                  onClick={() => navigate(`/portee/${l.id}`)}
                  className="w-full flex items-center justify-between bg-card rounded-xl border border-border p-3 shadow-sm hover:shadow-md transition-shadow text-left"
                >
                  <div>
                    <p className="font-bold text-sm">{getAnimalName(l.mother_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmt(l.birth_date)} • {l.newborn_count || 0} petit(s)
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
              {litters.length > 5 && (
                <Button variant="ghost" size="sm" className="w-full text-primary text-xs" onClick={() => navigate('/portees')}>
                  Voir les {litters.length - 5} portées restantes
                </Button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DashCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-extrabold text-foreground leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{label}</p>
      </div>
    </Card>
  );
}
