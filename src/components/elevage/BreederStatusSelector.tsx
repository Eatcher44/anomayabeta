import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const BREEDER_STATUSES = [
  { value: 'active', label: 'Actif', color: 'bg-[hsl(var(--status-green))]/15 text-[hsl(var(--status-green))]' },
  { value: 'on_break', label: 'En pause', color: 'bg-[hsl(var(--status-orange))]/15 text-[hsl(var(--status-orange))]' },
  { value: 'retired', label: 'Retraité', color: 'bg-muted text-muted-foreground' },
];

interface Props {
  animalId: string;
  currentStatus: string;
  onStatusChange: (status: string) => void;
}

export default function BreederStatusSelector({ animalId, currentStatus, onStatusChange }: Props) {
  const handleChange = async (status: string) => {
    try {
      const { error } = await supabase.from('animals').update({ breeder_status: status } as any).eq('id', animalId);
      if (error) throw error;
      onStatusChange(status);
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={currentStatus || 'active'} onValueChange={handleChange}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BREEDER_STATUSES.map(s => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function BreederStatusBadge({ status }: { status: string }) {
  const cfg = BREEDER_STATUSES.find(s => s.value === status) || BREEDER_STATUSES[0];
  return (
    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${cfg.color}`}>
      {cfg.label}
    </Badge>
  );
}