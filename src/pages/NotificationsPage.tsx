import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useAnimals } from '@/context/AnimalsContext';
import { toast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  animal_id: string | null;
  type: string;
  title: string;
  description: string | null;
  due_date: string;
  days_before: number;
  read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { animaux } = useAnimals();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('due_date', { ascending: true });
      if (error) throw error;
      setNotifications((data as Notification[]) || []);
    } catch {
      console.error('Error fetching notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
    }
  };

  const getAnimalName = (animalId: string | null) => {
    if (!animalId) return '';
    return animaux.find((a) => a.id === animalId)?.nom || '';
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');

  // Filter out notifications for non-active animals (paradis, transferred, deleted)
  const activeAnimalIds = new Set(
    animaux.filter((a) => !a.paradis && a.breeder_visible !== false).map((a) => a.id)
  );
  const activeNotifications = notifications.filter(
    (n) => !n.animal_id || activeAnimalIds.has(n.animal_id)
  );

  const now = new Date();
  const upcoming = activeNotifications.filter((n) => new Date(n.due_date) >= now);
  const past = activeNotifications.filter((n) => new Date(n.due_date) < now);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background">
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-lg">Mes notifications</h1>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : activeNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucune notification</p>
            <p className="text-sm text-muted-foreground mt-1">Les rappels apparaîtront ici</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div>
                <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wide mb-2">À venir</h2>
                <div className="space-y-2">
                  {upcoming.map((n) => {
                    const daysUntil = Math.ceil((new Date(n.due_date).getTime() - now.getTime()) / 86400000);
                    const animalName = getAnimalName(n.animal_id);
                    return (
                      <div key={n.id} className="bg-card rounded-xl p-3 border border-border flex items-start gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{n.title}</p>
                          {n.description && <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(n.due_date)} • {daysUntil === 0 ? "Aujourd'hui" : `Dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`}
                            {animalName && ` • ${animalName}`}
                          </p>
                        </div>
                        <button onClick={() => deleteNotification(n.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wide mb-2">Passées</h2>
                <div className="space-y-2">
                  {past.map((n) => {
                    const animalName = getAnimalName(n.animal_id);
                    return (
                      <div key={n.id} className="bg-card rounded-xl p-3 border border-border opacity-60 flex items-start gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(n.due_date)}{animalName && ` • ${animalName}`}
                          </p>
                        </div>
                        <button onClick={() => deleteNotification(n.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
