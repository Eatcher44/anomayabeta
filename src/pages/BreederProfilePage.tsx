import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { pickPhotoFile } from '@/utils/photo';

interface BreederProfile {
  id?: string;
  nom_elevage: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  siret: string;
  logo_url: string | null;
  signature_url: string | null;
}

const EMPTY: BreederProfile = {
  nom_elevage: '', prenom: '', nom: '', email: '', telephone: '',
  adresse: '', siret: '', logo_url: null, signature_url: null,
};

export default function BreederProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<BreederProfile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('breeder_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setExistingId(data.id);
        setProfile({
          id: data.id,
          nom_elevage: data.nom_elevage || '',
          prenom: data.prenom || '',
          nom: data.nom || '',
          email: data.email || user.email || '',
          telephone: data.telephone || '',
          adresse: data.adresse || '',
          siret: data.siret || '',
          logo_url: data.logo_url,
          signature_url: data.signature_url,
        });
      } else {
        setProfile({ ...EMPTY, email: user.email || '' });
      }
      setLoading(false);
    })();
  }, [user]);

  const uploadImage = async (field: 'logo_url' | 'signature_url') => {
    if (!user) return;
    const file = await pickPhotoFile('image/*');
    if (!file) return;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('animal-photos').upload(path, file);
    if (error) { toast({ title: 'Erreur upload', variant: 'destructive' }); return; }
    const { data: urlData } = supabase.storage.from('animal-photos').getPublicUrl(path);
    setProfile(p => ({ ...p, [field]: urlData.publicUrl }));
  };

  const handleSave = async () => {
    if (!user) return;
    if (!profile.nom.trim() || !profile.email.trim()) {
      toast({ title: 'Nom et email sont requis', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      nom_elevage: profile.nom_elevage.trim() || null,
      prenom: profile.prenom.trim() || null,
      nom: profile.nom.trim(),
      email: profile.email.trim(),
      telephone: profile.telephone.trim() || null,
      adresse: profile.adresse.trim() || null,
      siret: profile.siret.trim() || null,
      logo_url: profile.logo_url,
      signature_url: profile.signature_url,
    };

    let error;
    if (existingId) {
      ({ error } = await supabase.from('breeder_profiles').update(payload).eq('id', existingId));
    } else {
      const res = await supabase.from('breeder_profiles').insert(payload).select().single();
      error = res.error;
      if (res.data) setExistingId(res.data.id);
    }

    setSaving(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profil éleveur enregistré ✓' });
    }
  };

  const set = (field: keyof BreederProfile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setProfile(p => ({ ...p, [field]: e.target.value }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background">
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-lg">Profil éleveur</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 max-w-lg mx-auto">
          {/* Logo */}
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <Label className="text-xs text-muted-foreground">Logo de l'élevage (optionnel)</Label>
            <div className="flex items-center gap-3 mt-2">
              {profile.logo_url ? (
                <img src={profile.logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-border" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">Logo</div>
              )}
              <Button variant="outline" size="sm" onClick={() => uploadImage('logo_url')}>
                <Upload className="w-4 h-4 mr-1.5" />Choisir
              </Button>
            </div>
          </div>

          {/* Fields */}
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Nom de l'élevage</Label>
              <Input value={profile.nom_elevage} onChange={set('nom_elevage')} placeholder="Ex: Chatterie du Bois Joli" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Prénom *</Label>
                <Input value={profile.prenom} onChange={set('prenom')} placeholder="Prénom" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Nom *</Label>
                <Input value={profile.nom} onChange={set('nom')} placeholder="Nom" className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email *</Label>
              <Input value={profile.email} onChange={set('email')} placeholder="email@example.com" type="email" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Téléphone</Label>
              <Input value={profile.telephone} onChange={set('telephone')} placeholder="06 00 00 00 00" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Adresse</Label>
              <Input value={profile.adresse} onChange={set('adresse')} placeholder="Adresse postale" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">SIRET</Label>
              <Input value={profile.siret} onChange={set('siret')} placeholder="N° SIRET (optionnel)" className="mt-1" />
            </div>
          </div>

          {/* Signature */}
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <Label className="text-xs text-muted-foreground">Signature (optionnel)</Label>
            <div className="flex items-center gap-3 mt-2">
              {profile.signature_url ? (
                <img src={profile.signature_url} alt="Signature" className="h-12 rounded border border-border" />
              ) : (
                <div className="h-12 w-24 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">Signature</div>
              )}
              <Button variant="outline" size="sm" onClick={() => uploadImage('signature_url')}>
                <Upload className="w-4 h-4 mr-1.5" />Choisir
              </Button>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
