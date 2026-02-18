import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAnimals } from '@/context/AnimalsContext';
import DateField from '@/components/DateField';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatWeight } from '@/components/AnimalRow';

type WeightUnit = 'kg' | 'g';

export default function PoidsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { animaux, updateAnimal } = useAnimals();

  const [poids, setPoids] = useState('');
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [date, setDate] = useState(new Date());
  const [valid, setValid] = useState(true);

  // Edit state
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editPoids, setEditPoids] = useState('');
  const [editUnit, setEditUnit] = useState<WeightUnit>('kg');
  const [editDate, setEditDate] = useState(new Date());
  const [editValid, setEditValid] = useState(true);

  const animal = animaux.find((a) => a.id === id);

  const data = useMemo(() => {
    if (!animal) return [];
    return [...(animal.poids || [])].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [animal?.poids]);

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString('fr-FR'),
    poids: d.poids,
  }));

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

  const toKg = (val: number, u: WeightUnit): number => u === 'g' ? val / 1000 : val;

  const addPoids = () => {
    const val = parseFloat(String(poids).replace(',', '.'));
    if (!valid || isNaN(val) || val <= 0) return;

    const kgVal = toKg(val, unit);
    const entry = {
      id: Date.now().toString(),
      poids: kgVal,
      date: date.toISOString(),
    };
    updateAnimal(animal.id, (a) => ({
      ...a,
      poids: [...(a.poids || []), entry],
    }));
    setPoids('');
    setDate(new Date());
  };

  const openEdit = (entryId: string) => {
    const entry = data.find((p) => p.id === entryId);
    if (!entry) return;
    setEditId(entryId);
    // Display in best unit
    if (entry.poids < 1) {
      setEditPoids(String(Math.round(entry.poids * 1000)));
      setEditUnit('g');
    } else {
      setEditPoids(String(entry.poids));
      setEditUnit('kg');
    }
    setEditDate(new Date(entry.date));
    setEditValid(true);
    setEditSheetOpen(true);
  };

  const saveEdit = () => {
    if (!editId || !editValid) return;
    const val = parseFloat(String(editPoids).replace(',', '.'));
    if (isNaN(val) || val <= 0) return;

    const kgVal = toKg(val, editUnit);
    updateAnimal(animal.id, (a) => ({
      ...a,
      poids: (a.poids || []).map((p) =>
        p.id === editId ? { ...p, poids: kgVal, date: editDate.toISOString() } : p
      ),
    }));
    setEditSheetOpen(false);
    setEditId(null);
  };

  const deleteEntry = () => {
    if (!editId) return;
    updateAnimal(animal.id, (a) => ({
      ...a,
      poids: (a.poids || []).filter((p) => p.id !== editId),
    }));
    setEditSheetOpen(false);
    setEditId(null);
  };

  const canSave = valid && poids.trim() !== '' && !isNaN(parseFloat(poids.replace(',', '.')));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-lg">Suivi du poids — {animal.nom}</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Chart */}
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          {chartData.length < 2 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground">
              Ajoutez au moins 2 pesées pour voir le graphique
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}kg`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="poids" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Add weight */}
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <h2 className="font-bold mb-4">Ajouter un poids</h2>
          <div className="space-y-4">
            <div>
              <Label>Poids</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={poids}
                  onChange={(e) => setPoids(e.target.value)}
                  placeholder={unit === 'kg' ? 'ex: 4.5' : 'ex: 850'}
                  type="text"
                  inputMode="decimal"
                  className="flex-1"
                />
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setUnit('g')}
                    className={`px-3 py-2 text-sm font-semibold transition-colors ${
                      unit === 'g' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
                    }`}
                  >
                    g
                  </button>
                  <button
                    onClick={() => setUnit('kg')}
                    className={`px-3 py-2 text-sm font-semibold transition-colors ${
                      unit === 'kg' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
                    }`}
                  >
                    kg
                  </button>
                </div>
              </div>
            </div>
            <DateField
              value={date}
              onChange={setDate}
              maximumDate={new Date(2099, 11, 31)}
              title="Date"
              onValidityChange={setValid}
            />
            <Button onClick={addPoids} disabled={!canSave} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </div>

        {/* History */}
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <h2 className="font-bold mb-4">Historique</h2>
          {data.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucun enregistrement
            </p>
          ) : (
            <div className="space-y-2">
              {[...data].reverse().map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center py-2 border-b border-border last:border-0"
                >
                  <span>{new Date(p.date).toLocaleDateString('fr-FR')}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{formatWeight(p.poids)}</span>
                    <button
                      onClick={() => openEdit(p.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-accent transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit bottom sheet */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Modifier la pesée</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>Poids</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={editPoids}
                  onChange={(e) => setEditPoids(e.target.value)}
                  placeholder={editUnit === 'kg' ? 'ex: 4.5' : 'ex: 850'}
                  type="text"
                  inputMode="decimal"
                  className="flex-1"
                />
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setEditUnit('g')}
                    className={`px-3 py-2 text-sm font-semibold transition-colors ${
                      editUnit === 'g' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
                    }`}
                  >
                    g
                  </button>
                  <button
                    onClick={() => setEditUnit('kg')}
                    className={`px-3 py-2 text-sm font-semibold transition-colors ${
                      editUnit === 'kg' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
                    }`}
                  >
                    kg
                  </button>
                </div>
              </div>
            </div>
            <DateField
              value={editDate}
              onChange={setEditDate}
              maximumDate={new Date(2099, 11, 31)}
              title="Date"
              onValidityChange={setEditValid}
            />
            <div className="flex gap-3">
              <Button onClick={saveEdit} disabled={!editValid} className="flex-1">
                Enregistrer
              </Button>
              <Button variant="destructive" onClick={deleteEntry}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
