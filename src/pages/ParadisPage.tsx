import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bird, Home, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnimals } from '@/context/AnimalsContext';
import { displayBreed } from '@/utils/breeds';
import { getAgeText } from '@/utils/date';
import { formatWeight } from '@/components/AnimalRow';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

function lastPoidsKg(animal: any): number | null {
  if (!Array.isArray(animal?.poids) || animal.poids.length === 0) return null;
  const sorted = [...animal.poids].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return typeof sorted[0]?.poids === 'number' ? sorted[0].poids : null;
}

export default function ParadisPage() {
  const navigate = useNavigate();
  const { animaux, deleteAnimal } = useAnimals();

  const paradisAnimaux = animaux.filter((a) => a.paradis === true);

  // Permanent delete flow (double confirmation)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nom: string } | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);

  const startDelete = (id: string, nom: string) => {
    setDeleteTarget({ id, nom });
    setDeleteStep(1);
  };

  const handleDeleteStep1 = () => setDeleteStep(2);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAnimal(deleteTarget.id);
      toast({ title: `${deleteTarget.nom} supprimé définitivement` });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
    }
    setDeleteTarget(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(220,30%,96%)] to-[hsl(260,20%,94%)] dark:from-background dark:to-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/', { replace: true })}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Bird className="w-5 h-5 text-muted-foreground" />
        <h1 className="font-bold text-lg flex-1">Paradis</h1>
        <Button variant="ghost" size="sm" onClick={() => navigate('/', { replace: true })} className="text-primary gap-1.5">
          <Home className="w-4 h-4" />
          Ma famille
        </Button>
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
                <div
                  key={animal.id}
                  className="w-full text-left bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    {/* Photo */}
                    <button
                      onClick={() => navigate(`/profil/${animal.id}`)}
                      className="w-16 h-16 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden flex-shrink-0"
                    >
                      {animal.photo ? (
                        <img src={animal.photo} alt={animal.nom} className="w-full h-full object-cover" />
                      ) : (
                        <Bird className="w-6 h-6 text-muted-foreground/40" />
                      )}
                    </button>

                    {/* Info */}
                    <button
                      onClick={() => navigate(`/profil/${animal.id}`)}
                      className="flex-1 min-w-0 text-left"
                    >
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
                    </button>

                    {/* 3-dot menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => startDelete(animal.id, animal.nom)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer définitivement
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Memorial indicator */}
                    <div className="flex-shrink-0 text-2xl opacity-50">🕊️</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation #1 */}
      <AlertDialog open={!!deleteTarget && deleteStep === 1} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement</AlertDialogTitle>
            <AlertDialogDescription>
              Supprimer définitivement le profil de {deleteTarget?.nom} ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Non</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStep1} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Oui
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation #2 */}
      <AlertDialog open={!!deleteTarget && deleteStep === 2} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Vous perdrez toutes les données de {deleteTarget?.nom}. Confirmer la suppression ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Non</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Oui, supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
