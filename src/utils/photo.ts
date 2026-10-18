import { supabase } from '@/integrations/supabase/client';
import { secureUpload } from './secureUpload';

export async function uploadAnimalPhoto(userId: string, animalId: string, file: File): Promise<string> {
  // Identity and unique paths are issued by the verified server session.
  void userId; void animalId;
  return (await secureUpload('animal-photos', file)).url;
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
