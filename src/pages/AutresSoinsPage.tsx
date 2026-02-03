import React, { useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAnimals } from '@/context/AnimalsContext';
import DateField from '@/components/DateField';
import { maskHHMM, isValidHHMM } from '@/utils/date';
import type { SoinEntry } from '@/types/animal';

function pluralDoseUnit(value: number, unit: string) {
  if (unit === 'comprimé') return `${value} ${value === 1 ? 'comprimé' : 'comprimés'}`;
  return `${value} mL`;
}

export default function AutresSoinsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { animaux, updateAnimal } = useAnimals();
  const animal = animaux.find((a) => a.id === id);

  const [openModal, setOpenModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [debut, setDebut] = useState(new Date());
  const [fin, setFin] = useState(new Date());
  const [validDebut, setValidDebut] = useState(true);
  const [validFin, setValidFin] = useState(true);
  const [nom, setNom] = useState('');
  const [doseValue, setDoseValue] = useState('');
  const [doseUnit, setDoseUnit] = useState<'comprimé' | 'ml'>('comprimé');
  const [dosesPerDay, setDosesPerDay] = useState('1');
  const [timeInput, setTimeInput] = useState('');
  const [times, setTimes] = useState<string[]>([]);

  const traitements = useMemo(() => (animal?.soins || []).filter((s) => s.type === 'Traitement'), [animal?.soins]);
  const now = Date.now();
  const sorted = useMemo(() => {
    const list = traitements.slice().sort((a, b) => +new Date(a.debut!) - +new Date(b.debut!));
    const enCours: SoinEntry[] = [], passes: SoinEntry[] = [];
    for (const t of list) {
      const d0 = +new Date(t.debut!), d1 = +new Date(t.fin!);
      if (d0 <= now && now <= d1) enCours.push(t); else passes.push(t);
    }
    return { enCours, passes };
  }, [traitements, now]);

  const openCreate = useCallback(() => { setEditId(null); setDebut(new Date()); setFin(new Date()); setNom(''); setDoseValue(''); setDoseUnit('comprimé'); setDosesPerDay('1'); setTimes([]); setTimeInput(''); setOpenModal(true); }, []);
  const openEdit = useCallback((t: SoinEntry) => { setEditId(t.id); setDebut(new Date(t.debut!)); setFin(new Date(t.fin!)); setNom(t.nom || ''); setDoseValue(String(t.doseValue ?? '')); setDoseUnit(t.doseUnit || 'comprimé'); setDosesPerDay(String(t.dosesPerDay ?? '1')); setTimes(Array.isArray(t.times) ? t.times.slice() : []); setTimeInput(''); setOpenModal(true); }, []);
  const addTime = useCallback(() => { if (!isValidHHMM(timeInput)) return; setTimes((prev) => prev.includes(timeInput) ? prev : [...prev, timeInput].sort()); setTimeInput(''); }, [timeInput]);
  const removeTime = useCallback((t: string) => setTimes((prev) => prev.filter((x) => x !== t)), []);
  
  const saveTraitement = useCallback(() => {
    if (!animal || !nom.trim() || !(Number(doseValue) > 0) || !(Number(dosesPerDay) >= 1) || !validDebut || !validFin || +debut > +fin) return;
    const entry: SoinEntry = { id: editId || Date.now().toString(), type: 'Traitement', nom: nom.trim(), doseValue: Number(doseValue), doseUnit, dosesPerDay: Number(dosesPerDay), debut: debut.toISOString(), fin: fin.toISOString(), times: times.slice() };
    updateAnimal(animal.id, (a) => ({ ...a, soins: [...(a.soins || []).filter((s) => s.id !== entry.id), entry] }));
    setOpenModal(false);
  }, [editId, nom, doseValue, doseUnit, dosesPerDay, debut, fin, validDebut, validFin, times, updateAnimal, animal?.id]);

  const deleteTraitement = useCallback(() => { if (!deleteId || !animal) return; updateAnimal(animal.id, (a) => ({ ...a, soins: (a.soins || []).filter((s) => s.id !== deleteId) })); setDeleteId(null); }, [deleteId, updateAnimal, animal?.id]);

  if (!animal) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><p className="text-muted-foreground mb-4">Animal introuvable.</p><Button onClick={() => navigate('/')}>Retour</Button></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="font-bold text-lg">Autres soins — {animal.nom}</h1>
      </div>
      <div className="p-4 space-y-4">
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Ajouter un traitement</Button>
        <div>
          <h2 className="font-bold mb-2">En cours</h2>
          {sorted.enCours.length === 0 ? <p className="text-muted-foreground text-sm">Aucun traitement en cours.</p> : sorted.enCours.map((t) => (
            <div key={t.id} className="bg-muted/50 rounded-xl border border-border p-3 mb-2">
              <p className="font-bold">{t.nom}</p>
              <p className="text-sm text-muted-foreground mt-1">Du {new Date(t.debut!).toLocaleDateString('fr-FR')} au {new Date(t.fin!).toLocaleDateString('fr-FR')}</p>
              <p className="text-sm text-muted-foreground">Dose : {pluralDoseUnit(Number(t.doseValue || 0), t.doseUnit || 'comprimé')} • {t.dosesPerDay} / jour</p>
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => openEdit(t)}><Edit className="w-4 h-4 mr-1" />Éditer</Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteId(t.id)}><Trash2 className="w-4 h-4 mr-1" />Supprimer</Button>
              </div>
            </div>
          ))}
        </div>
        <div>
          <h2 className="font-bold mb-2">Historique</h2>
          {sorted.passes.length === 0 ? <p className="text-muted-foreground text-sm">Aucun traitement passé.</p> : sorted.passes.map((t) => (
            <div key={t.id} className="bg-muted/50 rounded-xl border border-border p-3 mb-2">
              <p className="font-bold">{t.nom}</p>
              <p className="text-sm text-muted-foreground mt-1">Du {new Date(t.debut!).toLocaleDateString('fr-FR')} au {new Date(t.fin!).toLocaleDateString('fr-FR')}</p>
            </div>
          ))}
        </div>
      </div>
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>{editId ? 'Modifier' : 'Ajouter'} un traitement</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Date de début</Label><div className="mt-1.5"><DateField value={debut} onChange={setDebut} maximumDate={new Date(2099, 11, 31)} onValidityChange={setValidDebut} /></div></div>
            <div><Label>Date de fin</Label><div className="mt-1.5"><DateField value={fin} onChange={setFin} maximumDate={new Date(2099, 11, 31)} onValidityChange={setValidFin} /></div></div>
            <div><Label>Nom du traitement</Label><Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex: Amoxicilline" className="mt-1.5" /></div>
            <div className="flex gap-3"><div className="flex-1"><Label>Dose</Label><Input value={doseValue} onChange={(e) => setDoseValue(e.target.value)} placeholder="ex: 2" className="mt-1.5" /></div><div className="flex-1"><Label>Unité</Label><div className="flex gap-2 mt-1.5"><button onClick={() => setDoseUnit('comprimé')} className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold ${doseUnit === 'comprimé' ? 'border-primary bg-accent text-primary' : 'border-border'}`}>Comprimé</button><button onClick={() => setDoseUnit('ml')} className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold ${doseUnit === 'ml' ? 'border-primary bg-accent text-primary' : 'border-border'}`}>mL</button></div></div></div>
            <div><Label>Doses par jour</Label><Input value={dosesPerDay} onChange={(e) => setDosesPerDay(e.target.value.replace(/\D/g, '') || '1')} className="mt-1.5" /></div>
            <div><Label>Heures de rappel</Label><div className="flex gap-2 mt-1.5"><Input value={timeInput} onChange={(e) => setTimeInput(maskHHMM(e.target.value))} placeholder="ex: 08:00" maxLength={5} className="flex-1" /><Button variant="outline" onClick={addTime} disabled={!isValidHHMM(timeInput)}><Plus className="w-4 h-4" /></Button></div>{times.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{times.map((t) => <span key={t} className="inline-flex items-center gap-1 px-2 py-1 bg-accent rounded-full text-sm">{t}<button onClick={() => removeTime(t)}><X className="w-3 h-3" /></button></span>)}</div>}</div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t"><Button variant="outline" onClick={() => setOpenModal(false)}>Annuler</Button><Button onClick={saveTraitement} disabled={!nom.trim() || !doseValue}>Enregistrer</Button></div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer ce traitement ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={deleteTraitement} className="bg-destructive">Supprimer</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
