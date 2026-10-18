export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export function ownedScreenshotPath(path: string | undefined, legacyUrl: string | undefined, uid: string, baseUrl: string): string | null {
  let candidate = path;
  if (!candidate && legacyUrl) {
    const prefix = `${baseUrl}/storage/v1/object/public/bug-screenshots/`;
    if (!legacyUrl.startsWith(prefix)) return null;
    candidate = legacyUrl.slice(prefix.length);
  }
  if (!candidate || !candidate.startsWith(`${uid}/`) || /[%?#\\]/.test(candidate) || candidate.split('/').some(part => !part || part === '.' || part === '..')) return null;
  return candidate;
}