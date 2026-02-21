import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBreeder } from '@/context/BreederContext';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Crown, Check, X, Shield, CreditCard, RefreshCw, Sparkles, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const isDev = import.meta.env.DEV;

type PlanId = 'nopub' | 'breeder';
type Duration = 'monthly' | 'quarterly' | 'yearly';

interface PriceOption {
  duration: Duration;
  label: string;
  price: string;
  badge?: string;
}

const NO_PUB_PRICES: PriceOption[] = [
  { duration: 'monthly', label: 'Mensuel', price: '2,99€' },
  { duration: 'quarterly', label: '3 mois', price: '7,99€' },
  { duration: 'yearly', label: 'Annuel', price: '29,99€', badge: 'Meilleure offre' },
];

const BREEDER_PRICES: PriceOption[] = [
  { duration: 'monthly', label: 'Mensuel', price: '9,99€' },
  { duration: 'quarterly', label: '3 mois', price: '27,99€' },
  { duration: 'yearly', label: 'Annuel', price: '99€', badge: '2 mois offerts' },
];

const COMPARISON_ROWS = [
  { label: 'Suivi santé', free: true, nopub: true, breeder: true },
  { label: 'Publicités', free: true, nopub: false, breeder: false, invertColors: true },
  { label: 'Animaux illimités', free: false, nopub: true, breeder: true },
  { label: 'Gestion gestation', free: false, nopub: false, breeder: true },
  { label: 'Gestion portées', free: false, nopub: false, breeder: true },
  { label: 'Transfert profil via QR', free: false, nopub: false, breeder: true },
  { label: 'Gestion chaleurs', free: false, nopub: false, breeder: true },
];

