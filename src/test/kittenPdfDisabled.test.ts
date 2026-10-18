import { describe, expect, it, vi } from 'vitest';
import { KITTEN_PDF_EXPORT_ENABLED } from '../config/breederFeatures';
import { computeDepartureChecklist } from '../utils/departureChecklist';
import { generateCarnetDepart } from '../utils/carnetDepart';
import type { Animal } from '../types/animal';
vi.mock('../utils/privateDocuments', () => ({ privateDocumentUrl: vi.fn() }));

const animal: Animal = { id: 'fixture', nom: 'Chaton', type: 'Chat', sexe: 'Mâle', poids: [], soins: [], consultations: [], repas: [] };
describe('temporarily disabled kitten PDF export', () => {
  it('keeps the specific export disabled', () => {
    expect(KITTEN_PDF_EXPORT_ENABLED).toBe(false);
  });
  it('refuses direct generation', async () => {
    await expect(generateCarnetDepart({ animal })).rejects.toThrow();
  });
  it('does not require a PDF to complete the departure checklist', () => {
    const items = computeDepartureChecklist(animal);
    expect(items.map(item => item.key)).toEqual(['chip', 'vaccines', 'deworm', 'weight', 'photo', 'transfer_ready']);
  });
});