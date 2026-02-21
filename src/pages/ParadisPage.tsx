import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bird } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnimals } from '@/context/AnimalsContext';
import { displayBreed } from '@/utils/breeds';
import { getAgeText } from '@/utils/date';
import { formatWeight } from '@/components/AnimalRow';

function lastPoidsKg(animal: any): number | null {
  if (!Array.isArray(animal?.poids) || animal.poids.length === 0) return null;
  const sorted = [...animal.poids].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return typeof sorted[0]?.poids === 'number' ? sorted[0].poids : null;
}

export default function ParadisPage() {
  const navigate = useNavigate();
  const { animaux } = useAnimals();

  const paradisAnimaux = animaux.filter((a) => a.paradis === true);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(220,30%,96%)] to-[hsl(260,20%,94%)] dark:from-background dark:to-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Bird className="w-5 h-5 text-muted-foreground" />
        <h1 className="font-bold text-lg">Paradis</h1>
      </div>

      <div className="p-4">
        {paradisAnimaux.length === 0 ? (
          <div className="text-center py-16">
            <Bird className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Aucun compagnon au paradis.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paradisAnimaux.map((animal) => {
              const poids = lastPoidsKg(animal);
              return (
                <button
                  key={animal.id}
                  onClick={() => navigate(`/profil/${animal.id}`)}
                  className="w-full text-left bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    {/* Photo */}
                    <div className="w-16 h-16 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                      {animal.photo ? (
                        <img src={animal.photo} alt={animal.nom} className="w-full h-full object-cover" />
                      ) : (
                        <Bird className="w-6 h-6 text-muted-foreground/40" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-bold text-foreground">{animal.nom}</p>
                      {animal.race && animal.race !== '—' && (
                        <p className="text-sm text-muted-foreground">{displayBreed(animal.race)}</p>
                      )}
                      <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                        {animal.naissance && (
                          <span>{getAgeText(animal.naissance)}</span>
                        )}
                        <span>{formatWeight(poids)}</span>
                      </div>
                    </div>

                    {/* Memorial indicator */}
                    <div className="flex-shrink-0 text-2xl opacity-50">🕊️</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
