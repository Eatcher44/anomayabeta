import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
// Unmounted legacy component (its table does not exist); must stay unreferenced.
const DEAD = 'components/elevage/DocumentsSection.tsx';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === 'test' || n === 'integrations' ? [] : files(p);
    return /\.(tsx?|jsx?)$/.test(n) ? [p] : [];
  });
}

describe('secure-upload exclusivity', () => {
  const all = files(ROOT);
  const rel = (p: string) => p.slice(ROOT.length + 1).replace(/\\/g, '/');

  it('no active source writes to Storage directly', () => {
    const offenders = all
      .filter((p) => rel(p) !== DEAD)
      .filter((p) => /storage\s*\.from\([^)]*\)\s*\.(upload|update|remove|move|copy)\(/s.test(readFileSync(p, 'utf8')));
    expect(offenders.map(rel)).toEqual([]);
  });

  it('the legacy direct-upload component is not imported anywhere', () => {
    const importers = all.filter((p) => rel(p) !== DEAD && readFileSync(p, 'utf8').includes('DocumentsSection'));
    expect(importers.map(rel)).toEqual([]);
  });

  it('no app-shell service worker is registered', () => {
    const regs = all.filter((p) => /serviceWorker\.register|virtual:pwa-register/.test(readFileSync(p, 'utf8')));
    expect(regs.map(rel)).toEqual([]);
  });
});
