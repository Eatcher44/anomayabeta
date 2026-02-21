import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatWeight } from '@/components/AnimalRow';
import { ArrowLeft, Edit, Syringe, Bug, Pill, Calendar, Baby, Bird, QrCode, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAnimals } from '@/context/AnimalsContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DateField from '@/components/DateField';
import ColorPicker from '@/components/ColorPicker';
import { displayBreed } from '@/utils/breeds';
import { getAgeText } from '@/utils/date';
import { pickPhotoFile, uploadAnimalPhoto } from '@/utils/photo';
import { getAllAlerts } from '@/utils/insights';
import { toast } from '@/hooks/use-toast';
import { useBreeder } from '@/context/BreederContext';
import { isBreederEligible } from '@/utils/breederUtils';

const fmt = (d: string | Date) => new Date(d).toLocaleDateString('fr-FR');
const isFemale = (a: { sexe?: string }) => (a.sexe || '').toLowerCase().startsWith('f');
const isMale = (a: { sexe?: string }) => (a.sexe || '').toLowerCase().startsWith('m');

export default function ProfilPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { animaux, updateAnimal, rendezvous, setAnimaux } = useAnimals();
  const { isBreeder } = useBreeder();
  const [editOpen, setEditOpen] = useState(false);
  const [puceInlineEdit, setPuceInlineEdit] = useState(false);
  const [puceDraft, setPuceDraft] = useState('');

  // Edit state
  const [nameDraft, setNameDraft] = useState('');
  const [typeDraft, setTypeDraft] = useState('');
  const [sexDraft, setSexDraft] = useState<'Mâle' | 'Femelle'>('Mâle');
  const [raceDraft, setRaceDraft] = useState('');
  const [birthDraft, setBirthDraft] = useState(new Date());
  const [birthValid, setBirthValid] = useState(true);
  const [sterilDraft, setSterilDraft] = useState(false);
  const [puceEditDraft, setPuceEditDraft] = useState('');
  const [colorDraft, setColorDraft] = useState<string | null>(null);

  const animal = animaux.find((a) => a.id === id);

  // Parent info for newborns
  const motherAnimal = animal?.mother_id ? animaux.find((a) => a.id === animal.mother_id) : null;
  const [fatherInfo, setFatherInfo] = useState<{ name: string } | null>(null);

  // Male reproduction records
  const [maleMatings, setMaleMatings] = useState<any[]>([]);

  useEffect(() => {
    if (!animal?.litter_id) return;
    (async () => {
      const { data } = await supabase
        .from('litters')
        .select('father_id, father_name')
        .eq('id', animal.litter_id)
        .single();
      if (data) {
        if (data.father_name) {
          setFatherInfo({ name: data.father_name });
        } else if (data.father_id) {
          const father = animaux.find((a) => a.id === data.father_id);
          setFatherInfo({ name: father?.nom || 'Inconnu' });
        }
      }
    })();
  }, [animal?.litter_id, animaux]);

  // Fetch matings where this male is the father
  useEffect(() => {
    if (!animal || !isMale(animal) || !isBreederEligible(animal.type)) return;
    (async () => {
      const { data } = await supabase
        .from('reproductions')
        .select('*')
        .eq('father_animal_id', animal.id)
        .order('date_saillie', { ascending: false });
      if (data) {
        // Also fetch linked litters
        const enriched = await Promise.all(
          data.map(async (r: any) => {
            const motherAnimal = animaux.find((a) => a.id === r.animal_id);
            let litter = null;
            if (r.status === 'birth_confirmed') {
              const { data: lit } = await supabase
                .from('litters')
                .select('id, birth_date')
                .eq('reproduction_id', r.id)
                .single();
              if (lit) {
                const { count } = await supabase
                  .from('animals')
                  .select('id', { count: 'exact', head: true })
                  .eq('litter_id', lit.id);
                litter = { ...lit, newborn_count: count || 0 };
              }
            }
            return { ...r, motherName: motherAnimal?.nom || 'Inconnue', litter };
          })
        );
        setMaleMatings(enriched);
      }
    })();
  }, [animal?.id, animaux]);

  const soins = animal?.soins || [];
  const bgClass = animal && isFemale(animal) ? 'bg-female' : 'bg-male';

  // Last recorded weight
  const lastWeight = useMemo(() => {
    if (!animal?.poids || animal.poids.length === 0) return null;
    const sorted = [...animal.poids].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return typeof sorted[0]?.poids === 'number' ? sorted[0].poids : null;
  }, [animal?.poids]);

  const actifsAutresSoins = useMemo(() => {
    if (!animal) return [];
    const now = new Date();
    return soins.filter(
      (s) =>
        s.type === 'Traitement' &&
        s.debut &&
        s.fin &&
        new Date(s.debut) <= now &&
        now <= new Date(s.fin)
    );
  }, [soins, animal]);

  const rdvsFuturs = useMemo(() => {
    if (!animal || !Array.isArray(rendezvous)) return [];
    return rendezvous
      .filter((r) => r.animalIds?.includes(animal.id))
      .filter((r) => new Date(r.date).getTime() >= Date.now());
  }, [rendezvous, animal?.id]);

  // Smart insights for this animal
  const animalAlerts = useMemo(() => {
    if (!animal) return [];
    return getAllAlerts([animal], rendezvous.filter((r) => r.animalIds?.includes(animal.id)));
  }, [animal, rendezvous]);

  if (!animal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Animal introuvable.</p>
          <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  const openEditModal = () => {
    setNameDraft(animal.nom);
    setTypeDraft(animal.type);
    setSexDraft((animal.sexe as 'Mâle' | 'Femelle') || 'Mâle');
    setRaceDraft(animal.race || '');
    setBirthDraft(animal.naissance ? new Date(animal.naissance) : new Date());
    setBirthValid(true);
    setSterilDraft(!!animal.sterilise);
    setPuceEditDraft(animal.puce || '');
    setColorDraft(animal.couleur || null);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!birthValid) return;
    try {
      await updateAnimal(animal.id, (a) => ({
        ...a,
        nom: nameDraft.trim() || a.nom,
        type: typeDraft.trim() || a.type,
        sexe: sexDraft,
        race: raceDraft.trim() || undefined,
        naissance: birthDraft.toISOString(),
        sterilise: sterilDraft,
        puce: puceEditDraft.trim() || undefined,
        couleur: colorDraft,
      }));
      setEditOpen(false);
    } catch {
      toast({ title: 'Erreur', description: "Impossible de sauvegarder", variant: 'destructive' });
    }
  };

  const handleChangePhoto = async () => {
    if (!user) return;
    const file = await pickPhotoFile('image/*');
    if (!file) return;
    try {
      const url = await uploadAnimalPhoto(user.id, animal.id, file);
      await updateAnimal(animal.id, { photo: url });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour la photo', variant: 'destructive' });
    }
  };

  const headerStyle = animal.couleur
    ? { borderColor: animal.couleur, borderWidth: '2px' }
    : {};

    const isParadis = !!animal.paradis;
    const isNewborn = !!(animal.litter_id && (animal as any).breeder_visible === false);

    const handlePromoteToFamily = async () => {
      try {
        await supabase.from('animals').update({ breeder_visible: true, litter_id: null }).eq('id', animal.id);
        setAnimaux((prev) =>
          prev.map((a) => (a.id === animal.id ? { ...a, breeder_visible: true, litter_id: undefined } : a))
        );
        toast({ title: 'Ajouté à Ma famille', description: `${animal.nom} est maintenant dans Ma famille.` });
        navigate('/');
      } catch {
        toast({ title: 'Erreur', variant: 'destructive' });
      }
    };

    const handleBackNav = () => {
      if (isParadis) return navigate('/paradis');
      if (isNewborn && animal.litter_id) return navigate(`/portee/${animal.litter_id}`);
      return navigate('/');
    };

    return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleBackNav}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-lg">Profil</h1>
        {isParadis && (
          <Badge variant="secondary" className="ml-auto gap-1.5 text-muted-foreground">
            <Bird className="w-3.5 h-3.5" />
            Au paradis 🕊️
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Header Profil */}
          <div
            className={`${bgClass} rounded-2xl p-4 border border-border relative shadow-sm`}
            style={headerStyle}
          >
            <div className="flex items-center">
              <div
                onClick={isParadis ? undefined : handleChangePhoto}
                className={`w-[72px] h-[72px] rounded-full bg-muted flex items-center justify-center overflow-hidden mr-3 transition-opacity ${isParadis ? 'cursor-default' : 'hover:opacity-80 cursor-pointer'}`}
              >
                {animal.photo ? (
                  <img src={animal.photo} alt={animal.nom} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground text-center px-1">{isParadis ? '' : 'Ajouter photo'}</span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-xl font-extrabold">
                  {animal.nom} {animal.sexe === 'Femelle' ? '♀' : '♂'}
                  {animal.race && animal.race !== '—' && (
                    <span className="font-normal text-muted-foreground text-sm ml-1">
                      ({displayBreed(animal.race)})
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground mt-1">
                  {animal.naissance ? getAgeText(animal.naissance) : 'Âge inconnu'}
                  {' • '}
                  <span className="font-semibold">{formatWeight(lastWeight)}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Smart Insights for this animal */}
          {animalAlerts.length > 0 && (
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <h2 className="font-extrabold mb-3">🧠 Analyse santé</h2>
              <div className="space-y-2">
                {animalAlerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-lg p-2.5 border text-sm ${
                      alert.severity === 'urgent'
                        ? 'border-destructive/30 bg-destructive/5'
                        : alert.severity === 'warning'
                        ? 'border-[hsl(var(--status-orange))]/30 bg-[hsl(var(--status-orange))]/5'
                        : 'border-primary/20 bg-accent/30'
                    }`}
                  >
                    <span className="mr-1.5">{alert.icon}</span>
                    <span className="font-semibold">{alert.title}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fiche */}
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-extrabold">Fiche</h2>
              {!isParadis && (
                <Button variant="outline" size="sm" onClick={openEditModal}>
                  <Edit className="w-4 h-4 mr-1.5" />
                  Modifier
                </Button>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Date de naissance</span>
                <span className="font-bold">{animal.naissance ? fmt(animal.naissance) : 'Non définie'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Race</span>
                <span className="font-bold">{animal.race && animal.race !== '—' ? displayBreed(animal.race) : 'Non définie'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Sexe</span>
                <span className="font-bold">{animal.sexe}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">
                  {isFemale(animal) ? 'Stérilisée' : 'Castré'}
                </span>
                <span className="font-bold">{animal.sterilise ? 'Oui' : 'Non'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground">Numéro de puce</span>
                <div className="flex-shrink-0">
                  {!animal.puce ? (
                    !isParadis && puceInlineEdit ? (
                      <Input
                        value={puceDraft}
                        onChange={(e) => setPuceDraft(e.target.value.replace(/\D/g, '').slice(0, 15))}
                        maxLength={15}
                        placeholder="15 chiffres"
                        className="w-40"
                        autoFocus
                        onBlur={() => {
                          if (puceDraft.trim()) {
                            updateAnimal(animal.id, { puce: puceDraft.trim() });
                          }
                          setPuceInlineEdit(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (puceDraft.trim()) {
                              updateAnimal(animal.id, { puce: puceDraft.trim() });
                            }
                            setPuceInlineEdit(false);
                          }
                        }}
                      />
                    ) : !isParadis ? (
                      <button
                        onClick={() => {
                          setPuceDraft('');
                          setPuceInlineEdit(true);
                        }}
                        className="font-bold text-primary hover:underline text-sm"
                      >
                        Ajouter le numéro
                      </button>
                    ) : (
                      <span className="font-bold text-muted-foreground">—</span>
                    )
                  ) : (
                    <span className="font-bold">{animal.puce}</span>
                  )}
                </div>
              </div>
              {/* Parents (for newborns linked to a litter) */}
              {motherAnimal && (
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Mère</span>
                  <button onClick={() => navigate(`/profil/${motherAnimal.id}`)} className="font-bold text-primary hover:underline text-sm">
                    {motherAnimal.nom}
                  </button>
                </div>
              )}
              {fatherInfo && (
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Père</span>
                  <span className="font-bold">{fatherInfo.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Soins */}
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <h2 className="font-extrabold mb-3">Soins</h2>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => navigate(`/vaccins/${animal.id}`)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-semibold bg-[hsl(211,100%,95%)] text-[hsl(211,72%,31%)] border border-[hsl(211,72%,31%,0.2)] hover:bg-[hsl(211,100%,90%)] transition-colors dark:bg-[hsl(211,40%,20%)] dark:text-[hsl(211,100%,75%)] dark:border-[hsl(211,40%,30%)]"
              >
                <Syringe className="w-4 h-4" />
                Vaccins
              </button>
              <button
                onClick={() => navigate(`/vermifuge/${animal.id}`)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-semibold bg-[hsl(145,50%,93%)] text-[hsl(145,50%,30%)] border border-[hsl(145,50%,30%,0.2)] hover:bg-[hsl(145,50%,88%)] transition-colors dark:bg-[hsl(145,30%,15%)] dark:text-[hsl(145,60%,65%)] dark:border-[hsl(145,30%,25%)]"
              >
                <Bug className="w-4 h-4" />
                Anti-puce & Vermifuge
              </button>
            </div>
            <Button onClick={() => navigate(`/autres-soins/${animal.id}`)} className="w-full">
              <Pill className="w-4 h-4 mr-2" />
              Autres soins / traitements
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              {actifsAutresSoins.length} soin(s) ou traitement(s) en cours
            </p>
          </div>


          {/* Chaleurs (breeder, female cats/dogs only) - hidden for newborns */}
          {!isParadis && !isNewborn && isFemale(animal) && !animal.sterilise && isBreederEligible(animal.type) && (
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <h2 className="font-extrabold mb-3">Chaleurs</h2>
              {isBreeder ? (
                <Button onClick={() => navigate(`/chaleurs/${animal.id}`)}>
                  <Flame className="w-4 h-4 mr-2" />
                  Gérer les chaleurs
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  <Flame className="w-4 h-4 mr-2" />
                  À venir (pack Éleveur)
                </Button>
              )}
            </div>
          )}

          {/* Reproduction (breeder, female cats/dogs only) - hidden for newborns */}
          {!isParadis && !isNewborn && isFemale(animal) && !animal.sterilise && isBreederEligible(animal.type) && (
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <h2 className="font-extrabold mb-3">Reproduction</h2>
              {isBreeder ? (
                <Button onClick={() => navigate(`/reproduction/${animal.id}`)}>
                  <Baby className="w-4 h-4 mr-2" />
                  Gérer la reproduction
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  <Baby className="w-4 h-4 mr-2" />
                  À venir (pack Éleveur)
                </Button>
              )}
            </div>
          )}

          {/* Reproduction (breeder, male cats/dogs) - hidden for newborns */}
          {!isParadis && !isNewborn && isMale(animal) && isBreederEligible(animal.type) && isBreeder && (
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <h2 className="font-extrabold mb-3">Reproduction</h2>
              {maleMatings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune saillie enregistrée pour ce mâle.</p>
              ) : (
                <div className="space-y-3">
                  {maleMatings.map((m: any) => {
                    const statusLabel = m.status === 'cancelled' ? 'Annulée' : m.status === 'birth_confirmed' ? 'Mise-bas effectuée' : 'En cours';
                    const statusColor = m.status === 'cancelled' ? 'text-muted-foreground' : m.status === 'birth_confirmed' ? 'text-green-600 dark:text-green-400' : 'text-primary';
                    return (
                      <div key={m.id} className={`rounded-lg border border-border p-3 ${m.status === 'cancelled' ? 'opacity-60' : ''}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-sm">Mère : {m.motherName}</p>
                            <p className="text-xs text-muted-foreground">Saillie le {fmt(m.date_saillie)}</p>
                          </div>
                          <span className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
                        </div>
                        {m.litter && (
                          <button
                            onClick={() => navigate(`/portee/${m.litter.id}`)}
                            className="mt-2 text-xs text-primary hover:underline"
                          >
                            Portée du {fmt(m.litter.birth_date)} • {m.litter.newborn_count} petit(s) →
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!isParadis && !isNewborn && isBreeder && isBreederEligible(animal.type) && (
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <h2 className="font-extrabold mb-3">Transfert de profil</h2>
              <Button variant="outline" onClick={() => navigate(`/transfer/${animal.id}`)}>
                <QrCode className="w-4 h-4 mr-2" />
                Transférer ce profil
              </Button>
            </div>
          )}

          {/* Ajouter à Ma famille (newborns only) */}
          {!isParadis && isNewborn && isBreeder && (
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <h2 className="font-extrabold mb-3">Gestion du profil</h2>
              <Button onClick={handlePromoteToFamily} className="w-full">
                Ajouter à Ma famille
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Le nouveau-né sera visible dans « Ma famille » et aura accès aux modules adultes.
              </p>
            </div>
          )}

          {/* RDV */}
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <h2 className="font-extrabold mb-3">Rendez-vous</h2>
            <p className="text-muted-foreground mb-3">
              {rdvsFuturs.length} rendez-vous à venir
            </p>
            <Button onClick={() => navigate(`/consultation/${animal.id}`)}>
              <Calendar className="w-4 h-4 mr-2" />
              Voir les consultations
            </Button>
          </div>

          {/* Poids */}
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <h2 className="font-extrabold mb-3">Suivi du poids</h2>
            <p className="text-sm text-muted-foreground mb-3">
              {(() => {
                if (!animal.poids || animal.poids.length === 0) return 'Poids non renseigné';
                const sorted = [...animal.poids].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const last = sorted[0];
                return `${formatWeight(last.poids)} le ${new Date(last.date).toLocaleDateString('fr-FR')}`;
              })()}
            </p>
            {!isParadis && (
              <Button variant="secondary" onClick={() => navigate(`/poids/${animal.id}`)}>
                Gérer le poids
              </Button>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Edit modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Éditer le profil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nom</Label>
              <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="Nom" className="mt-1.5" />
            </div>

            <div>
              <Label>Type</Label>
              <Input value={typeDraft} onChange={(e) => setTypeDraft(e.target.value)} placeholder="Chat, Chien..." className="mt-1.5" />
            </div>

            <div>
              <Label>Sexe</Label>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setSexDraft('Mâle')} className={`px-4 py-2 rounded-full border-2 font-semibold transition-colors ${sexDraft === 'Mâle' ? 'border-primary bg-accent text-primary' : 'border-border hover:border-primary'}`}>
                  ♂ Mâle
                </button>
                <button onClick={() => setSexDraft('Femelle')} className={`px-4 py-2 rounded-full border-2 font-semibold transition-colors ${sexDraft === 'Femelle' ? 'border-primary bg-accent text-primary' : 'border-border hover:border-primary'}`}>
                  ♀ Femelle
                </button>
              </div>
            </div>

            <div>
              <Label>Race</Label>
              <Input value={raceDraft} onChange={(e) => setRaceDraft(e.target.value)} placeholder="Race (ex: Maine Coon)" className="mt-1.5" />
            </div>

            <div>
              <Label>Date de naissance</Label>
              <div className="mt-1.5">
                <DateField value={birthDraft} onChange={setBirthDraft} maximumDate={new Date()} onValidityChange={setBirthValid} />
              </div>
            </div>

            <div>
              <Label>{sexDraft === 'Femelle' ? 'Stérilisée ?' : 'Castré ?'}</Label>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setSterilDraft(true)} className={`px-4 py-2 rounded-full border-2 font-semibold transition-colors ${sterilDraft ? 'border-primary bg-accent text-primary' : 'border-border hover:border-primary'}`}>
                  Oui
                </button>
                <button onClick={() => setSterilDraft(false)} className={`px-4 py-2 rounded-full border-2 font-semibold transition-colors ${!sterilDraft ? 'border-primary bg-accent text-primary' : 'border-border hover:border-primary'}`}>
                  Non
                </button>
              </div>
            </div>

            <div>
              <Label>Numéro de puce</Label>
              <Input value={puceEditDraft} onChange={(e) => setPuceEditDraft(e.target.value.replace(/\D/g, '').slice(0, 15))} maxLength={15} placeholder="15 chiffres" className="mt-1.5" />
            </div>

            <div>
              <Label>Couleur d'accent</Label>
              <div className="mt-2">
                <ColorPicker value={colorDraft} onChange={setColorDraft} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
              <Button onClick={saveEdit} disabled={!birthValid}>Enregistrer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
