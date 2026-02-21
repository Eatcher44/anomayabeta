import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Check, X, Baby, Calendar as CalendarIcon, Ban, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAnimals } from '@/context/AnimalsContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isBreederEligible } from '@/utils/breederUtils';
import DateField from '@/components/DateField';
import { toast } from '@/hooks/use-toast';

interface Reproduction {
  id: string;
  animal_id: string;
  date_saillie: string;
  notes: string | null;
  confirmed: boolean;
  status: string; // 'active' | 'cancelled' | 'birth_confirmed'
  father_animal_id: string | null;
  father_external_name: string | null;
  created_at: string;
}

const GESTATION_DAYS = 63;

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

  // Father selection
  const [fatherMode, setFatherMode] = useState<'none' | 'existing' | 'manual'>('none');
  const [fatherAnimalId, setFatherAnimalId] = useState('');
  const [fatherExternalName, setFatherExternalName] = useState('');

  // Cancel / Delete dialogs
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Birth confirmation dialog
  const [birthTargetId, setBirthTargetId] = useState<string | null>(null);

  const males = animaux.filter(
    (a) => a.sexe?.toLowerCase().startsWith('m') && !a.paradis && isBreederEligible(a.type)
  );

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

  const openAdd = () => {
    setEditId(null);
    setDateDraft(new Date());
    setNotesDraft('');
    setConfirmedDraft(false);
    setFatherMode('none');
    setFatherAnimalId('');
    setFatherExternalName('');
    setModalOpen(true);
  };

  const openEdit = (r: Reproduction) => {
    setEditId(r.id);
    setDateDraft(new Date(r.date_saillie));
    setNotesDraft(r.notes || '');
    setConfirmedDraft(r.confirmed);
    if (r.father_animal_id) {
      setFatherMode('existing');
      setFatherAnimalId(r.father_animal_id);
      setFatherExternalName('');
    } else if (r.father_external_name) {
      setFatherMode('manual');
      setFatherAnimalId('');
      setFatherExternalName(r.father_external_name);
    } else {
      setFatherMode('none');
      setFatherAnimalId('');
      setFatherExternalName('');
    }
    setModalOpen(true);
  };

  const save = async () => {
    if (!user || !dateValid) return;
    const payload: any = {
      user_id: user.id,
      animal_id: animal.id,
      date_saillie: dateDraft.toISOString().split('T')[0],
      notes: notesDraft.trim() || null,
      confirmed: confirmedDraft,
      father_animal_id: fatherMode === 'existing' && fatherAnimalId ? fatherAnimalId : null,
      father_external_name: fatherMode === 'manual' && fatherExternalName.trim() ? fatherExternalName.trim() : null,
    };

    try {
      if (editId) {
        const { error } = await supabase.from('reproductions').update(payload).eq('id', editId);
        if (error) throw error;
        setRecords((prev) => prev.map((r) => r.id === editId ? { ...r, ...payload } : r));
      } else {
        payload.status = 'active';
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

  const cancelRecord = async () => {
    if (!cancelTargetId) return;
    try {
      await supabase.from('reproductions').update({ status: 'cancelled' }).eq('id', cancelTargetId);
      // Remove linked notifications
      await supabase.from('notifications').delete().eq('animal_id', animal.id).eq('type', 'reproduction');
      setRecords((prev) => prev.map((r) => r.id === cancelTargetId ? { ...r, status: 'cancelled' } : r));
      toast({ title: 'Saillie annulée' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
    setCancelTargetId(null);
  };

  const deleteRecord = async () => {
    if (!deleteTargetId) return;
    try {
      await supabase.from('reproductions').delete().eq('id', deleteTargetId);
      setRecords((prev) => prev.filter((r) => r.id !== deleteTargetId));
      toast({ title: 'Saillie supprimée' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
    setDeleteTargetId(null);
  };

  const confirmBirth = () => {
    if (!birthTargetId) return;
    const rec = records.find((r) => r.id === birthTargetId);
    if (!rec) return;
    // Navigate to portées with prefill params
    const params = new URLSearchParams({
      from_reproduction: rec.id,
      mother_id: animal.id,
      birth_date: new Date().toISOString().split('T')[0],
    });
    if (rec.father_animal_id) params.set('father_animal_id', rec.father_animal_id);
    if (rec.father_external_name) params.set('father_external_name', rec.father_external_name);
    navigate(`/portees?${params.toString()}`);
    setBirthTargetId(null);
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR');

  const getFatherLabel = (r: Reproduction) => {
    if (r.father_animal_id) {
      const father = animaux.find((a) => a.id === r.father_animal_id);
      return father?.nom || 'Inconnu';
    }
    if (r.father_external_name) return r.father_external_name;
    return null;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'cancelled':
        return <Badge variant="outline" className="mt-1 gap-1 text-xs text-muted-foreground border-muted-foreground/40"><Ban className="w-3 h-3" /> Annulée</Badge>;
      case 'birth_confirmed':
        return <Badge variant="default" className="mt-1 gap-1 text-xs bg-green-600"><Check className="w-3 h-3" /> Mise-bas effectuée</Badge>;
      default:
        return null;
    }
  };

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
              expectedBirth.setDate(expectedBirth.getDate() + GESTATION_DAYS);
              const now = new Date();
              const daysSince = Math.floor((now.getTime() - saillieDate.getTime()) / (1000 * 60 * 60 * 24));
              const isOngoing = r.status === 'active' && daysSince >= 0 && daysSince <= GESTATION_DAYS;
              const isCancelled = r.status === 'cancelled';
              const isBirthDone = r.status === 'birth_confirmed';
              const fatherLabel = getFatherLabel(r);

              return (
                <div key={r.id} className={`bg-card rounded-xl border border-border p-4 shadow-sm ${isCancelled ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold">Saillie du {fmt(r.date_saillie)}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.confirmed && r.status === 'active' && (
                          <Badge variant="default" className="gap-1 text-xs">
                            <Check className="w-3 h-3" /> Confirmée
                          </Badge>
                        )}
                        {!r.confirmed && r.status === 'active' && (
                          <Badge variant="secondary" className="gap-1 text-xs">Non confirmée</Badge>
                        )}
                        {statusBadge(r.status)}
                      </div>
                    </div>
                    {!isCancelled && !isBirthDone && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>Modifier</Button>
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    {fatherLabel && (
                      <p>♂ Père : <span className="font-semibold text-foreground">{fatherLabel}</span></p>
                    )}
                    {!isCancelled && (
                      <p>
                        <CalendarIcon className="w-3.5 h-3.5 inline mr-1" />
                        Mise-bas estimée : <span className="font-semibold text-foreground">{fmt(expectedBirth.toISOString())}</span>
                      </p>
                    )}
                    {isOngoing && (
                      <p>
                        <Baby className="w-3.5 h-3.5 inline mr-1" />
                        Jour de gestation : <span className="font-semibold text-foreground">{daysSince} / {GESTATION_DAYS}</span>
                      </p>
                    )}
                    {r.notes && <p className="italic mt-1">{r.notes}</p>}
                  </div>

                  {/* Action buttons */}
                  {r.status === 'active' && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                      <Button
                        size="sm"
                        onClick={() => setBirthTargetId(r.id)}
                        className="gap-1"
                      >
                        <Baby className="w-3.5 h-3.5" />
                        Mise-bas effectuée
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCancelTargetId(r.id)}
                        className="gap-1 text-muted-foreground"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Annuler
                      </Button>
                    </div>
                  )}
                  {(isCancelled || isBirthDone) && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive gap-1"
                        onClick={() => setDeleteTargetId(r.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Supprimer définitivement
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
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
              <Label>Père (optionnel)</Label>
              <div className="flex gap-2 mt-1.5 mb-2">
                {(['none', 'existing', 'manual'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => { setFatherMode(mode); setFatherAnimalId(''); setFatherExternalName(''); }}
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
                <Select value={fatherAnimalId} onValueChange={setFatherAnimalId}>
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
                  value={fatherExternalName}
                  onChange={(e) => setFatherExternalName(e.target.value)}
                  placeholder="Nom du père externe"
                />
              )}
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

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancelTargetId} onOpenChange={(open) => !open && setCancelTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette saillie ?</AlertDialogTitle>
            <AlertDialogDescription>
              La saillie sera marquée comme annulée et les rappels associés seront supprimés. L'enregistrement restera visible dans l'historique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction onClick={cancelRecord}>Annuler la saillie</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'enregistrement sera supprimé de l'historique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={deleteRecord} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Birth confirmation */}
      <AlertDialog open={!!birthTargetId} onOpenChange={(open) => !open && setBirthTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mise-bas effectuée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez être redirigé vers la création d'une portée avec les informations pré-remplies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBirth}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
