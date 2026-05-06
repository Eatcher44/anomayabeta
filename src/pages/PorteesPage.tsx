import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Baby, ChevronRight, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAnimals } from '@/context/AnimalsContext';
import { isBreederEligible } from '@/utils/breederUtils';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DateField from '@/components/DateField';
import { toDateOnlyString, parseDateOnly, formatDateOnlyFr } from '@/utils/dateOnly';
import { toast } from '@/hooks/use-toast';

interface Litter {
  id: string;
  mother_id: string;
  father_id: string | null;
  father_name: string | null;
  reproduction_id: string | null;
  birth_date: string;
  notes: string | null;
  created_at: string;
  newborn_count?: number;
}

export default function PorteesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { animaux, addAnimal, setAnimaux } = useAnimals();
  const [litters, setLitters] = useState<Litter[]>([]);
  const [loading, setLoading] = useState(true);

  // Create litter modal
  const [modalOpen, setModalOpen] = useState(false);
  const [motherId, setMotherId] = useState('');
  const [fatherMode, setFatherMode] = useState<'none' | 'existing' | 'manual'>('none');
  const [fatherId, setFatherId] = useState('');
  const [fatherManualName, setFatherManualName] = useState('');
  const [birthDate, setBirthDate] = useState(new Date());
  const [birthDateValid, setBirthDateValid] = useState(true);
  const [nbNewborns, setNbNewborns] = useState(1);
  const [saving, setSaving] = useState(false);
  const [reproductionId, setReproductionId] = useState<string | null>(null);

  // Delete litter
  const [deleteLitterId, setDeleteLitterId] = useState<string | null>(null);

  const females = animaux.filter((a) =>
    a.sexe?.toLowerCase().startsWith('f') && !a.paradis && !a.sterilise && isBreederEligible(a.type)
  );

  const males = animaux.filter((a) =>
    a.sexe?.toLowerCase().startsWith('m') && !a.paradis && !a.sterilise && isBreederEligible(a.type)
  );

  const fetchLitters = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('litters')
      .select('*')
      .order('birth_date', { ascending: false });
    if (!error && data) {
      const littersWithCount = await Promise.all(
        (data as Litter[]).map(async (l) => {
          const { count } = await supabase
            .from('animals')
            .select('id', { count: 'exact', head: true })
            .eq('litter_id', l.id);
          return { ...l, newborn_count: count || 0 };
        })
      );
      setLitters(littersWithCount);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLitters();
  }, [fetchLitters]);

  // Handle prefill from reproduction page
  useEffect(() => {
    const fromRepro = searchParams.get('from_reproduction');
    if (!fromRepro) return;

    setReproductionId(fromRepro);
    setMotherId(searchParams.get('mother_id') || '');

    const fId = searchParams.get('father_animal_id');
    const fName = searchParams.get('father_external_name');
    if (fId) {
      setFatherMode('existing');
      setFatherId(fId);
    } else if (fName) {
      setFatherMode('manual');
      setFatherManualName(fName);
    } else {
      setFatherMode('none');
    }

    const bd = searchParams.get('birth_date');
    if (bd) { const pd = parseDateOnly(bd); if (pd) setBirthDate(pd); }

    setNbNewborns(1);
    setModalOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const createLitter = async () => {
    if (!user || !motherId || !birthDateValid || nbNewborns < 1) return;
    const validCount = Math.max(1, Math.min(20, Math.floor(nbNewborns)));
    setSaving(true);

    const mother = animaux.find((a) => a.id === motherId);
    if (!mother) { setSaving(false); return; }

    try {
      const fatherIdValue = fatherMode === 'existing' && fatherId ? fatherId : null;
      const fatherNameValue = fatherMode === 'manual' && fatherManualName.trim() ? fatherManualName.trim() : null;
      const birthDateStr = toDateOnlyString(birthDate);

      if (import.meta.env.DEV) console.log('[Litter] Creating with newbornCount:', validCount);

      const { data: litterData, error: litterError } = await supabase
        .from('litters')
        .insert({
          user_id: user.id,
          mother_id: motherId,
          father_id: fatherIdValue,
          father_name: fatherNameValue,
          birth_date: birthDateStr,
          reproduction_id: reproductionId,
          notes: null,
        })
        .select()
        .single();

      if (litterError || !litterData) throw litterError;

      // If coming from reproduction, mark it as birth_confirmed
      if (reproductionId) {
        await supabase
          .from('reproductions')
          .update({ status: 'birth_confirmed' })
          .eq('id', reproductionId);
      }

      const litterId = (litterData as any).id;

      if (import.meta.env.DEV) console.log('[Litter] Created litter:', litterId);

      // Create newborn animal profiles
      const createdNewborns: any[] = [];
      for (let i = 0; i < validCount; i++) {
        const { data: newborn, error: nbError } = await supabase
          .from('animals')
          .insert({
            user_id: user.id,
            nom: `Petit ${i + 1}`,
            type: mother.type,
            sexe: 'unknown',
            race: mother.race || null,
            naissance: birthDateStr,
            sterilise: false,
            poids: '[]',
            soins: '[]',
            consultations: '[]',
            breeder_visible: false,
            litter_id: litterId,
            mother_id: motherId,
          } as any)
          .select()
          .single();

        if (nbError) {
          console.error('Error creating newborn:', nbError);
        } else if (newborn) {
          createdNewborns.push(newborn);
        }
      }

      if (import.meta.env.DEV) console.log('[Litter] Newborns created:', createdNewborns.length);

      // Add newborns to local animaux state so LitterDetail can see them immediately
      if (createdNewborns.length > 0) {
        const mapped = createdNewborns.map((data: any) => ({
          id: data.id,
          nom: data.nom,
          type: data.type,
          sexe: data.sexe,
          race: data.race || undefined,
          naissance: data.naissance || undefined,
          sterilise: false,
          breeder_visible: false,
          litter_id: data.litter_id,
          mother_id: data.mother_id,
          poids: [],
          soins: [],
          consultations: [],
          createdAt: data.created_at,
        }));
        setAnimaux((prev: any[]) => [...mapped, ...prev]);
      }

      setModalOpen(false);
      setReproductionId(null);
      toast({ title: 'Portée créée', description: `${createdNewborns.length} profil(s) créés.` });
      await fetchLitters();
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLitter = async () => {
    if (!deleteLitterId) return;
    try {
      // 1. Find all newborn animal IDs linked to this litter
      const { data: newborns } = await supabase
        .from('animals')
        .select('id')
        .eq('litter_id', deleteLitterId);

      if (newborns && newborns.length > 0) {
        const ids = newborns.map((n) => n.id);
        // 2. Delete newborn animals (cascade will clean up notifications, heat_cycles, reproductions, transfer_codes)
        await supabase.from('animals').delete().in('id', ids);
        // Remove from local state
        setAnimaux((prev) => prev.filter((a) => !ids.includes(a.id)));
      }

      // 3. Delete the litter record
      await supabase.from('litters').delete().eq('id', deleteLitterId);

      setLitters((prev) => prev.filter((l) => l.id !== deleteLitterId));
      toast({ title: 'Portée supprimée', description: 'Tous les profils associés ont été supprimés.' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
    setDeleteLitterId(null);
  };

  const fmt = (d: string) => formatDateOnlyFr(d);
  const getMotherName = (mid: string) => animaux.find((a) => a.id === mid)?.nom || 'Inconnue';

  const openCreateModal = () => {
    setMotherId('');
    setFatherMode('none');
    setFatherId('');
    setFatherManualName('');
    setNbNewborns(1);
    setBirthDate(new Date());
    setReproductionId(null);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background">
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Baby className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-lg">Portées</h1>
      </div>

      <div className="p-4 space-y-4">
        <Button onClick={openCreateModal} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Créer une portée
        </Button>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : litters.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucune portée enregistrée.</p>
        ) : (
          <div className="space-y-3">
            {litters.map((l) => (
              <div
                key={l.id}
                className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/portee/${l.id}`)}
                    className="flex-1 text-left"
                  >
                    <p className="font-bold">{getMotherName(l.mother_id)}</p>
                    <p className="text-sm text-muted-foreground">
                      Née le {fmt(l.birth_date)} • {l.newborn_count || 0} petit(s)
                    </p>
                  </button>
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteLitterId(l.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer la portée
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteLitterId} onOpenChange={(open) => !open && setDeleteLitterId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette portée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement la portée et tous les profils de nouveau-nés associés, ainsi que leurs données (poids, vaccins, traitements, rendez-vous, notifications).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLitter}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle portée</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Mère</Label>
              <Select value={motherId} onValueChange={setMotherId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Sélectionner la mère" />
                </SelectTrigger>
                <SelectContent>
                  {females.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Père (optionnel)</Label>
              <div className="flex gap-2 mt-1.5 mb-2">
                {(['none', 'existing', 'manual'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => { setFatherMode(mode); setFatherId(''); setFatherManualName(''); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      fatherMode === mode
                        ? 'border-primary bg-accent text-primary'
                        : 'border-border hover:border-primary text-muted-foreground'
                    }`}
                  >
                    {mode === 'none' ? 'Aucun' : mode === 'existing' ? 'Mes animaux' : 'Nom externe'}
                  </button>
                ))}
              </div>
              {fatherMode === 'existing' && (
                <Select value={fatherId} onValueChange={setFatherId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le père" />
                  </SelectTrigger>
                  <SelectContent>
                    {males.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {fatherMode === 'manual' && (
                <Input
                  value={fatherManualName}
                  onChange={(e) => setFatherManualName(e.target.value)}
                  placeholder="Nom du père externe"
                />
              )}
            </div>
            <div>
              <Label>Date de naissance</Label>
              <div className="mt-1.5">
                <DateField value={birthDate} onChange={setBirthDate} maximumDate={new Date()} onValidityChange={setBirthDateValid} />
              </div>
            </div>
            <div>
              <Label>Nombre de petits</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={nbNewborns}
                onChange={(e) => setNbNewborns(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="mt-1.5"
              />
            </div>
            <Button onClick={createLitter} disabled={!motherId || !birthDateValid || saving} className="w-full">
              {saving ? 'Création...' : 'Créer la portée'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
