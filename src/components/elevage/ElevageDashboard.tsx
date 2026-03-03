import React from 'react';
import {
  Heart, Users, Baby, ShoppingCart, AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { ElevageAlert } from '@/hooks/useElevageData';

interface DashboardProps {
  females: number;
  males: number;
  activeGestations: number;
  activeLitters: number;
  availableKittens: number;
  soldPending: number;
  alerts: ElevageAlert[];
  youngLabel: string;
}

export default function ElevageDashboard({
  females, males, activeGestations, activeLitters,
  availableKittens, soldPending, alerts, youngLabel,
}: DashboardProps) {
  return (
    <section className="space-y-5">
      {/* KPIs — 4 essential cards */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          icon={<Heart className="w-4 h-4 text-[hsl(var(--female-accent))]" />}
          label="Reproducteurs"
          value={females + males}
          sub={`${females}♀ · ${males}♂`}
        />
        <KpiCard
          icon={<Baby className="w-4 h-4 text-primary" />}
          label="Portées actives"
          value={activeLitters}
        />
        <KpiCard
          icon={<Baby className="w-4 h-4 text-[hsl(var(--status-green))]" />}
          label={`${youngLabel} disponibles`}
          value={availableKittens}
        />
        <KpiCard
          icon={<ShoppingCart className="w-4 h-4 text-[hsl(var(--status-orange))]" />}
          label="Réservés / Vendus"
          value={soldPending}
        />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Alertes</h3>
          <div className="space-y-1.5">
            {alerts.map((a, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-xl p-2.5 border ${
                  a.severity === 'urgent'
                    ? 'bg-destructive/10 border-destructive/20'
                    : 'bg-[hsl(var(--status-orange))]/10 border-[hsl(var(--status-orange))]/20'
                }`}
              >
                <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                  a.severity === 'urgent' ? 'text-destructive' : 'text-[hsl(var(--status-orange))]'
                }`} />
                <span className={`text-xs font-medium ${
                  a.severity === 'urgent' ? 'text-destructive' : 'text-[hsl(var(--status-orange))]'
                }`}>{a.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-foreground leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground leading-tight mt-1 truncate">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70 leading-tight">{sub}</p>}
      </div>
    </Card>
  );
}
