import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TRANSFER_MESSAGES, type TransferReview } from '@/utils/secureTransfer';

interface Props {
  review: TransferReview | null;
  animalName: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function TransferReviewDialog({ review, animalName, busy, onCancel, onConfirm }: Props) {
  const [accepted, setAccepted] = useState(false);
  if (!review) return null;
  const p = review.private;
  const kept = [
    p.noms_soins > 0 && `Noms des soins saisis (${p.noms_soins})`,
    p.produits > 0 && `Produits utilisés (${p.produits})`,
    p.veterinaires > 0 && `Noms des vétérinaires (${p.veterinaires})`,
    p.motifs > 0 && `Motifs de consultation (${p.motifs})`,
    p.particularite && 'Particularité de l’animal',
    p.contact_acheteur && 'Coordonnées de l’acheteur',
    p.notes_commerciales && 'Notes commerciales',
  ].filter(Boolean) as string[];
  const s = review.shared;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) { setAccepted(false); onCancel(); } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vérifier avant le transfert — {animalName}</DialogTitle>
          <DialogDescription>Le nouveau propriétaire recevra uniquement les informations ci-dessous.</DialogDescription>
        </DialogHeader>
        {review.blocked ? (
          <p className="text-sm text-destructive">{TRANSFER_MESSAGES[review.blocked]}</p>
        ) : (
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold mb-1">Transmis</h3>
              <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                <li>Identité : nom, espèce, sexe, race, naissance, puce, couleur, stérilisation, photos</li>
                <li>Soins : type, dates, rappels et posologie ({s.soins})</li>
                <li>Dates de consultation, sans motif ni vétérinaire ({s.consultations})</li>
                <li>Pesées ({s.poids}) et repas, sans commentaire ({s.repas})</li>
              </ul>
            </section>
            <section>
              <h3 className="font-semibold mb-1">Reste privé (conservé dans votre archive)</h3>
              <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                {kept.length ? kept.map((k) => <li key={k}>{k}</li>) : <li>Aucun texte libre à retenir</li>}
                <li>Tout autre texte libre ou ancien champ non reconnu</li>
              </ul>
            </section>
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} aria-label="Confirmer les informations transmises" />
              <span>J’ai vérifié les informations transmises et je confirme le transfert.</span>
            </label>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { setAccepted(false); onCancel(); }}>Annuler</Button>
          {!review.blocked && (
            <Button disabled={!accepted || busy} onClick={onConfirm}>{busy ? 'Génération...' : 'Générer le code'}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
