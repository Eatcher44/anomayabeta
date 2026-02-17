import { supabase } from '@/integrations/supabase/client';

export async function uploadAnimalPhoto(userId: string, animalId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${animalId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('animal-photos')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from('animal-photos')
    .getPublicUrl(path);

  return data.publicUrl;
}

export function pickPhotoFile(accept = 'image/*', capture?: 'camera'): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    if (capture) input.setAttribute('capture', capture);
    input.onchange = () => {
      resolve(input.files?.[0] || null);
    };
    // handle cancel
    window.addEventListener('focus', () => {
      setTimeout(() => {
        if (!input.files?.length) resolve(null);
      }, 300);
    }, { once: true });
    input.click();
  });
}
