import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Clean premium screen shown when a non-subscriber tries to access
 * breeder features after the beta period ends.
 */
export default function BreederGate() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Lock className="w-8 h-8 text-primary" />
      </div>

      <h1 className="text-xl font-bold text-foreground mb-2">
        Pack Éleveur requis
      </h1>

      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-2">
        Les outils éleveur font partie du Pack Éleveur professionnel.
      </p>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-8">
        Débloquez la gestion avancée de votre élevage.
      </p>

      <Button
        onClick={() => navigate('/abonnement?plan=breeder')}
        className="gap-2 px-6"
        size="lg"
      >
        <Crown className="w-4 h-4" />
        Passer au Pack Éleveur
      </Button>

      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="mt-4 text-muted-foreground"
      >
        Retour à Ma famille
      </Button>
    </div>
  );
}
