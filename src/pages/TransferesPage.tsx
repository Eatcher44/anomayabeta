import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface TransferArchiveEntry {
  id: string;
  animal_name: string;
  animal_photo: string | null;
  animal_data: any;
  transferred_at: string;
}

export default function TransferesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState<TransferArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('transfer_archive')
        .select('*')
        .eq('original_owner_id', user.id)
        .order('transferred_at', { ascending: false });
      if (data) setEntries(data as TransferArchiveEntry[]);
      setLoading(false);
    })();
  }, [user]);

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background">
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <ArrowRightLeft className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-lg">Transférés</h1>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <ArrowRightLeft className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Aucun animal transféré.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const data = entry.animal_data || {};
              return (
                <div
                  key={entry.id}
                  className="w-full text-left bg-card rounded-2xl border border-border p-4 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                      {entry.animal_photo ? (
                        <img src={entry.animal_photo} alt={entry.animal_name} className="w-full h-full object-cover" />
                      ) : (
                        <ArrowRightLeft className="w-5 h-5 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold">{entry.animal_name}</p>
                        <Badge variant="secondary" className="text-xs">Transféré</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {data.type || ''} {data.sexe ? `• ${data.sexe}` : ''} {data.race ? `• ${data.race}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Transféré le {fmt(entry.transferred_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