export default function AbonnementPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isBreeder, setBreeder, setNoAds } = useBreeder();
  const initialPlan = searchParams.get('plan') === 'breeder' ? 'breeder' : 'nopub';
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(initialPlan);
  const [selectedDuration, setSelectedDuration] = useState<Duration>('yearly');

  const prices = selectedPlan === 'nopub' ? NO_PUB_PRICES : BREEDER_PRICES;
  const currentPrice = prices.find(p => p.duration === selectedDuration);

  const handleContinue = () => {
    // Future: integrate with StoreKit / Play Billing
    // For now, activate the plan locally
    if (selectedPlan === 'breeder') {
      setBreeder(true); // Also sets noAds
    } else {
      setNoAds(true);
    }
    toast({ title: 'Abonnement activé !', description: selectedPlan === 'breeder' ? 'Pack Éleveur activé' : 'Sans publicités activé' });
    navigate('/');
  };

  const handleRestore = () => {
    // Future: restore purchases via StoreKit / Play Billing
    console.log('Restore purchases');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Abonnement</h1>
        </div>
      </div>

      <div className="px-4 pb-10 max-w-lg mx-auto space-y-6 animate-fade-in">
        {/* Hero */}
        <div className="text-center pt-6 space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Crown className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-extrabold text-foreground">
            Passer à Anomaya<span className="text-primary">+</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Profitez d'Anomaya sans publicité et débloquez des fonctionnalités avancées.
          </p>
        </div>

        {/* Comparison Table */}
        <Card className="overflow-hidden">
          <div className="p-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
              Comparaison des plans
            </h3>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-1 items-center mb-2 px-1">
              <div />
              <span className="text-[10px] font-bold text-muted-foreground text-center w-14">Gratuit</span>
              <span className="text-[10px] font-bold text-primary text-center w-14">Sans Pub</span>
              <span className="text-[10px] font-bold text-primary text-center w-14">Éleveur</span>
            </div>
            {/* Rows */}
            {COMPARISON_ROWS.map((row, i) => (
              <div
                key={row.label}
                className={cn(
                  'grid grid-cols-[1fr_auto_auto_auto] gap-1 items-center px-1 py-2 rounded-lg',
                  i % 2 === 0 && 'bg-muted/40'
                )}
              >
                <span className="text-xs font-medium text-foreground">{row.label}</span>
                <StatusIcon value={row.free} inverted={row.invertColors} />
                <StatusIcon value={row.nopub} inverted={row.invertColors} />
                <StatusIcon value={row.breeder} inverted={row.invertColors} />
              </div>
            ))}
          </div>
        </Card>

        {/* Plan Selector */}
        <div className="flex gap-2">
          <PlanTab
            active={selectedPlan === 'nopub'}
            onClick={() => { setSelectedPlan('nopub'); setSelectedDuration('yearly'); }}
            label="Sans publicité"
          />
          <PlanTab
            active={selectedPlan === 'breeder'}
            onClick={() => { setSelectedPlan('breeder'); setSelectedDuration('yearly'); }}
            label="Pack Éleveur"
            badge="Pro"
          />
        </div>

        {/* Selected Plan Card */}
        <Card className="p-4 space-y-4 border-primary/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-foreground">
                {selectedPlan === 'nopub' ? 'Sans publicité' : 'Pack Éleveur'}
              </h3>
              {selectedPlan === 'breeder' && (
                <Badge variant="secondary" className="text-[10px]">Professionnel</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedPlan === 'nopub'
                ? 'Supprime toutes les publicités et débloque les animaux illimités.'
                : 'Idéal pour les éleveurs. Gestion complète de la reproduction et des portées.'}
            </p>
          </div>

          {/* Duration Options */}
          <div className="space-y-2">
            {prices.map((opt) => (
              <button
                key={opt.duration}
                onClick={() => setSelectedDuration(opt.duration)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left',
                  selectedDuration === opt.duration
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-muted-foreground/30'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                      selectedDuration === opt.duration ? 'border-primary' : 'border-muted-foreground/40'
                    )}
                  >
                    {selectedDuration === opt.duration && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                  {opt.badge && (
                    <Badge className="text-[9px] px-1.5 py-0 bg-primary text-primary-foreground">
                      {opt.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-sm font-bold text-foreground">{opt.price}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* CTA */}
        <Button className="w-full h-12 text-base font-bold rounded-xl" onClick={handleContinue}>
          Continuer — {currentPrice?.price}
        </Button>

        {/* Reassurance */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Résiliable à tout moment</span>
          <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Paiement sécurisé</span>
          <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> Aucun engagement</span>
        </div>

        {/* Restore */}
        <button
          onClick={handleRestore}
          className="block mx-auto text-xs text-primary underline underline-offset-2 opacity-80 hover:opacity-100 transition-opacity"
        >
          Restaurer mon abonnement
        </button>

        {/* Dev-only toggle */}
        {isDev && (
          <Card className="p-4 border-dashed border-2 border-yellow-500/50 bg-yellow-500/5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">
              <FlaskConical className="h-3.5 w-3.5" />
              Mode développement
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="dev-breeder" className="text-sm font-medium">Mode test – Pack Éleveur</Label>
              <Switch
                id="dev-breeder"
                checked={isBreeder}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setBreeder(true);
                    toast({ title: '🧪 Pack Éleveur activé (test)' });
                  } else {
                    setBreeder(false);
                    setNoAds(false);
                    toast({ title: 'Mode gratuit restauré' });
                  }
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Ce toggle n'apparaît qu'en développement.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ── */

function StatusIcon({ value, inverted }: { value: boolean; inverted?: boolean }) {
  if (inverted) {
    return (
      <div className="w-14 flex justify-center">
        {value
          ? <X className="h-4 w-4 text-destructive" />
          : <Check className="h-4 w-4 text-status-green" />}
      </div>
    );
  }
  return (
    <div className="w-14 flex justify-center">
      {value
        ? <Check className="h-4 w-4 text-status-green" />
        : <X className="h-4 w-4 text-destructive/50" />}
    </div>
  );
}

function PlanTab({ active, onClick, label, badge }: {
  active: boolean; onClick: () => void; label: string; badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border-2',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40'
      )}
    >
      {label}
      {badge && <span className="ml-1.5 text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{badge}</span>}
    </button>
  );
}
