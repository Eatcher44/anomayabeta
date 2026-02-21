import React from 'react';
import {
  Heart, Users, Clock, Baby, ShoppingCart, AlertTriangle, TrendingUp, Activity,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

interface DashboardProps {
  females: number;
  males: number;
  activeGestations: number;
  activeLitters: number;
  availableKittens: number;
  soldPending: number;
  alerts: { text: string; severity: 'urgent' | 'warning' | 'info' }[];
  stats: {
    totalLitters: number;
    totalKittens: number;
    avgPerLitter: number;
    survivalRate: number;
    sexRatio: string;
    yearProduction: number;
  };
}

export default function ElevageDashboard({
  females, males, activeGestations, activeLitters,
  availableKittens, soldPending, alerts, stats,
}: DashboardProps) {
  return (
    <section className="space-y-4">
      {/* A) Situation actuelle */}
      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Situation actuelle</h3>
        <div className="grid grid-cols-3 gap-2">
          <KpiCard icon={<Heart className="w-3.5 h-3.5 text-[hsl(var(--female-accent))]" />} label="Femelles" value={females} />
          <KpiCard icon={<Users className="w-3.5 h-3.5 text-[hsl(var(--male-accent))]" />} label="Mâles" value={males} />
          <KpiCard icon={<Clock className="w-3.5 h-3.5 text-[hsl(var(--status-orange))]" />} label="Gestations" value={activeGestations} />
          <KpiCard icon={<Baby className="w-3.5 h-3.5 text-primary" />} label="Portées" value={activeLitters} />
          <KpiCard icon={<Baby className="w-3.5 h-3.5 text-[hsl(var(--status-green))]" />} label="Disponibles" value={availableKittens} />
          <KpiCard icon={<ShoppingCart className="w-3.5 h-3.5 text-[hsl(var(--status-orange))]" />} label="Vendus/Réservés" value={soldPending} />
        </div>
      </div>

      {/* B) Alertes */}
      {alerts.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Alertes élevage</h3>
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

      {/* C) Statistiques globales */}
      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Statistiques globales</h3>
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Total portées" value={stats.totalLitters} />
          <StatCard label="Total chatons" value={stats.totalKittens} />
          <StatCard label="Moy. / portée" value={stats.avgPerLitter} />
          <StatCard label="Taux survie" value={`${stats.survivalRate}%`} />
          <StatCard label="Ratio M/F" value={stats.sexRatio} />
          <StatCard label="Année en cours" value={stats.yearProduction} />
        </div>
      </div>
    </section>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-2.5 flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-lg font-extrabold text-foreground leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">{label}</p>
      </div>
    </Card>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-2.5 text-center">
      <p className="text-lg font-extrabold text-foreground leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight mt-1">{label}</p>
    </Card>
  );
}
