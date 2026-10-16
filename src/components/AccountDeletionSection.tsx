import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

const CONFIRM_WORD = 'SUPPRIMER';

export default function AccountDeletionSection() {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [typed, setTyped] = useState('');
  const { session } = useAuth();
  const confirmed = typed.trim().toUpperCase() === CONFIRM_WORD;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!session?.access_token || !confirmed) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { confirm: CONFIRM_WORD },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setOpen(false);
      await supabase.auth.signOut();
      toast({ title: 'Compte supprimé', description: 'Votre compte et vos données ont été supprimés.' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message || 'Impossible de supprimer le compte.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Compte</h3>
      <p className="text-xs text-muted-foreground">
        Vous pouvez supprimer votre compte et toutes vos données à tout moment.
      </p>
      <Button variant="destructive" size="sm" onClick={() => { setTyped(''); setOpen(true); }} className="gap-1.5">
        <Trash2 className="w-3.5 h-3.5" />
        Supprimer mon compte
      </Button>

      <AlertDialog open={open} onOpenChange={(o) => !deleting && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement le compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement votre compte et toutes les données associées : animaux, portées, soins, rappels, rendez-vous, pharmacie, profil éleveur et photos. Les animaux déjà transférés à un autre utilisateur restent chez leur nouveau propriétaire. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              Pour confirmer, tapez <span className="font-semibold text-foreground">{CONFIRM_WORD}</span> :
            </p>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={CONFIRM_WORD} disabled={deleting} autoCapitalize="characters" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || !confirmed}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Suppression...' : 'Supprimer mon compte'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
