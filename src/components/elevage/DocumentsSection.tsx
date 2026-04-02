import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Upload, Trash2, Eye, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

const DOC_TYPES = [
  { value: 'pedigree', label: 'Pedigree' },
  { value: 'dna_test', label: 'Test ADN' },
  { value: 'contract', label: 'Contrat' },
  { value: 'vaccination_proof', label: 'Preuve de vaccination' },
  { value: 'other', label: 'Autre' },
];

interface Document {
  id: string;
  file_url: string;
  file_name: string;
  document_type: string;
  created_at: string;
}

interface Props {
  animalId: string;
}

export default function DocumentsSection({ animalId }: Props) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] = useState('other');
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('animal_documents' as any)
        .select('*')
        .eq('animal_id', animalId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setDocuments((data as Document[]) || []);
    } catch {
      // Table may not exist yet — gracefully handle
      setDocuments([]);
    }
    setLoading(false);
  }, [animalId, user]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: 'Fichier trop volumineux', description: 'Maximum 10 Mo', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${animalId}/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('animal-documents')
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('animal-documents')
        .getPublicUrl(path);

      const { error: insertError } = await supabase
        .from('animal_documents' as any)
        .insert({
          user_id: user.id,
          animal_id: animalId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          document_type: docType,
        } as any);
      if (insertError) throw insertError;

      await fetchDocs();
      setUploadOpen(false);
      toast({ title: 'Document ajouté' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: "Impossible d'uploader le document", variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await supabase.from('animal_documents' as any).delete().eq('id', deleteId);
      setDocuments(prev => prev.filter(d => d.id !== deleteId));
      toast({ title: 'Document supprimé' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
    setDeleteId(null);
  };

  const getTypeLabel = (type: string) => DOC_TYPES.find(d => d.value === type)?.label || 'Autre';

  return (
    <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h2 className="font-extrabold">Documents</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setDocType('other'); setUploadOpen(true); }}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Ajouter
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
        </div>
      ) : documents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aucun document</p>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/30">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.file_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{getTypeLabel(doc.document_type)}</Badge>
                  <span className="text-[10px] text-muted-foreground">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.file_name);
                  if (isImage) setPreviewUrl(doc.file_url);
                  else window.open(doc.file_url, '_blank');
                }}>
                  <Eye className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(doc.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Ajouter un document</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs text-muted-foreground">Type de document</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fichier (PDF ou image, max 10 Mo)</Label>
              <label className="mt-1.5 flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{uploading ? 'Upload en cours...' : 'Choisir un fichier'}</span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleUpload} className="hidden" disabled={uploading} />
              </label>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Aperçu</DialogTitle></DialogHeader>
          {previewUrl && <img src={previewUrl} alt="Preview" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
