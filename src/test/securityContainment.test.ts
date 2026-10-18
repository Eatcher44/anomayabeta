import { describe, expect, it } from 'vitest';
import { accountDeletionIsEnabled } from '../../supabase/functions/delete-account/securityGate';

describe('emergency media containment', () => {
  it('blocks automatic account deletion until trusted media cleanup is implemented', () => {
    expect(accountDeletionIsEnabled()).toBe(false);
  });
});