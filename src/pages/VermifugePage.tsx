import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAnimals } from '@/context/AnimalsContext';
import { useAuth } from '@/context/AuthContext';
import DateField from '@/components/DateField';
import StatusBadge from '@/components/StatusBadge';
import { ReminderPickerUI, useReminderPicker, createReminders } from '@/components/ReminderPicker';
import { addMonths, addWeeks, diffDays } from '@/utils/date';
import type { SoinEntry } from '@/types/animal';

export default function VermifugePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { animaux, updateAnimal } = useAnimals();
  const { user } = useAuth();
  const reminderPicker = useReminderPicker();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'antipuce' | 'vermifuge' | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [pickerValid, setPickerValid] = useState(true);
  const [pickerProduit, setPickerProduit] = useState('');

  const animal = animaux.find((a) => a.id === id);
  const soins = animal?.soins || [];
  const birth = animal?.naissance ? new Date(animal.naissance) : new Date();
  const today = new Date();

  // Helpers
  const ageInWeeksAt = (date: Date) => Math.floor((+date - +birth) / 86400000 / 7);
  const ageInMonthsAt = (date: Date) => {
    const d = new Date(date);
    let m = (d.getFullYear() - birth.getFullYear()) * 12 + (d.getMonth() - birth.getMonth());
    if (d.getDate() < birth.getDate()) m -= 1;
    return m;
  };

  const listByType = (type: string) =>
    soins
      .filter((s) => s.type === type)
      .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());
  const lastOfType = (type: string) => listByType(type)[0] || null;

  // Anti-puce
  const lastAnti = lastOfType('Antipuce');
  const lastAntiDate = lastAnti ? new Date(lastAnti.date!) : null;
  const firstAntiAt = addWeeks(birth, 8);

  const nextAntiDue = useMemo(() => {
    if (lastAntiDate) return addMonths(lastAntiDate, 3);
    const ageWeeks = ageInWeeksAt(today);
    return ageWeeks < 8 ? firstAntiAt : today;
  }, [lastAntiDate, firstAntiAt, today]);

  const antiDays = diffDays(nextAntiDue, today);
  const antiStatus: 'red' | 'orange' | 'green' = antiDays < 0 ? 'red' : antiDays <= 7 ? 'orange' : 'green';

  // Vermifuge
  const lastVermi = lastOfType('Vermifuge');
  const lastVermiDate = lastVermi ? new Date(lastVermi.date!) : null;

  const nextVermiDue = useMemo(() => {
    if (lastVermiDate) {
      const candidate1 = addMonths(lastVermiDate, 1);
      const ageM = ageInMonthsAt(candidate1);
      return ageM <= 6 ? candidate1 : addMonths(lastVermiDate, 3);
    }
    const ageW = ageInWeeksAt(today);
    if (ageW <= 7) {
      const infant = [3, 5, 7]
        .map((w) => addWeeks(birth, w))
        .filter((d) => d > today);
      if (infant.length > 0) return infant[0];
    }
    return today;
  }, [lastVermiDate, today, birth]);

  const vermiDays = diffDays(nextVermiDue, today);
  const vermiStatus: 'red' | 'orange' | 'green' = vermiDays < 0 ? 'red' : vermiDays <= 7 ? 'orange' : 'green';

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

  function openPickerFor(mode: 'antipuce' | 'vermifuge') {
    setPickerMode(mode);
    if (mode === 'antipuce') {
      setPickerDate(lastAntiDate || (ageInWeeksAt(today) < 8 ? firstAntiAt : today));
    } else {
      setPickerDate(lastVermiDate || today);
    }
    setPickerValid(true);
    setPickerProduit('');
    setPickerOpen(true);
  }

  async function savePickedDate(date: Date) {
    const entry: SoinEntry = {
      id: Date.now().toString(),
      type: pickerMode === 'antipuce' ? 'Antipuce' : 'Vermifuge',
      nom: pickerMode === 'antipuce' ? 'Anti-puce' : 'Vermifuge',
      produit: pickerProduit || null,
      date: date.toISOString(),
    };
    updateAnimal(animal.id, (a) => ({
      ...a,
      soins: [...(a.soins || []), entry],
    }));

    // Create reminders for next due date
    if (user && reminderPicker.selectedDays.length > 0) {
      const nextDue = addMonths(date, 3);
      await createReminders({
        userId: user.id,
        animalId: animal.id,
        type: pickerMode === 'antipuce' ? 'antipuce' : 'vermifuge',
        title: `${pickerMode === 'antipuce' ? 'Anti-puce' : 'Vermifuge'} — ${animal.nom}`,
        eventDate: nextDue,
        selectedDays: reminderPicker.selectedDays,
      });
    }

    setPickerOpen(false);
    setPickerMode(null);
    reminderPicker.reset();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-lg">Anti-puce & Vermifuge — {animal.nom}</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Anti-puce */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Anti-puce</h2>
            <div className="flex items-center gap-3">
              <StatusBadge status={antiStatus} />
              <button
                onClick={() => openPickerFor('antipuce')}
                className="date-rect text-sm"
              >
                Dernière : {lastAntiDate ? lastAntiDate.toLocaleDateString('fr-FR') : 'choisir'}
              </button>
            </div>
          </div>
          {lastAnti?.produit && (
            <p className="text-xs text-muted-foreground mt-1">Produit : {lastAnti.produit}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            Prochain : <span className="font-semibold">{nextAntiDue.toLocaleDateString('fr-FR')}</span>
          </p>
        </div>

        {/* Vermifuge */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Vermifuge</h2>
            <div className="flex items-center gap-3">
              <StatusBadge status={vermiStatus} />
              <button
                onClick={() => openPickerFor('vermifuge')}
                className="date-rect text-sm"
              >
                Dernière : {lastVermiDate ? lastVermiDate.toLocaleDateString('fr-FR') : 'choisir'}
              </button>
            </div>
          </div>
          {lastVermi?.produit && (
            <p className="text-xs text-muted-foreground mt-1">Produit : {lastVermi.produit}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            Prochain : <span className="font-semibold">{nextVermiDue.toLocaleDateString('fr-FR')}</span>
          </p>
        </div>
      </div>

      {/* Modal */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pickerMode === 'antipuce' ? 'Date — Anti-puce' : 'Date — Vermifuge'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <DateField
              value={pickerDate}
              onChange={setPickerDate}
              maximumDate={new Date()}
              title="Sélectionne la date"
              onValidityChange={setPickerValid}
            />
            <div>
              <Label>Nom du produit (optionnel)</Label>
              <Input
                value={pickerProduit}
                onChange={(e) => setPickerProduit(e.target.value)}
                placeholder="ex: Frontline, Milbemax..."
                className="mt-1.5"
              />
            </div>
            <ReminderPickerUI {...reminderPicker} />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPickerOpen(false)}>Annuler</Button>
              <Button onClick={() => savePickedDate(pickerDate)} disabled={!pickerValid}>Valider</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
