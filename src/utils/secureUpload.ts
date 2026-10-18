import { supabase } from '@/integrations/supabase/client';

export async function secureUpload(bucket: 'animal-photos' | 'bug-screenshots' | 'sensitive-documents', file: File): Promise<{ path: string; url: string }> {
  const body = new FormData();
  body.append('bucket', bucket);
  body.append('file', file);
  const { data, error } = await supabase.functions.invoke('secure-upload', { body });
  if (error || typeof data?.path !== 'string' || typeof data?.url !== 'string') {
    throw new Error('Le dépôt ne peut pas être terminé. Réessayez ou contactez support@anomaya.app.');
  }
  return data;
}