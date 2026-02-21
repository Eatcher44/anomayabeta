import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ChevronRight,
  AlertCircle,
  MoreVertical,
  GripVertical,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useAnimals } from '@/context/AnimalsContext';
import { getChecklistCompletion, getDepartureUrgency } from '@/utils/departureChecklist';
import { normalizeType } from '@/utils/normalize';
import { toast } from '@/hooks/use-toast';
import type { Animal, CommercialStatus } from '@/types/animal';

const COLUMNS: { key: CommercialStatus; label: string }[] = [
  { key: 'available', label: 'Disponible' },
  { key: 'option', label: 'Option' },
  { key: 'reserved', label: 'Réservé' },
  { key: 'sold', label: 'Vendu' },
  { key: 'kept', label: 'Gardé' },
];

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-secondary text-secondary-foreground border-border',
  option: 'bg-[hsl(var(--status-orange))]/15 text-[hsl(var(--status-orange))] border-[hsl(var(--status-orange))]/30',
  reserved: 'bg-[hsl(var(--male-bg))] text-[hsl(var(--male-accent))] border-[hsl(var(--male-accent))]/30',
  sold: 'bg-[hsl(var(--status-green))]/15 text-[hsl(var(--status-green))] border-[hsl(var(--status-green))]/30',
  kept: 'bg-secondary text-secondary-foreground border-border',
};

const URGENCY_LABELS: Record<string, { text: string; className: string }> = {
  urgent: { text: 'Très urgent', className: 'bg-destructive text-destructive-foreground' },
  imminent: { text: 'Urgent', className: 'bg-[hsl(var(--status-orange))]/15 text-[hsl(var(--status-orange))]' },
  soon: { text: 'Bientôt', className: 'bg-secondary text-muted-foreground' },
};

function getCardUrgency(animal: Animal): string {
  const urgency = getDepartureUrgency(animal.planned_departure_date);
  // Only show urgent/imminent badges for reserved/sold
  const s = animal.commercial_status || 'available';
  if ((urgency === 'urgent' || urgency === 'imminent') && s !== 'reserved' && s !== 'sold') {
    return urgency === 'urgent' ? 'soon' : 'none';
  }
  return urgency;
}

interface KanbanBoardProps {
  species: string;
}

