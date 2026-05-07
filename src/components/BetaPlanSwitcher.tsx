import React from 'react';
import { FlaskConical, Database } from 'lucide-react';
import { isBeta, isDev } from '@/config/appVariant';
import { useUserPlan, setUserPlan, getPlanLabel, type UserPlan } from '@/utils/userPlan';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const PLANS: UserPlan[] = ['free', 'no_ads', 'breeder'];

/** Beta-only plan simulator. Switches access without payments and without deleting data. */
export default function BetaPlanSwitcher() {
  const plan = useUserPlan();
  if (!isBeta && !isDev) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
        <FlaskConical className="w-3.5 h-3.5" />
        Tester les accès d'abonnement
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Pendant la bêta, vous pouvez simuler les différents accès pour
        vérifier que vos données restent bien conservées.
      </p>

      <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/50 p-1">
        {PLANS.map((p) => {
          const active = plan === p;
          return (
            <button
              key={p}
              onClick={() => {
                setUserPlan(p);
                toast({ title: `🧪 Plan simulé : ${getPlanLabel(p)}` });
              }}
              className={cn(
                'py-2 px-1 rounded-lg text-[11px] font-semibold transition-all',
                active
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {getPlanLabel(p)}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80 pt-1">
        <Database className="w-3 h-3" />
        Vos données d'élevage sont conservées dans tous les cas.
      </div>
    </div>
  );
}
