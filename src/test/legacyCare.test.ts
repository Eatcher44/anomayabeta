import { describe, it, expect } from 'vitest';
import { parseJsonArray } from '../utils/jsonArray';

describe('legacy care compatibility', () => {
  it('reads the empty string arrays found in all 12 legacy records without rewriting them', () => {
    expect(Array.from({ length: 12 }, () => parseJsonArray('[]'))).toEqual(Array.from({ length: 12 }, () => []));
  });
  it('preserves historical entries when a legacy array has content', () => {
    expect(parseJsonArray('[{"id":"old-care","type":"Vaccin"}]')).toEqual([{ id: 'old-care', type: 'Vaccin' }]);
  });
  it('rejects invalid legacy values without crashing', () => {
    expect(parseJsonArray('{"not":"array"}')).toEqual([]);
    expect(parseJsonArray('broken json')).toEqual([]);
  });
});