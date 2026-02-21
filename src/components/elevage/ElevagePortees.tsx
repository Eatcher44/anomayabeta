import React, { useState } from 'react';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Litter } from '@/hooks/useElevageData';

interface Props {
  activeLitters: Litter[];
  archivedLitters: Litter[];
  getAnimalName: (id: string) => string;
}

export default function ElevagePortees({ activeLitters, archivedLitters, getAnimalName }: Props) {
  const navigate = useNavigate();
  const [showArchived, setShowArchived] = useState(false);
  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR');

  const renderLitter = (l: Litter) => (
    <button
      key={l.id}
      onClick={() => navigate(`/portee/${l.id}`)}
      className="w-full flex items-center justify-between bg-card rounded-xl border border-border p-3 shadow-sm hover:shadow-md transition-shadow text-left"
    >
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">{getAnimalName(l.mother_id)}</p>
        <p className="text-[11px] text-muted-foreground">{fmt(l.birth_date)}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <Badge variant="secondary" className="text-[10px]">{l.newborn_count} nés</Badge>
          <Badge variant="secondary" className="text-[10px] bg-[hsl(var(--status-green))]/10 text-[hsl(var(--status-green))]">{l.alive_count} vivants</Badge>
          {l.transferred_count > 0 && (
            <Badge variant="secondary" className="text-[10px]">{l.transferred_count} transférés</Badge>
          )}
          {l.deceased_count > 0 && (
            <Badge variant="destructive" className="text-[10px]">{l.deceased_count} décédés</Badge>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );

  return (
    <div className="space-y-3">
      {/* Active */}
      <div>
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase mb-2">Actives ({activeLitters.length})</h3>
        {activeLitters.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune portée active.</p>
        ) : (
          <div className="space-y-2">{activeLitters.map(renderLitter)}</div>
        )}
      </div>

      {/* Archived */}
      {archivedLitters.length > 0 && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary text-xs p-0 h-auto mb-2"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? 'Masquer' : 'Voir'} les {archivedLitters.length} portées archivées <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
          {showArchived && (
            <div className="space-y-2">{archivedLitters.map(renderLitter)}</div>
          )}
        </div>
      )}

      <Button variant="ghost" size="sm" className="w-full text-primary text-xs" onClick={() => navigate('/portees')}>
        Gérer les portées <ArrowRight className="w-3 h-3 ml-1" />
      </Button>
    </div>
  );
}
