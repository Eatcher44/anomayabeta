import React, { useState } from 'react';
import { Camera, X, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { pickPhotoFile, uploadAnimalPhoto } from '@/utils/photo';
import { toast } from '@/hooks/use-toast';
import type { Animal } from '@/types/animal';

interface Props {
  animal: Animal;
  onUpdate: (patch: Partial<Animal>) => void;
}

const MAX_PHOTOS = 5;

export default function KittenPhotoGallery({ animal, onUpdate }: Props) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [fullscreenIdx, setFullscreenIdx] = useState<number | null>(null);

  const gallery: string[] = ((animal as any).gallery_photos || []) as string[];
  const allPhotos = [animal.photo, ...gallery].filter(Boolean) as string[];
  const canAdd = allPhotos.length < MAX_PHOTOS;

  const handleAddPhoto = async () => {
    if (!user || !canAdd) return;
    const file = await pickPhotoFile('image/*');
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAnimalPhoto(user.id, animal.id, file);
      if (!animal.photo) {
        await supabase.from('animals').update({ photo: url }).eq('id', animal.id);
        onUpdate({ photo: url });
      } else {
        const newGallery = [...gallery, url];
        await supabase.from('animals').update({ gallery_photos: newGallery } as any).eq('id', animal.id);
        onUpdate({ gallery_photos: newGallery } as any);
      }
      toast({ title: 'Photo ajoutée' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (idx: number) => {
    if (idx === 0 && animal.photo) {
      const newMain = gallery[0] || null;
      const newGallery = gallery.slice(1);
      await supabase.from('animals').update({ photo: newMain, gallery_photos: newGallery } as any).eq('id', animal.id);
      onUpdate({ photo: newMain, gallery_photos: newGallery } as any);
    } else {
      const galleryIdx = idx - 1;
      const newGallery = gallery.filter((_, i) => i !== galleryIdx);
      await supabase.from('animals').update({ gallery_photos: newGallery } as any).eq('id', animal.id);
      onUpdate({ gallery_photos: newGallery } as any);
    }
    setFullscreenIdx(null);
    toast({ title: 'Photo supprimée' });
  };

  const handleMakeMain = async (idx: number) => {
    if (idx === 0) return;
    const galleryIdx = idx - 1;
    const newMain = gallery[galleryIdx];
    const newGallery = [...gallery];
    newGallery.splice(galleryIdx, 1);
    if (animal.photo) newGallery.unshift(animal.photo);
    await supabase.from('animals').update({ photo: newMain, gallery_photos: newGallery } as any).eq('id', animal.id);
    onUpdate({ photo: newMain, gallery_photos: newGallery } as any);
    toast({ title: 'Photo principale mise à jour' });
  };

  return (
    <>
      <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-sm">Photos ({allPhotos.length}/{MAX_PHOTOS})</h2>
          {canAdd && (
            <Button variant="outline" size="sm" onClick={handleAddPhoto} disabled={uploading}>
              <Camera className="w-4 h-4 mr-1.5" />
              {uploading ? 'Upload...' : 'Ajouter'}
            </Button>
          )}
        </div>

        {allPhotos.length === 0 ? (
          <button
            onClick={handleAddPhoto}
            className="w-full aspect-video rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary transition-colors"
          >
            <Camera className="w-6 h-6 mr-2" />
            Ajouter une photo
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {allPhotos.map((url, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => setFullscreenIdx(i)}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <div className="absolute top-1 left-1 bg-[hsl(45,80%,50%)]/90 text-[hsl(45,80%,10%)] text-[8px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5" />
                    Principale
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </div>
            ))}
          </div>
        )}
      </div>

      {fullscreenIdx !== null && allPhotos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center" onClick={() => setFullscreenIdx(null)}>
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            {fullscreenIdx !== 0 && (
              <Button size="sm" variant="secondary" onClick={e => { e.stopPropagation(); handleMakeMain(fullscreenIdx); }}>
                <Star className="w-4 h-4 mr-1" />Principale
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={e => { e.stopPropagation(); handleDeletePhoto(fullscreenIdx); }}>
              <X className="w-4 h-4 mr-1" />Supprimer
            </Button>
            <button className="text-white p-2" onClick={() => setFullscreenIdx(null)}>
              <X className="w-6 h-6" />
            </button>
          </div>
          <img src={allPhotos[fullscreenIdx]} alt="" className="max-w-full max-h-[80vh] object-contain" onClick={e => e.stopPropagation()} />
          {allPhotos.length > 1 && (
            <>
              <button
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white p-2"
                onClick={e => { e.stopPropagation(); setFullscreenIdx((fullscreenIdx - 1 + allPhotos.length) % allPhotos.length); }}
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white p-2"
                onClick={e => { e.stopPropagation(); setFullscreenIdx((fullscreenIdx + 1) % allPhotos.length); }}
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
