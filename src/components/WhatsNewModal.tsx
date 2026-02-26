import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const CURRENT_VERSION = '2026-02-26';
const STORAGE_KEY = 'last_seen_changelog_version';

export default function WhatsNewModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (lastSeen !== CURRENT_VERSION) {
      // Small delay so it doesn't flash on load
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mise à jour du 26/02/2026</DialogTitle>
          <DialogDescription className="sr-only">Nouveautés de cette version</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✦</span>
              <span>Ajout de la possibilité d'indiquer une particularité sur son animal</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✦</span>
              <span>Amélioration de la courbe du suivi du poids</span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
            Merci de participer à la Bêta 🙏<br />
            N'oubliez pas d'utiliser le bouton "Avis" en bas de la page pour proposer des améliorations !
          </p>
        </div>
        <Button onClick={dismiss} className="w-full">Compris</Button>
      </DialogContent>
    </Dialog>
  );
}
