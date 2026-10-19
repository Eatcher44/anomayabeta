import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { privateMediaPath, resolvePhotoUrl } from '@/utils/photoRef';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src?: string | null };

/** Drop-in <img> that supports both public photo URLs and private animal-media references. */
export default function SecurePhoto({ src, className, alt = '', onError, ...rest }: Props) {
  const isPrivate = !!privateMediaPath(src);
  const [url, setUrl] = useState<string | null>(isPrivate ? null : src ?? null);
  const [failed, setFailed] = useState(false);
  const retried = useRef(false);

  useEffect(() => {
    let live = true;
    retried.current = false;
    setFailed(false);
    if (!isPrivate) { setUrl(src ?? null); return; }
    setUrl(null);
    resolvePhotoUrl(src).then((u) => { if (!live) return; if (u) setUrl(u); else setFailed(true); });
    return () => { live = false; };
  }, [src, isPrivate]);

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
          resolvePhotoUrl(src, true).then((u) => (u ? setUrl(u === url ? `${u}&retry=1` : u) : setFailed(true)));
          return;
        }
        setFailed(true);
        onError?.(e);
      }}
    />
  );
}
