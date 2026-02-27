import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const CURRENT_VERSION = '2026-02-27';
const STORAGE_KEY = 'last_seen_changelog_version';

export default function WhatsNewModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (lastSeen !== CURRENT_VERSION) {
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
      <DialogContent className="sm:max-w-md animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle>Mise à jour du 27/02/2026</DialogTitle>
          <DialogDescription className="sr-only">Nouveautés de cette version</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="mt-0.5">✨</span>
              <span>Ajout de la couleur des animaux directement dans leur profil.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">🎯</span>
              <span>Une gestion encore plus précise et personnalisée.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">🚀</span>
              <span>La Bêta test complète du côté Élevage arrive très bientôt !</span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground pt-3 border-t border-border">
            Merci de participer à la Bêta et de contribuer à faire d'Anomaya une référence pour tous les passionnés et éleveurs.
          </p>
        </div>
        <Button onClick={dismiss} className="w-full">Continuer</Button>
      </DialogContent>
    </Dialog>
  );
}
