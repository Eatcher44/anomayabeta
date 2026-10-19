import { useEffect, useRef, useState, useSyncExternalStore, type ImgHTMLAttributes } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { privatePhotoGeneration, resolvePhotoUrl, subscribePrivatePhotoSession } from '@/utils/photoRef';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src?: string | null };

/** Drop-in <img> that supports both public photo URLs and private animal-media references. */
export default function SecurePhoto({ src, className, alt = '', onError, ...rest }: Props) {
  const isPrivate = !!src?.includes('/animal-media/');
  const generation = useSyncExternalStore(subscribePrivatePhotoSession, privatePhotoGeneration, privatePhotoGeneration);
  const [result, setResult] = useState<{ src: typeof src; generation: number; url: string | null; failed: boolean } | null>(null);
  const current = result?.src === src && result.generation === generation ? result : null;
  const url = isPrivate ? current?.url ?? null : src ?? null;
  const failed = current?.failed ?? false;
  const retried = useRef(false);
  const request = useRef(0);

  useEffect(() => {
    const requestId = ++request.current;
    retried.current = false;
    setResult(null);
    if (isPrivate) resolvePhotoUrl(src).then((u) => {
      if (request.current !== requestId || privatePhotoGeneration() !== generation) return;
      setResult({ src, generation, url: u, failed: !u });
    });
    return () => { request.current += 1; };
  }, [src, isPrivate, generation]);

  if (failed || (!url && !isPrivate)) {
    return (
      <div role="img" aria-label={alt || 'Photo indisponible'} className={cn('flex items-center justify-center bg-muted text-muted-foreground', className)}>
        <ImageOff className="w-1/3 h-1/3 max-w-6 max-h-6" />
      </div>
    );
  }
  if (!url) return <div aria-busy="true" className={cn('bg-muted animate-pulse', className)} />;
  return (
    <img
      {...rest}
      src={url}
      alt={alt}
      className={className}
      onError={(e) => {
        // An expired signed URL is refreshed once through the same authorization path.
        if (isPrivate && !retried.current) {
          retried.current = true;
          const requestId = request.current;
          resolvePhotoUrl(src, true).then((u) => {
            if (request.current !== requestId || privatePhotoGeneration() !== generation) return;
            setResult({ src, generation, url: u === url && u ? `${u}&retry=1` : u, failed: !u });
          });
          return;
        }
        setResult({ src, generation, url: null, failed: true });
        onError?.(e);
      }}
    />
  );
}
