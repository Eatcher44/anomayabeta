import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Animal } from '@/types/animal';

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'En attente', color: 'bg-[hsl(var(--status-orange))]/15 text-[hsl(var(--status-orange))]' },
  { value: 'deposit_paid', label: 'Acompte versé', color: 'bg-primary/15 text-primary' },
  { value: 'fully_paid', label: 'Payé intégralement', color: 'bg-[hsl(var(--status-green))]/15 text-[hsl(var(--status-green))]' },
];

interface Props {
  animal: Animal;
  onUpdate: (patch: Partial<Animal>) => void;
}

export default function FinancialSection({ animal, onUpdate }: Props) {
  const [salePrice, setSalePrice] = useState(String((animal as any).sale_price || ''));
  const [depositAmount, setDepositAmount] = useState(String((animal as any).deposit_amount || ''));
  const [paymentStatus, setPaymentStatus] = useState((animal as any).payment_status || 'pending');
  const [dirty, setDirty] = useState(false);

  const salePriceNum = parseFloat(salePrice) || 0;
  const depositNum = parseFloat(depositAmount) || 0;
  const remaining = Math.max(0, salePriceNum - depositNum);

  const statusCfg = PAYMENT_STATUSES.find(s => s.value === paymentStatus) || PAYMENT_STATUSES[0];

  const handleSave = async () => {
    try {
      const { error } = await supabase.from('animals').update({
        sale_price: salePriceNum || null,
        deposit_amount: depositNum || null,
        payment_status: paymentStatus,
      } as any).eq('id', animal.id);
      if (error) throw error;
      onUpdate({ sale_price: salePriceNum, deposit_amount: depositNum, payment_status: paymentStatus } as any);
      setDirty(false);
      toast({ title: 'Finances enregistrées' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const markDirty = () => { if (!dirty) setDirty(true); };

  return (
    <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-4 h-4 text-primary" />
        <h2 className="font-extrabold">Finances</h2>
        <Badge variant="outline" className={`ml-auto text-[10px] ${statusCfg.color}`}>
          {statusCfg.label}
        </Badge>
      </div>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Prix de vente (€)</Label>
          <Input type="number" min={0} step={0.01} value={salePrice} onChange={(e) => { setSalePrice(e.target.value); markDirty(); }} placeholder="0.00" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Acompte reçu (€)</Label>
          <Input type="number" min={0} step={0.01} value={depositAmount} onChange={(e) => { setDepositAmount(e.target.value); markDirty(); }} placeholder="0.00" className="mt-1" />
        </div>
        <div className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">Solde restant</span>
          <span className="font-extrabold text-foreground">{remaining.toFixed(2)} €</span>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Statut de paiement</Label>
          <Select value={paymentStatus} onValueChange={(v) => { setPaymentStatus(v); markDirty(); }}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_STATUSES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dirty && (
          <Button onClick={handleSave} className="w-full">Enregistrer</Button>
        )}
      </div>
    </div>
  );
}

export function computeLitterFinancials(newborns: Animal[]) {
  let totalExpected = 0;
  let totalReceived = 0;
  newborns.forEach(nb => {
    const price = (nb as any).sale_price || 0;
    const deposit = (nb as any).deposit_amount || 0;
    totalExpected += price;
    totalReceived += deposit;
  });
  return {
    totalExpected,
    totalReceived,
    totalOutstanding: totalExpected - totalReceived,
  };
}