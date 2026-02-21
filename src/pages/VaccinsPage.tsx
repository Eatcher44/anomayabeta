import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
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
import { addMonths } from '@/utils/date';
import type { SoinEntry } from '@/types/animal';

// Catalogue vaccins selon l'espèce
function getVaccineCatalog(animal: { type?: string }) {
  const type = (animal?.type || '').toLowerCase();

  if (type === 'chat') {
    return {
      required: [
        { name: 'Rage', months: 12 },
        { name: 'Typhus félin (Panleucopénie)', months: 12 },
        { name: 'Coryza félin', months: 12 },
      ],
      optional: [
        { name: 'Leucose féline (FeLV)', months: 12 },
        { name: 'Chlamydiose', months: 12 },
      ],
    };
  }

  return {
    required: [
      { name: 'Carré (C)', months: 12 },
      { name: 'Hépatite de Rubarth (H)', months: 12 },
      { name: 'Parvovirose (P)', months: 12 },
      { name: 'Parainfluenza (Pi)', months: 12 },
      { name: 'Leptospirose (L)', months: 12 },
    ],
    optional: [
      { name: 'Rage (R)', months: 12 },
      { name: 'Toux de chenil (Bordetella bronchiseptica)', months: 12 },
      { name: 'Leishmaniose', months: 12 },
      { name: 'Piroplasmose (babésiose)', months: 12 },
    ],
  };
}

function findVaccinEntry(soins: SoinEntry[], nom: string) {
  const arr = soins.filter((s) => s.type === 'Vaccin' && s.nom === nom);
  if (arr.length === 0) return null;
  return arr.sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())[0];
}

