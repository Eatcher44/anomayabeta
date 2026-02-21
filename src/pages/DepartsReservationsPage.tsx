import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cat, Dog, CalendarDays, ChevronRight, AlertCircle, List, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAnimals } from '@/context/AnimalsContext';
import { normalizeType } from '@/utils/normalize';
import { getChecklistCompletion, getDepartureUrgency } from '@/utils/departureChecklist';
import KanbanBoard from '@/components/elevage/KanbanBoard';
import type { Animal } from '@/types/animal';

const SPECIES_TABS = [
  { key: 'chat', label: 'Chats', icon: Cat },
  { key: 'chien', label: 'Chiens', icon: Dog },
] as const;

const STORAGE_KEY = 'elevage-species-tab';
const VIEW_STORAGE_KEY = 'departs-view-mode';

const STATUS_LABELS: Record<string, string> = {
  option: 'Option',
  reserved: 'Réservé',
  sold: 'Vendu',
  kept: 'Gardé',
};

const STATUS_COLORS: Record<string, string> = {
  option: 'bg-[hsl(var(--status-orange))]/15 text-[hsl(var(--status-orange))] border-[hsl(var(--status-orange))]/30',
  reserved: 'bg-[hsl(var(--male-bg))] text-[hsl(var(--male-accent))] border-[hsl(var(--male-accent))]/30',
  sold: 'bg-[hsl(var(--status-green))]/15 text-[hsl(var(--status-green))] border-[hsl(var(--status-green))]/30',
  kept: 'bg-secondary text-secondary-foreground border-border',
};

export default function DepartsReservationsPage() {
  const navigate = useNavigate();
  const { animaux } = useAnimals();
  const [species, setSpecies] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'chat'; } catch { return 'chat'; }
  });
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>(() => {
    try { return (localStorage.getItem(VIEW_STORAGE_KEY) as 'list' | 'kanban') || 'kanban'; } catch { return 'kanban'; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, species); } catch {}
  }, [species]);

  useEffect(() => {
    try { localStorage.setItem(VIEW_STORAGE_KEY, viewMode); } catch {}
  }, [viewMode]);

  const speciesKey = normalizeType(species).toLowerCase();

  // Filter newborns of this species with relevant statuses (for list view)
  const relevantAnimals = useMemo(() => {
    return animaux.filter(a => {
      if (a.paradis) return false;
      if (normalizeType(a.type).toLowerCase() !== speciesKey) return false;
      const status = a.commercial_status;
      return status === 'option' || status === 'reserved' || status === 'sold' || status === 'kept';
    });
  }, [animaux, speciesKey]);

  // Split into dated and undated, sorted
  const { dated, undated } = useMemo(() => {
    const d: Animal[] = [];
    const u: Animal[] = [];
    relevantAnimals.forEach(a => {
      if (a.planned_departure_date) d.push(a);
      else u.push(a);
    });
    d.sort((a, b) => new Date(a.planned_departure_date!).getTime() - new Date(b.planned_departure_date!).getTime());
    u.sort((a, b) => a.nom.localeCompare(b.nom));
    return { dated: d, undated: u };
  }, [relevantAnimals]);

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR');

  const getMotherName = (a: Animal) => {
    if (!a.mother_id) return null;
    return animaux.find(m => m.id === a.mother_id)?.nom || null;
  };

  const renderRow = (a: Animal) => {
    const { done, total } = getChecklistCompletion(a);
    const urgency = getDepartureUrgency(a.planned_departure_date);
    const status = a.commercial_status || 'available';
    const motherName = getMotherName(a);

    let rowBg = '';
    if (urgency === 'urgent') rowBg = 'border-l-2 border-l-destructive bg-destructive/5';
    else if (urgency === 'imminent') rowBg = 'border-l-2 border-l-[hsl(var(--status-orange))] bg-[hsl(var(--status-orange))]/5';
    else if (urgency === 'soon') rowBg = 'border-l-2 border-l-[hsl(var(--status-orange))]/50';

    return (
      <button
        key={a.id}
        onClick={() => navigate(`/depart/${a.id}`)}
        className={`w-full flex items-center gap-3 bg-card rounded-xl border border-border p-3 shadow-sm hover:shadow-md transition-shadow text-left ${rowBg}`}
      >
        {a.photo ? (
          <img src={a.photo} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">🐾</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-bold text-sm truncate">{a.nom}</p>
            {urgency === 'urgent' && (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">Urgent</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${STATUS_COLORS[status] || ''}`}>
              {STATUS_LABELS[status] || status}
            </span>
            {a.buyer_name && (
              <span className="text-[10px] text-muted-foreground truncate">• {a.buyer_name}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {a.planned_departure_date && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <CalendarDays className="w-3 h-3" />{fmt(a.planned_departure_date)}
              </span>
            )}
            {motherName && (
              <span className="text-[10px] text-muted-foreground">Mère: {motherName}</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Checklist : {done}/{total}
            {done < total && <AlertCircle className="w-3 h-3 inline ml-1 text-[hsl(var(--status-orange))]" />}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/elevage')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-extrabold text-primary flex-1">Départs & Réservations</h1>
          {/* View toggle */}
          <div className="flex bg-muted/60 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}
              title="Vue liste"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}
              title="Vue Kanban"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Species Tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 bg-muted/60 rounded-xl p-1">
          {SPECIES_TABS.map(tab => {
            const isActive = tab.key === species;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setSpecies(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'kanban' ? (
        <KanbanBoard species={species} />
      ) : (
        <div className="px-4 space-y-4">
          {dated.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                Départs planifiés ({dated.length})
              </h2>
              <div className="space-y-2">{dated.map(renderRow)}</div>
            </section>
          )}

          {undated.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                Sans date de départ ({undated.length})
              </h2>
              <div className="space-y-2">{undated.map(renderRow)}</div>
            </section>
          )}

          {dated.length === 0 && undated.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">Aucun départ ou réservation en cours.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}