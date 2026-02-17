import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, SlidersHorizontal, Calendar, LogOut } from 'lucide-react';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAnimals } from '@/context/AnimalsContext';
import { useAuth } from '@/context/AuthContext';
import AnimalRow from '@/components/AnimalRow';
import DateField from '@/components/DateField';
import {
  NomModal, TypeModal, CustomTypeModal, SexeModal, SterilModal,
  RaceModal, NaissanceModal, PhotoModal, DeleteConfirmModal,
} from '@/components/AnimalModals';
import { maskHHMM, isValidHHMM } from '@/utils/date';
import { pickPhotoFile, uploadAnimalPhoto } from '@/utils/photo';
import { toast } from '@/hooks/use-toast';
import type { Animal, RendezVous } from '@/types/animal';

function lastPoidsKg(a: Animal): number | null {
  if (!a?.poids || a.poids.length === 0) return null;
  const last = [...a.poids].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime())[0];
  return typeof last?.poids === 'number' ? last.poids : null;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const {
    animaux,
    addAnimal,
    updateAnimal,
    deleteAnimal,
    rendezvous,
    addRendezVous,
    loading,
  } = useAnimals();

  // Sort
  const [triSelected, setTriSelected] = useState<'alpha' | 'age' | 'poids'>('alpha');
  const [triOpen, setTriOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add animal flow steps
  const [modalNomVisible, setModalNomVisible] = useState(false);
  const [modalTypeVisible, setModalTypeVisible] = useState(false);
  const [modalSexeVisible, setModalSexeVisible] = useState(false);
  const [modalSterilVisible, setModalSterilVisible] = useState(false);
  const [modalRaceVisible, setModalRaceVisible] = useState(false);
  const [modalNaissanceVisible, setModalNaissanceVisible] = useState(false);
  const [modalPhotoVisible, setModalPhotoVisible] = useState(false);
  const [modalCustomTypeVisible, setModalCustomTypeVisible] = useState(false);

  const [animalTemp, setAnimalTemp] = useState('');
  const [typeTemp, setTypeTemp] = useState('');
  const [sexeTemp, setSexeTemp] = useState<'Mâle' | 'Femelle'>('Femelle');
  const [sterilTemp, setSterilTemp] = useState(false);
  const [raceTemp, setRaceTemp] = useState('');
  const [naissanceTemp, setNaissanceTemp] = useState(new Date());
  const [naissanceSet, setNaissanceSet] = useState(false);
  const [customType, setCustomType] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete flow
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteConfirm1, setDeleteConfirm1] = useState(false);
  const [deleteConfirm2, setDeleteConfirm2] = useState(false);

  // RDV
  const [rdvOpen, setRdvOpen] = useState(false);
  const [rdvDate, setRdvDate] = useState(new Date());
  const [rdvHeure, setRdvHeure] = useState('');
  const [rdvHeureValid, setRdvHeureValid] = useState(true);
  const [rdvObjet, setRdvObjet] = useState('');
  const [rdvNotes, setRdvNotes] = useState('');
  const [rdvAnimauxSelectionnes, setRdvAnimauxSelectionnes] = useState<string[]>([]);
  const [rdvDateValid, setRdvDateValid] = useState(true);

  const deleteTargetAnimal = animaux.find((a) => a.id === deleteTargetId);

  const startAdd = () => {
    setEditingId(null);
    setAnimalTemp('');
    setTypeTemp('');
    setSexeTemp('Femelle');
    setSterilTemp(false);
    setRaceTemp('');
    setNaissanceTemp(new Date());
    setNaissanceSet(false);
    setCustomType('');
    setModalNomVisible(true);
  };

  const confirmNom = () => {
    if (!animalTemp.trim()) return;
    setModalNomVisible(false);
    setModalTypeVisible(true);
  };

  const pickType = (t: string) => {
    setTypeTemp(t);
    setModalTypeVisible(false);
    setModalSexeVisible(true);
  };

  const pickCustomType = () => {
    if (!customType.trim()) return;
    setTypeTemp(customType.trim());
    setModalCustomTypeVisible(false);
    setModalSexeVisible(true);
  };

  const pickSexe = () => {
    setModalSexeVisible(false);
    setModalSterilVisible(true);
  };

  const pickSteril = () => {
    setModalSterilVisible(false);
    setModalRaceVisible(true);
  };

  const pickRace = () => {
    setModalRaceVisible(false);
    setModalNaissanceVisible(true);
  };

  const pickNaissance = () => {
    setNaissanceSet(true);
    setModalNaissanceVisible(false);
    setModalPhotoVisible(true);
  };

  const skipNaissance = () => {
    setNaissanceSet(false);
    setModalNaissanceVisible(false);
    setModalPhotoVisible(true);
  };

  const finalSave = async (photoUrl?: string | null) => {
    if (!animalTemp || !typeTemp || !sexeTemp) return;
    setSaving(true);
    try {
      const animalData = {
        nom: animalTemp.trim(),
        type: typeTemp.trim(),
        sexe: sexeTemp,
        race: raceTemp.trim() || undefined,
        photo: photoUrl || null,
        naissance: naissanceSet ? naissanceTemp.toISOString() : undefined,
        sterilise: sterilTemp,
        poids: [],
        soins: [],
        consultations: [],
      };

      if (editingId) {
        await updateAnimal(editingId, animalData);
      } else {
        await addAnimal(animalData);
      }

      setModalPhotoVisible(false);
      toast({ title: 'Succès', description: editingId ? 'Animal modifié' : 'Animal ajouté' });
    } catch (error) {
      toast({ title: 'Erreur', description: "Impossible d'enregistrer l'animal", variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoFromGallery = async () => {
    const file = await pickPhotoFile('image/*');
    if (!file || !user) { finalSave(null); return; }
    setSaving(true);
    try {
      const url = await uploadAnimalPhoto(user.id, 'new', file);
      await finalSave(url);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de télécharger la photo', variant: 'destructive' });
      setSaving(false);
    }
  };

  const handlePhotoFromCamera = async () => {
    const file = await pickPhotoFile('image/*', 'camera');
    if (!file || !user) { finalSave(null); return; }
    setSaving(true);
    try {
      const url = await uploadAnimalPhoto(user.id, 'new', file);
      await finalSave(url);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de télécharger la photo', variant: 'destructive' });
      setSaving(false);
    }
  };

  // Delete handlers
  const handleDeleteRequest = (id: string) => {
    setDeleteTargetId(id);
    setDeleteConfirm1(true);
  };

  const handleDeleteConfirm1 = () => {
    setDeleteConfirm1(false);
    setDeleteConfirm2(true);
  };

  const handleDeleteConfirm2 = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteAnimal(deleteTargetId);
      toast({ title: 'Animal supprimé' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
    }
    setDeleteConfirm2(false);
    setDeleteTargetId(null);
  };

  const filtered = useMemo(() => {
    let list = [...animaux];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((a) =>
        a.nom?.toLowerCase().includes(q) ||
        a.type?.toLowerCase().includes(q) ||
        a.race?.toLowerCase().includes(q)
      );
    }
    if (triSelected === 'alpha') {
      list.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    } else if (triSelected === 'age') {
      list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    } else if (triSelected === 'poids') {
      list.sort((a, b) => (lastPoidsKg(b) || 0) - (lastPoidsKg(a) || 0));
    }
    return list;
  }, [animaux, searchQuery, triSelected]);

  const handlePickPhoto = useCallback(async (id: string) => {
    if (!user) return;
    const file = await pickPhotoFile('image/*');
    if (!file) return;
    try {
      const url = await uploadAnimalPhoto(user.id, id, file);
      await updateAnimal(id, { photo: url });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour la photo', variant: 'destructive' });
    }
  }, [updateAnimal, user]);

  const toggleRdvAnimal = (id: string) => {
    setRdvAnimauxSelectionnes((curr) =>
      curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]
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
      setRdvObjet('');
      setRdvNotes('');
      setRdvHeure('');
      setRdvAnimauxSelectionnes([]);
      toast({ title: 'Rendez-vous ajouté' });
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'ajouter le rendez-vous", variant: 'destructive' });
    }
  };

  const sortedAnimaux = useMemo(
    () => [...animaux].sort((a, b) => (a.nom || '').localeCompare(b.nom || '')),
    [animaux]
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)]">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex justify-between items-start mb-4">
          <div className="text-center flex-1">
            <div className="text-3xl mb-2">🐾🐾</div>
            <h1 className="text-2xl font-extrabold text-primary">Ma famille</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} title="Déconnexion">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex gap-3 mb-4">
          <Button onClick={startAdd} className="flex-1">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un animal
          </Button>
          
          <Sheet open={triOpen} onOpenChange={setTriOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Trier par</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-2">
                {[
                  { k: 'alpha' as const, t: 'Nom (A→Z)' },
                  { k: 'age' as const, t: 'Âge (plus jeune → plus âgé)' },
                  { k: 'poids' as const, t: 'Poids (décroissant)' },
                ].map((opt) => (
                  <button
                    key={opt.k}
                    onClick={() => {
                      setTriSelected(opt.k);
                      setTriOpen(false);
                    }}
                    className={`w-full text-left py-3 px-4 rounded-lg transition-colors ${
                      triSelected === opt.k
                        ? 'bg-accent text-primary font-semibold'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {triSelected === opt.k ? '✓ ' : ''}{opt.t}
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un animal..."
          className="mb-4 bg-card"
        />
      </div>

      {/* List */}
      <div className="px-4 pb-32">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun animal pour le moment.</p>
            <p className="text-sm mt-2">Cliquez sur "Ajouter un animal" pour commencer !</p>
          </div>
        ) : (
          filtered.map((item) => (
            <AnimalRow
              key={item.id}
              item={item}
              onPickPhoto={handlePickPhoto}
              onOpenProfile={(id) => navigate(`/profil/${id}`)}
              onDelete={handleDeleteRequest}
            />
          ))
        )}
      </div>

      {/* FAB RDV */}
      <button onClick={() => setRdvOpen(true)} className="fab" title="Nouveau rendez-vous">
        <Calendar className="w-6 h-6" />
      </button>

      {/* Add animal modals */}
      <NomModal open={modalNomVisible} onClose={() => setModalNomVisible(false)} value={animalTemp} onChange={setAnimalTemp} onNext={confirmNom} isEdit={!!editingId} />
      <TypeModal open={modalTypeVisible} onClose={() => setModalTypeVisible(false)} onSelect={pickType} onCustom={() => { setModalTypeVisible(false); setModalCustomTypeVisible(true); }} />
      <CustomTypeModal open={modalCustomTypeVisible} onClose={() => { setModalCustomTypeVisible(false); setModalTypeVisible(true); }} value={customType} onChange={setCustomType} onNext={pickCustomType} />
      <SexeModal open={modalSexeVisible} onClose={() => setModalSexeVisible(false)} value={sexeTemp} onChange={setSexeTemp} onNext={pickSexe} />
      <SterilModal open={modalSterilVisible} onClose={() => setModalSterilVisible(false)} sexe={sexeTemp} value={sterilTemp} onChange={setSterilTemp} onNext={pickSteril} />
      <RaceModal open={modalRaceVisible} onClose={() => setModalRaceVisible(false)} type={typeTemp} value={raceTemp} onChange={setRaceTemp} onNext={pickRace} />
      <NaissanceModal open={modalNaissanceVisible} onClose={() => setModalNaissanceVisible(false)} value={naissanceTemp} onChange={setNaissanceTemp} onSave={pickNaissance} onSkip={skipNaissance} />
      <PhotoModal open={modalPhotoVisible} onClose={() => setModalPhotoVisible(false)} onPickGallery={handlePhotoFromGallery} onTakePhoto={handlePhotoFromCamera} onSkip={() => finalSave(null)} saving={saving} />

      {/* Delete confirmation modals */}
      <DeleteConfirmModal
        open={deleteConfirm1}
        onClose={() => { setDeleteConfirm1(false); setDeleteTargetId(null); }}
        animalName={deleteTargetAnimal?.nom || ''}
        onConfirm={handleDeleteConfirm1}
      />
      <DeleteConfirmModal
        open={deleteConfirm2}
        onClose={() => { setDeleteConfirm2(false); setDeleteTargetId(null); }}
        animalName={deleteTargetAnimal?.nom || ''}
        onConfirm={handleDeleteConfirm2}
        isSecondConfirm
      />

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
              {rendezvous.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Rendez-vous existants</Label>
                  <div className="mt-2 space-y-2 max-h-32 overflow-auto">
                    {rendezvous.map((r) => (
                      <div key={r.id} className="py-2 border-b border-border text-sm">
                        <p className="font-semibold">{new Date(r.date).toLocaleDateString('fr-FR')} à {r.heure} – {r.objet}</p>
                        {r.animalIds?.length > 0 && (
                          <p className="text-muted-foreground text-xs">{r.animalIds.map((id) => sortedAnimaux.find((a) => a.id === id)?.nom).filter(Boolean).join(', ')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
