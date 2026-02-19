import React, { useMemo } from 'react';
import type { Animal } from '@/types/animal';

interface TimelineEvent {
  id: string;
  date: Date;
  type: 'vaccine' | 'treatment' | 'medication' | 'weight' | 'consultation' | 'antipuce' | 'vermifuge';
  title: string;
  description?: string;
  icon: string;
}

interface HealthTimelineProps {
  animal: Animal;
}

export default function HealthTimeline({ animal }: HealthTimelineProps) {
  const events = useMemo(() => {
    const items: TimelineEvent[] = [];

    // Vaccines
    (animal.soins || []).filter((s) => s.type === 'Vaccin').forEach((s) => {
      if (s.date) {
        items.push({
          id: `vac-${s.id}`,
          date: new Date(s.date),
          type: 'vaccine',
          title: `Vaccin : ${s.nom || 'Inconnu'}`,
          description: s.produit ? `Produit : ${s.produit}` : undefined,
          icon: '💉',
        });
      }
    });

    // Anti-puce & Vermifuge
    (animal.soins || []).filter((s) => s.type === 'Antipuce' || s.type === 'Vermifuge').forEach((s) => {
      if (s.date) {
        items.push({
          id: `${s.type}-${s.id}`,
          date: new Date(s.date),
          type: s.type === 'Antipuce' ? 'antipuce' : 'vermifuge',
          title: s.type === 'Antipuce' ? 'Anti-puce' : 'Vermifuge',
          description: s.produit ? `Produit : ${s.produit}` : undefined,
          icon: s.type === 'Antipuce' ? '🐛' : '💊',
        });
      }
    });

    // Treatments
    (animal.soins || []).filter((s) => s.type === 'Traitement').forEach((s) => {
      if (s.debut) {
        items.push({
          id: `trt-${s.id}`,
          date: new Date(s.debut),
          type: 'treatment',
          title: `Traitement : ${s.nom || 'Inconnu'}`,
          description: s.fin ? `Jusqu'au ${new Date(s.fin).toLocaleDateString('fr-FR')}` : undefined,
          icon: '💊',
        });
      }
    });

    // Weights
    (animal.poids || []).forEach((p) => {
      items.push({
        id: `wt-${p.id}`,
        date: new Date(p.date),
        type: 'weight',
        title: 'Pesée',
        description: p.poids < 1 ? `${Math.round(p.poids * 1000)} g` : `${p.poids} kg`,
        icon: '⚖️',
      });
    });

    // Consultations
    (animal.consultations || []).forEach((c) => {
      items.push({
        id: `cons-${c.id}`,
        date: new Date(c.date),
        type: 'consultation',
        title: `Consultation : ${c.motif}`,
        description: c.veterinaire ? `Dr. ${c.veterinaire}` : undefined,
        icon: '🏥',
      });
    });

    // Sort most recent first
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    return items;
  }, [animal]);

  if (events.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p>Aucun événement santé enregistré.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="relative flex items-start gap-3">
            {/* Dot */}
            <div className="absolute -left-6 top-1 w-[22px] h-[22px] rounded-full bg-card border-2 border-primary flex items-center justify-center text-xs">
              {event.icon}
            </div>
            
            <div className="flex-1 bg-muted/50 rounded-lg p-3 border border-border">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-foreground">{event.title}</p>
                <span className="text-xs text-muted-foreground">
                  {event.date.toLocaleDateString('fr-FR')}
                </span>
              </div>
              {event.description && (
                <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