export default function KanbanBoard({ species }: KanbanBoardProps) {
  const navigate = useNavigate();
  const { animaux, updateAnimal, deleteAnimal } = useAnimals();
  const [buyerDialog, setBuyerDialog] = useState<{ animalId: string; targetStatus: CommercialStatus } | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [filterNoDate, setFilterNoDate] = useState(false);

  const speciesKey = normalizeType(species).toLowerCase();

  const relevantAnimals = useMemo(() => {
    return animaux.filter(a => {
      if (a.paradis) return false;
      if (normalizeType(a.type).toLowerCase() !== speciesKey) return false;
      const status = a.commercial_status || 'available';
      return ['available', 'option', 'reserved', 'sold', 'kept'].includes(status);
    });
  }, [animaux, speciesKey]);

  // Summary stats (computed from all relevant, before filter)
  const summary = useMemo(() => {
    const total = relevantAnimals.length;
    const noDate = relevantAnimals.filter(a => !a.planned_departure_date).length;
    const urgent = relevantAnimals.filter(a => {
      if (!a.planned_departure_date) return false;
      const s = a.commercial_status || 'available';
      if (s !== 'reserved' && s !== 'sold') return false;
      const days = Math.floor((new Date(a.planned_departure_date).getTime() - Date.now()) / 86400000);
      return days <= 3;
    }).length;
    return { total, noDate, urgent };
  }, [relevantAnimals]);

  // Apply filter
  const filteredAnimals = useMemo(() => {
    if (!filterNoDate) return relevantAnimals;
    return relevantAnimals.filter(a => !a.planned_departure_date);
  }, [relevantAnimals, filterNoDate]);

  const columnData = useMemo(() => {
    const map: Record<string, Animal[]> = {};
    COLUMNS.forEach(c => { map[c.key] = []; });
    filteredAnimals.forEach(a => {
      const s = a.commercial_status || 'available';
      if (map[s]) map[s].push(a);
    });
    // Sort each column by planned_departure_date
    Object.values(map).forEach(arr => {
      arr.sort((a, b) => {
        if (a.planned_departure_date && b.planned_departure_date) {
          return new Date(a.planned_departure_date).getTime() - new Date(b.planned_departure_date).getTime();
        }
        if (a.planned_departure_date) return -1;
        if (b.planned_departure_date) return 1;
        return a.nom.localeCompare(b.nom);
      });
    });
    return map;
  }, [filteredAnimals]);
  const getMotherName = useCallback((a: Animal) => {
    if (!a.mother_id) return null;
    return animaux.find(m => m.id === a.mother_id)?.nom || null;
  }, [animaux]);

  const moveToStatus = useCallback(async (animal: Animal, newStatus: CommercialStatus) => {
    // If moving to sold and no buyer name, prompt
    if (newStatus === 'sold' && !animal.buyer_name) {
      setBuyerDialog({ animalId: animal.id, targetStatus: newStatus });
      return;
    }
    await updateAnimal(animal.id, { commercial_status: newStatus });
    toast({ title: `Statut mis à jour`, description: `${animal.nom} → ${COLUMNS.find(c => c.key === newStatus)?.label}` });
  }, [updateAnimal]);

  const handleBuyerConfirm = useCallback(async (addNow: boolean) => {
    if (!buyerDialog) return;
    const updates: Partial<Animal> = { commercial_status: buyerDialog.targetStatus };
    if (addNow && buyerName.trim()) {
      updates.buyer_name = buyerName.trim();
    }
    await updateAnimal(buyerDialog.animalId, updates);
    toast({ title: 'Statut mis à jour' });
    setBuyerDialog(null);
    setBuyerName('');
  }, [buyerDialog, buyerName, updateAnimal]);

  const handleParadis = useCallback(async (animal: Animal) => {
    await updateAnimal(animal.id, { paradis: true } as Partial<Animal>);
    toast({ title: `${animal.nom} envoyé au paradis 🌈` });
  }, [updateAnimal]);

  const handleDelete = useCallback(async (animal: Animal) => {
    await deleteAnimal(animal.id);
    toast({ title: `${animal.nom} supprimé` });
  }, [deleteAnimal]);

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  return (
    <>
      {/* Summary bar + filter */}
      <div className="px-4 pb-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card rounded-lg border border-border px-3 py-1.5">
          <span>Total: <strong className="text-foreground">{summary.total}</strong></span>
          <span className="text-border">|</span>
          <span>Sans date: <strong className="text-foreground">{summary.noDate}</strong></span>
          <span className="text-border">|</span>
          <span>Urgents: <strong className={summary.urgent > 0 ? 'text-destructive' : 'text-foreground'}>{summary.urgent}</strong></span>
        </div>
        <button
          onClick={() => setFilterNoDate(v => !v)}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
            filterNoDate
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:text-foreground'
          }`}
        >
          Sans date uniquement
        </button>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-3 px-4 pb-4 min-w-max">
          {COLUMNS.map(col => (
            <div key={col.key} className="w-[260px] shrink-0">
              {/* Column header */}
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${STATUS_COLORS[col.key]}`}>
                    {col.label}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {columnData[col.key]?.length || 0}
                  </span>
                </div>
              </div>

              {/* Column body */}
              <div className="space-y-2 min-h-[100px] bg-muted/30 rounded-xl p-2 border border-border/50">
                {(columnData[col.key] || []).map(animal => {
                  const { done, total } = getChecklistCompletion(animal);
                  const urgency = getCardUrgency(animal);
                  const urgencyInfo = URGENCY_LABELS[urgency];
                  const motherName = getMotherName(animal);

                  return (
                    <div
                      key={animal.id}
                      className="bg-card rounded-lg border border-border p-2.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/depart/${animal.id}`)}
                    >
                      {/* Top row: photo + name + menu */}
                      <div className="flex items-start gap-2">
                        {animal.photo ? (
                          <img src={animal.photo} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs shrink-0">🐾</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{animal.nom}</p>
                          {motherName && (
                            <p className="text-[10px] text-muted-foreground truncate">Mère: {motherName}</p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <button className="p-1 rounded-md hover:bg-muted shrink-0">
                              <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48" onClick={e => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => navigate(`/depart/${animal.id}`)}>
                              Ouvrir profil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/profil/${animal.id}`)}>
                              Modifier acheteur
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {COLUMNS.filter(c => c.key !== (animal.commercial_status || 'available')).map(c => (
                              <DropdownMenuItem key={c.key} onClick={() => moveToStatus(animal, c.key)}>
                                Déplacer vers {c.label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            {(animal.commercial_status === 'sold') && (
                              <DropdownMenuItem onClick={() => navigate(`/transfer/${animal.id}`)}>
                                Transférer au propriétaire
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleParadis(animal)}
                            >
                              Envoyer au paradis
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(animal)}
                            >
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Info row */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {animal.planned_departure_date ? (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <CalendarDays className="w-3 h-3" />{fmt(animal.planned_departure_date)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Sans date</span>
                        )}
                        {animal.buyer_name && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">• {animal.buyer_name}</span>
                        )}
                      </div>

                      {/* Bottom row: checklist + urgency */}
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          ✅ {done}/{total}
                          {done < total && <AlertCircle className="w-3 h-3 inline ml-0.5 text-[hsl(var(--status-orange))]" />}
                        </span>
                        {urgencyInfo && (
                          <Badge className={`text-[9px] px-1.5 py-0 h-4 ${urgencyInfo.className} border-0`}>
                            {urgencyInfo.text}
                          </Badge>
                        )}
                      </div>

                      {/* Quick actions based on status */}
                      {animal.commercial_status === 'kept' && (
                        <button
                          className="mt-1.5 w-full text-[10px] font-semibold text-primary bg-accent rounded-md py-1 hover:bg-accent/80 transition-colors"
                          onClick={e => { e.stopPropagation(); navigate(`/profil/${animal.id}`); }}
                        >
                          Ajouter à Ma famille
                        </button>
                      )}
                      {animal.commercial_status === 'sold' && (
                        <button
                          className="mt-1.5 w-full text-[10px] font-semibold text-primary bg-accent rounded-md py-1 hover:bg-accent/80 transition-colors"
                          onClick={e => {
                            e.stopPropagation();
                            const { done: d, total: t } = getChecklistCompletion(animal);
                            if (d < t) {
                              toast({ title: 'Checklist incomplète', description: `${d}/${t} — complétez les éléments manquants.`, variant: 'destructive' });
                            } else {
                              navigate(`/transfer/${animal.id}`);
                            }
                          }}
                        >
                          Transférer au propriétaire
                        </button>
                      )}
                    </div>
                  );
                })}

                {(columnData[col.key] || []).length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-6 italic">Aucun animal</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Buyer name dialog */}
      <Dialog open={!!buyerDialog} onOpenChange={open => !open && setBuyerDialog(null)}>
        <DialogContent className="max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="text-base">Ajouter le nom de l'acheteur ?</DialogTitle>
            <DialogDescription className="text-xs">
              Vous pouvez ajouter le nom maintenant ou plus tard.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Nom de l'acheteur"
            value={buyerName}
            onChange={e => setBuyerName(e.target.value)}
            className="text-sm"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => handleBuyerConfirm(false)}>
              Plus tard
            </Button>
            <Button size="sm" onClick={() => handleBuyerConfirm(true)} disabled={!buyerName.trim()}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}