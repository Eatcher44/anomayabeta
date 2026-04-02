import React, { useState } from 'react';
import { CalendarCheck, User, Phone, Mail, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Animal } from '@/types/animal';

interface Props {
  animal: Animal;
  onUpdate: (patch: Partial<Animal>) => void;
}

export default function ReservationSection({ animal, onUpdate }: Props) {
  const [buyerName, setBuyerName] = useState(animal.buyer_name || '');
  const [buyerPhone, setBuyerPhone] = useState(animal.buyer_phone || '');
  const [buyerEmail, setBuyerEmail] = useState(animal.buyer_email || '');
  const [notes, setNotes] = useState(animal.commercial_notes || '');
  const [reservationDate, setReservationDate] = useState((animal as any).reservation_date || '');
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const hasReservation = !!(animal.buyer_name?.trim());
  const isReserved = animal.commercial_status === 'reserved';

  const openEdit = () => {
    setBuyerName(animal.buyer_name || '');
    setBuyerPhone(animal.buyer_phone || '');
    setBuyerEmail(animal.buyer_email || '');
    setNotes(animal.commercial_notes || '');
    setReservationDate((animal as any).reservation_date || new Date().toISOString().split('T')[0]);
    setEditOpen(true);
  };

  const handleSave = async () => {
    try {
      const newStatus = buyerName.trim() ? 'reserved' : (animal.commercial_status || 'available');
      const patch: any = {
        buyer_name: buyerName.trim() || null,
        buyer_phone: buyerPhone.trim() || null,
        buyer_email: buyerEmail.trim() || null,
        commercial_notes: notes.trim() || null,
        reservation_date: reservationDate || null,
        commercial_status: newStatus,
      };
      const { error } = await supabase.from('animals').update(patch).eq('id', animal.id);
      if (error) throw error;
      onUpdate(patch);
      setEditOpen(false);
      toast({ title: 'Réservation enregistrée' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleCancel = async () => {
    try {
      const patch: any = {
        buyer_name: null, buyer_phone: null, buyer_email: null,
        commercial_notes: null, reservation_date: null,
        commercial_status: 'available',
      };
      const { error } = await supabase.from('animals').update(patch).eq('id', animal.id);
      if (error) throw error;
      onUpdate(patch);
      setCancelOpen(false);
      toast({ title: 'Réservation annulée' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR');

  return (
    <>
      <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <CalendarCheck className="w-4 h-4 text-primary" />
          <h2 className="font-extrabold text-sm">Réservation</h2>
          {isReserved && (
            <Badge className="ml-auto text-[10px] bg-[hsl(45,80%,88%)] text-[hsl(45,70%,25%)] dark:bg-[hsl(45,40%,18%)] dark:text-[hsl(45,70%,65%)] border-0">
              Réservé
            </Badge>
          )}
        </div>

        {hasReservation ? (
          <div className="space-y-2">
            <div className="text-sm">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-semibold">{animal.buyer_name}</span>
              </div>
              {(animal as any).reservation_date && (
                <p className="text-xs text-muted-foreground mt-1">Réservé le {fmt((animal as any).reservation_date)}</p>
              )}
              {animal.buyer_phone && (
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{animal.buyer_phone}</span>
                </div>
              )}
              {animal.buyer_email && (
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{animal.buyer_email}</span>
                </div>
              )}
              {animal.commercial_notes && (
                <div className="flex items-start gap-2 mt-1">
                  <FileText className="w-3 h-3 text-muted-foreground mt-0.5" />
                  <span className="text-xs text-muted-foreground">{animal.commercial_notes}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1" onClick={openEdit}>Modifier</Button>
              <Button variant="outline" size="sm" className="text-destructive" onClick={() => setCancelOpen(true)}>Annuler</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={openEdit}>
            <CalendarCheck className="w-4 h-4 mr-2" />
            Ajouter une réservation
          </Button>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{hasReservation ? 'Modifier la réservation' : 'Nouvelle réservation'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Nom de l'acheteur</Label>
              <Input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Nom complet" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Téléphone (optionnel)</Label>
              <Input value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="06..." className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email (optionnel)</Label>
              <Input value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="email@..." type="email" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Date de réservation</Label>
              <Input type="date" value={reservationDate} onChange={e => setReservationDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notes (optionnel)</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes..." className="mt-1" rows={2} />
            </div>
            <Button onClick={handleSave} className="w-full">Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la réservation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le statut sera remis à "Disponible". Les données de réservation seront effacées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Annuler la réservation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}