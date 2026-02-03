import React, { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatFrDate, parseFrDate } from '@/utils/date';

interface DateFieldProps {
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
  title?: string;
  placeholder?: string;
  onValidityChange?: (valid: boolean) => void;
}

export default function DateField({
  value,
  onChange,
  maximumDate = new Date(),
  title,
  placeholder = 'JJ/MM/AAAA',
  onValidityChange,
}: DateFieldProps) {
  const [typed, setTyped] = useState(
    value instanceof Date && !isNaN(+value) ? formatFrDate(value) : ''
  );
  const [error, setError] = useState('');

  // Sync quand la valeur externe change
  useEffect(() => {
    if (value instanceof Date && !isNaN(+value)) {
      const txt = formatFrDate(value);
      setTyped(txt);
      validate(txt);
    }
  }, [value]);

  // Masque "JJ/MM/AAAA" pendant la frappe
  const maskAndTrim = useCallback((raw: string) => {
    const digits = (raw || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  }, []);

  // Validation + émission de validité
  const validate = useCallback(
    (txt: string) => {
      if (!txt || txt.length < 10) {
        setError('Format attendu : JJ/MM/AAAA');
        onValidityChange?.(false);
        return null;
      }
      const d = parseFrDate(txt);
      if (!d) {
        setError('Date invalide (ex: 05/09/2024)');
        onValidityChange?.(false);
        return null;
      }
      const max = maximumDate || new Date();
      if (d > max) {
        setError('La date ne peut pas être dans le futur');
        onValidityChange?.(false);
        return null;
      }
      setError('');
      onValidityChange?.(true);
      return d;
    },
    [maximumDate, onValidityChange]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const txt = e.target.value;
      const masked = maskAndTrim(txt);
      setTyped(masked);
      const d = validate(masked);
      if (d) onChange?.(d);
    },
    [maskAndTrim, validate, onChange]
  );

  const onBlur = useCallback(() => {
    const d = validate(typed);
    if (d) onChange?.(d);
  }, [typed, validate, onChange]);

  return (
    <div className="w-full">
      {title && <Label className="mb-1.5 block">{title}</Label>}
      <Input
        value={typed}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        maxLength={10}
        className={error ? 'border-destructive' : ''}
      />
      {error && (
        <p className="mt-1.5 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
