import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { Animal, WeightEntry, SoinEntry } from '@/types/animal';
import { displayBreed } from '@/utils/breeds';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 25;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const COL_W = CONTENT_W / 2 - 5;

// ─── Clinical color palette ──────────────────────────────────
const C = {
  black: [20, 20, 20] as [number, number, number],
  dark: [50, 50, 55] as [number, number, number],
  medium: [110, 110, 115] as [number, number, number],
  light: [160, 160, 165] as [number, number, number],
  rule: [200, 200, 205] as [number, number, number],
  rowAlt: [246, 247, 250] as [number, number, number],
  accent: [40, 80, 140] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

function setC(doc: jsPDF, c: [number, number, number]) { doc.setTextColor(...c); }

// ─── Sanitize strings ────────────────────────────────────────
function sanitize(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/[\u0000-\u001F\u007F-\u009F]+/g, '')  // control chars
    .replace(/&[A-Z]/g, '')                           // stray jsPDF formatting tokens like &B
    .normalize('NFC')
    .trim();
}

// ─── Footer ──────────────────────────────────────────────────
function footer(doc: jsPDF, page: number, total: number) {
  const y = PAGE_H - 10;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  setC(doc, C.light);
  doc.text('Carnet généré par Anomaya', MARGIN, y);
  doc.text(`${page} / ${total}`, PAGE_W - MARGIN, y, { align: 'right' });
  // Legal disclaimer
  doc.setFontSize(5.5);
  setC(doc, C.light);
  doc.text(
    "Document informatif de suivi établi par l'éleveur \u2013 Ne remplace pas un carnet de santé vétérinaire.",
    PAGE_W / 2, y + 4, { align: 'center' }
  );
}

// ─── Separator ───────────────────────────────────────────────
function rule(doc: jsPDF, y: number) {
  doc.setDrawColor(...C.rule);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

// ─── Section title ───────────────────────────────────────────
function section(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  setC(doc, C.accent);
  doc.text(sanitize(title), MARGIN, y);
  rule(doc, y + 3);
  return y + 12;
}

// ─── Label → Value pair ──────────────────────────────────────
function lv(doc: jsPDF, label: string, value: string, x: number, y: number): number {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setC(doc, C.medium);
  doc.text(sanitize(label), x, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  setC(doc, C.black);
  doc.text(sanitize(value) || '\u2014', x, y + 4.5);
  return y + 13;
}

// ─── Date formatters ─────────────────────────────────────────
function fmtLong(iso?: string | null): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtShort(iso?: string | null): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleDateString('fr-FR');
}

function fmtWeight(g: number): string {
  return g < 1000 ? `${Math.round(g)} g` : `${(g / 1000).toFixed(2)} kg`;
}

function sexLabel(s: string) {
  const norm = sanitize(s).toLowerCase();
  if (norm.startsWith('f')) return 'Femelle';
  if (norm.startsWith('m')) return 'Mâle';
  return sanitize(s);
}

function birthLine(sexe: string, dateIso?: string | null): string {
  const norm = sanitize(sexe).toLowerCase();
  const d = fmtLong(dateIso);
  if (norm.startsWith('f')) return `Née le ${d}`;
  if (norm.startsWith('m')) return `Né le ${d}`;
  return `Né(e) le ${d}`;
}

function statusLabel(s?: string) {
  return ({ sold: 'Vendu', kept: 'Gardé', reserved: 'Réservé', option: 'Option', available: 'Disponible' } as Record<string, string>)[s || ''] || '\u2014';
}

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image(); i.crossOrigin = 'anonymous';
    i.onload = () => res(i); i.onerror = rej; i.src = url;
  });
}

