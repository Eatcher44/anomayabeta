import { describe, expect, it } from 'vitest';
import { escapeHtml, ownedScreenshotPath } from '../../supabase/functions/send-feedback-email/validation';

describe('feedback message safety', () => {
  it('escapes injected HTML and attribute delimiters', () => {
    expect(escapeHtml('<a href="javascript:alert(1)">x & y\'</a>')).toBe('&lt;a href=&quot;javascript:alert(1)&quot;&gt;x &amp; y&#39;&lt;/a&gt;');
  });
  it('rejects foreign screenshot paths and external legacy URLs', () => {
    expect(ownedScreenshotPath('foreign/image.png', undefined, 'owner', 'https://storage.invalid')).toBeNull();
    expect(ownedScreenshotPath(undefined, 'javascript:alert(1)', 'owner', 'https://storage.invalid')).toBeNull();
    expect(ownedScreenshotPath(undefined, 'https://evil.invalid/owner/image.png', 'owner', 'https://storage.invalid')).toBeNull();
  });
  it('preserves canonical owner-scoped legacy screenshot compatibility', () => {
    expect(ownedScreenshotPath(undefined, 'https://storage.invalid/storage/v1/object/public/bug-screenshots/owner/image.png', 'owner', 'https://storage.invalid')).toBe('owner/image.png');
  });
  it('rejects encoded, traversal and query paths', () => {
    for (const path of ['owner/../victim.png', 'owner/%2e%2e/victim.png', 'owner/image.png?x=1', 'owner//image.png']) {
      expect(ownedScreenshotPath(path, undefined, 'owner', 'https://storage.invalid')).toBeNull();
    }
  });
});