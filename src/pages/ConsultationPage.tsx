import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnimals } from '@/context/AnimalsContext';

export default function ConsultationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { animaux, rendezvous } = useAnimals();

  const animal = animaux.find((a) => a.id === id);

  const { futurs, passes } = useMemo(() => {
    if (!animal) return { futurs: [], passes: [] };

    const toDate = (r: any) => {
      const d = new Date(r.date);
      if (r.heureHHMM && /^\d{2}:\d{2}$/.test(r.heureHHMM)) {
        const [hh, mm] = r.heureHHMM.split(':').map((n: string) => parseInt(n, 10));
        d.setHours(hh, mm, 0, 0);
      }
      return d;
    };

    const list = (rendezvous || [])
      .filter((r) => Array.isArray(r.animalIds) && r.animalIds.includes(animal.id))
      .map((r) => ({ ...r, _dt: toDate(r) }));

    const now = Date.now();
    const futursList = list.filter((r) => +r._dt >= now).sort((a, b) => +a._dt - +b._dt);
    const passesList = list.filter((r) => +r._dt < now).sort((a, b) => +b._dt - +a._dt);

    return { futurs: futursList, passes: passesList };
  }, [rendezvous, animal?.id]);

  if (!animal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Animal introuvable.</p>
          <Button onClick={() => navigate('/')}>Retour</Button>
        </div>
      </div>
    );
  }

  const isEmpty = futurs.length === 0 && passes.length === 0;

  function RdvCard({ r, isPast }: { r: any; isPast: boolean }) {
    return (
      <div className="bg-muted/50 rounded-xl border border-border p-3 mb-2">
        <div className="flex items-center justify-between">
          <p className="font-bold">
            {r._dt.toLocaleDateString('fr-FR')} {r.heureHHMM ? `• ${r.heureHHMM}` : ''}
          </p>
          <div className={`w-2.5 h-2.5 rounded-full ${isPast ? 'bg-status-red' : 'bg-status-green'}`} />
        </div>
        {r.objet && (
          <p className="text-sm text-muted-foreground mt-1">{r.objet}</p>
        )}
        {r.lieu && (
          <p className="text-sm text-muted-foreground">Lieu : {r.lieu}</p>
        )}
        {Array.isArray(r.animalIds) && r.animalIds.length > 1 && (
          <p className="text-xs text-muted-foreground mt-1">
            {r.animalIds.length} animaux (rendez-vous partagé)
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-lg">Consultations — {animal.nom}</h1>
      </div>

      <div className="p-4 space-y-4">
        {isEmpty ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Aucun rendez-vous pour cet animal.</p>
            <Button onClick={() => navigate('/')}>
              <CalendarPlus className="w-4 h-4 mr-2" />
              Prendre un rendez-vous
            </Button>
          </div>
        ) : (
          <>
            {/* À venir */}
            <div>
              <h2 className="font-bold mb-2">À venir</h2>
              {futurs.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun rendez-vous à venir.</p>
              ) : (
                futurs.map((r) => <RdvCard key={r.id} r={r} isPast={false} />)
              )}
            </div>

            {/* Historique */}
            <div>
              <h2 className="font-bold mb-2">Historique</h2>
              {passes.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun rendez-vous passé.</p>
              ) : (
                passes.map((r) => <RdvCard key={r.id} r={r} isPast={true} />)
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
