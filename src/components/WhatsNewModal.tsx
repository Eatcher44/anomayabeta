import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CHANGELOG, CURRENT_CHANGELOG_VERSION, CHANGELOG_STORAGE_KEY, isVersionNewer } from '@/data/changelog';

export default function WhatsNewModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem(CHANGELOG_STORAGE_KEY);
    if (!lastSeen || isVersionNewer(CURRENT_CHANGELOG_VERSION, lastSeen)) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(CHANGELOG_STORAGE_KEY, CURRENT_CHANGELOG_VERSION);
    setOpen(false);
  };

  const v = CHANGELOG.find((c) => c.version === CURRENT_CHANGELOG_VERSION) || CHANGELOG[0];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Nouveautés de la version {v.version}</DialogTitle>
          <DialogDescription>Voici les dernières améliorations de la bêta.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="py-2 space-y-4 text-sm">
            {v.intro && <p className="text-muted-foreground leading-relaxed">{v.intro}</p>}

            {v.ajouts.length > 0 && (
              <Section title="Ajouts" items={v.ajouts} />
            )}
            {v.modifications.length > 0 && (
              <Section title="Modifications" items={v.modifications} />
            )}
            {v.bugs.length > 0 && (
              <Section title="Résolutions de bugs" items={v.bugs} />
            )}
          </div>
        </ScrollArea>

        <Button onClick={dismiss} className="w-full mt-2">Merci, j'ai compris</Button>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="font-bold text-foreground mb-1">{title}</h3>
      <ul className="space-y-1 pl-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-foreground leading-snug">
            <span className="text-muted-foreground">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
