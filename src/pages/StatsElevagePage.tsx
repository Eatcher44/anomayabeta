import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Baby, BarChart3, Send, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  totalLitters: number;
  totalNewborns: number;
  totalTransferred: number;
  avgPerLitter: number;
  littersPerYear: { year: number; count: number }[];
}

export default function StatsElevagePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Fetch litters
      const { data: litters } = await supabase
        .from('litters')
        .select('id, birth_date')
        .eq('user_id', user.id);

      // Fetch newborns (animals with a litter_id)
      const { data: newborns } = await supabase
        .from('animals')
        .select('id, litter_id, user_id')
        .eq('user_id', user.id)
        .not('litter_id', 'is', null);

      // Fetch transferred (transfer_codes that have been claimed)
      const { data: transfers } = await supabase
        .from('transfer_codes')
        .select('id')
        .eq('from_user_id', user.id)
        .not('claimed_at', 'is', null);

      const totalLitters = litters?.length || 0;
      const totalNewborns = newborns?.length || 0;
      const totalTransferred = transfers?.length || 0;
      const avgPerLitter = totalLitters > 0 ? Math.round((totalNewborns / totalLitters) * 10) / 10 : 0;

      // Group litters by year
      const yearMap: Record<number, number> = {};
      litters?.forEach((l) => {
        const year = new Date(l.birth_date).getFullYear();
        yearMap[year] = (yearMap[year] || 0) + 1;
      });
      const littersPerYear = Object.entries(yearMap)
        .map(([y, c]) => ({ year: Number(y), count: c }))
        .sort((a, b) => b.year - a.year);

      setStats({ totalLitters, totalNewborns, totalTransferred, avgPerLitter, littersPerYear });
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(33,60%,95%)] to-[hsl(30,40%,92%)] dark:from-background dark:to-background">
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <BarChart3 className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-lg">Statistiques élevage</h1>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : stats && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<Baby className="w-5 h-5 text-primary" />} label="Portées" value={stats.totalLitters} />
              <StatCard icon={<Users className="w-5 h-5 text-primary" />} label="Nouveau-nés" value={stats.totalNewborns} />
              <StatCard icon={<Send className="w-5 h-5 text-primary" />} label="Transférés" value={stats.totalTransferred} />
              <StatCard icon={<TrendingUp className="w-5 h-5 text-primary" />} label="Moy. / portée" value={stats.avgPerLitter} />
            </div>

            {/* Litters per year */}
            {stats.littersPerYear.length > 0 && (
              <Card className="p-4">
                <h2 className="font-extrabold mb-3">Portées par année</h2>
                <div className="space-y-2">
                  {stats.littersPerYear.map((entry) => (
                    <div key={entry.year} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">{entry.year}</span>
                      <div className="flex items-center gap-2 flex-1 ml-4">
                        <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min(100, (entry.count / Math.max(...stats.littersPerYear.map(e => e.count))) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold w-6 text-right">{entry.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-4 flex flex-col items-center text-center gap-2">
      {icon}
      <span className="text-2xl font-extrabold text-foreground">{value}</span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </Card>
  );
}
