import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Baby, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnimals } from '@/context/AnimalsContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Animal } from '@/types/animal';

export default function LitterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { animaux } = useAnimals();

  const [litter, setLitter] = useState<any>(null);
  const [newborns, setNewborns] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLitter = useCallback(async () => {
    if (!user || !id) return;
    const { data } = await supabase.from('litters').select('*').eq('id', id).single();
    if (data) setLitter(data);

    // Newborns are in animaux context (litter_id match)
    const nb = animaux.filter((a) => a.litter_id === id);
    setNewborns(nb);
    setLoading(false);
  }, [user, id, animaux]);

  useEffect(() => {
    fetchLitter();
  }, [fetchLitter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (!litter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Portée introuvable.</p>
      </div>
    );
  }

  const motherName = animaux.find((a) => a.id === litter.mother_id)?.nom || 'Inconnue';
  const fatherName = litter.father_id
    ? animaux.find((a) => a.id === litter.father_id)?.nom || 'Inconnu'
    : litter.father_name || null;

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background">
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/portees')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Baby className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-lg">Portée — {motherName}</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Litter info */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mère</span>
            <button onClick={() => navigate(`/profil/${litter.mother_id}`)} className="font-bold text-primary hover:underline text-sm">
              {motherName}
            </button>
          </div>
          {fatherName && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Père</span>
              <span className="font-bold">
                {litter.father_id ? (
                  <button onClick={() => navigate(`/profil/${litter.father_id}`)} className="text-primary hover:underline">
                    {fatherName}
                  </button>
                ) : fatherName}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date de naissance</span>
            <span className="font-bold">{fmt(litter.birth_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nombre de petits</span>
            <span className="font-bold">{newborns.length}</span>
          </div>
        </div>

        {/* Newborn list */}
        <h2 className="font-extrabold text-lg">Nouveau-nés</h2>
        {newborns.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">Aucun nouveau-né enregistré.</p>
        ) : (
          <div className="space-y-2">
            {newborns.map((nb) => (
              <button
                key={nb.id}
                onClick={() => navigate(`/profil/${nb.id}`)}
                className="w-full text-left bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {nb.photo ? (
                        <img src={nb.photo} alt={nb.nom} className="w-full h-full object-cover" />
                      ) : (
                        <Baby className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold">{nb.nom}</p>
                      <p className="text-xs text-muted-foreground">{nb.sexe} {nb.race ? `• ${nb.race}` : ''}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
