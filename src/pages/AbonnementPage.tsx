import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBreeder } from '@/context/BreederContext';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Crown, Check, X, RefreshCw, Sparkles, FlaskConical, Zap, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { isBeta } from '@/config/appVariant';

const isDev = import.meta.env.DEV;

type PlanId = 'nopub' | 'breeder';
type Duration = 'monthly' | 'quarterly' | 'yearly';

interface PriceOption {
  duration: Duration;
  label: string;
  price: string;
  perMonth?: string;
  saving?: string;
  badge?: string;
}

const NO_PUB_PRICES: PriceOption[] = [
  { duration: 'monthly', label: 'Mensuel', price: 'À définir' },
  { duration: 'quarterly', label: '3 mois', price: 'À définir' },
  { duration: 'yearly', label: 'Annuel', price: 'À définir' },
];

const BREEDER_PRICES: PriceOption[] = [
  { duration: 'monthly', label: 'Mensuel', price: 'À définir' },
  { duration: 'quarterly', label: '3 mois', price: 'À définir' },
  { duration: 'yearly', label: 'Annuel', price: 'À définir' },
];

const NOPUB_FEATURES = [
  'Sans publicités',
  'Animaux illimités',
  'Suivi santé complet',
];

const BREEDER_FEATURES = [
  'Tout de Sans pub',
  'Gestion des portées',
  'Suivi gestation & chaleurs',
  'Transfert QR professionnel',
  'Kanban réservations',
];

function PriceSelector({ prices, selected, onSelect }: { prices: PriceOption[]; selected: Duration; onSelect: (d: Duration) => void }) {
  return (
    <div className="space-y-2">
      {prices.map(opt => (
        <button
          key={opt.duration}
          onClick={() => onSelect(opt.duration)}
          className={cn(
            'w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left',
            selected === opt.duration
              ? 'border-primary bg-primary/5'
              : 'border-border bg-card hover:border-muted-foreground/30'
          )}
        >
          <div className="flex items-center gap-2">
            <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center', selected === opt.duration ? 'border-primary' : 'border-muted-foreground/40')}>
              {selected === opt.duration && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground">{opt.label}</span>
              {opt.perMonth && <span className="text-[10px] text-muted-foreground ml-1.5">({opt.perMonth})</span>}
            </div>
            {opt.badge && <Badge className="text-[9px] px-1.5 py-0 bg-primary text-primary-foreground">{opt.badge}</Badge>}
          </div>
          <div className="flex items-center gap-1.5">
            {opt.saving && <Badge variant="secondary" className="text-[9px] px-1 py-0">-{opt.saving}</Badge>}
            <span className="text-sm font-bold text-foreground">{opt.price}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function AbonnementPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isBreeder, isNoAds, setBreeder, setNoAds } = useBreeder();
  const initialPlan = searchParams.get('plan') === 'breeder' ? 'breeder' : 'nopub';
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(initialPlan);
  const [nopubDuration, setNopubDuration] = useState<Duration>('yearly');
  const [breederDuration, setBreederDuration] = useState<Duration>('yearly');

  const selectedDuration = selectedPlan === 'nopub' ? nopubDuration : breederDuration;
  const prices = selectedPlan === 'nopub' ? NO_PUB_PRICES : BREEDER_PRICES;
  const currentPrice = prices.find(p => p.duration === selectedDuration);

  const ctaLabel = selectedPlan === 'breeder'
    ? 'Disponible après la bêta'
    : 'En préparation';

  const handleContinue = () => {
    toast({
      title: 'Bientôt disponible',
      description: "Les abonnements seront disponibles dans la version finale. Pendant la bêta, aucun paiement n'est effectué.",
    });
  };

  const handleRestore = () => {
    console.log('Restore purchases');
  };

  return (
    <div className="min-h-screen bg-background" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Anomaya+</h1>
        </div>
      </div>

      <div className="px-4 pb-10 max-w-lg mx-auto space-y-5 animate-fade-in">
        {/* Hero */}
        <div className="text-center pt-6 space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Crown className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-extrabold text-foreground">
            Passer à Anomaya<span className="text-primary">+</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Choisissez le plan qui vous convient.
          </p>
        </div>

        {/* Two plans side by side */}
        <div className="grid grid-cols-2 gap-3">
          {/* Sans pub */}
          <button
            onClick={() => setSelectedPlan('nopub')}
            className={cn(
              'rounded-xl border-2 p-3 text-left transition-all',
              selectedPlan === 'nopub' ? 'border-primary bg-primary/5' : 'border-border bg-card'
            )}
          >
            <h3 className="text-sm font-bold text-foreground mb-2">Sans publicité</h3>
            <ul className="space-y-1">
              {NOPUB_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <Check className="w-3 h-3 text-[hsl(var(--status-green))] mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </button>

          {/* Pack Éleveur */}
          <button
            onClick={() => setSelectedPlan('breeder')}
            className={cn(
              'rounded-xl border-2 p-3 text-left transition-all relative',
              selectedPlan === 'breeder' ? 'border-primary bg-primary/5' : 'border-border bg-card'
            )}
          >
            <Badge variant="secondary" className="absolute -top-2 right-2 text-[9px]">Pro</Badge>
            <h3 className="text-sm font-bold text-foreground mb-2">Pack Éleveur</h3>
            <ul className="space-y-1">
              {BREEDER_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <Check className="w-3 h-3 text-[hsl(var(--status-green))] mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </button>
        </div>

        {/* Pricing for selected plan */}
        <Card className="p-4 space-y-3 border-primary/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-foreground text-sm">
              {selectedPlan === 'nopub' ? 'Sans publicité' : 'Pack Éleveur'}
            </h3>
          </div>
          <PriceSelector
            prices={selectedPlan === 'nopub' ? NO_PUB_PRICES : BREEDER_PRICES}
            selected={selectedPlan === 'nopub' ? nopubDuration : breederDuration}
            onSelect={selectedPlan === 'nopub' ? setNopubDuration : setBreederDuration}
          />
        </Card>

        {/* CTA */}
        <Button
          className="w-full h-12 text-base font-bold rounded-xl"
          onClick={handleContinue}
          disabled
        >
          {ctaLabel}
        </Button>

        {/* Reassurance */}
        <div className="flex flex-col items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><RefreshCw className="h-3 w-3" /> Résiliable à tout moment</span>
          <span className="flex items-center gap-1.5"><Zap className="h-3 w-3" /> Accès immédiat</span>
          <span className="flex items-center gap-1.5"><Database className="h-3 w-3" /> Données conservées même sans abonnement</span>
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
          <Card className="p-4 border-dashed border-2 border-amber-500/50 bg-amber-500/5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
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
            <div className="flex items-center justify-between">
              <Label htmlFor="dev-noads" className="text-sm font-medium">Mode test – Sans publicité</Label>
              <Switch
                id="dev-noads"
                checked={isNoAds && !isBreeder}
                onCheckedChange={(checked) => {
                  setNoAds(checked);
                  toast({ title: checked ? '🧪 Sans publicité activé (test)' : 'Publicités réactivées' });
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Ce panneau n'apparaît qu'en développement.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
