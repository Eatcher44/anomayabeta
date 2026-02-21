import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Animal } from '@/types/animal';
import type { Reproduction } from '@/hooks/useElevageData';

interface Props {
  reproductions: Reproduction[];
  animaux: Animal[];
  gestationDays: number;
}

export default function ElevageGestations({ reproductions, animaux, gestationDays }: Props) {
  const navigate = useNavigate();
  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR');

  // Group by status
  const active = reproductions.filter(r => r.status === 'active');
  const cancelled = reproductions.filter(r => r.status === 'cancelled');
  const confirmed = reproductions.filter(r => r.status === 'birth_confirmed' || r.confirmed);

  const renderList = (items: Reproduction[], label: string) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase">{label} ({items.length})</h3>
        {items.map(g => {
          const start = new Date(g.date_saillie);
          const expected = new Date(start);
          expected.setDate(expected.getDate() + gestationDays);
          const days = Math.floor((Date.now() - start.getTime()) / 86400000);
          const mother = animaux.find(a => a.id === g.animal_id);
          const progress = Math.round((days / gestationDays) * 100);
          const isActive = g.status === 'active' && days >= 0 && days <= gestationDays;

          const statusLabel = g.status === 'cancelled' ? 'Annulée' : g.status === 'birth_confirmed' || g.confirmed ? 'Mise-bas' : `J${days}/${gestationDays}`;
          const statusVariant = g.status === 'cancelled' ? 'destructive' as const : 'secondary' as const;

          return (
            <Card key={g.id} className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-sm">{mother?.nom || 'Femelle'}</p>
                <Badge variant={statusVariant} className="text-[10px]">{statusLabel}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Saillie : {fmt(g.date_saillie)} • Mise-bas : {fmt(expected.toISOString())}
              </p>
              {isActive && (
                <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
                </div>
              )}
              <Button variant="ghost" size="sm" className="mt-1.5 text-[11px] text-primary p-0 h-auto" onClick={() => navigate(`/reproduction/${g.animal_id}`)}>
                Voir détails <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Card>
          );
        })}
      </div>
    );
  };

  if (reproductions.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune saillie enregistrée.</p>;
  }

  return (
    <div className="space-y-3">
      {renderList(active, 'Actives')}
      {renderList(confirmed, 'Mise-bas effectuée')}
      {renderList(cancelled, 'Annulées')}
    </div>
  );
}
