import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BreederPremiumGate() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          Pack Éleveur requis
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Les outils de gestion d'élevage font partie du Pack Éleveur professionnel.
          Débloquez la gestion avancée de la reproduction, des portées et des transferts.
        </p>
        <Button onClick={() => navigate('/abonnement?plan=breeder')} className="mt-2">
          Découvrir le Pack Éleveur
        </Button>
        <Button variant="ghost" onClick={() => navigate('/')} className="text-muted-foreground">
          Retour à Ma famille
        </Button>
      </div>
    </div>
  );
}