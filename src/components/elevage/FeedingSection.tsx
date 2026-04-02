import React, { useState, useMemo } from 'react';
import { Utensils, Plus, Trash2, Edit, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import type { Animal, RepasEntry } from '@/types/animal';

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

interface FeedingSectionProps {
  animal: Animal;
  onUpdate: (patch: Partial<Animal>) => void | Promise<void>;
}

export function getLastRepas(animal: Animal): string | null {
  if (!animal.repas || animal.repas.length === 0) return null;
  const sorted = [...animal.repas].sort((a, b) => {
    const da = `${a.date}T${a.time}`;
    const db = `${b.date}T${b.time}`;
    return db.localeCompare(da);
  });
  const last = sorted[0];
  return `${last.quantity} mL à ${last.time}`;
}

export default function FeedingSection({ animal, onUpdate }: FeedingSectionProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(nowHHMM());
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');

  const repas = animal.repas || [];

  const sorted = useMemo(() =>
    [...repas].sort((a, b) => {
      const da = `${a.date}T${a.time}`;
      const db = `${b.date}T${b.time}`;
      return db.localeCompare(da);
    }),
    [repas]
  );

  const total24h = useMemo(() => {
    const now = new Date();
    const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return repas.reduce((sum, r) => {
      const dt = new Date(`${r.date}T${r.time}`);
      return dt >= h24ago && dt <= now ? sum + r.quantity : sum;
    }, 0);
  }, [repas]);

  const openAdd = () => {
    setEditId(null);
    setDate(todayISO());
    setTime(nowHHMM());
    setQuantity('');
    setNote('');
    setAddOpen(true);
  };

  const openEdit = (entry: RepasEntry) => {
    setEditId(entry.id);
    setDate(entry.date);
    setTime(entry.time);
    setQuantity(String(entry.quantity));
    setNote(entry.note || '');
    setAddOpen(true);
  };

  const handleSave = async () => {
    const q = parseFloat(quantity);
    if (!q || q <= 0) return;

    let updated: RepasEntry[];
    if (editId) {
      updated = repas.map((r) =>
        r.id === editId ? { ...r, date, time, quantity: q, note: note.trim() || undefined } : r
      );
    } else {
      const newEntry: RepasEntry = {
        id: crypto.randomUUID(),
        date,
        time,
        quantity: q,
        note: note.trim() || undefined,
      };
      updated = [...repas, newEntry];
    }

    try {
      await onUpdate({ repas: updated } as any);
      setAddOpen(false);
      toast({ title: editId ? 'Repas modifié' : 'Repas ajouté' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    const updated = repas.filter((r) => r.id !== id);
    try {
      await onUpdate({ repas: updated } as any);
      toast({ title: 'Repas supprimé' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const fmt = (d: string) => {
    const parts = d.split('-');
    return `${parts[2]}/${parts[1]}`;
  };

  return (
    <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Utensils className="w-4 h-4 text-primary" />
          <h2 className="font-extrabold text-sm">Repas</h2>
        </div>
        <Button size="sm" variant="outline" onClick={openAdd} className="h-7 text-xs gap-1">
          <Plus className="w-3 h-3" /> Ajouter
        </Button>
      </div>

      <div className="flex items-center justify-between bg-accent/40 rounded-lg px-3 py-2 mb-3">
        <span className="text-xs text-muted-foreground">Total sur 24h</span>
        <span className="font-bold text-sm">{total24h} mL</span>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Aucun repas enregistré</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {sorted.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{r.quantity} mL</p>
                <p className="text-[11px] text-muted-foreground">
                  {fmt(r.date)} à {r.time}
                  {r.note && <span className="ml-1">• {r.note}</span>}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button onClick={() => openEdit(r)} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(r.id)} className="w-7 h-7 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editId ? 'Modifier le repas' : 'Ajouter un repas'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Heure</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Quantité (mL)</Label>
              <Input type="number" min="0" step="0.5" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Ex: 12" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Note (optionnel)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: bien mangé" className="mt-1" />
            </div>
            <Button onClick={handleSave} disabled={!quantity || parseFloat(quantity) <= 0} className="w-full">
              {editId ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}