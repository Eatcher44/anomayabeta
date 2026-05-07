import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Crown, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isBeta } from '@/config/appVariant';

/**
 * Premium gate shown when a non-subscriber tries to access breeder features.
 * Makes it explicit that breeder data is preserved, never deleted.
 */
export default function BreederGate() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Lock className="w-8 h-8 text-primary" />
      </div>

      <h1 className="text-xl font-bold text-foreground mb-3">
        Pack Éleveur requis
      </h1>

      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-4">
        Vos données d'élevage sont conservées. Activez le Pack Éleveur pour
        retrouver l'accès complet à vos portées, suivis et outils d'élevage.
      </p>

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-6">
        <Database className="w-3 h-3" />
        Aucune donnée n'est supprimée
      </div>

      <Button
        onClick={() => navigate('/abonnement?plan=breeder')}
        className="gap-2 px-6"
        size="lg"
      >
        <Crown className="w-4 h-4" />
        Voir le Pack Éleveur
      </Button>

      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="mt-3 text-muted-foreground"
      >
        Retour à Ma famille
      </Button>

      {isBeta && (
        <p className="mt-6 text-[11px] text-muted-foreground/70 max-w-xs leading-relaxed">
          Pendant la bêta, cette logique est en test et aucun paiement réel
          n'est effectué.
        </p>
      )}
    </div>
  );
}
