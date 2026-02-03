import React from 'react';
import { ChevronRight, Camera } from 'lucide-react';
import type { Animal } from '@/types/animal';
import { displayBreed } from '@/utils/breeds';
import { getAgeText } from '@/utils/date';

function lastPoidsKg(animal: Animal): number | null {
  if (!Array.isArray(animal?.poids) || animal.poids.length === 0) return null;
  const sorted = [...animal.poids].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return typeof sorted[0]?.poids === 'number' ? sorted[0].poids : null;
}

interface AnimalRowProps {
  item: Animal;
  onPickPhoto?: (id: string) => void;
  onOpenProfile?: (id: string) => void;
}

export default function AnimalRow({ item, onPickPhoto, onOpenProfile }: AnimalRowProps) {
  const poids = lastPoidsKg(item);
  const isFemale = (item.sexe || '').toLowerCase().startsWith('f');
  const sexeSymbol = isFemale ? '♀' : '♂';
  const bgClass = isFemale ? 'bg-female' : 'bg-male';
  const textClass = isFemale ? 'text-female' : 'text-male';

  return (
    <div className={`flex items-center rounded-xl p-3 border border-border ${bgClass} mb-2 animate-fade-in`}>
      {/* Photo */}
      <button
        onClick={() => onPickPhoto?.(item.id)}
        className="w-[72px] h-[72px] rounded-xl bg-card border border-border flex items-center justify-center overflow-hidden mr-3 hover:opacity-80 transition-opacity"
      >
        {item.photo ? (
          <img src={item.photo} alt={item.nom} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center text-muted-foreground">
            <Camera className="w-5 h-5 mb-1" />
            <span className="text-[10px] text-center">Ajouter photo</span>
          </div>
        )}
      </button>

      {/* Texte */}
      <div className="flex-1 flex items-center">
        <div className="flex-1 pr-2">
          <p className="text-lg font-extrabold text-foreground">
            {item.nom}{' '}
            <span className={textClass}>{sexeSymbol}</span>{' '}
            {item.race && item.race !== '—' && (
              <span className="font-normal text-muted-foreground text-sm">
                ({displayBreed(item.race)})
              </span>
            )}
          </p>
          {item.naissance && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {getAgeText(item.naissance)}
            </p>
          )}
          <p className="text-sm font-semibold text-muted-foreground mt-0.5">
            {poids == null ? 'Poids inconnu' : `${poids} kg`}
          </p>
        </div>

        {/* Flèche d'accès profil */}
        <button
          onClick={() => onOpenProfile?.(item.id)}
          className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
