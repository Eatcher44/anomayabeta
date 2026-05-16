import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Syringe, Bug, Pill, ArrowDownUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAnimals } from '@/context/AnimalsContext';
import type { SoinEntry } from '@/types/animal';

type Order = 'desc' | 'asc';

function fmtDate(d?: string): string {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('fr-FR');
}

function entryDate(s: SoinEntry): string | undefined {
  return s.date || s.debut;
}

function sortSoins(arr: SoinEntry[], order: Order): SoinEntry[] {
  return [...arr].sort((a, b) => {
    const da = new Date(entryDate(a) || 0).getTime();
    const db = new Date(entryDate(b) || 0).getTime();
    return order === 'desc' ? db - da : da - db;
  });
}

function SoinCard({ s }: { s: SoinEntry }) {
  const date = fmtDate(entryDate(s));
  const isPharmacie = (s as any).source === 'pharmacie';
  const dose = (s as any).doseValue;
  const doseUnit = (s as any).doseUnit as string | undefined;
  const rappel = (s as any).prochain as string | undefined;

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm text-foreground">
          {date && <span className="text-muted-foreground">{date} — </span>}
          {s.nom || s.type}
        </p>
        {isPharmacie && (
          <Badge variant="secondary" className="text-[10px] shrink-0">Pharmacie</Badge>
        )}
      </div>
      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        {s.produit && s.produit !== s.nom && <p>Produit : {s.produit}</p>}
        {s.veterinaire && <p>Vétérinaire : {s.veterinaire}</p>}
        {dose != null && (
          <p>Dose : {dose}{doseUnit ? ` ${doseUnit}` : ''}</p>
        )}
        {s.fin && s.debut && s.fin !== s.debut && (
          <p>Jusqu'au {fmtDate(s.fin)}</p>
        )}
        {rappel && <p>Rappel : {fmtDate(rappel)}</p>}
        {s.notes && <p className="italic">{s.notes}</p>}
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  items,
  emptyLabel,
}: {
  icon: React.ReactNode;
  title: string;
  items: SoinEntry[];
  emptyLabel: string;
}) {
  return (
    <section className="bg-card rounded-xl p-3 border border-border shadow-sm">
      <h2 className="font-extrabold text-sm mb-2 flex items-center gap-2">
        {icon}
        {title}
        <span className="ml-auto text-xs font-normal text-muted-foreground">{items.length}</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {items.map((s) => <SoinCard key={s.id} s={s} />)}
        </div>
      )}
    </section>
  );
}

export default function HistoriqueSoinsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { animaux } = useAnimals();
  const animal = animaux.find((a) => a.id === id);
  const [order, setOrder] = useState<Order>('desc');

  const groups = useMemo(() => {
    const soins = animal?.soins || [];
    const vaccins = soins.filter((s) => s.type === 'Vaccin');
    const antiparasites = soins.filter((s) => s.type === 'Antipuce' || s.type === 'Vermifuge');
    const autres = soins.filter((s) => !['Vaccin', 'Antipuce', 'Vermifuge'].includes(s.type));
    return {
      vaccins: sortSoins(vaccins, order),
      antiparasites: sortSoins(antiparasites, order),
      autres: sortSoins(autres, order),
    };
  }, [animal?.soins, order]);

  if (!animal) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <p className="mt-6 text-center text-muted-foreground">Animal introuvable.</p>
      </div>
    );
  }

  const totalCount = groups.vaccins.length + groups.antiparasites.length + groups.autres.length;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-lg flex-1 truncate">Historique des soins — {animal.nom}</h1>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')}
          title={order === 'desc' ? 'Plus récent d’abord' : 'Plus ancien d’abord'}
        >
          <ArrowDownUp className="w-3.5 h-3.5 mr-1" />
          {order === 'desc' ? 'Récent' : 'Ancien'}
        </Button>
      </div>

      <div className="p-4 space-y-3">
        {totalCount === 0 ? (
          <div className="text-center py-16 px-6 text-muted-foreground">
            <Pill className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-semibold text-foreground">Aucun soin enregistré pour cet animal.</p>
          </div>
        ) : (
          <>
            <Section
              icon={<Syringe className="w-4 h-4 text-primary" />}
              title="Vaccins"
              items={groups.vaccins}
              emptyLabel="Aucun vaccin enregistré"
            />
            <Section
              icon={<Bug className="w-4 h-4 text-primary" />}
              title="Anti-puces / Vermifuges"
              items={groups.antiparasites}
              emptyLabel="Aucun anti-puces ou vermifuge enregistré"
            />
            <Section
              icon={<Pill className="w-4 h-4 text-primary" />}
              title="Autres soins / traitements"
              items={groups.autres}
              emptyLabel="Aucun autre soin enregistré"
            />
          </>
        )}
      </div>
    </div>
  );
}
