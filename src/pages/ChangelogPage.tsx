import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/components/AppLayout';
import { CHANGELOG } from '@/data/changelog';

function fmt(d: string) {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return d;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export default function ChangelogPage() {
  const navigate = useNavigate();
  return (
    <AppLayout className="bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Historique des mises à jour</h1>
        </div>
      </div>

      <div className="px-4 py-5 max-w-2xl mx-auto space-y-5">
        {CHANGELOG.map((v) => (
          <article
            key={v.version}
            className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-3"
          >
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-bold">
                  Version {v.version}
                </p>
                <h2 className="text-lg font-extrabold text-foreground">{v.title}</h2>
              </div>
              <span className="text-xs text-muted-foreground">{fmt(v.date)}</span>
            </header>

            {v.intro && (
              <p className="text-sm text-muted-foreground leading-relaxed">{v.intro}</p>
            )}

            {v.ajouts.length > 0 && (
              <Section icon={<Plus className="w-4 h-4 text-primary" />} title="Ajouts" items={v.ajouts} />
            )}
            {v.modifications.length > 0 && (
              <Section icon={<Pencil className="w-4 h-4 text-primary" />} title="Modifications" items={v.modifications} />
            )}
            {v.bugs.length > 0 && (
              <Section icon={<Bug className="w-4 h-4 text-primary" />} title="Résolutions de bugs" items={v.bugs} />
            )}
          </article>
        ))}
      </div>
    </AppLayout>
  );
}

function Section({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
      <ul className="space-y-1.5 pl-1">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-foreground leading-snug flex gap-2">
            <span className="text-muted-foreground">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
