import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Baby, ChevronRight, Plus, MoreVertical, Trash2, Bird, RefreshCw, Clock, Tag, Edit, Scale, UtensilsCrossed, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import { useAnimals } from '@/context/AnimalsContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatWeight } from '@/components/AnimalRow';
import type { Animal, CommercialStatus } from '@/types/animal';

function isSexUnsetStatic(a: Animal) {
  const sex = a.sexe?.toLowerCase();
  return !sex || (sex !== 'mâle' && sex !== 'male' && sex !== 'femelle' && sex !== 'female');
}

const COMMERCIAL_STATUSES: { value: CommercialStatus; label: string; color: string; darkColor: string; textColor: string; darkTextColor: string }[] = [
  { value: 'available', label: 'Disponible', color: 'bg-[hsl(145,50%,88%)]', darkColor: 'dark:bg-[hsl(145,30%,20%)]', textColor: 'text-[hsl(145,50%,25%)]', darkTextColor: 'dark:text-[hsl(145,50%,65%)]' },
  { value: 'option', label: 'Option', color: 'bg-[hsl(45,80%,88%)]', darkColor: 'dark:bg-[hsl(45,40%,18%)]', textColor: 'text-[hsl(45,70%,25%)]', darkTextColor: 'dark:text-[hsl(45,70%,65%)]' },
  { value: 'reserved', label: 'Réservé', color: 'bg-[hsl(30,80%,90%)]', darkColor: 'dark:bg-[hsl(30,40%,18%)]', textColor: 'text-[hsl(30,70%,30%)]', darkTextColor: 'dark:text-[hsl(30,70%,65%)]' },
  { value: 'sold', label: 'Vendu', color: 'bg-[hsl(0,60%,92%)]', darkColor: 'dark:bg-[hsl(0,30%,20%)]', textColor: 'text-[hsl(0,60%,35%)]', darkTextColor: 'dark:text-[hsl(0,50%,65%)]' },
  { value: 'kept', label: 'Gardé', color: 'bg-[hsl(211,60%,90%)]', darkColor: 'dark:bg-[hsl(211,30%,20%)]', textColor: 'text-[hsl(211,60%,30%)]', darkTextColor: 'dark:text-[hsl(211,60%,70%)]' },
];

function getStatusConfig(status: CommercialStatus | undefined) {
  return COMMERCIAL_STATUSES.find((s) => s.value === (status || 'available')) || COMMERCIAL_STATUSES[0];
}

type FilterKey = 'all' | CommercialStatus;

// Helper: get last weight
function getLastWeight(a: Animal): number | null {
  if (!Array.isArray(a?.poids) || a.poids.length === 0) return null;
  const sorted = [...a.poids].sort((b, c) => new Date(c.date).getTime() - new Date(b.date).getTime());
  return typeof sorted[0]?.poids === 'number' ? sorted[0].poids : null;
}

