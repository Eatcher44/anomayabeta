import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ElevageBetaPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Élevage</h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          Mode Éleveur bientôt disponible
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Cette version test est limitée aux fonctionnalités Free.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Merci de participer aux tests. 🙏
        </p>
        <Button variant="outline" onClick={() => navigate('/')} className="mt-4">
          Retour à Ma famille
        </Button>
      </div>
    </div>
  );
}
