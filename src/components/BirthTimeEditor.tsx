import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';

interface BirthTimeEditorProps {
  litterId: string;
  initialValue?: string | null;
  onSaved?: (time: string) => void;
}

export function BirthTimeEditor({ litterId, initialValue, onSaved }: BirthTimeEditorProps) {
  const [editing, setEditing] = useState(false);
  const [time, setTime] = useState(initialValue || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!time) {
      toast.error("Veuillez choisir une heure");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('litters')
      .update({ birth_time: time })
      .eq('id', litterId);
    setSaving(false);
    if (error) {
      toast.error("Erreur lors de l'enregistrement");
      return;
    }
    toast.success('Heure de naissance enregistrée');
    onSaved?.(time);
    setEditing(false);
  };

  if (!editing) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setEditing(true)}
      >
        <Clock className="h-4 w-4 mr-2" />
        {initialValue ? 'Modifier l\'heure de naissance' : 'Ajouter l\'heure de naissance'}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="birth-time" className="text-xs">Heure de naissance</Label>
      <p className="text-xs text-muted-foreground">
        Permet de calculer l'âge des petits plus précisément.
      </p>
      <div className="flex gap-2">
        <Input
          id="birth-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="flex-1"
        />
        <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? '...' : 'OK'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

export default BirthTimeEditor;
