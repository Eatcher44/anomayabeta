import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
      <DialogContent
        className="sm:max-w-md p-0 gap-0 flex flex-col max-h-[85vh] overflow-hidden"
      >
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle>Nouveautés de la version {v.version}</DialogTitle>
          <DialogDescription>Voici les dernières améliorations de la bêta.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6">
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
        </div>

        <div
          className="px-6 pt-3 pb-6 shrink-0 border-t border-border/50 bg-background"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        >
          <Button onClick={dismiss} className="w-full">Merci, j'ai compris</Button>
        </div>
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
