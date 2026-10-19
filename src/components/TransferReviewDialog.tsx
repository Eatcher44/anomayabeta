import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TRANSFER_MESSAGES, type TransferReview, type CareSelection } from '@/utils/secureTransfer';

interface Props {
  review: TransferReview | null;
  animalName: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (selection: CareSelection[]) => void;
}

const key = (s: CareSelection) => `${s.id}:${s.field}`;
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : '');

export default function TransferReviewDialog({ review, animalName, busy, onCancel, onConfirm }: Props) {
  const [accepted, setAccepted] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  if (!review) return null;
  const close = () => { setAccepted(false); setSelected(new Set()); onCancel(); };
  const toggle = (s: CareSelection, on: boolean) => {
    setAccepted(false); // any change in selection requires re-confirmation
    setSelected((prev) => { const n = new Set(prev); if (on) n.add(key(s)); else n.delete(key(s)); return n; });
  };
  const named = review.named ?? [];
  const selection: CareSelection[] = named.flatMap((n) => (['nom', 'produit'] as const)
    .filter((f) => n[f] && selected.has(`${n.id}:${f}`)).map((f) => ({ id: n.id, field: f })));
  const p = review.private;
  const kept = [
    p.noms_soins > 0 && `Noms des soins non cochés (${p.noms_soins - selection.filter((x) => x.field === 'nom').length})`,
    p.produits > 0 && `Produits non cochés (${p.produits - selection.filter((x) => x.field === 'produit').length})`,
    p.veterinaires > 0 && `Noms des vétérinaires (${p.veterinaires})`,
    p.motifs > 0 && `Motifs de consultation (${p.motifs})`,
    p.particularite && 'Particularité de l’animal',
    p.contact_acheteur && 'Coordonnées de l’acheteur',
    p.notes_commerciales && 'Notes commerciales',
  ].filter(Boolean) as string[];
  const s = review.shared;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] max-w-lg">
        <DialogHeader>
          <DialogTitle>Vérifier avant le transfert — {animalName}</DialogTitle>
          <DialogDescription>Le nouveau propriétaire recevra uniquement les informations « Transmis ».</DialogDescription>
        </DialogHeader>
        {review.blocked ? (
          <p className="text-sm text-destructive">{TRANSFER_MESSAGES[review.blocked]}</p>
        ) : (
          <div className="space-y-4 text-sm">
            <section aria-label="Transmis">
              <h3 className="font-semibold mb-1">Transmis</h3>
              <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                <li>Identité : nom, espèce, sexe, race, naissance, puce, couleur, stérilisation, photos</li>
                <li>Soins : type, dates, rappels et posologie ({s.soins})</li>
                <li>Dates de consultation, sans motif ni vétérinaire ({s.consultations})</li>
                <li>Pesées ({s.poids}) et repas, sans commentaire ({s.repas})</li>
              </ul>
            </section>
            {named.length > 0 && (
              <section aria-label="Noms à partager" className="rounded-lg border border-border p-3 space-y-2">
                <h3 className="font-semibold">Noms de vaccins et traitements (facultatif)</h3>
                <p className="text-xs text-muted-foreground">Privés par défaut. Ces textes ont été saisis librement et peuvent contenir des informations personnelles : cochez uniquement ce que vous voulez partager.</p>
                {named.map((n) => (
                  <div key={n.id} className="space-y-1">
                    <p className="text-xs font-medium">{n.type ?? 'Soin'} {fmt(n.date)}</p>
                    {(['nom', 'produit'] as const).filter((f) => n[f]).map((f) => (
                      <label key={f} className="flex items-start gap-2 cursor-pointer pl-2">
                        <Checkbox checked={selected.has(`${n.id}:${f}`)} onCheckedChange={(v) => toggle({ id: n.id, field: f }, v === true)}
                          aria-label={`Partager ${f === 'nom' ? 'le nom' : 'le produit'} : ${n[f]}`} />
                        <span className="break-words min-w-0">{f === 'nom' ? 'Nom' : 'Produit'} : {n[f]}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </section>
            )}
            <section aria-label="Reste privé">
              <h3 className="font-semibold mb-1">Reste privé (conservé dans votre archive)</h3>
              <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                {kept.length ? kept.map((k) => <li key={k}>{k}</li>) : <li>Aucun texte libre à retenir</li>}
                <li>Tout autre texte libre ou ancien champ non reconnu</li>
              </ul>
            </section>
            <section aria-label="Aperçu final" className="rounded-lg bg-muted p-3">
              <h3 className="font-semibold mb-1">Aperçu final des textes partagés</h3>
              {selection.length ? (
                <ul className="list-disc pl-5 space-y-0.5">
                  {selection.map((x) => { const n = named.find((i) => i.id === x.id)!; return <li key={key(x)} className="break-words">{n.type ?? 'Soin'} {fmt(n.date)} — {x.field === 'nom' ? 'Nom' : 'Produit'} : {n[x.field]}</li>; })}
                </ul>
              ) : <p className="text-muted-foreground">Aucun texte libre partagé.</p>}
            </section>
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} aria-label="Confirmer les informations transmises" />
              <span>J’ai vérifié les informations transmises et je confirme le transfert.</span>
            </label>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={close}>Annuler</Button>
          {!review.blocked && (
            <Button disabled={!accepted || busy} onClick={() => onConfirm(selection)}>{busy ? 'Génération...' : 'Générer le code'}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
