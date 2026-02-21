import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, Copy, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAnimals } from '@/context/AnimalsContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TransferCode {
  id: string;
  code: string;
  animal_id: string;
  expires_at: string;
  claimed_at: string | null;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
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
      const { data } = await supabase
        .from('transfer_codes')
        .select('*')
        .eq('animal_id', id)
        .order('created_at', { ascending: false });
      if (data) setCodes(data as TransferCode[]);
      setLoading(false);
    })();
  }, [user, id]);

  const generateTransferCode = async () => {
    if (!user || !animal) return;
    setGenerating(true);
    try {
      const code = generateCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await supabase
        .from('transfer_codes')
        .insert({
          code,
          animal_id: animal.id,
          from_user_id: user.id,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      if (data) setCodes((prev) => [data as TransferCode, ...prev]);
      toast({ title: 'Code généré', description: `Code : ${code}` });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
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
      // Find the transfer code
      const { data: tc, error: findError } = await supabase
        .from('transfer_codes')
        .select('*')
        .eq('code', claimCode.trim().toUpperCase())
        .is('claimed_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (findError || !tc) {
        toast({ title: 'Code invalide ou expiré', variant: 'destructive' });
        setClaiming(false);
        return;
      }

      const animalId = (tc as any).animal_id;
      const fromUserId = (tc as any).from_user_id;

      // Fetch the animal data for snapshot before transfer
      const { data: animalData } = await supabase
        .from('animals')
        .select('*')
        .eq('id', animalId)
        .single();

      // Create archive entry for the original owner
      if (animalData) {
        await supabase
          .from('transfer_archive')
          .insert({
            original_owner_id: fromUserId,
            animal_id: animalId,
            animal_name: (animalData as any).nom,
            animal_photo: (animalData as any).photo,
            animal_data: {
              type: (animalData as any).type,
              sexe: (animalData as any).sexe,
              race: (animalData as any).race,
              naissance: (animalData as any).naissance,
              puce: (animalData as any).puce,
              poids: (animalData as any).poids,
              soins: (animalData as any).soins,
              consultations: (animalData as any).consultations,
            },
            transfer_code_id: (tc as any).id,
          } as any);
      }

      // Transfer ownership - set breeder_visible to true for buyer
      const { error: transferError } = await supabase
        .from('animals')
        .update({ user_id: user.id, litter_id: null, mother_id: null, breeder_visible: true })
        .eq('id', animalId);

      if (transferError) throw transferError;

      // Mark code as claimed
      await supabase
        .from('transfer_codes')
        .update({ to_user_id: user.id, claimed_at: new Date().toISOString() })
        .eq('id', (tc as any).id);

      // Delete notifications for the old owner
      await supabase
        .from('notifications')
        .delete()
        .eq('animal_id', animalId);

      toast({ title: 'Profil transféré !', description: "L'animal a été ajouté à votre famille." });
      setClaimCode('');
      navigate('/');
    } catch {
      toast({ title: 'Erreur de transfert', variant: 'destructive' });
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
                placeholder="CODE1234"
                maxLength={8}
                className="font-mono tracking-widest"
              />
              <Button onClick={claimAnimal} disabled={claiming || claimCode.length < 8}>
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
                    <span className="font-mono text-xl tracking-[0.3em] font-bold">{c.code}</span>
                    {claimed ? (
                      <Badge variant="default" className="gap-1"><Check className="w-3 h-3" /> Utilisé</Badge>
                    ) : expired ? (
                      <Badge variant="destructive" className="gap-1"><Clock className="w-3 h-3" /> Expiré</Badge>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => copyCode(c.code)}>
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
