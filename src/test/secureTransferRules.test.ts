import { describe, expect, it } from 'vitest';
import { isTransferCode, TRANSFER_CODE_LENGTH } from '../utils/secureTransfer';

describe('secure transfer code validation', () => {
  it('accepts the 32 hexadecimal characters used by 128-bit server codes', () => {
    expect(TRANSFER_CODE_LENGTH).toBe(32);
    expect(isTransferCode('0123456789ABCDEF0123456789ABCDEF')).toBe(true);
  });
  it('rejects the legacy eight-character code', () => {
    expect(isTransferCode('ABC12345')).toBe(false);
  });
  it('rejects non-hexadecimal characters', () => {
    expect(isTransferCode('G'.repeat(32))).toBe(false);
  });
});