// ─── Weight chart (vector) ───────────────────────────────────
function weightChart(doc: jsPDF, weights: WeightEntry[], x: number, y: number, w: number, h: number) {
  if (weights.length < 2) return;
  const vals = weights.map(e => e.poids);
  const minV = Math.min(...vals) * 0.9;
  const maxV = Math.max(...vals) * 1.1;
  const range = maxV - minV || 1;
  const padL = 14, padB = 10;
  const cw = w - padL, ch = h - padB;

  doc.setDrawColor(...C.rule);
  doc.setLineWidth(0.12);
  for (let i = 0; i <= 4; i++) {
    const gy = y + ch - (ch * i) / 4;
    doc.line(x + padL, gy, x + w, gy);
    doc.setFontSize(5.5); setC(doc, C.light); doc.setFont('helvetica', 'normal');
    doc.text(fmtWeight(minV + (range * i) / 4), x, gy + 1);
  }

  doc.setDrawColor(...C.dark);
  doc.setLineWidth(0.5);
  const pts: [number, number][] = weights.map((e, i) => [
    x + padL + (cw * i) / (weights.length - 1),
    y + ch - ((e.poids - minV) / range) * ch,
  ]);
  for (let i = 1; i < pts.length; i++) doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);

  doc.setFillColor(...C.dark);
  for (const p of pts) doc.circle(p[0], p[1], 0.7, 'F');

  doc.setFontSize(5); setC(doc, C.light);
  const step = Math.max(1, Math.floor(weights.length / 6));
  weights.forEach((e, i) => {
    if (i % step === 0 || i === weights.length - 1)
      doc.text(fmtShort(e.date), pts[i][0], y + ch + 7, { align: 'center' });
  });
}

// ─── QR ──────────────────────────────────────────────────────
async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { width: 400, margin: 1, color: { dark: '#141414', light: '#ffffff' } });
}

// ─── Public types ────────────────────────────────────────────
export interface BreederProfileData {
  nom_elevage?: string;
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  siret?: string;
  logo_url?: string | null;
  signature_url?: string | null;
}

export interface CarnetDepartData {
  animal: Animal;
  motherName?: string;
  fatherName?: string;
  breederProfile?: BreederProfileData;
  transferCode?: string;
}

