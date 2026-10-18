import { secureUpload } from './secureUpload';

export async function uploadAnimalPhoto(userId: string, animalId: string, file: File): Promise<string> {
  // Identity and unique paths are issued by the verified server session.
  void userId; void animalId;
  return (await secureUpload('animal-photos', file)).url;
}

let cancelPreviousPicker: (() => void) | undefined;

export function pickPhotoFile(accept = 'image/*', capture?: 'camera'): Promise<File | null> {
  cancelPreviousPicker?.();
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    if (capture) input.setAttribute('capture', 'environment');
    input.hidden = true;
    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      input.removeEventListener('change', change);
      input.removeEventListener('cancel', cancel);
      input.remove();
      if (cancelPreviousPicker === cancel) cancelPreviousPicker = undefined;
      resolve(file);
    };
    const change = () => finish(input.files?.[0] ?? null);
    const cancel = () => finish(null);
    cancelPreviousPicker = cancel;
    input.addEventListener('change', change);
    input.addEventListener('cancel', cancel);
    document.body.append(input);
    // Focus can precede camera file delivery. Only native selection/cancel
    // events settle this picker; an older browser can reopen to supersede it.
    try { input.click(); } catch { cancel(); }
  });
}
