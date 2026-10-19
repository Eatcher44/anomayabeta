import { supabase } from '@/integrations/supabase/client';

export const TRANSFER_CODE_LENGTH = 32;
export function isTransferCode(value: string): boolean {
  return /^[0-9A-F]{32}$/i.test(value.trim());
}

export interface TransferReview {
  approval: string;
  shared: { soins: number; consultations: number; poids: number; repas: number };
  private: { noms_soins: number; produits: number; veterinaires: number; motifs: number; particularite: boolean; contact_acheteur: boolean; notes_commerciales: boolean };
  blocked: string | null;
}

export const TRANSFER_MESSAGES: Record<string, string> = {
  invalid_code: 'Code invalide, expiré ou déjà utilisé.',
  own_code: 'Vous ne pouvez pas réclamer votre propre code.',
  rate_limited: 'Trop de tentatives. Réessayez plus tard.',
  temporarily_suspended: 'Les transferts sont temporairement suspendus pour protéger vos données.',
  operation_busy: 'Une autre opération est en cours. Réessayez.',
  review_required: 'Le dossier a changé depuis votre relecture. Relisez les informations transmises avant de continuer.',
  private_notes_require_support: 'Transfert bloqué : ce dossier contient des notes privées. Elles sont conservées sans être communiquées. Contactez support@anomaya.app.',
  linked_records_require_support: 'Transfert bloqué : cet animal est lié à des parents, une portée, une reproduction, des chaleurs ou un rendez-vous. Son historique est conservé. Contactez support@anomaya.app.',
};

export async function secureTransfer(action: 'preview' | 'create' | 'claim' | 'list', payload: { animal_id?: string; code?: string; approval?: string }) {
  const { data, error } = await supabase.functions.invoke('secure-transfer', { body: { action, ...payload } });
  if (error) {
    let reason = 'operation_failed';
    if ('context' in error && error.context instanceof Response) {
      try { reason = (await error.context.json()).error ?? reason; } catch { /* opaque network failure */ }
    }
    throw new Error(TRANSFER_MESSAGES[reason] ?? 'Le transfert a échoué. Réessayez.');
  }
  return data;
}
