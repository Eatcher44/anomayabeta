import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, LogOut, GripVertical, Bell, Activity, Crown, Bird, Baby, BarChart3, ArrowRightLeft, Lock, Sparkles, MessageSquare, ArrowDownToLine, BookOpen, Settings, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/sheet';
import { useAnimals } from '@/context/AnimalsContext';
import { useAuth } from '@/context/AuthContext';
import AnimalRow from '@/components/AnimalRow';
import DateField from '@/components/DateField';
import HealthDashboard from '@/components/HealthDashboard';
import DarkModeToggle, { useDarkMode } from '@/components/DarkModeToggle';
import {
  NomModal, TypeModal, CustomTypeModal, SexeModal, SterilModal,
  RaceModal, NaissanceModal, PhotoModal, DeleteConfirmModal,
} from '@/components/AnimalModals';
import { isValidHHMM } from '@/utils/date';
import { supabase } from '@/integrations/supabase/client';
import { normalizeType } from '@/utils/normalize';
import { pickPhotoFile, uploadAnimalPhoto } from '@/utils/photo';
import { toast } from '@/hooks/use-toast';
import type { Animal, RendezVous } from '@/types/animal';
import { useBreeder } from '@/context/BreederContext';
import { BOTTOM_NAV_HEIGHT } from '@/components/BreederBottomNav';
import { isBeta } from '@/config/appVariant';


type SortKey = 'alpha' | 'alpha-desc' | 'age-asc' | 'age-desc' | 'poids-asc' | 'poids-desc';

const SORT_OPTIONS: { k: SortKey; t: string }[] = [
  { k: 'alpha', t: 'Nom (A → Z)' },
  { k: 'alpha-desc', t: 'Nom (Z → A)' },
  { k: 'age-desc', t: 'Âge (Plus vieux → plus jeune)' },
  { k: 'age-asc', t: 'Âge (Plus jeune → plus vieux)' },
  { k: 'poids-asc', t: 'Poids (croissant)' },
  { k: 'poids-desc', t: 'Poids (décroissant)' },
];

function lastPoidsKg(a: Animal): number | null {
  if (!a?.poids || a.poids.length === 0) return null;
  const last = [...a.poids].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime())[0];
  return typeof last?.poids === 'number' ? last.poids : null;
}

function sortAnimals(list: Animal[], key: SortKey): Animal[] {
  const sorted = [...list];
  switch (key) {
    case 'alpha':
      return sorted.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    case 'alpha-desc':
      return sorted.sort((a, b) => (b.nom || '').localeCompare(a.nom || ''));
    case 'age-desc':
      return sorted.sort((a, b) => {
        if (!a.naissance && !b.naissance) return 0;
        if (!a.naissance) return 1;
        if (!b.naissance) return -1;
        return new Date(a.naissance).getTime() - new Date(b.naissance).getTime();
      });
    case 'age-asc':
      return sorted.sort((a, b) => {
        if (!a.naissance && !b.naissance) return 0;
        if (!a.naissance) return 1;
        if (!b.naissance) return -1;
        return new Date(b.naissance).getTime() - new Date(a.naissance).getTime();
      });
    case 'poids-asc':
      return sorted.sort((a, b) => (lastPoidsKg(a) ?? -1) - (lastPoidsKg(b) ?? -1));
    case 'poids-desc':
      return sorted.sort((a, b) => (lastPoidsKg(b) ?? -1) - (lastPoidsKg(a) ?? -1));
    default:
      return sorted;
  }
}

function getCategoryLabel(type: string): string {
  const t = normalizeType(type).toLowerCase();
  if (t === 'chat') return 'Chats';
  if (t === 'chien') return 'Chiens';
  return normalizeType(type);
}

const CATEGORY_ORDER_KEY = 'pet-category-order';