// ═════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═════════════════════════════════════════════════════════════
export async function generateCarnetDepart(data: CarnetDepartData): Promise<jsPDF> {
  const { animal, motherName, fatherName, breederProfile, transferCode } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const totalPages = 6;
  const race = animal.race ? displayBreed(animal.race) : '';
  const genDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const bp = breederProfile || {};
  const breederFullName = [bp.prenom, bp.nom].filter(Boolean).join(' ');
  const breederDisplayName = breederFullName || 'Informations non renseignées';

  // ── PAGE 1 — PAGE DE GARDE ─────────────────────────────────
  // Optional logo top-right
  if (bp.logo_url) {
    try {
      const logo = await loadImg(bp.logo_url);
      const maxS = 20;
      const ratio = Math.min(maxS / logo.width, maxS / logo.height);
      doc.addImage(logo, 'PNG', PAGE_W - MARGIN - logo.width * ratio, MARGIN, logo.width * ratio, logo.height * ratio);
    } catch { /* skip logo */ }
  }

  let cy = 80;
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  setC(doc, C.black);
  doc.text('Carnet de départ', PAGE_W / 2, cy, { align: 'center' });
  cy += 4;
  rule(doc, cy);
  cy += 18;

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  setC(doc, C.black);
  doc.text(sanitize(animal.nom), PAGE_W / 2, cy, { align: 'center' });
  cy += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  setC(doc, C.dark);
  if (race) { doc.text(sanitize(race), PAGE_W / 2, cy, { align: 'center' }); cy += 7; }
  doc.text(birthLine(animal.sexe, animal.naissance), PAGE_W / 2, cy, { align: 'center' }); cy += 7;
  doc.text(sexLabel(animal.sexe), PAGE_W / 2, cy, { align: 'center' }); cy += 25;

  // Photo
  if (animal.photo) {
    try {
      const img = await loadImg(animal.photo);
      const maxS = 55;
      const ratio = Math.min(maxS / img.width, maxS / img.height);
      const w = img.width * ratio, h = img.height * ratio;
      doc.addImage(img, 'JPEG', (PAGE_W - w) / 2, cy, w, h);
      doc.setDrawColor(...C.rule); doc.setLineWidth(0.3); doc.rect((PAGE_W - w) / 2, cy, w, h);
      cy += h + 20;
    } catch { cy += 10; }
  }

  // Breeder info bottom
  rule(doc, cy); cy += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setC(doc, C.dark);
  if (bp.nom_elevage) { doc.text(sanitize(bp.nom_elevage), PAGE_W / 2, cy, { align: 'center' }); cy += 6; }
  if (breederFullName) { doc.text(`Éleveur : ${sanitize(breederFullName)}`, PAGE_W / 2, cy, { align: 'center' }); cy += 6; }
  if (bp.email) { doc.text(sanitize(bp.email), PAGE_W / 2, cy, { align: 'center' }); cy += 6; }
  if (!breederFullName && !bp.nom_elevage) {
    doc.text('Éleveur : informations non renseignées', PAGE_W / 2, cy, { align: 'center' }); cy += 6;
  }
  doc.setFontSize(8); setC(doc, C.light);
  doc.text(`Document généré le ${genDate}`, PAGE_W / 2, cy + 4, { align: 'center' });

  footer(doc, 1, totalPages);

  // ── PAGE 2 — IDENTITÉ ──────────────────────────────────────
  doc.addPage();
  let y = 30;
  y = section(doc, "Informations d'identité", y);

  const lx = MARGIN, rx = MARGIN + COL_W + 10;
  let yL = y, yR = y;
  yL = lv(doc, 'Nom', animal.nom, lx, yL);
  yL = lv(doc, 'Sexe', sexLabel(animal.sexe), lx, yL);
  yL = lv(doc, 'Race', race || '\u2014', lx, yL);
  yL = lv(doc, 'Date de naissance', fmtLong(animal.naissance), lx, yL);
  yL = lv(doc, 'Numéro de puce', animal.puce || '\u2014', lx, yL);

  yR = lv(doc, 'Mère', motherName || '\u2014', rx, yR);
  yR = lv(doc, 'Père', fatherName || '\u2014', rx, yR);
  yR = lv(doc, 'Éleveur', breederDisplayName, rx, yR);
  yR = lv(doc, 'Téléphone', bp.telephone || '\u2014', rx, yR);
  yR = lv(doc, 'Email', bp.email || '\u2014', rx, yR);
  yR = lv(doc, 'Statut', statusLabel(animal.commercial_status || undefined), rx, yR);

  y = Math.max(yL, yR) + 6;

  if (animal.buyer_name) {
    rule(doc, y); y += 10;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); setC(doc, C.accent);
    doc.text('Nouveau propriétaire', MARGIN, y); y += 10;
    yL = y; yR = y;
    yL = lv(doc, 'Nom', animal.buyer_name, lx, yL);
    if (animal.buyer_phone) yL = lv(doc, 'Téléphone', animal.buyer_phone, lx, yL);
    if (animal.buyer_email) yR = lv(doc, 'Email', animal.buyer_email, rx, yR);
    if (animal.planned_departure_date) yR = lv(doc, 'Date de départ', fmtLong(animal.planned_departure_date), rx, yR);
  }

  footer(doc, 2, totalPages);

  // ── PAGE 3 — SUIVI DE CROISSANCE ──────────────────────────
  doc.addPage();
  y = 30;
  y = section(doc, 'Suivi du poids', y);

  const weights = [...(animal.poids || [])].sort((a, b) => +new Date(a.date) - +new Date(b.date));

  if (!weights.length) {
    doc.setFontSize(10); doc.setFont('helvetica', 'italic'); setC(doc, C.light);
    doc.text('Aucune mesure enregistrée.', MARGIN, y);
  } else {
    doc.setFillColor(...C.rowAlt);
    doc.rect(MARGIN, y - 4.5, CONTENT_W, 8, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); setC(doc, C.dark);
    doc.text('Date', MARGIN + 4, y); doc.text('Poids', MARGIN + CONTENT_W / 2, y);
    y += 7;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    weights.forEach((w, i) => {
      if (y > PAGE_H - 80) { doc.addPage(); y = 30; }
      if (i % 2 === 0) { doc.setFillColor(252, 252, 254); doc.rect(MARGIN, y - 3.5, CONTENT_W, 6.5, 'F'); }
      setC(doc, C.black);
      doc.text(fmtShort(w.date), MARGIN + 4, y);
      doc.text(fmtWeight(w.poids), MARGIN + CONTENT_W / 2, y);
      y += 6.5;
    });

    if (weights.length >= 2) {
      y += 6; rule(doc, y); y += 8;
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); setC(doc, C.dark);
      doc.text('Courbe de croissance', MARGIN, y); y += 6;
      const ch = Math.min(50, PAGE_H - y - 30);
      weightChart(doc, weights, MARGIN, y, CONTENT_W, ch);
    }
  }

  footer(doc, 3, totalPages);

  // ── PAGE 4 — VACCINS & SOINS ──────────────────────────────
  doc.addPage();
  y = 30;
  y = section(doc, 'Vaccins et soins', y);

  const soins = animal.soins || [];
  const vaccins = soins.filter(s => s.type === 'Vaccin' || s.type === 'vaccin');
  const traits = soins.filter(s => s.type !== 'Vaccin' && s.type !== 'vaccin');

  if (!vaccins.length && !traits.length) {
    doc.setFontSize(10); doc.setFont('helvetica', 'italic'); setC(doc, C.light);
    doc.text('Aucun vaccin ou traitement enregistré.', MARGIN, y);
  } else {
    if (vaccins.length) {
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); setC(doc, C.dark);
      doc.text('Vaccins', MARGIN, y); y += 7;

      doc.setFillColor(...C.rowAlt);
      doc.rect(MARGIN, y - 4.5, CONTENT_W, 8, 'F');
      doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); setC(doc, C.dark);
      doc.text('Nom', MARGIN + 4, y);
      doc.text('Date', MARGIN + 55, y);
      doc.text('Rappel prévu', MARGIN + 95, y);
      doc.text('Catégorie', MARGIN + 138, y);
      y += 7;

      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      for (const v of vaccins) {
        if (y > PAGE_H - 30) { doc.addPage(); y = 30; }
        setC(doc, C.black);
        doc.text(sanitize(v.nom || v.produit || '\u2014').substring(0, 25), MARGIN + 4, y);
        doc.text(fmtShort(v.date), MARGIN + 55, y);
        doc.text(v.prochain ? fmtShort(v.prochain) : '\u2014', MARGIN + 95, y);
        doc.text(v.obligatoire ? 'Obligatoire' : 'Recommandé', MARGIN + 138, y);
        y += 6.5;
      }
      y += 6;
    }

    if (traits.length) {
      if (y > PAGE_H - 50) { doc.addPage(); y = 30; }
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); setC(doc, C.dark);
      doc.text('Traitements', MARGIN, y); y += 7;

      doc.setFillColor(...C.rowAlt);
      doc.rect(MARGIN, y - 4.5, CONTENT_W, 8, 'F');
      doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); setC(doc, C.dark);
      doc.text('Type', MARGIN + 4, y);
      doc.text('Produit', MARGIN + 40, y);
      doc.text('Date', MARGIN + 95, y);
      doc.text('Notes', MARGIN + 135, y);
      y += 7;

      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); setC(doc, C.black);
      for (const t of traits) {
        if (y > PAGE_H - 30) { doc.addPage(); y = 30; }
        doc.text(sanitize(t.type || '\u2014').substring(0, 18), MARGIN + 4, y);
        doc.text(sanitize(t.produit || t.nom || '\u2014').substring(0, 25), MARGIN + 40, y);
        doc.text(fmtShort(t.date || t.debut), MARGIN + 95, y);
        doc.text(sanitize(t.notes || '').substring(0, 18), MARGIN + 135, y);
        y += 6.5;
      }
    }
  }

  footer(doc, 4, totalPages);

  // ── PAGE 5 — OBSERVATIONS ─────────────────────────────────
  doc.addPage();
  y = 30;
  y = section(doc, 'Observations', y);

  const notes = sanitize(animal.commercial_notes);
  if (notes) {
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); setC(doc, C.black);
    const lines = doc.splitTextToSize(notes, CONTENT_W);
    doc.text(lines, MARGIN, y); y += lines.length * 5 + 10;
  } else {
    doc.setFontSize(10); doc.setFont('helvetica', 'italic'); setC(doc, C.light);
    doc.text('Aucune observation saisie.', MARGIN, y); y += 10;
  }

  rule(doc, y); y += 10;
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); setC(doc, C.accent);
  doc.text('Recommandations', MARGIN, y); y += 8;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); setC(doc, C.dark);
  const recs = [
    "\u2022 Visite vétérinaire recommandée dans les 15 jours suivant l'adoption.",
    '\u2022 Respecter le calendrier de rappels vaccinaux indiqué.',
    "\u2022 Maintenir une alimentation adaptée à l'âge et à la race.",
    "\u2022 Prévoir une période d'adaptation dans un environnement calme.",
  ];
  for (const r of recs) { doc.text(r, MARGIN, y); y += 6; }

  // Signature area
  y += 10; rule(doc, y); y += 8;
  doc.setFontSize(8); setC(doc, C.light); doc.setFont('helvetica', 'italic');
  doc.text("Signature de l'éleveur :", MARGIN, y); y += 4;

  if (bp.signature_url) {
    try {
      const sig = await loadImg(bp.signature_url);
      const maxW = 50, maxH = 20;
      const ratio = Math.min(maxW / sig.width, maxH / sig.height);
      doc.addImage(sig, 'PNG', MARGIN, y, sig.width * ratio, sig.height * ratio);
      y += sig.height * ratio + 4;
    } catch { /* skip */ }
  }

  // Ruled lines for notes
  y += 6;
  doc.setFontSize(8); setC(doc, C.light); doc.setFont('helvetica', 'italic');
  doc.text('Notes complémentaires :', MARGIN, y); y += 4;
  doc.setDrawColor(...C.rule); doc.setLineWidth(0.15);
  for (let i = 0; i < 8; i++) { y += 7; doc.line(MARGIN, y, PAGE_W - MARGIN, y); }

  footer(doc, 5, totalPages);

  // ── PAGE 6 — TRANSFERT NUMÉRIQUE ──────────────────────────
  doc.addPage();
  let qy = 50;
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); setC(doc, C.accent);
  doc.text('Import du profil numérique', PAGE_W / 2, qy, { align: 'center' });
  qy += 4; rule(doc, qy); qy += 18;

  const qrText = transferCode || `anomaya://transfer/${animal.id}`;
  try {
    const qr = await qrDataUrl(qrText);
    const sz = 55;
    doc.addImage(qr, 'PNG', (PAGE_W - sz) / 2, qy, sz, sz);
    qy += sz + 12;
  } catch { qy += 10; }

  if (transferCode) {
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); setC(doc, C.medium);
    doc.text('Code de transfert :', PAGE_W / 2, qy, { align: 'center' }); qy += 8;
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); setC(doc, C.black);
    doc.text(sanitize(transferCode), PAGE_W / 2, qy, { align: 'center' }); qy += 14;
  }

  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); setC(doc, C.dark);
  const instr = doc.splitTextToSize(
    'Scannez ce QR code depuis votre compte Anomaya pour importer automatiquement le profil complet.',
    CONTENT_W - 30
  );
  doc.text(instr, PAGE_W / 2, qy, { align: 'center' });

  footer(doc, 6, totalPages);

  return doc;
}

export function downloadPdf(doc: jsPDF, filename: string) { doc.save(filename); }

export async function sharePdf(doc: jsPDF, filename: string): Promise<boolean> {
  if (!navigator.share || !navigator.canShare) return false;
  try {
    const blob = doc.output('blob');
    const file = new File([blob], filename, { type: 'application/pdf' });
    if (!navigator.canShare({ files: [file] })) return false;
    await navigator.share({ files: [file], title: filename });
    return true;
  } catch { return false; }
}
