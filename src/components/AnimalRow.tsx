import React, { useRef, useState } from 'react';
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

  // Swipe state using pointer events (works on touch AND mouse)
  const [swiped, setSwiped] = useState(false);
  const pointerStartX = useRef(0);
  const pointerCurrentX = useRef(0);
  const isPointerDown = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartX.current = e.clientX;
    pointerCurrentX.current = e.clientX;
    isPointerDown.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDown.current) return;
    pointerCurrentX.current = e.clientX;
  };

  const handlePointerUp = () => {
    if (!isPointerDown.current) return;
    isPointerDown.current = false;
    const diff = pointerStartX.current - pointerCurrentX.current;
    if (diff > 60) {
      setSwiped(true);
    } else if (diff < -40) {
      setSwiped(false);
    }
  };

  const accentStyle = item.couleur ? { borderColor: item.couleur, borderWidth: '2px' } : {};

  return (
    <div className="relative mb-3 overflow-hidden rounded-xl">
      {/* Delete button behind */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-16 flex items-center justify-center bg-destructive transition-opacity ${
          swiped ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={() => onDelete?.(item.id)}
          className="w-12 h-12 rounded-full bg-destructive-foreground/20 flex items-center justify-center"
        >
          <Trash2 className="w-6 h-6 text-destructive-foreground" />
        </button>
      </div>

      {/* Card */}
      <div
        className={`flex items-center rounded-xl p-3 border border-border ${bgClass} shadow-sm transition-transform duration-200 touch-pan-y ${
          swiped ? '-translate-x-16' : 'translate-x-0'
        }`}
        style={{ ...accentStyle, touchAction: 'pan-y' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={() => swiped && setSwiped(false)}
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
              {item.race && item.race !== '—' && (
                <span className="font-normal text-muted-foreground text-sm">
                  ({displayBreed(item.race)})
                </span>
              )}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {item.naissance ? getAgeText(item.naissance) : 'Âge inconnu'}
            </p>
            <p className="text-sm font-semibold text-muted-foreground mt-0.5">
              {formatWeight(poids)}
            </p>
          </div>

          {/* Desktop delete menu fallback */}
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
                Supprimer
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