// Helper: get last feeding
function getLastRepas(a: Animal): { quantity: number; time: string } | null {
  if (!Array.isArray(a?.repas) || a.repas.length === 0) return null;
  const sorted = [...a.repas].sort((b, c) => new Date(`${c.date}T${c.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
  return sorted[0] ? { quantity: sorted[0].quantity, time: sorted[0].time } : null;
}

export default function LitterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { animaux, setAnimaux } = useAnimals();

  const [litter, setLitter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [paradisId, setParadisId] = useState<string | null>(null);

  // Long press
  const [longPressAnimal, setLongPressAnimal] = useState<Animal | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = (animal: Animal) => {
    longPressTimer.current = setTimeout(() => {
      setLongPressAnimal(animal);
    }, 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const fetchLitter = useCallback(async () => {
    if (!user || !id) return;
    const { data } = await supabase.from('litters').select('*').eq('id', id).single();
    if (data) setLitter(data);
    setLoading(false);
  }, [user, id]);

  useEffect(() => {
    fetchLitter();
  }, [fetchLitter]);

  // Derive newborns from animaux state
  const allNewborns = animaux.filter((a) => a.litter_id === id);
  const activeNewborns = allNewborns.filter((a) => !a.paradis);

  const sexDefined = useMemo(() => activeNewborns.filter((a) => !isSexUnsetStatic(a)).length, [activeNewborns]);
  const sexTotal = activeNewborns.length;
  const sexRemaining = sexTotal - sexDefined;

  // Apply filters
  const newborns = useMemo(() => {
    let list = activeNewborns;
    if (sexFilter === 'unset') list = list.filter((a) => isSexUnsetStatic(a));
    if (commercialFilter !== 'all') list = list.filter((a) => (a.commercial_status || 'available') === commercialFilter);
    return list;
  }, [activeNewborns, sexFilter, commercialFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (!litter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Portée introuvable.</p>
      </div>
    );
  }

  const motherName = animaux.find((a) => a.id === litter.mother_id)?.nom || 'Inconnue';
  const fatherName = litter.father_id
    ? animaux.find((a) => a.id === litter.father_id)?.nom || 'Inconnu'
    : litter.father_name || null;

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR');
  const isSexUnset = isSexUnsetStatic;

  const handleSetSex = async (animalId: string, sex: 'Mâle' | 'Femelle') => {
    try {
      const { error } = await supabase.from('animals').update({ sexe: sex }).eq('id', animalId);
      if (error) throw error;
      setAnimaux((prev) => prev.map((a) => (a.id === animalId ? { ...a, sexe: sex } : a)));
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleSetCommercialStatus = async (animalId: string, status: CommercialStatus) => {
    try {
      const { error } = await supabase.from('animals').update({ commercial_status: status } as any).eq('id', animalId);
      if (error) throw error;
      setAnimaux((prev) => prev.map((a) => (a.id === animalId ? { ...a, commercial_status: status } : a)));
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleAddNewborn = async () => {
    if (!user || !litter) return;
    setAdding(true);
    try {
      const mother = animaux.find((a) => a.id === litter.mother_id);
      const existingCount = animaux.filter((a) => a.litter_id === id).length;
      const { data, error } = await supabase
        .from('animals')
        .insert({
          user_id: user.id,
          nom: `Petit ${existingCount + 1}`,
          type: mother?.type || 'Chat',
          sexe: 'unknown',
          race: mother?.race || null,
          naissance: litter.birth_date,
          sterilise: false,
          poids: '[]',
          soins: '[]',
          consultations: '[]',
          breeder_visible: false,
          litter_id: id,
          mother_id: litter.mother_id,
          commercial_status: 'available',
        } as any)
        .select()
        .single();
      if (error) throw error;
      if (data) {
        const newAnimal: Animal = {
          id: data.id, nom: data.nom, type: data.type, sexe: data.sexe,
          race: data.race || undefined,
          naissance: data.naissance ? new Date(data.naissance).toISOString() : undefined,
          sterilise: false, breeder_visible: false,
          litter_id: (data as any).litter_id, mother_id: (data as any).mother_id,
          commercial_status: 'available',
          poids: [], soins: [], consultations: [], repas: [],
          createdAt: data.created_at,
        };
        setAnimaux((prev) => [newAnimal, ...prev]);
      }
      toast({ title: 'Nouveau-né ajouté' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteNewborn = async () => {
    if (!deleteId) return;
    try {
      await supabase.from('animals').delete().eq('id', deleteId);
      setAnimaux((prev) => prev.filter((a) => a.id !== deleteId));
      toast({ title: 'Nouveau-né supprimé' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
    setDeleteId(null);
  };

  const handleParadisNewborn = async () => {
    if (!paradisId) return;
    try {
      await supabase.from('animals').update({ paradis: true }).eq('id', paradisId);
      await supabase.from('notifications').delete().eq('animal_id', paradisId);
      setAnimaux((prev) => prev.map((a) => (a.id === paradisId ? { ...a, paradis: true } : a)));
      toast({ title: 'Envoyé au paradis 🕊️' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
    setParadisId(null);
  };

  const handleRecovery = async () => {
    if (!user || !litter || recoveryCount < 1) return;
    setRecovering(true);
    try {
      const mother = animaux.find((a) => a.id === litter.mother_id);
      const existingCount = animaux.filter((a) => a.litter_id === id).length;
      const created: any[] = [];
      for (let i = 0; i < recoveryCount; i++) {
        const { data, error } = await supabase
          .from('animals')
          .insert({
            user_id: user.id, nom: `Petit ${existingCount + i + 1}`,
            type: mother?.type || 'Chat', sexe: 'unknown',
            race: mother?.race || null, naissance: litter.birth_date,
            sterilise: false, poids: '[]', soins: '[]', consultations: '[]',
            breeder_visible: false, litter_id: id, mother_id: litter.mother_id,
            commercial_status: 'available',
          } as any)
          .select().single();
        if (error) console.error(error);
        else if (data) created.push(data);
      }
      if (created.length > 0) {
        const mapped = created.map((data: any) => ({
          id: data.id, nom: data.nom, type: data.type, sexe: data.sexe,
          race: data.race || undefined,
          naissance: data.naissance ? new Date(data.naissance).toISOString() : undefined,
          sterilise: false, breeder_visible: false,
          litter_id: data.litter_id, mother_id: data.mother_id,
          commercial_status: 'available' as const,
          poids: [], soins: [], consultations: [],
          createdAt: data.created_at,
        }));
        setAnimaux((prev: any[]) => [...mapped, ...prev]);
      }
      setRecoveryOpen(false);
      toast({ title: `${created.length} profil(s) générés` });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setRecovering(false);
    }
  };

  const getSexBgClass = (nb: Animal) => {
    const sex = nb.sexe?.toLowerCase();
    if (!sex || (sex !== 'mâle' && sex !== 'male' && sex !== 'femelle' && sex !== 'female')) {
      return 'bg-[hsl(145,40%,92%)] dark:bg-[hsl(145,25%,18%)] border-[hsl(145,30%,75%)] dark:border-[hsl(145,20%,30%)]';
    }
    if (sex.startsWith('m')) {
      return 'bg-[hsl(211,60%,93%)] dark:bg-[hsl(211,30%,18%)] border-[hsl(211,40%,78%)] dark:border-[hsl(211,20%,30%)]';
    }
    return 'bg-[hsl(340,60%,93%)] dark:bg-[hsl(340,30%,18%)] border-[hsl(340,40%,78%)] dark:border-[hsl(340,20%,30%)]';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background">
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/portees')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Baby className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-lg">Portée — {motherName}</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Litter info */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mère</span>
            <button onClick={() => navigate(`/profil/${litter.mother_id}`)} className="font-bold text-primary hover:underline text-sm">
              {motherName}
            </button>
          </div>
          {fatherName && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Père</span>
              <span className="font-bold">
                {litter.father_id ? (
                  <button onClick={() => navigate(`/profil/${litter.father_id}`)} className="text-primary hover:underline">
                    {fatherName}
                  </button>
                ) : fatherName}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date de naissance</span>
            <span className="font-bold">{fmt(litter.birth_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nombre de petits</span>
            <span className="font-bold">{allNewborns.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Sexes définis</span>
            <Badge variant={sexDefined === sexTotal && sexTotal > 0 ? 'default' : 'secondary'} className="text-xs">
              {sexDefined} / {sexTotal}
            </Badge>
          </div>
        </div>

        {/* Add newborn button */}
        <Button onClick={handleAddNewborn} disabled={adding} variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          {adding ? 'Ajout...' : 'Ajouter un nouveau-né'}
        </Button>

        {/* Commercial status filter */}
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-1.5 min-w-max">
            {[{ value: 'all' as FilterKey, label: 'Tous' }, ...COMMERCIAL_STATUSES].map((s) => (
              <button
                key={s.value}
                onClick={() => setCommercialFilter(s.value as FilterKey)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                  commercialFilter === s.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section header with sex filter */}
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-lg">Nouveau-nés</h2>
          <div className="flex rounded-full border border-border overflow-hidden text-xs">
            <button
              onClick={() => setSexFilter('all')}
              className={`px-3 py-1 transition-colors ${sexFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent'}`}
            >
              Tous
            </button>
            <button
              onClick={() => setSexFilter('unset')}
              className={`px-3 py-1 transition-colors ${sexFilter === 'unset' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent'}`}
            >
              Sexe à définir
            </button>
          </div>
        </div>

        {/* Banner for remaining unknown sexes */}
        {sexRemaining > 0 && (
          <div className="flex items-center justify-between bg-[hsl(145,40%,92%)] dark:bg-[hsl(145,25%,18%)] border border-[hsl(145,30%,75%)] dark:border-[hsl(145,20%,30%)] rounded-lg px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Il reste {sexRemaining} sexe{sexRemaining > 1 ? 's' : ''} à définir.
            </p>
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate('/portees')}>
              <Clock className="w-3 h-3" />
              Définir plus tard
            </Button>
          </div>
        )}

        {newborns.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-muted-foreground">
              {activeNewborns.length === 0 ? 'Aucun nouveau-né enregistré.' : 'Aucun résultat pour ce filtre.'}
            </p>
            {activeNewborns.length === 0 && (
              <Button variant="outline" onClick={() => { setRecoveryCount(1); setRecoveryOpen(true); }} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Générer les profils manquants
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {newborns.map((nb) => {
              const statusCfg = getStatusConfig(nb.commercial_status);
              return (
                <div
                  key={nb.id}
                  className={`rounded-xl border p-4 shadow-sm transition-shadow ${getSexBgClass(nb)}`}
                >
                  <div className="flex items-center justify-between">
                    <button onClick={() => navigate(`/profil/${nb.id}`)} className="flex-1 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {nb.photo ? (
                            <img src={nb.photo} alt={nb.nom} className="w-full h-full object-cover" />
                          ) : (
                            <Baby className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Distinction color dot */}
                            {nb.couleur && (
                              <span
                                className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                                style={{ backgroundColor: nb.couleur }}
                                title={`Distinction: ${nb.couleur}`}
                              />
                            )}
                            <p className="font-bold">{nb.nom}</p>
                            {/* Commercial status badge */}
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 h-4 border ${statusCfg.color} ${statusCfg.darkColor} ${statusCfg.textColor} ${statusCfg.darkTextColor}`}
                            >
                              {statusCfg.label}
                            </Badge>
                            {isSexUnset(nb) && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-[hsl(145,40%,88%)] dark:bg-[hsl(145,25%,22%)] border-[hsl(145,30%,70%)] text-[hsl(145,40%,30%)] dark:text-[hsl(145,50%,65%)]">
                                Sexe à définir
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {isSexUnset(nb) ? 'Non défini' : nb.sexe}
                            {nb.race ? ` • ${nb.race}` : ''}
                          </p>
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Tag className="w-4 h-4 mr-2" />
                              Changer le statut
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {COMMERCIAL_STATUSES.map((s) => (
                                <DropdownMenuItem
                                  key={s.value}
                                  onClick={() => handleSetCommercialStatus(nb.id, s.value)}
                                  className={nb.commercial_status === s.value || (!nb.commercial_status && s.value === 'available') ? 'font-bold' : ''}
                                >
                                  {s.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setParadisId(nb.id)}>
                            <Bird className="w-4 h-4 mr-2" />
                            Envoyer au paradis
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(nb.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Sex selection buttons if sex not set */}
                  {isSexUnset(nb) && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm" variant="outline"
                        className="flex-1 bg-[hsl(211,60%,93%)] border-[hsl(211,40%,70%)] text-[hsl(211,60%,35%)] hover:bg-[hsl(211,60%,88%)] dark:bg-[hsl(211,30%,20%)] dark:text-[hsl(211,70%,70%)] dark:border-[hsl(211,20%,35%)]"
                        onClick={(e) => { e.stopPropagation(); handleSetSex(nb.id, 'Mâle'); }}
                      >
                        ♂ Mâle
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        className="flex-1 bg-[hsl(340,60%,93%)] border-[hsl(340,40%,70%)] text-[hsl(340,60%,35%)] hover:bg-[hsl(340,60%,88%)] dark:bg-[hsl(340,30%,20%)] dark:text-[hsl(340,70%,70%)] dark:border-[hsl(340,20%,35%)]"
                        onClick={(e) => { e.stopPropagation(); handleSetSex(nb.id, 'Femelle'); }}
                      >
                        ♀ Femelle
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce nouveau-né ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement le profil et toutes ses données associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNewborn} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Paradis confirmation */}
      <AlertDialog open={!!paradisId} onOpenChange={(open) => !open && setParadisId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Envoyer au paradis ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le profil sera archivé en mode lecture seule et les notifications supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleParadisNewborn}>Confirmer 🕊️</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recovery modal */}
      <Dialog open={recoveryOpen} onOpenChange={setRecoveryOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Générer les profils manquants</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Combien de petits à créer ?</Label>
              <Input
                type="number" min={1} max={20} value={recoveryCount}
                onChange={(e) => setRecoveryCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="mt-1.5"
              />
            </div>
            <Button onClick={handleRecovery} disabled={recovering || recoveryCount < 1} className="w-full">
              {recovering ? 'Génération...' : `Créer ${recoveryCount} profil(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
