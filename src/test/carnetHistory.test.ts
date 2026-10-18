import { describe, expect, it, vi } from 'vitest';
import { generateCarnetDepart } from '../utils/carnetDepart';
import type { Animal } from '../types/animal';
vi.mock('../utils/privateDocuments', () => ({ privateDocumentUrl: vi.fn() }));
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockRejectedValue(new Error('No bitmap in unit test')) } }));

const fixture: Animal = { id: 'disposable', nom: 'Fixture', type: 'Chat', sexe: 'Mâle', poids: [], soins: [], consultations: [], repas: [] };
describe('carnet historical data preservation', () => {
  it('generates the six base pages for a small record', async () => {
    expect((await generateCarnetDepart({ animal: fixture })).getNumberOfPages()).toBe(6);
  });
  it('adds pages rather than silently dropping a large weight history', async () => {
    const doc = await generateCarnetDepart({ animal: { ...fixture, poids: Array.from({ length: 100 }, (_, i) => ({ id: String(i), date: '2026-01-01', poids: i + 100 })) } });
    expect(doc.getNumberOfPages()).toBeGreaterThan(6);
    expect(doc.output()).toContain('199 g');
    expect(doc.output()).toContain(`${doc.getNumberOfPages()} / ${doc.getNumberOfPages()}`);
  });
  it('preserves long observations on extra pages', async () => {
    const doc = await generateCarnetDepart({ animal: { ...fixture, commercial_notes: 'Historical observation. '.repeat(500) + 'FINAL_HISTORY_MARKER' } });
    expect(doc.getNumberOfPages()).toBeGreaterThan(6);
    expect(doc.output()).toContain('FINAL_HISTORY_MARKER');
  });
});