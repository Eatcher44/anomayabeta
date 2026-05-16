import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Pill,
  AlertTriangle,
  CalendarClock,
  Edit2,
  Trash2,
  PlusCircle,
  MinusCircle,
  Syringe,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useAnimals } from '@/context/AnimalsContext';
import { toast } from '@/hooks/use-toast';
import DateField from '@/components/DateField';

type PharmacyItem = {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  quantity_remaining: number;
  unit: string | null;
  expiration_date: string | null;
  low_stock_threshold: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const CATEGORIES = [
  'Médicament',
  'Vermifuge',
  'Anti-puces',
  'Vaccin',
  'Complément',
  'Autre',
];

const UNITS = ['dose', 'comprimé', 'ml', 'pipette', 'sachet', 'gramme'];

const DEFAULT_LOW_THRESHOLD = 1;
const EXPIRING_SOON_DAYS = 30;

function parseDecimal(value: string): number | null {
  if (value.trim() === '') return null;
  const normalized = value.replace(',', '.');
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return n;
}

function formatQty(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, '');
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function formatExpiration(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' });
}

type EditForm = {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  expiration: Date | null;
  threshold: string;
  notes: string;
};

const emptyForm: EditForm = {
  name: '',
  category: '',
  quantity: '',
  unit: '',
  expiration: null,
  threshold: '',
  notes: '',
};

export default function PharmaciePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { animaux, updateAnimal } = useAnimals();

  const [items, setItems] = useState<PharmacyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Edit / create dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Stock adjust dialog
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<PharmacyItem | null>(null);
  const [adjustMode, setAdjustMode] = useState<'add' | 'remove'>('add');
  const [adjustValue, setAdjustValue] = useState('');

  // Give-dose dialog
  const [doseOpen, setDoseOpen] = useState(false);
  const [doseTarget, setDoseTarget] = useState<PharmacyItem | null>(null);
  const [doseAnimalId, setDoseAnimalId] = useState<string>('');
  const [doseValue, setDoseValue] = useState('');
  const [doseDate, setDoseDate] = useState<Date>(new Date());
  const [doseNotes, setDoseNotes] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<PharmacyItem | null>(null);

  const loadItems = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await (supabase as any)
        .from('pharmacy_items')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setItems((data || []) as PharmacyItem[]);
    } catch (e) {
      console.error('Pharmacy load error', e);
      toast({ title: 'Erreur', description: 'Impossible de charger la pharmacie', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      it.name.toLowerCase().includes(q) ||
      (it.category || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  // ------- Edit / Create -------
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setEditOpen(true);
  };

  const openEdit = (it: PharmacyItem) => {
    setEditingId(it.id);
    setForm({
      name: it.name,
      category: it.category || '',
      quantity: formatQty(it.quantity_remaining),
      unit: it.unit || '',
      expiration: it.expiration_date ? new Date(it.expiration_date) : null,
      threshold: it.low_stock_threshold != null ? formatQty(it.low_stock_threshold) : '',
      notes: it.notes || '',
    });
    setEditOpen(true);
  };

  const saveForm = async () => {
    if (!user) return;
    const name = form.name.trim();
    if (!name) {
      toast({ title: 'Nom requis', variant: 'destructive' });
      return;
    }
    const qty = parseDecimal(form.quantity);
    if (qty == null || qty < 0) {
      toast({ title: 'Quantité invalide', description: 'La quantité doit être un nombre positif (ex. 1.5)', variant: 'destructive' });
      return;
    }
    const threshold = form.threshold.trim() ? parseDecimal(form.threshold) : null;
    if (form.threshold.trim() && (threshold == null || threshold < 0)) {
      toast({ title: 'Seuil invalide', variant: 'destructive' });
      return;
    }

    const payload = {
      user_id: user.id,
      name,
      category: form.category || null,
      quantity_remaining: qty,
      unit: form.unit || null,
      expiration_date: form.expiration ? form.expiration.toISOString().split('T')[0] : null,
      low_stock_threshold: threshold,
      notes: form.notes.trim() || null,
    };

    setSaving(true);
    try {
      if (editingId) {
        const { data, error } = await (supabase as any)
          .from('pharmacy_items')
          .update(payload)
          .eq('id', editingId)
          .select()
          .single();
        if (error) throw error;
        setItems((prev) => prev.map((p) => (p.id === editingId ? (data as PharmacyItem) : p)));
        toast({ title: 'Produit modifié' });
      } else {
        const { data, error } = await (supabase as any)
          .from('pharmacy_items')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setItems((prev) => [...prev, data as PharmacyItem].sort((a, b) => a.name.localeCompare(b.name)));
        toast({ title: 'Produit ajouté' });
      }
      setEditOpen(false);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erreur', description: "Impossible d'enregistrer", variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ------- Adjust stock -------
  const openAdjust = (it: PharmacyItem, mode: 'add' | 'remove') => {
    setAdjustTarget(it);
    setAdjustMode(mode);
    setAdjustValue('');
    setAdjustOpen(true);
  };

  const applyAdjust = async () => {
    if (!adjustTarget) return;
    const v = parseDecimal(adjustValue);
    if (v == null || v <= 0) {
      toast({ title: 'Quantité invalide', variant: 'destructive' });
      return;
    }
    const current = Number(adjustTarget.quantity_remaining);
    const next = adjustMode === 'add' ? current + v : Math.max(0, current - v);
    if (adjustMode === 'remove' && v > current) {
      const ok = window.confirm(`La quantité retirée (${formatQty(v)}) dépasse le stock restant (${formatQty(current)}). Mettre le stock à 0 ?`);
      if (!ok) return;
    }
    try {
      const { data, error } = await (supabase as any)
        .from('pharmacy_items')
        .update({ quantity_remaining: next })
        .eq('id', adjustTarget.id)
        .select()
        .single();
      if (error) throw error;
      setItems((prev) => prev.map((p) => (p.id === adjustTarget.id ? (data as PharmacyItem) : p)));
      toast({ title: adjustMode === 'add' ? 'Stock ajouté' : 'Stock retiré' });
      setAdjustOpen(false);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  // ------- Give dose to animal -------
  const openDose = (it: PharmacyItem) => {
    setDoseTarget(it);
    setDoseAnimalId('');
    setDoseValue('');
    setDoseDate(new Date());
    setDoseNotes('');
    setDoseOpen(true);
  };

  const activeAnimals = useMemo(
    () => animaux.filter((a) => !a.paradis && a.breeder_visible !== false)
      .sort((a, b) => (a.nom || '').localeCompare(b.nom || '')),
    [animaux]
  );

  const applyDose = async () => {
    if (!doseTarget) return;
    if (!doseAnimalId) {
      toast({ title: 'Sélectionnez un animal', variant: 'destructive' });
      return;
    }
    const v = parseDecimal(doseValue);
    if (v == null || v <= 0) {
      toast({ title: 'Dose invalide', variant: 'destructive' });
      return;
    }
    const current = Number(doseTarget.quantity_remaining);
    if (v > current) {
      const ok = window.confirm(`La dose donnée (${formatQty(v)}) dépasse le stock restant (${formatQty(current)}). Continuer (le stock passera à 0) ?`);
      if (!ok) return;
    }
    const animal = animaux.find((a) => a.id === doseAnimalId);
    if (!animal) return;
    const next = Math.max(0, current - v);

    try {
      // 1. Deduct stock
      const { data, error } = await (supabase as any)
        .from('pharmacy_items')
        .update({ quantity_remaining: next })
        .eq('id', doseTarget.id)
        .select()
        .single();
      if (error) throw error;

      // 2. Add soin entry on animal
      const soin = {
        id: `pharm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: doseTarget.category || 'Pharmacie',
        nom: doseTarget.name,
        date: doseDate.toISOString(),
        produit: doseTarget.name,
        doseValue: v,
        doseUnit: doseTarget.unit || undefined,
        notes: doseNotes.trim() || undefined,
        // Pharmacy link (extra fields, ignored by old code)
        pharmacyItemId: doseTarget.id,
        pharmacyDeducted: v,
      } as any;
      const newSoins = [...(animal.soins || []), soin];
      await updateAnimal(doseAnimalId, { soins: newSoins });

      setItems((prev) => prev.map((p) => (p.id === doseTarget.id ? (data as PharmacyItem) : p)));
      toast({ title: 'Dose enregistrée', description: `${formatQty(v)} ${doseTarget.unit || ''} pour ${animal.nom}`.trim() });
      setDoseOpen(false);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erreur', description: "Impossible d'enregistrer la dose", variant: 'destructive' });
    }
  };

  // ------- Delete -------
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await (supabase as any)
        .from('pharmacy_items')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      setItems((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast({ title: 'Produit supprimé' });
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  // ------- Render helpers -------
  const renderItem = (it: PharmacyItem) => {
    const qty = Number(it.quantity_remaining);
    const threshold = it.low_stock_threshold != null ? Number(it.low_stock_threshold) : DEFAULT_LOW_THRESHOLD;
    const isEmpty = qty <= 0;
    const isLow = !isEmpty && qty <= threshold;
    const days = daysUntil(it.expiration_date);
    const isExpired = days != null && days < 0;
    const isExpiringSoon = days != null && days >= 0 && days <= EXPIRING_SOON_DAYS;

    return (
      <div key={it.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Pill className="w-4 h-4 text-primary flex-shrink-0" />
              <h3 className="font-semibold text-foreground truncate">{it.name}</h3>
              {it.category && (
                <Badge variant="secondary" className="text-[10px]">{it.category}</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Quantité restante : <span className="font-semibold text-foreground">{formatQty(qty)}{it.unit ? ` ${it.unit}${qty > 1 && !it.unit.endsWith('s') ? 's' : ''}` : ''}</span>
            </p>
            {it.expiration_date && (
              <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                <CalendarClock className="w-3 h-3" /> Expire : {formatExpiration(it.expiration_date)}
              </p>
            )}
            {it.notes && (
              <p className="mt-1 text-xs text-muted-foreground italic line-clamp-2">{it.notes}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {isEmpty && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="w-3 h-3 mr-1" />Stock épuisé</Badge>}
              {isLow && <Badge className="text-[10px] bg-[hsl(40,90%,55%)] hover:bg-[hsl(40,90%,55%)] text-white"><AlertTriangle className="w-3 h-3 mr-1" />Stock faible</Badge>}
              {isExpired && <Badge variant="destructive" className="text-[10px]">Expiré</Badge>}
              {isExpiringSoon && !isExpired && <Badge className="text-[10px] bg-[hsl(40,90%,55%)] hover:bg-[hsl(40,90%,55%)] text-white">Expire bientôt</Badge>}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={() => openDose(it)} disabled={isEmpty}>
            <Syringe className="w-3.5 h-3.5 mr-1" /> Donner une dose
          </Button>
          <Button size="sm" variant="outline" onClick={() => openAdjust(it, 'add')}>
            <PlusCircle className="w-3.5 h-3.5 mr-1" /> Ajouter
          </Button>
          <Button size="sm" variant="outline" onClick={() => openAdjust(it, 'remove')} disabled={isEmpty}>
            <MinusCircle className="w-3.5 h-3.5 mr-1" /> Retirer
          </Button>
          <Button size="sm" variant="outline" onClick={() => openEdit(it)}>
            <Edit2 className="w-3.5 h-3.5 mr-1" /> Modifier
          </Button>
          <Button size="sm" variant="ghost" className="col-span-2 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(it)}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Supprimer
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-lg flex-1">Pharmacie</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </div>

      <div className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-6">
            <Pill className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-semibold text-foreground">Aucun produit dans la pharmacie</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajoutez vos médicaments ou traitements pour suivre les quantités restantes.
            </p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> Ajouter un produit
            </Button>
          </div>
        ) : (
          <div className="space-y-3">{filtered.map(renderItem)}</div>
        )}
      </div>

      {/* Edit / Create dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier le produit' : 'Ajouter un produit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nom du produit *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex. Milbemax" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unité</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Quantité restante *</Label>
                <Input
                  inputMode="decimal"
                  type="text"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="Ex. 3 ou 1.5"
                />
              </div>
              <div>
                <Label>Seuil stock faible</Label>
                <Input
                  inputMode="decimal"
                  type="text"
                  value={form.threshold}
                  onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                  placeholder="Ex. 1"
                />
              </div>
            </div>
            <div>
              <Label>Date d'expiration</Label>
              <DateField
                value={form.expiration || new Date()}
                onChange={(d) => setForm({ ...form, expiration: d })}
              />
              {form.expiration && (
                <Button variant="ghost" size="sm" className="mt-1 h-auto p-1 text-xs" onClick={() => setForm({ ...form, expiration: null })}>
                  Retirer la date
                </Button>
              )}
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button onClick={saveForm} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{adjustMode === 'add' ? 'Ajouter du stock' : 'Retirer du stock'}</DialogTitle>
            <DialogDescription>
              {adjustTarget?.name} — restant : {adjustTarget ? formatQty(Number(adjustTarget.quantity_remaining)) : '0'} {adjustTarget?.unit || ''}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Quantité</Label>
            <Input
              inputMode="decimal"
              type="text"
              value={adjustValue}
              onChange={(e) => setAdjustValue(e.target.value)}
              placeholder="Ex. 1.5"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Annuler</Button>
            <Button onClick={applyAdjust}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Give-dose dialog */}
      <Dialog open={doseOpen} onOpenChange={setDoseOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Donner une dose</DialogTitle>
            <DialogDescription>
              {doseTarget?.name} — restant : {doseTarget ? formatQty(Number(doseTarget.quantity_remaining)) : '0'} {doseTarget?.unit || ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Animal *</Label>
              <Select value={doseAnimalId} onValueChange={setDoseAnimalId}>
                <SelectTrigger><SelectValue placeholder="Choisir un animal" /></SelectTrigger>
                <SelectContent>
                  {activeAnimals.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Dose donnée *</Label>
              <Input
                inputMode="decimal"
                type="text"
                value={doseValue}
                onChange={(e) => setDoseValue(e.target.value)}
                placeholder="Ex. 1 ou 0.5"
              />
              {doseTarget?.unit && <p className="text-xs text-muted-foreground mt-1">Unité : {doseTarget.unit}</p>}
            </div>
            <div>
              <Label>Date</Label>
              <DateField value={doseDate} onChange={(d) => setDoseDate(d)} />
            </div>
            <div>
              <Label>Notes (optionnel)</Label>
              <Textarea value={doseNotes} onChange={(e) => setDoseNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDoseOpen(false)}>Annuler</Button>
            <Button onClick={applyDose}>Enregistrer la dose</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} sera supprimé de votre pharmacie. L'historique des traitements déjà donnés aux animaux est conservé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
