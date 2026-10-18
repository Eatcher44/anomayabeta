import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, cleanup, waitFor } from '@testing-library/react';
import { AnimalsProvider, useAnimals } from '@/context/AnimalsContext';
const m = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), single: vi.fn(), maybeSingle: vi.fn(), id: '51f3db7b-8056-498d-9447-b0c738753aa0' }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: m.from } }));
// Use a stable owner so provider effects are stable, too.
const owner = { id: 'owner' };
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: owner }) }));
beforeEach(() => { cleanup(); vi.clearAllMocks();
  const chain: any = { insert: m.insert, select: vi.fn(() => chain), eq: vi.fn(() => chain), order: vi.fn(() => chain), single: m.single, maybeSingle: m.maybeSingle, then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve) };
  m.insert.mockReturnValue(chain);m.from.mockReturnValue(chain);
});
describe('ambiguous animal insert retry', () => {
  it('confirms committed insert by stable ID after lost response, without a second insert', async () => {
    m.single.mockResolvedValue({ data: null, error: new Error('response lost') });
    m.maybeSingle.mockResolvedValue({ data: { id: m.id, nom: 'Milo', type: 'Chat', sexe: 'Femelle', created_at: '2026-10-18' }, error: null });
    const { result } = renderHook(() => useAnimals(), { wrapper: ({ children }) => <AnimalsProvider>{children}</AnimalsProvider> });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.addAnimal({ nom: 'Milo', type: 'Chat', sexe: 'Femelle', poids: [], soins: [], consultations: [], repas: [] }, m.id); });
    expect(m.insert).toHaveBeenCalledTimes(1);
    expect(m.insert.mock.calls[0][0].id).toBe(m.id);
    expect(m.maybeSingle).toHaveBeenCalledTimes(1);
    expect(result.current.animaux.map(a => a.id)).toEqual([m.id]);
  });
});