import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Flame, Calendar as CalendarIcon, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAnimals } from '@/context/AnimalsContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DateField from '@/components/DateField';
import { useReminderPicker, ReminderPickerUI, createReminders } from '@/components/ReminderPicker';
import { toDateOnlyString, parseDateOnly, formatDateOnlyFr } from '@/utils/dateOnly';
import { toast } from '@/hooks/use-toast';

interface HeatCycle {
  id: string;
  animal_id: string;
  date_debut: string;
  date_fin: string | null;
  notes: string | null;
  created_at: string;
}

function getNextHeatDays(type: string): number {
  const t = type.toLowerCase();
  if (t === 'chien') return 180;
  return 21; // Chat default
}

export default function ChaleursPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { animaux } = useAnimals();
  const animal = animaux.find((a) => a.id === id);

  const [records, setRecords] = useState<HeatCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [debutDraft, setDebutDraft] = useState(new Date());
  const [debutValid, setDebutValid] = useState(true);
  const [finDraft, setFinDraft] = useState<Date | null>(null);
  const [finValid, setFinValid] = useState(true);
  const [notesDraft, setNotesDraft] = useState('');

  // Reminder state
  const reminder = useReminderPicker();

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data, error } = await supabase
        .from('heat_cycles')
        .select('*')
        .eq('animal_id', id)
        .order('date_debut', { ascending: false });
      if (!error && data) setRecords(data as HeatCycle[]);
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

  const nextHeatDays = getNextHeatDays(animal.type);

  const openAdd = () => {
    setEditId(null);
    setDebutDraft(new Date());
    setFinDraft(null);
    setNotesDraft('');
    reminder.reset();
    setModalOpen(true);
  };

  const openEdit = (r: HeatCycle) => {
    setEditId(r.id);
    setDebutDraft(parseDateOnly(r.date_debut) || new Date());
    setFinDraft(r.date_fin ? (parseDateOnly(r.date_fin) || null) : null);
    setNotesDraft(r.notes || '');
    reminder.reset();
    setModalOpen(true);
  };

  const saveReminders = async (startDate: Date) => {
    if (!user || !animal || reminder.selectedDays.length === 0) return;
    const nextHeat = new Date(startDate);
    nextHeat.setDate(nextHeat.getDate() + nextHeatDays);

    await createReminders({
      userId: user.id,
      animalId: animal.id,
      type: 'chaleurs',
      title: `Chaleurs prévues – ${animal.nom}`,
      eventDate: nextHeat,
      selectedDays: reminder.selectedDays,
    });
  };

  const save = async () => {
    if (!user || !debutValid || !finValid) return;
    const payload = {
      user_id: user.id,
      animal_id: animal.id,
      date_debut: toDateOnlyString(debutDraft),
      date_fin: finDraft ? toDateOnlyString(finDraft) : null,
      notes: notesDraft.trim() || null,
    };

    try {
      if (editId) {
        const { error } = await supabase.from('heat_cycles').update(payload).eq('id', editId);
        if (error) throw error;
        setRecords((prev) => prev.map((r) => r.id === editId ? { ...r, ...payload } : r));
      } else {
        const { data, error } = await supabase.from('heat_cycles').insert(payload).select().single();
        if (error) throw error;
        if (data) {
          setRecords((prev) => [data as HeatCycle, ...prev]);
          await saveReminders(debutDraft);
        }
      }
      setModalOpen(false);
      toast({ title: editId ? 'Chaleurs modifiées' : 'Chaleurs enregistrées' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const deleteRecord = async (rid: string) => {
    try {
      await supabase.from('heat_cycles').delete().eq('id', rid);
      setRecords((prev) => prev.filter((r) => r.id !== rid));
      toast({ title: 'Chaleurs supprimées' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const fmt = (d: string) => formatDateOnlyFr(d);

  // Compute next estimated heat from most recent record
  const latestRecord = records.length > 0 ? records[0] : null;
  const nextHeatDate = latestRecord
    ? (() => {
        const d = parseDateOnly(latestRecord.date_debut) || new Date(latestRecord.date_debut);
        d.setDate(d.getDate() + nextHeatDays);
        return d;
      })()
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background">
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/profil/${animal.id}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Flame className="w-5 h-5 text-destructive" />
        <h1 className="font-bold text-lg">Chaleurs — {animal.nom}</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Next estimated heat */}
        {nextHeatDate && (
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <CalendarIcon className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm">Prochaines chaleurs estimées</span>
            </div>
            <p className="text-lg font-extrabold text-primary">
              {fmt(nextHeatDate.toISOString())}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Basé sur un cycle de {nextHeatDays} jours ({animal.type === 'Chien' ? '~6 mois' : '~3 semaines'})
            </p>
          </div>
        )}

        <Button onClick={openAdd} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Enregistrer des chaleurs
        </Button>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : records.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucune chaleur enregistrée.</p>
        ) : (
          <div className="space-y-3">
            {records.map((r) => {
              const nextEst = parseDateOnly(r.date_debut) || new Date(r.date_debut);
              nextEst.setDate(nextEst.getDate() + nextHeatDays);

              return (
                <div key={r.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold">Début : {fmt(r.date_debut)}</p>
                      {r.date_fin && (
                        <p className="text-sm text-muted-foreground">Fin : {fmt(r.date_fin)}</p>
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
                      <Flame className="w-3.5 h-3.5 inline mr-1 text-destructive" />
                      Prochaines estimées : <span className="font-semibold text-foreground">{fmt(nextEst.toISOString())}</span>
                    </p>
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
            <DialogTitle>{editId ? 'Modifier les chaleurs' : 'Nouvelles chaleurs'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Date de début</Label>
              <div className="mt-1.5">
                <DateField value={debutDraft} onChange={setDebutDraft} maximumDate={new Date()} onValidityChange={setDebutValid} />
              </div>
            </div>
            <div>
              <Label>Date de fin (optionnel)</Label>
              <div className="mt-1.5">
                <DateField
                  value={finDraft || new Date()}
                  onChange={(d) => setFinDraft(d)}
                  maximumDate={new Date()}
                  onValidityChange={setFinValid}
                />
              </div>
              {finDraft && (
                <button
                  onClick={() => setFinDraft(null)}
                  className="text-xs text-destructive mt-1 underline"
                >
                  Retirer la date de fin
                </button>
              )}
            </div>
            <div>
              <Label>Notes (optionnel)</Label>
              <Input value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} placeholder="Notes..." className="mt-1.5" />
            </div>
            {!editId && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Bell className="w-4 h-4 text-primary" />
                  <Label>Rappel avant prochaines chaleurs</Label>
                </div>
                <ReminderPickerUI
                  selectedDays={reminder.selectedDays}
                  customDays={reminder.customDays}
                  setCustomDays={reminder.setCustomDays}
                  toggleDay={reminder.toggleDay}
                  addCustom={reminder.addCustom}
                />
              </div>
            )}
            <Button onClick={save} disabled={!debutValid || !finValid} className="w-full">
              {editId ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
