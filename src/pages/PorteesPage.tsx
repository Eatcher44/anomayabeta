import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Baby, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAnimals } from '@/context/AnimalsContext';
import { isBreederEligible } from '@/utils/breederUtils';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DateField from '@/components/DateField';
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
  const { animaux, addAnimal } = useAnimals();
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

  const females = animaux.filter((a) =>
    a.sexe?.toLowerCase().startsWith('f') && !a.paradis && isBreederEligible(a.type)
  );

  const males = animaux.filter((a) =>
    a.sexe?.toLowerCase().startsWith('m') && !a.paradis && isBreederEligible(a.type)
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

    const fatherId = searchParams.get('father_animal_id');
    const fatherName = searchParams.get('father_external_name');
    if (fatherId) {
      setFatherMode('existing');
      setFatherId(fatherId);
    } else if (fatherName) {
      setFatherMode('manual');
      setFatherManualName(fatherName);
    } else {
      setFatherMode('none');
    }

    const bd = searchParams.get('birth_date');
    if (bd) setBirthDate(new Date(bd));

    setNbNewborns(1);
    setModalOpen(true);
    // Clear search params
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const createLitter = async () => {
    if (!user || !motherId || !birthDateValid || nbNewborns < 1) return;
    setSaving(true);

    const mother = animaux.find((a) => a.id === motherId);
    if (!mother) { setSaving(false); return; }

    try {
      const fatherIdValue = fatherMode === 'existing' && fatherId ? fatherId : null;
      const fatherNameValue = fatherMode === 'manual' && fatherManualName.trim() ? fatherManualName.trim() : null;

      const { data: litterData, error: litterError } = await supabase
        .from('litters')
        .insert({
          user_id: user.id,
          mother_id: motherId,
          father_id: fatherIdValue,
          father_name: fatherNameValue,
          birth_date: birthDate.toISOString().split('T')[0],
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

      // Create newborn animal profiles with breeder_visible=false
      for (let i = 0; i < nbNewborns; i++) {
        await addAnimal({
          nom: `${mother.nom} - Bébé ${i + 1}`,
          type: mother.type,
          sexe: 'Femelle',
          race: mother.race,
          naissance: birthDate.toISOString(),
          sterilise: false,
          poids: [],
          soins: [],
          consultations: [],
        });
      }

      // Link newborns to litter and set breeder_visible=false
      const { data: newAnimals } = await supabase
        .from('animals')
        .select('id')
        .eq('user_id', user.id)
        .is('litter_id', null)
        .order('created_at', { ascending: false })
        .limit(nbNewborns);

      if (newAnimals) {
        for (const na of newAnimals) {
          await supabase
            .from('animals')
            .update({
              litter_id: (litterData as any).id,
              mother_id: motherId,
              breeder_visible: false,
            })
            .eq('id', na.id);
        }
      }

      setModalOpen(false);
      setReproductionId(null);
      toast({ title: 'Portée créée', description: `${nbNewborns} profils créés.` });
      await fetchLitters();
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR');
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
              <button
                key={l.id}
                onClick={() => navigate(`/portee/${l.id}`)}
                className="w-full text-left bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{getMotherName(l.mother_id)}</p>
                    <p className="text-sm text-muted-foreground">
                      Née le {fmt(l.birth_date)} • {l.newborn_count || 0} petit(s)
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

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