export default function VaccinsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { animaux, updateAnimal } = useAnimals();
  const { user } = useAuth();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [pickerValid, setPickerValid] = useState(true);
  const [pickerProduit, setPickerProduit] = useState('');
  const [currentVaccin, setCurrentVaccin] = useState<{ name: string; months: number; mandatory: boolean } | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addMandatory, setAddMandatory] = useState<'required' | 'optional'>('required');
  const [customMonths, setCustomMonths] = useState('12');

  const reminderPicker = useReminderPicker();

  const animal = animaux.find((a) => a.id === id);
  const soins = animal?.soins || [];
  const catalog = useMemo(() => animal ? getVaccineCatalog(animal) : { required: [], optional: [] }, [animal]);

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

  function openPicker(v: { name: string; months: number; mandatory?: boolean }) {
    const entry = findVaccinEntry(soins, v.name);
    setCurrentVaccin({ name: v.name, months: v.months, mandatory: v.mandatory ?? true });
    setPickerDate(entry ? new Date(entry.date!) : new Date());
    setPickerProduit(entry?.produit || '');
    setPickerValid(true);
    setPickerOpen(true);
  }

  async function saveVaccin(date: Date) {
    if (!currentVaccin) return;
    const { name, months, mandatory } = currentVaccin;

    const entry = findVaccinEntry(soins, name);
    const prochain = addMonths(date, months);

    if (entry) {
      updateAnimal(animal.id, (a) => ({
        ...a,
        soins: a.soins.map((s) =>
          s.type === 'Vaccin' && s.nom === name
            ? {
                ...s,
                date: date.toISOString(),
                rappelMois: months,
                prochain: prochain.toISOString(),
                produit: pickerProduit || null,
                obligatoire: mandatory,
              }
            : s
        ),
      }));
    } else {
      const newEntry: SoinEntry = {
        id: Date.now().toString(),
        type: 'Vaccin',
        nom: name,
        date: date.toISOString(),
        rappelMois: months,
        prochain: prochain.toISOString(),
        produit: pickerProduit || null,
        obligatoire: mandatory,
      };
      updateAnimal(animal.id, (a) => ({
        ...a,
        soins: [...(a.soins || []), newEntry],
      }));
    }

    // Create reminders
    if (user && reminderPicker.selectedDays.length > 0) {
      await createReminders({
        userId: user.id,
        animalId: animal.id,
        type: `vaccine-${name}`,
        title: `Vaccin ${name} — ${animal.nom}`,
        eventDate: prochain,
        selectedDays: reminderPicker.selectedDays,
      });
    }

    setPickerOpen(false);
    setCurrentVaccin(null);
    reminderPicker.reset();
  }

  function VaccinRow({ v, isMandatory }: { v: { name: string; months: number }; isMandatory: boolean }) {
    const entry = findVaccinEntry(soins, v.name);
    const done = !!entry;
    const nextDate = done
      ? (entry.prochain ? new Date(entry.prochain) : addMonths(new Date(entry.date!), v.months))
      : null;

    return (
      <div className="py-3 border-b border-border last:border-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!done) {
                openPicker({ ...v, mandatory: isMandatory });
              }
            }}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              done
                ? 'bg-primary border-primary text-primary-foreground'
                : 'border-muted-foreground hover:border-primary'
            }`}
          >
            {done && <span className="text-xs">✓</span>}
          </button>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium">{v.name}</span>
            {done && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Fait le {new Date(entry.date!).toLocaleDateString('fr-FR')}
                {entry.produit && ` • ${entry.produit}`}
              </p>
            )}
            {done && nextDate && (
              <p className="text-xs text-muted-foreground">
                Prochain rappel : <span className="font-semibold">{nextDate.toLocaleDateString('fr-FR')}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={done ? 'green' : 'red'} />
            {done && (
              <button
                onClick={() => openPicker({ ...v, mandatory: isMandatory })}
                className="text-xs text-primary font-semibold"
              >
                Modifier
              </button>
            )}
          </div>
        </div>
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
        <h1 className="font-bold text-lg">Vaccins — {animal.nom}</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Obligatoires */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h2 className="font-extrabold mb-2">Obligatoires</h2>
          {catalog.required.map((v) => (
            <VaccinRow key={v.name} v={v} isMandatory={true} />
          ))}
        </div>

        {/* Optionnels */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h2 className="font-extrabold mb-2">Optionnels</h2>
          {catalog.optional.map((v) => (
            <VaccinRow key={v.name} v={v} isMandatory={false} />
          ))}
        </div>

        {/* Ajouter un vaccin */}
        <Button onClick={() => {
          setAddName('');
          setAddMandatory('required');
          setCustomMonths('12');
          setAddOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un vaccin
        </Button>
      </div>

      {/* Modal date + produit */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentVaccin?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <DateField
              value={pickerDate}
              onChange={setPickerDate}
              maximumDate={new Date()}
              title="Date du vaccin"
              onValidityChange={setPickerValid}
            />
            <div>
              <Label>Nom du produit (optionnel)</Label>
              <Input
                value={pickerProduit}
                onChange={(e) => setPickerProduit(e.target.value)}
                placeholder="ex: Nobivac, Purevax..."
                className="mt-1.5"
              />
            </div>
            <ReminderPickerUI {...reminderPicker} />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPickerOpen(false)}>Annuler</Button>
              <Button onClick={() => saveVaccin(pickerDate)} disabled={!pickerValid}>Valider</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal ajout vaccin perso */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un vaccin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nom du vaccin</Label>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Nom du vaccin"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Section</Label>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setAddMandatory('required')}
                  className={`px-4 py-2 rounded-full border-2 font-semibold text-sm transition-colors ${
                    addMandatory === 'required'
                      ? 'border-primary bg-accent text-primary'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  Obligatoire
                </button>
                <button
                  onClick={() => setAddMandatory('optional')}
                  className={`px-4 py-2 rounded-full border-2 font-semibold text-sm transition-colors ${
                    addMandatory === 'optional'
                      ? 'border-primary bg-accent text-primary'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  Optionnel
                </button>
              </div>
            </div>

            <div>
              <Label>Rappel (en mois)</Label>
              <Input
                value={customMonths}
                onChange={(e) => setCustomMonths(e.target.value.replace(/\D/g, '').slice(0, 3) || '0')}
                placeholder="ex: 12"
                className="mt-1.5"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Annuler</Button>
              <Button
                onClick={() => {
                  const name = addName.trim();
                  const months = Math.max(1, parseInt(customMonths || '12', 10) || 12);
                  if (!name) return;
                  openPicker({ name, months, mandatory: addMandatory === 'required' });
                  setAddOpen(false);
                }}
                disabled={!addName.trim()}
              >
                Continuer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
