import { supabase } from '@/integrations/supabase/client';

export const TRANSFER_CODE_LENGTH = 32;
export function isTransferCode(value: string): boolean {
  return /^[0-9A-F]{32}$/i.test(value.trim());
}

export async function secureTransfer(action: 'create' | 'claim' | 'list', payload: { animal_id?: string; code?: string }) {
  const { data, error } = await supabase.functions.invoke('secure-transfer', { body: { action, ...payload } });
  if (error) {
    let reason = 'operation_failed';
    if ('context' in error && error.context instanceof Response) {
      try { reason = (await error.context.json()).error ?? reason; } catch { /* opaque network failure */ }
    }
    const messages: Record<string, string> = {
      invalid_code: 'Code invalide, expiré ou déjà utilisé.',
      own_code: 'Vous ne pouvez pas réclamer votre propre code.',
      rate_limited: 'Trop de tentatives. Réessayez plus tard.',
      temporarily_suspended: 'Les transferts sont temporairement suspendus pour protéger vos données.',
      operation_busy: 'Une autre opération est en cours. Réessayez.',
      private_notes_require_support: 'Transfert bloqué : ce dossier contient des notes privées. Elles sont conservées sans être communiquées. Contactez support@anomaya.app.',
      linked_records_require_support: 'Transfert bloqué : cet animal est lié à des parents, une portée, une reproduction, des chaleurs ou un rendez-vous. Son historique est conservé. Contactez support@anomaya.app.',
    };
    throw new Error(messages[reason] ?? 'Le transfert a échoué. Réessayez.');
  }
  return data;
}