import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Animal } from '@/types/animal';

interface Props {
  animal: Animal;
  onUpdate: (patch: Partial<Animal>) => void;
}

export default function AdopterNoteSection({ animal, onUpdate }: Props) {
  const [note, setNote] = useState((animal as any).adopter_note || '');
  const [dirty, setDirty] = useState(false);

  const handleSave = async () => {
    try {
      await supabase.from('animals').update({ adopter_note: note.trim() || null } as any).eq('id', animal.id);
      onUpdate({ adopter_note: note.trim() || null } as any);
      setDirty(false);
      toast({ title: 'Note enregistrée' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  return (
    <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-primary" />
        <h2 className="font-extrabold text-sm">Note visible aux adoptants</h2>
      </div>
      <Textarea
        value={note}
        onChange={e => { setNote(e.target.value); if (!dirty) setDirty(true); }}
        placeholder="Caractère, habitudes, alimentation, socialisation..."
        rows={3}
      />
      <p className="text-[10px] text-muted-foreground mt-1">Ce texte sera affiché sur la fiche chaton partagée.</p>
      {dirty && <Button onClick={handleSave} className="w-full mt-2">Enregistrer</Button>}
    </div>
  );
}
