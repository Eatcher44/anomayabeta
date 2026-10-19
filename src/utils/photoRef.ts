import { supabase } from '@/integrations/supabase/client';

// Stored photo references are left untouched. Public URLs render as-is; references to the
// private animal-media bucket are resolved to a short-lived signed URL, which Storage only
// issues after its server-side access rule (custody, binding, feature flag) passes.
const PRIVATE_REF = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/animal-media\/([0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:png|jpg|webp))$/;
const TTL_SECONDS = 300;
const REFRESH_MARGIN_MS = 60_000;

export function privateMediaPath(ref: string | null | undefined): string | null {
  if (!ref) return null;
  return PRIVATE_REF.exec(ref)?.[1] ?? null;
}

type Entry = { url: string; expires: number } | { pending: Promise<string | null> };
const cache = new Map<string, Entry>();

export function clearPrivatePhotoCache() { cache.clear(); }

/** Returns a displayable URL, or null when access is refused / unavailable. Never falls back to a public URL for private refs. */
export async function resolvePhotoUrl(ref: string | null | undefined, force = false): Promise<string | null> {
  if (!ref) return null;
  const path = privateMediaPath(ref);
  if (!path) return ref.includes('/animal-media/') ? null : ref;
  const hit = cache.get(path);
  if (!force && hit) {
    if ('pending' in hit) return hit.pending;
    if (hit.expires - REFRESH_MARGIN_MS > Date.now()) return hit.url;
  }
  const pending = (async () => {
    const { data, error } = await supabase.storage.from('animal-media').createSignedUrl(path, TTL_SECONDS);
    if (error || !data?.signedUrl) { cache.delete(path); return null; }
    cache.set(path, { url: data.signedUrl, expires: Date.now() + TTL_SECONDS * 1000 });
    return data.signedUrl;
  })();
  cache.set(path, { pending });
  return pending;
}

supabase.auth?.onAuthStateChange?.((event) => { if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') clearPrivatePhotoCache(); });
