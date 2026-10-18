import { supabase } from '@/integrations/supabase/client';

export async function privateDocumentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('sensitive-documents').createSignedUrl(path, 300);
  if (error || !data?.signedUrl) throw new Error('Document privé indisponible');
  return data.signedUrl;
}