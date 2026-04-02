import React, { useState, useEffect } from 'react';
import { CalendarDays, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Animal } from '@/types/animal';

interface Props {
  animal: Animal;
  onUpdate: (patch: Partial<Animal>) => void;
}

function computeAutoDate(naissance?: string): string | null {
  if (!naissance) return null;
  const d = new Date(naissance);
  d.setDate(d.getDate() + 84); // 12 weeks
  return d.toISOString().split('T')[0];
}

export default function AvailabilityDateSection({ animal, onUpdate }: Props) {
  const autoDate = computeAutoDate(animal.naissance);
  const isManual = (animal as any).availability_date_manual === true;
  const currentDate = (animal as any).availability_date || autoDate || '';
  const [date, setDate] = useState(currentDate);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!isManual && autoDate) {
      setDate(autoDate);
    }
  }, [autoDate, isManual]);

  const handleSave = async () => {
    try {
      await supabase.from('animals').update({
        availability_date: date || null,
        availability_date_manual: true,
      } as any).eq('id', animal.id);
      onUpdate({ availability_date: date || null, availability_date_manual: true } as any);
      setDirty(false);
      toast({ title: 'Date de disponibilité enregistrée' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleReset = async () => {
    try {
      await supabase.from('animals').update({
        availability_date: autoDate,
        availability_date_manual: false,
      } as any).eq('id', animal.id);
      setDate(autoDate || '');
      onUpdate({ availability_date: autoDate, availability_date_manual: false } as any);
      setDirty(false);
      toast({ title: 'Date réinitialisée' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR');

  return (
    <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-4 h-4 text-primary" />
        <h2 className="font-extrabold text-sm">Disponibilité</h2>
        {isManual && (
          <Badge variant="secondary" className="text-[9px] ml-auto">Personnalisée</Badge>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Disponible à partir du</Label>
          <Input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setDirty(true); }}
            className="mt-1"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Calculée automatiquement à 12 semaines, modifiable manuellement
          </p>
        </div>
        {dirty && <Button onClick={handleSave} className="w-full">Enregistrer</Button>}
        {isManual && !dirty && (
          <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={handleReset}>
            <RotateCcw className="w-3 h-3 mr-1" />Réinitialiser la date automatique
          </Button>
        )}
      </div>
    </div>
  );
}