function loadCategoryOrder(): string[] | null {
  try {
    const raw = localStorage.getItem(CATEGORY_ORDER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCategoryOrder(order: string[]) {
  localStorage.setItem(CATEGORY_ORDER_KEY, JSON.stringify(order));
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

  const { dark, toggle: toggleDark } = useDarkMode();
  const { isBreeder } = useBreeder();
  const premiumGateRef = useRef(false);

  const handlePremiumGate = useCallback((targetRoute: string) => {
    if (isBreeder) {
      navigate(targetRoute);
      return;
    }
    if (premiumGateRef.current) return; // debounce
    premiumGateRef.current = true;
    toast({ title: '🔒 Fonction Pack Éleveur', description: 'Accédez à toutes les fonctionnalités éleveur' });
    setTimeout(() => {
      navigate('/abonnement?plan=breeder');
      premiumGateRef.current = false;
    }, 1500);
  }, [isBreeder, navigate]);

  // Sort
  const [triSelected, setTriSelected] = useState<SortKey>('alpha');
  const [triOpen, setTriOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Category reorder
  const [reorderMode, setReorderMode] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);

  // Add animal flow steps
  const [addChoiceVisible, setAddChoiceVisible] = useState(false);
  const [transferCodeVisible, setTransferCodeVisible] = useState(false);
  const [transferCode, setTransferCode] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
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

  // Build categories from animals (normalized)
  const allCategories = useMemo(() => {
    const types = new Set(animaux.map((a) => normalizeType(a.type)));
    return Array.from(types);
  }, [animaux]);

  // Sync category order when types change
  useEffect(() => {
    const saved = loadCategoryOrder();
    if (saved) {
      const normalizedSaved = saved.map(normalizeType);
      const merged = [...normalizedSaved.filter((c) => allCategories.includes(c)), ...allCategories.filter((c) => !normalizedSaved.includes(c))];
      setCategoryOrder(merged);
    } else {
      const ordered = [...allCategories].sort((a, b) => {
        if (a.toLowerCase() === 'chien') return -1;
        if (b.toLowerCase() === 'chien') return 1;
        if (a.toLowerCase() === 'chat') return -1;
        if (b.toLowerCase() === 'chat') return 1;
        return a.localeCompare(b);
      });
      setCategoryOrder(ordered);
    }
  }, [allCategories]);

  const moveCategoryUp = (idx: number) => {
    if (idx <= 0) return;
    const newOrder = [...categoryOrder];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    setCategoryOrder(newOrder);
    saveCategoryOrder(newOrder);
  };

  const moveCategoryDown = (idx: number) => {
    if (idx >= categoryOrder.length - 1) return;
    const newOrder = [...categoryOrder];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    setCategoryOrder(newOrder);
    saveCategoryOrder(newOrder);
  };

  // Grouped + sorted animals
  const groupedAnimals = useMemo(() => {
    let list = animaux.filter(a => !(a as any).paradis && (a as any).breeder_visible !== false);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((a) =>
        a.nom?.toLowerCase().includes(q) ||
        a.type?.toLowerCase().includes(q) ||
        a.race?.toLowerCase().includes(q)
      );
    }

    const groups: { category: string; label: string; animals: Animal[] }[] = [];
    for (const cat of categoryOrder) {
      const catAnimals = list.filter((a) => normalizeType(a.type) === cat);
      if (catAnimals.length > 0) {
        groups.push({
          category: cat,
          label: getCategoryLabel(cat),
          animals: sortAnimals(catAnimals, triSelected),
        });
      }
    }
    const handled = new Set(categoryOrder);
    const remaining = list.filter((a) => !handled.has(normalizeType(a.type)));
    if (remaining.length > 0) {
      const otherTypes = new Set(remaining.map((a) => normalizeType(a.type)));
      for (const t of otherTypes) {
        groups.push({
          category: t,
          label: getCategoryLabel(t),
          animals: sortAnimals(remaining.filter((a) => normalizeType(a.type) === t), triSelected),
        });
      }
    }

    return groups;
  }, [animaux, searchQuery, triSelected, categoryOrder]);

  const startAdd = () => {
    setAddChoiceVisible(true);
  };

  const startAddNew = () => {
    setAddChoiceVisible(false);
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

  const startTransfer = () => {
    setAddChoiceVisible(false);
    if (!isBreeder) {
      if (premiumGateRef.current) return;
      premiumGateRef.current = true;
      toast({ title: '🔒 Fonction Pack Éleveur', description: 'Le transfert est réservé au Pack Éleveur' });
      setTimeout(() => {
        navigate('/abonnement?plan=breeder');
        premiumGateRef.current = false;
      }, 1500);
      return;
    }
    setTransferCode('');
    setTransferCodeVisible(true);
  };

  const handleClaimTransfer = async () => {
    if (!transferCode.trim() || !user) return;
    setTransferLoading(true);
    try {
      navigate(`/claim?code=${encodeURIComponent(transferCode.trim())}`);
    } finally {
      setTransferLoading(false);
      setTransferCodeVisible(false);
    }
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
    setTypeTemp(normalizeType(customType.trim()));
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
      // Auto-capitalize first letter of name
      const capitalizedName = animalTemp.trim().charAt(0).toUpperCase() + animalTemp.trim().slice(1);
      const animalData = {
        nom: capitalizedName,
        type: normalizeType(typeTemp.trim()),
        sexe: sexeTemp,
        race: raceTemp.trim() || undefined,
        photo: photoUrl || null,
        naissance: naissanceSet ? naissanceTemp.toISOString() : undefined,
        sterilise: sterilTemp,
        poids: [],
        soins: [],
        consultations: [],
        repas: [],
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

  const handleParadis = async (id: string) => {
    try {
      await updateAnimal(id, { paradis: true } as any);
      // Delete all notifications for this animal
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('animal_id', id);
      if (error) console.error('Error deleting notifications:', error);
      toast({ title: `${animaux.find(a => a.id === id)?.nom || 'Animal'} s'est envolé au paradis 🕊️` });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
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

  // Active animals for health dashboard/alerts: exclude paradis, transferred, non-visible
  const activeAnimals = useMemo(
    () => animaux.filter((a) => !a.paradis && a.breeder_visible !== false),
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
    <div className="bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-1.5">
            <DarkModeToggle dark={dark} onToggle={toggleDark} />
            <button
              onClick={() => navigate('/abonnement')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-amber-400/40 bg-amber-50/80 dark:bg-amber-900/20 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              title="Anomaya+"
            >
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Anomaya+</span>
            </button>
            <button
              onClick={() => navigate('/guide')}
              className="relative flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-primary/40 bg-primary/10 dark:bg-primary/20 dark:border-primary/30 hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
              title="Guide"
            >
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-[11px] font-bold text-primary">Guide</span>
              {isBeta && (
                <span className="absolute -top-2 -right-2 px-1.5 py-px rounded-full text-[8px] font-bold bg-primary text-primary-foreground leading-tight">
                  Nouveau
                </span>
              )}
            </button>
          </div>
          <div className="text-center flex-1">
            <div className="text-3xl mb-2">🐾🐾</div>
            <h1 className="text-2xl font-extrabold text-primary">Ma famille</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigate('/notifications')} title="Notifications">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Déconnexion">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Health Dashboard button */}
        {animaux.length > 0 && (
          <Button
            variant="outline"
            className="w-full mb-4 font-semibold bg-[hsl(350,60%,95%)] dark:bg-[hsl(350,30%,18%)] border-[hsl(350,40%,85%)] dark:border-[hsl(350,20%,30%)] hover:bg-[hsl(350,60%,90%)] dark:hover:bg-[hsl(350,30%,22%)] rounded-2xl py-3"
            onClick={() => navigate('/dashboard-sante')}
          >
            <Activity className="w-4 h-4 mr-2 text-[hsl(350,60%,55%)]" />
            Tableau de bord santé
          </Button>
        )}

        {/* Compact Health Alerts — only active, visible animals */}
        {activeAnimals.length > 0 && (
          <div className="mb-4">
            <HealthDashboard animals={activeAnimals} rendezvous={rendezvous} />
          </div>
        )}

        <div className="flex gap-3 mb-4">
          <Button onClick={startAdd} className="flex-1">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un animal
          </Button>

          <Button
            variant="ghost"
            className="text-primary font-semibold"
            onClick={() => setTriOpen(true)}
          >
            Trier
          </Button>

          <Sheet open={triOpen} onOpenChange={setTriOpen}>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Trier par</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-2">
                {SORT_OPTIONS.map((opt) => (
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
          className="mb-3 bg-card"
        />

      </div>

      {/* Reorder toggle */}
      {categoryOrder.length > 1 && (
        <div className="px-4 mb-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-primary font-semibold"
            onClick={() => setReorderMode(!reorderMode)}
          >
            <GripVertical className="w-4 h-4 mr-1" />
            {reorderMode ? 'Terminer' : 'Réorganiser'}
          </Button>
        </div>
      )}

      {/* Grouped list — padding accounts for bottom nav + safe area */}
      <div className="px-4 pb-24">
        {groupedAnimals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun animal pour le moment.</p>
            <p className="text-sm mt-2">Cliquez sur "Ajouter un animal" pour commencer !</p>
          </div>
        ) : (
          groupedAnimals.map((group, groupIdx) => (
            <div key={group.category} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                {reorderMode && (
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveCategoryUp(groupIdx)}
                      disabled={groupIdx === 0}
                      className="text-xs text-primary disabled:opacity-30 px-1"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveCategoryDown(groupIdx)}
                      disabled={groupIdx === groupedAnimals.length - 1}
                      className="text-xs text-primary disabled:opacity-30 px-1"
                    >
                      ▼
                    </button>
                  </div>
                )}
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                  {group.label} ({group.animals.length})
                </h2>
              </div>
              {group.animals.map((item) => (
              <AnimalRow
                  key={item.id}
                  item={item}
                  onPickPhoto={handlePickPhoto}
                  onOpenProfile={(id) => navigate(`/profil/${id}`)}
                  onDelete={handleDeleteRequest}
                  onParadis={handleParadis}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Raccourcis dock — above bottom nav */}
      <div
        className="fixed left-3 z-30 flex items-center gap-0.5 px-1.5 py-1 bg-card/95 backdrop-blur-md border border-border/60 rounded-2xl shadow-sm"
        style={{ bottom: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 12px)` }}
      >
        <button
          onClick={() => navigate('/paradis')}
          className="flex items-center gap-1.5 h-8 px-3 rounded-xl hover:bg-muted/80 active:bg-muted transition-colors"
        >
          <Bird className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground">Paradis</span>
        </button>

        <div className="w-px h-4 bg-border/50" />

        <button
          onClick={() => {
            if (isBreeder) {
              navigate('/transferes');
            } else {
              handlePremiumGate('/transferes');
            }
          }}
          className="flex items-center gap-1.5 h-8 px-3 rounded-xl hover:bg-muted/80 active:bg-muted transition-colors"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground">Transférés</span>
        </button>

        <div className="w-px h-4 bg-border/50" />

        <button
          onClick={() => {
            if (isBreeder) {
              navigate('/portees');
            } else {
              handlePremiumGate('/portees');
            }
          }}
          className={`flex items-center gap-1.5 h-8 px-3 rounded-xl transition-colors ${
            isBreeder ? 'hover:bg-muted/80 active:bg-muted' : 'opacity-70 hover:opacity-90'
          }`}
        >
          <Baby className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground">Portées</span>
          {!isBreeder && (
            <span className="flex items-center gap-0.5 ml-0.5 px-1 py-px rounded text-[9px] font-bold bg-primary/10 text-primary">
              <Lock className="w-2.5 h-2.5" />
              Pro
            </span>
          )}
        </button>
      </div>

      {/* FAB RDV — positioned above dock */}
      <button
        onClick={() => setRdvOpen(true)}
        className="fixed right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow z-35"
        style={{ bottom: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 60px)` }}
        title="Nouveau rendez-vous"
      >
        <Calendar className="w-6 h-6" />
      </button>

      {/* Floating feedback button — beta only, centered above dock */}
      {isBeta && (
        <button
          onClick={() => navigate('/feedback')}
          className="fixed left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-4 py-2 bg-amber-50/95 dark:bg-amber-900/30 backdrop-blur-md border border-amber-300/60 dark:border-amber-500/30 rounded-full shadow-md hover:bg-amber-100 dark:hover:bg-amber-900/40 active:bg-amber-200 dark:active:bg-amber-900/50 transition-colors"
          style={{ bottom: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 56px)` }}
        >
          <MessageSquare className="w-4 h-4 text-amber-500" />
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Avis</span>
        </button>
      )}

      {/* Add animal choice modal */}
      <Dialog open={addChoiceVisible} onOpenChange={setAddChoiceVisible}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un animal</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <button
              onClick={startTransfer}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-accent transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ArrowDownToLine className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Transférer d'un éleveur</h3>
                <p className="text-xs text-muted-foreground">Importer un profil via un code</p>
              </div>
              {!isBreeder && (
                <span className="ml-auto flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary">
                  <Lock className="w-2.5 h-2.5" />
                  Pro
                </span>
              )}
            </button>
            <button
              onClick={startAddNew}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-accent transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Ajouter mon animal</h3>
                <p className="text-xs text-muted-foreground">Créer un nouveau profil</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer code modal */}
      <Dialog open={transferCodeVisible} onOpenChange={setTransferCodeVisible}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transférer d'un éleveur</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>Code de transfert</Label>
              <Input
                value={transferCode}
                onChange={e => setTransferCode(e.target.value)}
                placeholder="Entrez le code reçu"
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setTransferCodeVisible(false)}>Annuler</Button>
              <Button onClick={handleClaimTransfer} disabled={!transferCode.trim() || transferLoading}>
                {transferLoading ? 'Import...' : 'Importer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                <Input type="time" value={rdvHeure} onChange={(e) => setRdvHeure(e.target.value)} className={!rdvHeureValid ? 'border-destructive' : ''} />
                {!rdvHeureValid && <p className="text-xs text-destructive mt-1">Veuillez sélectionner une heure</p>}
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
