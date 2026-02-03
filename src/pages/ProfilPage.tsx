import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Syringe, Bug, Pill, Calendar, Baby } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAnimals } from '@/context/AnimalsContext';
import DateField from '@/components/DateField';
import { displayBreed } from '@/utils/breeds';
import { getAgeText } from '@/utils/date';

const fmt = (d: string | Date) => new Date(d).toLocaleDateString('fr-FR');
const isFemale = (a: { sexe?: string }) => (a.sexe || '').toLowerCase().startsWith('f');

export default function ProfilPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { animaux, updateAnimal, rendezvous } = useAnimals();

  const [editOpen, setEditOpen] = useState(false);
  const [puceInlineEdit, setPuceInlineEdit] = useState(false);
  const [puceDraft, setPuceDraft] = useState('');

  // État local pour l'édition
  const [sexDraft, setSexDraft] = useState<'Mâle' | 'Femelle'>('Mâle');
  const [raceDraft, setRaceDraft] = useState('—');
  const [birthDraft, setBirthDraft] = useState(new Date());
  const [birthValid, setBirthValid] = useState(true);
  const [sterilDraft, setSterilDraft] = useState(false);
  const [puceEditDraft, setPuceEditDraft] = useState('');

  const animal = animaux.find((a) => a.id === id);

  const soins = animal?.soins || [];
  const bgClass = animal && isFemale(animal) ? 'bg-female' : 'bg-male';

  const actifsAutresSoins = useMemo(() => {
    if (!animal) return [];
    const now = new Date();
    return soins.filter(
      (s) =>
        s.type === 'Traitement' &&
        s.debut &&
        s.fin &&
        new Date(s.debut) <= now &&
        now <= new Date(s.fin)
    );
  }, [soins, animal]);

  const rdvsFuturs = useMemo(() => {
    if (!animal || !Array.isArray(rendezvous)) return [];
    return rendezvous
      .filter((r) => r.animalIds?.includes(animal.id))
      .filter((r) => new Date(r.date).getTime() >= Date.now());
  }, [rendezvous, animal?.id]);

  if (!animal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Animal introuvable.</p>
          <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  const openEditModal = () => {
    setSexDraft((animal.sexe as 'Mâle' | 'Femelle') || 'Mâle');
    setRaceDraft(animal.race || '—');
    setBirthDraft(animal.naissance ? new Date(animal.naissance) : new Date());
    setBirthValid(true);
    setSterilDraft(!!animal.sterilise);
    setPuceEditDraft(animal.puce || '');
    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!birthValid) return;
    updateAnimal(animal.id, (a) => ({
      ...a,
      sexe: sexDraft,
      race: raceDraft || '—',
      naissance: birthDraft.toISOString(),
      sterilise: sterilDraft,
      puce: puceEditDraft.trim(),
    }));
    setEditOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header avec retour */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-lg">Profil</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Header Profil */}
          <div className={`${bgClass} rounded-2xl p-4 border border-border relative`}>
            <button
              onClick={openEditModal}
              className="absolute right-3 top-3 w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
            >
              <Edit className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="flex items-center">
              <div className="w-[72px] h-[72px] rounded-full bg-muted flex items-center justify-center overflow-hidden mr-3">
                {animal.photo ? (
                  <img src={animal.photo} alt={animal.nom} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground text-center px-1">Pas de photo</span>
                )}
              </div>
              <div className="flex-1 pr-14">
                <p className="text-xl font-extrabold">
                  {animal.nom} {animal.sexe === 'Femelle' ? '♀' : '♂'}
                  {animal.race && animal.race !== '—' && (
                    <span className="font-normal text-muted-foreground text-sm ml-1">
                      ({displayBreed(animal.race)})
                    </span>
                  )}
                </p>
                {animal.naissance && (
                  <p className="text-muted-foreground mt-1">{getAgeText(animal.naissance)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Fiche */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <h2 className="font-extrabold mb-3">Fiche</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Date de naissance</span>
                <span className="font-bold">{animal.naissance ? fmt(animal.naissance) : '—'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Race</span>
                <span className="font-bold">{animal.race ? displayBreed(animal.race) : '—'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Sexe</span>
                <span className="font-bold">{animal.sexe}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">
                  {isFemale(animal) ? 'Stérilisée' : 'Castré'}
                </span>
                <span className="font-bold">{animal.sterilise ? 'Oui' : 'Non'}</span>
              </div>
              <div className="py-1.5">
                <span className="text-muted-foreground">Numéro de puce</span>
                {!animal.puce ? (
                  puceInlineEdit ? (
                    <Input
                      value={puceDraft}
                      onChange={(e) => setPuceDraft(e.target.value.replace(/\D/g, '').slice(0, 15))}
                      maxLength={15}
                      placeholder="15 chiffres"
                      className="mt-1.5"
                      autoFocus
                      onBlur={() => {
                        if (puceDraft.trim()) {
                          updateAnimal(animal.id, { puce: puceDraft.trim() });
                        }
                        setPuceInlineEdit(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (puceDraft.trim()) {
                            updateAnimal(animal.id, { puce: puceDraft.trim() });
                          }
                          setPuceInlineEdit(false);
                        }
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setPuceDraft('');
                        setPuceInlineEdit(true);
                      }}
                      className="mt-1.5 font-bold text-primary hover:underline"
                    >
                      Ajouter le numéro
                    </button>
                  )
                ) : (
                  <p className="mt-1.5 font-bold">{animal.puce}</p>
                )}
              </div>
            </div>
          </div>

          {/* Soins */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <h2 className="font-extrabold mb-3">Soins</h2>

            <div className="flex gap-2 mb-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => navigate(`/vaccins/${animal.id}`)}
              >
                <Syringe className="w-4 h-4 mr-2" />
                Vaccins
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => navigate(`/vermifuge/${animal.id}`)}
              >
                <Bug className="w-4 h-4 mr-2" />
                Anti-puce & Vermifuge
              </Button>
            </div>

            <Button
              onClick={() => navigate(`/autres-soins/${animal.id}`)}
              className="w-full"
            >
              <Pill className="w-4 h-4 mr-2" />
              Autres soins / traitements
            </Button>

            <p className="text-sm text-muted-foreground mt-3">
              {actifsAutresSoins.length} soin(s) ou traitement(s) en cours
            </p>
          </div>

          {/* Reproduction (si non stérilisé) */}
          {!animal.sterilise && (
            <div className="bg-card rounded-xl p-4 border border-border">
              <h2 className="font-extrabold mb-3">
                {isFemale(animal) ? 'Gestation' : 'Reproduction'}
              </h2>
              <Button variant="outline" disabled>
                <Baby className="w-4 h-4 mr-2" />
                À venir (pack Éleveur)
              </Button>
            </div>
          )}

          {/* Rendez-vous */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <h2 className="font-extrabold mb-3">Rendez-vous</h2>
            <p className="text-muted-foreground mb-3">
              {rdvsFuturs.length} rendez-vous à venir
            </p>
            <Button onClick={() => navigate(`/consultation/${animal.id}`)}>
              <Calendar className="w-4 h-4 mr-2" />
              Voir les consultations
            </Button>
          </div>

          {/* Poids */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <h2 className="font-extrabold mb-3">Suivi du poids</h2>
            <Button variant="secondary" onClick={() => navigate(`/poids/${animal.id}`)}>
              Gérer le poids
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* Modal édition */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Éditer le profil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Sexe</Label>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setSexDraft('Mâle')}
                  className={`px-4 py-2 rounded-full border-2 font-semibold transition-colors ${
                    sexDraft === 'Mâle'
                      ? 'border-primary bg-accent text-primary'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  ♂ Mâle
                </button>
                <button
                  onClick={() => setSexDraft('Femelle')}
                  className={`px-4 py-2 rounded-full border-2 font-semibold transition-colors ${
                    sexDraft === 'Femelle'
                      ? 'border-primary bg-accent text-primary'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  ♀ Femelle
                </button>
              </div>
            </div>

            <div>
              <Label>Race</Label>
              <Input
                value={raceDraft}
                onChange={(e) => setRaceDraft(e.target.value)}
                placeholder="Race (ex: Maine Coon)"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Date de naissance</Label>
              <div className="mt-1.5">
                <DateField
                  value={birthDraft}
                  onChange={setBirthDraft}
                  maximumDate={new Date()}
                  onValidityChange={setBirthValid}
                />
              </div>
            </div>

            <div>
              <Label>{sexDraft === 'Femelle' ? 'Stérilisée ?' : 'Castré ?'}</Label>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setSterilDraft(true)}
                  className={`px-4 py-2 rounded-full border-2 font-semibold transition-colors ${
                    sterilDraft
                      ? 'border-primary bg-accent text-primary'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  Oui
                </button>
                <button
                  onClick={() => setSterilDraft(false)}
                  className={`px-4 py-2 rounded-full border-2 font-semibold transition-colors ${
                    !sterilDraft
                      ? 'border-primary bg-accent text-primary'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  Non
                </button>
              </div>
            </div>

            <div>
              <Label>Numéro de puce</Label>
              <Input
                value={puceEditDraft}
                onChange={(e) => setPuceEditDraft(e.target.value.replace(/\D/g, '').slice(0, 15))}
                maxLength={15}
                placeholder="15 chiffres"
                className="mt-1.5"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Annuler
              </Button>
              <Button onClick={saveEdit} disabled={!birthValid}>
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
