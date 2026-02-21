import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Animal } from '@/types/animal';
import type { Reproduction, Litter } from '@/hooks/useElevageData';

interface Props {
  eligible: Animal[];
  litters: Litter[];
  reproductions: Reproduction[];
}

export default function ElevageReproducteurs({ eligible, litters, reproductions }: Props) {
  const navigate = useNavigate();

  if (eligible.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun reproducteur éligible.</p>;
  }

  return (
    <div className="space-y-2">
      {eligible.map(a => {
        const isFemale = a.sexe?.toLowerCase().startsWith('f');
        const animalLitters = litters.filter(l => l.mother_id === a.id);
        const litterCount = animalLitters.length;
        const totalKittens = animalLitters.reduce((s, l) => s + l.newborn_count, 0);

        const animalRepros = reproductions.filter(r => r.animal_id === a.id || r.father_animal_id === a.id);
        const saillieCount = animalRepros.length;

        // Last date
        const lastDate = isFemale
          ? (animalLitters.length > 0 ? animalLitters[0].birth_date : null)
          : (animalRepros.length > 0 ? animalRepros[0].date_saillie : null);
        const lastLabel = lastDate ? new Date(lastDate).toLocaleDateString('fr-FR') : '—';

        return (
          <button
            key={a.id}
            onClick={() => navigate(`/profil/${a.id}`)}
            className="w-full flex items-center gap-3 bg-card rounded-xl border border-border p-3 shadow-sm hover:shadow-md transition-shadow text-left"
          >
            {a.photo ? (
              <img src={a.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                {isFemale ? '♀' : '♂'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{a.nom}</p>
              {isFemale ? (
                <p className="text-[11px] text-muted-foreground">
                  {litterCount} portée(s) • {totalKittens} petit(s) • dern. {lastLabel}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {saillieCount} saillie(s) • dern. {lastLabel}
                </p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
