import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, FileText, Send, ShoppingCart, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAnimals } from '@/context/AnimalsContext';
import { computeDepartureChecklist, getDepartureUrgency } from '@/utils/departureChecklist';
import { toast } from '@/hooks/use-toast';

const STATUS_LABELS: Record<string, string> = {
  option: 'Option',
  reserved: 'Réservé',
  sold: 'Vendu',
  kept: 'Gardé',
  available: 'Disponible',
};

export default function PreparerDepartPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { animaux, updateAnimal } = useAnimals();
  const animal = animaux.find(a => a.id === id);
  const [departDate, setDepartDate] = useState<Date | undefined>(
    animal?.planned_departure_date ? new Date(animal.planned_departure_date) : undefined
  );

  const motherName = useMemo(() => {
    if (!animal?.mother_id) return null;
    return animaux.find(m => m.id === animal.mother_id)?.nom || null;
  }, [animal, animaux]);

  if (!animal) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background flex items-center justify-center">
        <p className="text-muted-foreground">Animal introuvable.</p>
      </div>
    );
  }

  const checklist = computeDepartureChecklist(animal);
  const completedCount = checklist.filter(i => i.completed).length;
  const urgency = getDepartureUrgency(animal.planned_departure_date);
  const status = animal.commercial_status || 'available';
  const allDone = completedCount === checklist.length;

  const handleDateChange = async (date: Date | undefined) => {
    setDepartDate(date);
    await updateAnimal(animal.id, {
      planned_departure_date: date ? date.toISOString().split('T')[0] : null,
    });
    toast({ title: date ? 'Date de départ mise à jour' : 'Date de départ supprimée' });
  };

  const handleMarkSold = async () => {
    await updateAnimal(animal.id, { commercial_status: 'sold' });
    toast({ title: 'Statut mis à jour', description: 'Marqué comme vendu.' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background" style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 24px)' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-extrabold text-primary truncate">Préparer le départ</h1>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Identity card */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            {animal.photo ? (
              <img src={animal.photo} alt="" className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-2xl">🐾</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-lg font-extrabold truncate">{animal.nom}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className="text-[10px]">{STATUS_LABELS[status]}</Badge>
                {urgency === 'urgent' && <Badge variant="destructive" className="text-[10px]">Urgent</Badge>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            {animal.race && <p>Race : <span className="text-foreground font-medium">{animal.race}</span></p>}
            {animal.sexe && <p>Sexe : <span className="text-foreground font-medium">{animal.sexe}</span></p>}
            {motherName && <p>Mère : <span className="text-foreground font-medium">{motherName}</span></p>}
            {animal.puce && <p>Puce : <span className="text-foreground font-medium">{animal.puce}</span></p>}
          </div>
        </Card>

        {/* Buyer info */}
        {(animal.buyer_name || animal.buyer_phone || animal.buyer_email) && (
          <Card className="p-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Acheteur</h3>
            <div className="space-y-1 text-sm">
              {animal.buyer_name && <p className="font-medium">{animal.buyer_name}</p>}
              {animal.buyer_phone && <p className="text-muted-foreground">{animal.buyer_phone}</p>}
              {animal.buyer_email && <p className="text-muted-foreground">{animal.buyer_email}</p>}
              {animal.deposit_received && (
                <Badge variant="secondary" className="text-[10px] mt-1">Acompte reçu ✓</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" className="mt-2 text-xs text-primary p-0 h-auto" onClick={() => navigate(`/profil/${animal.id}`)}>
              Modifier acheteur
            </Button>
          </Card>
        )}

        {/* Departure date */}
        <Card className="p-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Date de départ</h3>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !departDate && "text-muted-foreground")}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                {departDate ? format(departDate, 'PPP', { locale: fr }) : 'Choisir une date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={departDate}
                onSelect={handleDateChange}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {departDate && (
            <Button variant="ghost" size="sm" className="mt-1 text-xs text-destructive p-0 h-auto" onClick={() => handleDateChange(undefined)}>
              Supprimer la date
            </Button>
          )}
        </Card>

        {/* Checklist */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase">Checklist départ</h3>
            <span className="text-xs font-bold text-foreground">{completedCount}/{checklist.length}</span>
          </div>
          <div className="space-y-2">
            {checklist.map(item => (
              <div key={item.key} className="flex items-center gap-2.5">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                  item.completed
                    ? 'bg-[hsl(var(--status-green))]/15 text-[hsl(var(--status-green))]'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {item.completed ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                </div>
                <span className={`text-sm ${item.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-2">
          {status === 'reserved' && (
            <Button className="w-full gap-2" variant="default" onClick={handleMarkSold}>
              <ShoppingCart className="w-4 h-4" />
              Marquer comme vendu
            </Button>
          )}

          <Button className="w-full gap-2" variant="outline" onClick={() => navigate(`/profil/${animal.id}`)}>
            <FileText className="w-4 h-4" />
            Générer carnet de départ PDF
          </Button>

          {status === 'sold' && allDone && (
            <Button className="w-full gap-2" variant="default" onClick={() => navigate(`/transfer/${animal.id}`)}>
              <Send className="w-4 h-4" />
              Transférer au propriétaire
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
