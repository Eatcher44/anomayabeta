import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAnimals } from '@/context/AnimalsContext';
import DateField from '@/components/DateField';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function PoidsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { animaux, updateAnimal } = useAnimals();
  
  const [poids, setPoids] = useState('');
  const [date, setDate] = useState(new Date());
  const [valid, setValid] = useState(true);

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

  const addPoids = () => {
    const val = parseFloat(String(poids).replace(',', '.'));
    if (!valid || isNaN(val) || val <= 0) return;

    const entry = {
      id: Date.now().toString(),
      poids: val,
      date: date.toISOString(),
    };
    updateAnimal(animal.id, (a) => ({
      ...a,
      poids: [...(a.poids || []), entry],
    }));
    setPoids('');
    setDate(new Date());
  };

  const canSave = valid && poids.trim() !== '' && !isNaN(parseFloat(poids.replace(',', '.')));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-lg">Suivi du poids — {animal.nom}</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Graphique */}
        <div className="bg-card rounded-xl p-4 border border-border">
          {chartData.length < 2 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground">
              Ajoutez au moins 2 pesées pour voir le graphique
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}kg`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="poids"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Ajout */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h2 className="font-bold mb-4">Ajouter un poids</h2>
          <div className="space-y-4">
            <div>
              <Label>Poids (kg)</Label>
              <Input
                value={poids}
                onChange={(e) => setPoids(e.target.value)}
                placeholder="ex: 4.5"
                type="text"
                inputMode="decimal"
                className="mt-1.5"
              />
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

        {/* Historique */}
        <div className="bg-card rounded-xl p-4 border border-border">
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
                  className="flex justify-between py-2 border-b border-border last:border-0"
                >
                  <span>{new Date(p.date).toLocaleDateString('fr-FR')}</span>
                  <span className="font-bold">{p.poids} kg</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
