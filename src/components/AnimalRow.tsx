import React from 'react';
import { ChevronRight, Camera, MoreVertical, Trash2, Bird } from 'lucide-react';
import type { Animal } from '@/types/animal';
import { displayBreed } from '@/utils/breeds';
import { getAgeText } from '@/utils/date';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function formatWeight(kg: number | null): string {
  if (kg == null) return 'Poids inconnu';
  if (kg < 1) return `${Math.round(kg * 1000)} g`;
  return `${kg} kg`;
}

function lastPoidsKg(animal: Animal): number | null {
  if (!Array.isArray(animal?.poids) || animal.poids.length === 0) return null;
  const sorted = [...animal.poids].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return typeof sorted[0]?.poids === 'number' ? sorted[0].poids : null;
}

interface AnimalRowProps {
  item: Animal;
  onPickPhoto?: (id: string) => void;
  onOpenProfile?: (id: string) => void;
  onDelete?: (id: string) => void;
  onParadis?: (id: string) => void;
}

export default function AnimalRow({ item, onPickPhoto, onOpenProfile, onDelete, onParadis }: AnimalRowProps) {
  const poids = lastPoidsKg(item);
  const isFemale = (item.sexe || '').toLowerCase().startsWith('f');
  const sexeSymbol = isFemale ? '♀' : '♂';
  const bgClass = isFemale ? 'bg-female' : 'bg-male';
  const textClass = isFemale ? 'text-female' : 'text-male';

  return (
    <div className="mb-3 rounded-xl">
      <div
        className={`flex items-center rounded-xl p-3 border border-border ${bgClass} shadow-sm`}
      >
        {/* Photo */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPickPhoto?.(item.id);
          }}
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

        {/* Text */}
        <div className="flex-1 flex items-center">
          <div className="flex-1 pr-2">
            <p className="text-lg font-extrabold text-foreground">
              {item.nom}{' '}
              <span className={textClass}>{sexeSymbol}</span>{' '}
              {(() => {
                const parts: string[] = [];
                if (item.race && item.race !== '—') parts.push(displayBreed(item.race));
                if (item.robe) parts.push(item.robe.toLowerCase());
                if (item.particularite && item.particularite.toLowerCase() !== 'aucune') parts.push(item.particularite.toLowerCase());
                return parts.length > 0 ? (
                  <span className="font-normal text-muted-foreground text-sm">
                    ({parts.join(' ')})
                  </span>
                ) : null;
              })()}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {item.naissance ? getAgeText(item.naissance) : 'Âge inconnu'}
            </p>
            <p className="text-sm font-semibold text-muted-foreground mt-0.5">
              {formatWeight(poids)}
            </p>
          </div>

          {/* Three-dot menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors mr-1"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onParadis?.(item.id)}
                className="text-muted-foreground"
              >
                <Bird className="w-4 h-4 mr-2" />
                S'envoler au paradis
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete?.(item.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer définitivement
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenProfile?.(item.id);
            }}
            className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
