import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const BETA_WELCOME_KEY = 'anomaya-beta-welcome-shown';

export default function BetaWelcomePopup() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(BETA_WELCOME_KEY)) {
        setOpen(true);
      }
    } catch {}
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(BETA_WELCOME_KEY, '1'); } catch {}
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">
            Bienvenue dans la bêta d'Anomaya 🐾
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4 text-center">
          <p className="text-sm text-foreground leading-relaxed">
            Merci de tester la première version d'Anomaya, l'application de gestion d'élevage pour chiens et chats.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cette version bêta peut encore contenir quelques bugs ou fonctionnalités en évolution.
          </p>
          <p className="text-sm text-foreground font-medium">
            Votre retour est très précieux pour améliorer l'application. 🙏
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={dismiss} className="flex-1">
            Continuer
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              dismiss();
              navigate('/feedback');
            }}
          >
            Donner un feedback
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}