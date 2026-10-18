import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, Copy, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAnimals } from '@/context/AnimalsContext';
import { useAuth } from '@/context/AuthContext';
import { secureTransfer, isTransferCode, TRANSFER_CODE_LENGTH } from '@/utils/secureTransfer';
import { toast } from '@/hooks/use-toast';

interface TransferCode {
  id: string;
  code: string;
  animal_id: string;
  expires_at: string;
  claimed_at: string | null;
}

export default function TransferPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { animaux } = useAnimals();
  const animal = animaux.find((a) => a.id === id);

  const [codes, setCodes] = useState<TransferCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Claim flow
  const [claimCode, setClaimCode] = useState('');
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        const data = await secureTransfer('list', { animal_id: id });
        if (data) setCodes(data as TransferCode[]);
      } catch { /* list remains empty when unavailable */ }
      finally { setLoading(false); }
    })();
  }, [user, id]);

  const generateTransferCode = async () => {
    if (!user || !animal) return;
    setGenerating(true);
    try {
      const data = await secureTransfer('create', { animal_id: animal.id });
      if (data) setCodes((prev) => [data as TransferCode, ...prev]);
      toast({ title: 'Code généré' });
    } catch (error) {
      toast({ title: 'Erreur', description: error instanceof Error ? error.message : undefined, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const claimAnimal = async () => {
    if (!user || !claimCode.trim()) return;
    setClaiming(true);
    try {
      // Validated and applied atomically on the server.
      await secureTransfer('claim', { code: claimCode.trim().toUpperCase() });
      toast({ title: 'Profil transféré !', description: "L'animal a été ajouté à votre famille." });
      setClaimCode('');
      // Full reload so the family list includes the new animal.
      window.location.assign('/');
    } catch (error) {
      toast({ title: 'Erreur de transfert', description: error instanceof Error ? error.message : undefined, variant: 'destructive' });
    } finally {
      setClaiming(false);
    }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR');
  const isExpired = (d: string) => new Date(d) < new Date();

  if (!animal) {
    return (
      <div className="min-h-screen bg-background">
        {/* Claim-only mode for non-owners */}
        <div className="sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <QrCode className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-lg">Réclamer un profil</h1>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <h2 className="font-bold mb-2">Entrer un code de transfert</h2>
            <div className="flex gap-2">
              <Input
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                placeholder="Code de transfert"
                aria-label="Code de transfert"
                maxLength={TRANSFER_CODE_LENGTH}
                className="font-mono min-w-0"
              />
              <Button onClick={claimAnimal} disabled={claiming || !isTransferCode(claimCode)}>
                {claiming ? '...' : 'Valider'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background">
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/profil/${animal.id}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <QrCode className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-lg">Transférer — {animal.nom}</h1>
      </div>

      <div className="p-4 space-y-4">
        <Button onClick={generateTransferCode} disabled={generating} className="w-full">
          <QrCode className="w-4 h-4 mr-2" />
          {generating ? 'Génération...' : 'Générer un code de transfert'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Le code est valable 7 jours et utilisable une seule fois.
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : codes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucun code généré.</p>
        ) : (
          <div className="space-y-3">
            {codes.map((c) => {
              const expired = isExpired(c.expires_at);
              const claimed = !!c.claimed_at;
              return (
                <div key={c.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm break-all min-w-0 font-bold">{c.code}</span>
                    {claimed ? (
                      <Badge variant="default" className="gap-1"><Check className="w-3 h-3" /> Utilisé</Badge>
                    ) : expired ? (
                      <Badge variant="destructive" className="gap-1"><Clock className="w-3 h-3" /> Expiré</Badge>
                    ) : (
                      <Button variant="ghost" size="sm" aria-label="Copier le code" disabled={!isTransferCode(c.code)} onClick={() => copyCode(c.code)}>
                        {copied === c.code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Expire le {fmt(c.expires_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
