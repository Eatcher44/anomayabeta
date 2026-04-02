import React from 'react';
import { Share2 } from 'lucide-react';

interface Props {
  animalId: string;
}

// Placeholder — full implementation requires kitten_share_tokens table
export default function ShareKittenSection({ animalId }: Props) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="w-4 h-4 text-primary" />
        <h2 className="font-extrabold text-sm">Partage</h2>
      </div>
      <p className="text-xs text-muted-foreground">Fonctionnalité de partage bientôt disponible.</p>
    </div>
  );
}
