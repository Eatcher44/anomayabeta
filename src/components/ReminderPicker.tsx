import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const PRESET_OPTIONS = [
  { days: 30, label: '30 jours avant' },
  { days: 14, label: '14 jours avant' },
  { days: 7, label: '7 jours avant' },
  { days: 3, label: '3 jours avant' },
  { days: 1, label: '1 jour avant' },
];

interface ReminderPickerProps {
  className?: string;
}

export function useReminderPicker() {
  const [selectedDays, setSelectedDays] = useState<number[]>([7]);
  const [customDays, setCustomDays] = useState('');

  const toggleDay = (d: number) => {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const addCustom = () => {
    const val = parseInt(customDays, 10);
    if (val > 0 && !selectedDays.includes(val)) {
      setSelectedDays((prev) => [...prev, val].sort((a, b) => b - a));
      setCustomDays('');
    }
  };

  const reset = () => {
    setSelectedDays([7]);
    setCustomDays('');
  };

  return { selectedDays, customDays, setCustomDays, toggleDay, addCustom, reset };
}

interface ReminderPickerUIProps {
  selectedDays: number[];
  customDays: string;
  setCustomDays: (v: string) => void;
  toggleDay: (d: number) => void;
  addCustom: () => void;
}

export function ReminderPickerUI({ selectedDays, customDays, setCustomDays, toggleDay, addCustom }: ReminderPickerUIProps) {
  return (
    <div>
      <Label className="flex items-center gap-1.5 mb-2">
        <Bell className="w-3.5 h-3.5" />
        Rappels
      </Label>
      <div className="flex flex-wrap gap-2">
        {PRESET_OPTIONS.map((opt) => {
          const active = selectedDays.includes(opt.days);
          return (
            <button
              key={opt.days}
              type="button"
              onClick={() => toggleDay(opt.days)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                active
                  ? 'border-primary bg-accent text-primary'
                  : 'border-border hover:border-primary text-muted-foreground'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 mt-2">
        <Input
          value={customDays}
          onChange={(e) => setCustomDays(e.target.value.replace(/\D/g, '').slice(0, 3))}
          placeholder="Autre (jours)"
          className="flex-1 text-sm"
          inputMode="numeric"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customDays || parseInt(customDays, 10) <= 0}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-primary text-primary hover:bg-accent disabled:opacity-40 transition-colors"
        >
          Ajouter
        </button>
      </div>
      {selectedDays.filter((d) => !PRESET_OPTIONS.some((p) => p.days === d)).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedDays
            .filter((d) => !PRESET_OPTIONS.some((p) => p.days === d))
            .map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1 px-2 py-1 bg-accent rounded-full text-xs font-semibold text-primary"
              >
                {d} jours
                <button type="button" onClick={() => toggleDay(d)} className="text-muted-foreground hover:text-destructive">×</button>
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

export async function createReminders({
  userId,
  animalId,
  type,
  title,
  eventDate,
  selectedDays,
}: {
  userId: string;
  animalId: string;
  type: string;
  title: string;
  eventDate: Date;
  selectedDays: number[];
}) {
  // First delete existing reminders for this soin/type/animal
  await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('animal_id', animalId)
    .eq('type', type);

  const notifications = selectedDays.map((days) => {
    const dueDate = new Date(eventDate);
    dueDate.setDate(dueDate.getDate() - days);
    return {
      user_id: userId,
      animal_id: animalId,
      type,
      title,
      description: `Rappel ${days} jour${days > 1 ? 's' : ''} avant`,
      due_date: dueDate.toISOString(),
      days_before: days,
    };
  });

  if (notifications.length > 0) {
    const { error } = await supabase.from('notifications').insert(notifications);
    if (error) console.error('Error creating reminders:', error);
  }
}
