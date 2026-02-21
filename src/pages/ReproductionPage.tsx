import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Check, X, Baby, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAnimals } from '@/context/AnimalsContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DateField from '@/components/DateField';
import { toast } from '@/hooks/use-toast';

interface Reproduction {
  id: string;
  animal_id: string;
  date_saillie: string;
  notes: string | null;
  confirmed: boolean;
  created_at: string;
}

// Gestation duration: 63 days for both cats and dogs
const GESTATION_DAYS = 63;

function getGestationDays(_type: string): number {
  return GESTATION_DAYS;
}

export default function ReproductionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { animaux } = useAnimals();
  const animal = animaux.find((a) => a.id === id);

  const [records, setRecords] = useState<Reproduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [dateDraft, setDateDraft] = useState(new Date());
  const [dateValid, setDateValid] = useState(true);
  const [notesDraft, setNotesDraft] = useState('');
  const [confirmedDraft, setConfirmedDraft] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data, error } = await supabase
        .from('reproductions')
        .select('*')
        .eq('animal_id', id)
        .order('date_saillie', { ascending: false });
      if (!error && data) setRecords(data as Reproduction[]);
      setLoading(false);
    })();
  }, [user, id]);

  if (!animal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Animal introuvable.</p>
      </div>
    );
  }

  const gestDays = getGestationDays(animal.type);

  const openAdd = () => {
    setEditId(null);
    setDateDraft(new Date());
    setNotesDraft('');
    setConfirmedDraft(false);
    setModalOpen(true);
  };

  const openEdit = (r: Reproduction) => {
    setEditId(r.id);
    setDateDraft(new Date(r.date_saillie));
    setNotesDraft(r.notes || '');
    setConfirmedDraft(r.confirmed);
    setModalOpen(true);
  };

  const save = async () => {
    if (!user || !dateValid) return;
    const payload = {
      user_id: user.id,
      animal_id: animal.id,
      date_saillie: dateDraft.toISOString().split('T')[0],
      notes: notesDraft.trim() || null,
      confirmed: confirmedDraft,
    };

    try {
      if (editId) {
        const { error } = await supabase.from('reproductions').update(payload).eq('id', editId);
        if (error) throw error;
        setRecords((prev) => prev.map((r) => r.id === editId ? { ...r, ...payload } : r));
      } else {
        const { data, error } = await supabase.from('reproductions').insert(payload).select().single();
        if (error) throw error;
        if (data) setRecords((prev) => [data as Reproduction, ...prev]);
      }
      setModalOpen(false);
      toast({ title: editId ? 'Saillie modifiée' : 'Saillie enregistrée' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const deleteRecord = async (rid: string) => {
    try {
      await supabase.from('reproductions').delete().eq('id', rid);
      setRecords((prev) => prev.filter((r) => r.id !== rid));
      toast({ title: 'Saillie supprimée' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background">
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/profil/${animal.id}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Baby className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-lg">Reproduction — {animal.nom}</h1>
      </div>

      <div className="p-4 space-y-4">
        <Button onClick={openAdd} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle saillie
        </Button>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : records.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucune saillie enregistrée.</p>
        ) : (
          <div className="space-y-3">
            {records.map((r) => {
              const saillieDate = new Date(r.date_saillie);
              const expectedBirth = new Date(saillieDate);
              expectedBirth.setDate(expectedBirth.getDate() + gestDays);
              const now = new Date();
              const daysSince = Math.floor((now.getTime() - saillieDate.getTime()) / (1000 * 60 * 60 * 24));
              const isOngoing = daysSince >= 0 && daysSince <= gestDays;

              return (
                <div key={r.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold">Saillie du {fmt(r.date_saillie)}</p>
                      {r.confirmed ? (
                        <Badge variant="default" className="mt-1 gap-1 text-xs">
                          <Check className="w-3 h-3" /> Confirmée
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="mt-1 gap-1 text-xs">
                          Non confirmée
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>Modifier</Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteRecord(r.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <CalendarIcon className="w-3.5 h-3.5 inline mr-1" />
                      Mise-bas estimée : <span className="font-semibold text-foreground">{fmt(expectedBirth.toISOString())}</span>
                    </p>
                    {isOngoing && (
                      <p>
                        <Baby className="w-3.5 h-3.5 inline mr-1" />
                        Jour de gestation : <span className="font-semibold text-foreground">{daysSince} / {gestDays}</span>
                      </p>
                    )}
                    {r.notes && <p className="italic mt-1">{r.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Modifier la saillie' : 'Nouvelle saillie'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Date de prise</Label>
              <div className="mt-1.5">
                <DateField value={dateDraft} onChange={setDateDraft} maximumDate={new Date()} onValidityChange={setDateValid} />
              </div>
            </div>
            <div>
              <Label>Notes (optionnel)</Label>
              <Input value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} placeholder="Notes..." className="mt-1.5" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Saillie confirmée ?</Label>
              <Switch checked={confirmedDraft} onCheckedChange={setConfirmedDraft} />
            </div>
            <Button onClick={save} disabled={!dateValid} className="w-full">
              {editId ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
