import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAnimals } from '@/context/AnimalsContext';
import DateField from '@/components/DateField';
import { maskHHMM, isValidHHMM } from '@/utils/date';
import { toast } from '@/hooks/use-toast';

export default function ConsultationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { animaux, rendezvous, addRendezVous } = useAnimals();

  const animal = animaux.find((a) => a.id === id);

  // RDV creation modal state
  const [rdvOpen, setRdvOpen] = useState(false);
  const [rdvDate, setRdvDate] = useState(new Date());
  const [rdvDateValid, setRdvDateValid] = useState(true);
  const [rdvHeure, setRdvHeure] = useState('');
  const [rdvHeureValid, setRdvHeureValid] = useState(true);
  const [rdvObjet, setRdvObjet] = useState('');
  const [rdvNotes, setRdvNotes] = useState('');
  const [rdvAnimauxSelectionnes, setRdvAnimauxSelectionnes] = useState<string[]>([]);

  const sortedAnimaux = useMemo(
    () => [...animaux].sort((a, b) => (a.nom || '').localeCompare(b.nom || '')),
    [animaux]
  );

  const { futurs, passes } = useMemo(() => {
    if (!animal) return { futurs: [], passes: [] };

    const toDate = (r: any) => {
      const d = new Date(r.date);
      if (r.heureHHMM && /^\d{2}:\d{2}$/.test(r.heureHHMM)) {
        const [hh, mm] = r.heureHHMM.split(':').map((n: string) => parseInt(n, 10));
        d.setHours(hh, mm, 0, 0);
      }
      return d;
    };

    const list = (rendezvous || [])
      .filter((r) => Array.isArray(r.animalIds) && r.animalIds.includes(animal.id))
      .map((r) => ({ ...r, _dt: toDate(r) }));

    const now = Date.now();
    const futursList = list.filter((r) => +r._dt >= now).sort((a, b) => +a._dt - +b._dt);
    const passesList = list.filter((r) => +r._dt < now).sort((a, b) => +b._dt - +a._dt);

    return { futurs: futursList, passes: passesList };
  }, [rendezvous, animal?.id]);

  const openNewRdv = () => {
    setRdvDate(new Date());
    setRdvDateValid(true);
    setRdvHeure('');
    setRdvHeureValid(true);
    setRdvObjet('');
    setRdvNotes('');
    // Pre-select current animal
    setRdvAnimauxSelectionnes(animal ? [animal.id] : []);
    setRdvOpen(true);
  };

  const toggleRdvAnimal = (animalId: string) => {
    setRdvAnimauxSelectionnes((curr) =>
      curr.includes(animalId) ? curr.filter((x) => x !== animalId) : [...curr, animalId]
    );
  };

  const submitRdv = async () => {
    if (!rdvDate || !rdvDateValid) return;
    if (!rdvHeure || !isValidHHMM(rdvHeure)) {
      setRdvHeureValid(false);
      return;
    }
    setRdvHeureValid(true);
    if (!rdvObjet.trim()) return;

    try {
      await addRendezVous({
        date: rdvDate.toISOString(),
        heure: rdvHeure,
        objet: rdvObjet.trim(),
        notes: rdvNotes.trim(),
        animalIds: rdvAnimauxSelectionnes,
      });
      setRdvOpen(false);
      toast({ title: 'Rendez-vous ajouté' });
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'ajouter le rendez-vous", variant: 'destructive' });
    }
  };

  if (!animal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Animal introuvable.</p>
          <Button onClick={() => navigate('/')}>Retour</Button>
        </div>
      </div>
    );
  }

  const isEmpty = futurs.length === 0 && passes.length === 0;

  function RdvCard({ r, isPast }: { r: any; isPast: boolean }) {
    return (
      <div className="bg-muted/50 rounded-xl border border-border p-3 mb-2">
        <div className="flex items-center justify-between">
          <p className="font-bold">
            {r._dt.toLocaleDateString('fr-FR')} {r.heureHHMM ? `• ${r.heureHHMM}` : ''}
          </p>
          <div className={`w-2.5 h-2.5 rounded-full ${isPast ? 'bg-[hsl(var(--status-red))]' : 'bg-[hsl(var(--status-green))]'}`} />
        </div>
        {r.objet && (
          <p className="text-sm text-muted-foreground mt-1">{r.objet}</p>
        )}
        {r.lieu && (
          <p className="text-sm text-muted-foreground">Lieu : {r.lieu}</p>
        )}
        {Array.isArray(r.animalIds) && r.animalIds.length > 1 && (
          <p className="text-xs text-muted-foreground mt-1">
            {r.animalIds.length} animaux (rendez-vous partagé)
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-lg">Consultations — {animal.nom}</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Always show "Prendre un rendez-vous" button */}
        <Button onClick={openNewRdv} className="w-full">
          <CalendarPlus className="w-4 h-4 mr-2" />
          Prendre un rendez-vous
        </Button>

        {isEmpty ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Aucun rendez-vous pour cet animal.</p>
          </div>
        ) : (
          <>
            {/* À venir */}
            <div>
              <h2 className="font-bold mb-2">À venir</h2>
              {futurs.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun rendez-vous à venir.</p>
              ) : (
                futurs.map((r) => <RdvCard key={r.id} r={r} isPast={false} />)
              )}
            </div>

            {/* Historique */}
            <div>
              <h2 className="font-bold mb-2">Historique</h2>
              {passes.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun rendez-vous passé.</p>
              ) : (
                passes.map((r) => <RdvCard key={r.id} r={r} isPast={true} />)
              )}
            </div>
          </>
        )}
      </div>

      {/* RDV Modal */}
      <Dialog open={rdvOpen} onOpenChange={setRdvOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Nouveau rendez-vous</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-2">
              <div>
                <Label>Date</Label>
                <DateField value={rdvDate} onChange={setRdvDate} maximumDate={new Date(2099, 11, 31)} onValidityChange={setRdvDateValid} />
              </div>
              <div>
                <Label>Heure (HH:MM)</Label>
                <Input value={rdvHeure} onChange={(e) => setRdvHeure(maskHHMM(e.target.value))} placeholder="ex: 14:30" maxLength={5} className={!rdvHeureValid ? 'border-destructive' : ''} />
                {!rdvHeureValid && <p className="text-xs text-destructive mt-1">Format attendu : HH:MM</p>}
              </div>
              <div>
                <Label>Objet</Label>
                <Input value={rdvObjet} onChange={(e) => setRdvObjet(e.target.value)} placeholder="ex: Vaccin annuel, contrôle..." />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={rdvNotes} onChange={(e) => setRdvNotes(e.target.value)} placeholder="Informations complémentaires…" rows={3} />
              </div>
              <div>
                <Label>Animaux concernés</Label>
                <div className="mt-2 space-y-2 max-h-32 overflow-auto">
                  {sortedAnimaux.map((a) => {
                    const selected = rdvAnimauxSelectionnes.includes(a.id);
                    return (
                      <button key={a.id} onClick={() => toggleRdvAnimal(a.id)} className={`w-full text-left py-2 px-3 rounded-lg border transition-colors ${selected ? 'border-primary bg-accent' : 'border-border hover:bg-muted'}`}>
                        {selected ? '✓ ' : ''}{a.nom}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
            <Button variant="outline" onClick={() => setRdvOpen(false)}>Annuler</Button>
            <Button onClick={submitRdv} disabled={!rdvObjet.trim() || !rdvDateValid}>Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
