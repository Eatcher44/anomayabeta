import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function AccountDeletionSection() {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { session } = useAuth();

  const handleDelete = async () => {
    if (!session?.access_token) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await supabase.auth.signOut();
      toast({ title: 'Compte supprimé', description: 'Votre compte et vos données ont été supprimés.' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message || 'Impossible de supprimer le compte.', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Compte</h3>
      <p className="text-xs text-muted-foreground">
        Vous pouvez supprimer votre compte et toutes vos données à tout moment.
      </p>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Trash2 className="w-3.5 h-3.5" />
        Supprimer mon compte
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement votre compte et toutes les données associées (animaux, portées, historiques). Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
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