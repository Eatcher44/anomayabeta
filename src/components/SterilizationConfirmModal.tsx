import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export type SterilizationChoice = 'retire' | 'pet' | 'cancel';

interface Props {
  open: boolean;
  sexe?: string;
  onChoose: (choice: SterilizationChoice) => void;
}

export default function SterilizationConfirmModal({ open, sexe, onChoose }: Props) {
  const isFemale = (sexe || '').toLowerCase().startsWith('f');
  const label = isFemale ? 'stérilisée' : 'castré';
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onChoose('cancel'); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Animal {label}</DialogTitle>
          <DialogDescription>
            Cet animal ne pourra plus être proposé comme reproducteur actif.
            Souhaitez-vous le passer en retraite et conserver l'accès à son
            historique de reproduction ?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          <Button className="w-full justify-start" onClick={() => onChoose('retire')}>
            Passer en retraite et conserver l'historique
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => onChoose('pet')}>
            Garder uniquement comme animal de compagnie
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => onChoose('cancel')}>
            Annuler
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Dans tous les cas, l'historique d'élevage existant (portées, chaleurs, gestations) est conservé.
        </p>
      </DialogContent>
    </Dialog>
  );
}
