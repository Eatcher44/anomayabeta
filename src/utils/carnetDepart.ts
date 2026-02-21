import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { Animal, WeightEntry, SoinEntry } from '@/types/animal';
import { displayBreed } from '@/utils/breeds';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - 2 * MARGIN;

// ─── Color palette ───────────────────────────────────────────
const C = {
  black: [20, 20, 20] as [number, number, number],
  dark: [45, 45, 50] as [number, number, number],
  medium: [100, 100, 105] as [number, number, number],
  light: [155, 155, 160] as [number, number, number],
  rule: [195, 195, 200] as [number, number, number],
  rowAlt: [245, 246, 249] as [number, number, number],
  accent: [31, 60, 91] as [number, number, number], // #1f3c5b
  white: [255, 255, 255] as [number, number, number],
};

function setC(doc: jsPDF, c: [number, number, number]) { doc.setTextColor(...c); }

function sanitize(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/[\u0000-\u001F\u007F-\u009F]+/g, '')
    .replace(/&[A-Z]/g, '')
    .normalize('NFC')
    .trim();
}

// ─── Footer on every page ────────────────────────────────────
function footer(doc: jsPDF, page: number, total: number) {
  const y = PAGE_H - 8;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  setC(doc, C.light);
  doc.text('Carnet généré par Anomaya', MARGIN, y);
  doc.text(`${page} / ${total}`, PAGE_W - MARGIN, y, { align: 'right' });
  doc.setFontSize(5);
  doc.text(
    "Document informatif de suivi établi par l'éleveur \u2013 Ne remplace pas un carnet vétérinaire officiel.",
    PAGE_W / 2, y + 3, { align: 'center' }
  );
}

// ─── Helpers ─────────────────────────────────────────────────
function hRule(doc: jsPDF, y: number, color = C.rule, width = 0.25) {
  doc.setDrawColor(...color);
  doc.setLineWidth(width);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  setC(doc, C.accent);
  doc.text(sanitize(title).toUpperCase(), MARGIN, y);
  hRule(doc, y + 2, C.accent, 0.4);
  return y + 9;
}

function labelValue(doc: jsPDF, label: string, value: string, x: number, y: number, labelW = 32): number {
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  setC(doc, C.medium);
  doc.text(sanitize(label), x, y);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  setC(doc, C.black);
  doc.text(sanitize(value) || '\u2014', x + labelW, y);
  return y + 5.5;
}

function labelValueInline(doc: jsPDF, label: string, value: string, x: number, y: number): number {
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  setC(doc, C.medium);
  doc.text(sanitize(label) + ' :', x, y);
  const lw = doc.getTextWidth(sanitize(label) + ' : ');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  setC(doc, C.dark);
  doc.text(sanitize(value) || '\u2014', x + lw + 1, y);
  return y + 4.5;
}

// ─── Date / weight formatters ────────────────────────────────
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
  const n = sanitize(s).toLowerCase();
  if (n.startsWith('f')) return 'Femelle';
  if (n.startsWith('m')) return 'Mâle';
  return sanitize(s);
}
function birthPrefix(sexe: string): string {
  const n = sanitize(sexe).toLowerCase();
  if (n.startsWith('f')) return 'Née le';
  if (n.startsWith('m')) return 'Né le';
  return 'Né(e) le';
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
  const padL = 12, padB = 8;
  const cw = w - padL, ch = h - padB;

  // grid
  doc.setDrawColor(...C.rule); doc.setLineWidth(0.1);
  for (let i = 0; i <= 4; i++) {
    const gy = y + ch - (ch * i) / 4;
    doc.line(x + padL, gy, x + w, gy);
    doc.setFontSize(4.5); setC(doc, C.light); doc.setFont('helvetica', 'normal');
    doc.text(fmtWeight(minV + (range * i) / 4), x, gy + 1);
  }

  // line
  doc.setDrawColor(...C.dark); doc.setLineWidth(0.5);
  const pts: [number, number][] = weights.map((e, i) => [
    x + padL + (cw * i) / (weights.length - 1),
    y + ch - ((e.poids - minV) / range) * ch,
  ]);
  for (let i = 1; i < pts.length; i++) doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  doc.setFillColor(...C.dark);
  for (const p of pts) doc.circle(p[0], p[1], 0.5, 'F');

  // x-axis labels
  doc.setFontSize(4); setC(doc, C.light);
  const step = Math.max(1, Math.floor(weights.length / 5));
  weights.forEach((e, i) => {
    if (i % step === 0 || i === weights.length - 1)
      doc.text(fmtShort(e.date), pts[i][0], y + ch + 5, { align: 'center' });
  });
}

// ─── QR ──────────────────────────────────────────────────────
async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { width: 400, margin: 1, color: { dark: '#1f3c5b', light: '#ffffff' } });
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
// MAIN
// ═════════════════════════════════════════════════════════════
export async function generateCarnetDepart(data: CarnetDepartData): Promise<jsPDF> {
  const { animal, motherName, fatherName, breederProfile, transferCode } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const totalPages = 6;
  const race = animal.race ? displayBreed(animal.race) : '';
  const genDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const bp = breederProfile || {};
  const breederFullName = [bp.prenom, bp.nom].filter(Boolean).join(' ');

  // ════════════════════════════════════════════════════════════
  // PAGE 1 – COVER
  // ════════════════════════════════════════════════════════════
  let y = MARGIN;

  // Header row: title left, logo right
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  setC(doc, C.accent);
  doc.text('CARNET DE DÉPART', MARGIN, y + 5);

  if (bp.logo_url) {
    try {
      const logo = await loadImg(bp.logo_url);
      const maxS = 14;
      const ratio = Math.min(maxS / logo.width, maxS / logo.height);
      doc.addImage(logo, 'PNG', PAGE_W - MARGIN - logo.width * ratio, y - 1, logo.width * ratio, logo.height * ratio);
    } catch { /* skip */ }
  }

  y += 8;
  hRule(doc, y, C.accent, 0.5);
  y += 10;

  // Photo (compact)
  if (animal.photo) {
    try {
      const img = await loadImg(animal.photo);
      const maxW = 40, maxH = 40;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio, h = img.height * ratio;
      doc.addImage(img, 'JPEG', (PAGE_W - w) / 2, y, w, h);
      doc.setDrawColor(...C.rule); doc.setLineWidth(0.2); doc.rect((PAGE_W - w) / 2, y, w, h);
      y += h + 6;
    } catch { /* skip */ }
  }

  // Name large
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  setC(doc, C.black);
  doc.text(sanitize(animal.nom), PAGE_W / 2, y, { align: 'center' });
  y += 7;

  // Inline: Race | Sexe | Né(e) le
  const parts: string[] = [];
  if (race) parts.push(race);
  parts.push(sexLabel(animal.sexe));
  parts.push(`${birthPrefix(animal.sexe)} ${fmtLong(animal.naissance)}`);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  setC(doc, C.dark);
  doc.text(parts.join('  |  '), PAGE_W / 2, y, { align: 'center' });
  y += 10;

  // 2-col identity grid
  const lx = MARGIN, rx = MARGIN + CONTENT_W / 2 + 2;
  y = labelValue(doc, 'Puce', animal.puce || '\u2014', lx, y, 22);
  let tmpY = labelValue(doc, 'Mère', motherName || '\u2014', rx, y - 5.5, 22);
  y = labelValue(doc, 'Statut', statusLabel(animal.commercial_status || undefined), lx, y, 22);
  tmpY = labelValue(doc, 'Père', fatherName || '\u2014', rx, tmpY, 22);
  y = Math.max(y, tmpY) + 4;

  hRule(doc, y); y += 6;

  // Breeder info block (compact)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setC(doc, C.accent);
  doc.text('ÉLEVEUR', MARGIN, y); y += 5;

  if (bp.nom_elevage) { y = labelValueInline(doc, 'Élevage', bp.nom_elevage, MARGIN, y); }
  if (breederFullName) { y = labelValueInline(doc, 'Nom', breederFullName, MARGIN, y); }
  if (bp.telephone) { y = labelValueInline(doc, 'Tél', bp.telephone, MARGIN, y); }
  if (bp.email) { y = labelValueInline(doc, 'Email', bp.email, MARGIN, y); }
  if (bp.adresse) { y = labelValueInline(doc, 'Adresse', bp.adresse, MARGIN, y); }
  if (bp.siret) { y = labelValueInline(doc, 'SIRET', bp.siret, MARGIN, y); }
  if (!breederFullName && !bp.nom_elevage) {
    doc.setFontSize(7); doc.setFont('helvetica', 'italic'); setC(doc, C.light);
    doc.text('Informations éleveur non renseignées', MARGIN, y); y += 5;
  }

  y += 4;
  doc.setFontSize(6.5); setC(doc, C.light); doc.setFont('helvetica', 'normal');
  doc.text(`Document généré le ${genDate}`, PAGE_W / 2, y, { align: 'center' });

  // Buyer info if exists
  if (animal.buyer_name) {
    y += 8; hRule(doc, y); y += 6;
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); setC(doc, C.accent);
    doc.text('NOUVEAU PROPRIÉTAIRE', MARGIN, y); y += 5;
    y = labelValueInline(doc, 'Nom', animal.buyer_name, MARGIN, y);
    if (animal.buyer_phone) y = labelValueInline(doc, 'Tél', animal.buyer_phone, MARGIN, y);
    if (animal.buyer_email) y = labelValueInline(doc, 'Email', animal.buyer_email, MARGIN, y);
    if (animal.planned_departure_date) y = labelValueInline(doc, 'Départ prévu', fmtLong(animal.planned_departure_date), MARGIN, y);
  }

  footer(doc, 1, totalPages);

  // ════════════════════════════════════════════════════════════
  // PAGE 2 – IDENTITÉ TABLE
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  y = MARGIN + 4;
  y = sectionTitle(doc, 'Informations complètes', y);

  const rows: [string, string][] = [
    ['Nom', animal.nom],
    ['Sexe', sexLabel(animal.sexe)],
    ['Race', race || '\u2014'],
    ['Date de naissance', fmtLong(animal.naissance)],
    ['Numéro de puce', animal.puce || '\u2014'],
    ['Mère', motherName || '\u2014'],
    ['Père', fatherName || '\u2014'],
    ['Statut', statusLabel(animal.commercial_status || undefined)],
  ];

  const col1W = 45;
  // Header
  doc.setFillColor(...C.accent);
  doc.rect(MARGIN, y - 4, CONTENT_W, 7, 'F');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); setC(doc, C.white);
  doc.text('Champ', MARGIN + 3, y);
  doc.text('Valeur', MARGIN + col1W + 3, y);
  y += 5;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  rows.forEach(([field, val], i) => {
    if (i % 2 === 0) { doc.setFillColor(...C.rowAlt); doc.rect(MARGIN, y - 3.5, CONTENT_W, 6, 'F'); }
    setC(doc, C.dark);
    doc.text(sanitize(field), MARGIN + 3, y);
    doc.setFont('helvetica', 'bold'); setC(doc, C.black);
    doc.text(sanitize(val), MARGIN + col1W + 3, y);
    doc.setFont('helvetica', 'normal');
    // row border
    doc.setDrawColor(...C.rule); doc.setLineWidth(0.1);
    doc.line(MARGIN, y + 2.5, PAGE_W - MARGIN, y + 2.5);
    y += 6;
  });

  // Buyer section on page 2
  if (animal.buyer_name) {
    y += 6;
    y = sectionTitle(doc, 'Nouveau propriétaire', y);
    const buyerRows: [string, string][] = [
      ['Nom', animal.buyer_name],
    ];
    if (animal.buyer_phone) buyerRows.push(['Téléphone', animal.buyer_phone]);
    if (animal.buyer_email) buyerRows.push(['Email', animal.buyer_email]);
    if (animal.planned_departure_date) buyerRows.push(['Date de départ', fmtLong(animal.planned_departure_date)]);

    buyerRows.forEach(([field, val], i) => {
      if (i % 2 === 0) { doc.setFillColor(...C.rowAlt); doc.rect(MARGIN, y - 3.5, CONTENT_W, 6, 'F'); }
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); setC(doc, C.dark);
      doc.text(sanitize(field), MARGIN + 3, y);
      doc.setFont('helvetica', 'bold'); setC(doc, C.black);
      doc.text(sanitize(val), MARGIN + col1W + 3, y);
      doc.setDrawColor(...C.rule); doc.setLineWidth(0.1);
      doc.line(MARGIN, y + 2.5, PAGE_W - MARGIN, y + 2.5);
      y += 6;
    });
  }

  footer(doc, 2, totalPages);

  // ════════════════════════════════════════════════════════════
  // PAGE 3 – WEIGHT (table left, chart right)
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  y = MARGIN + 4;
  y = sectionTitle(doc, 'Suivi du poids', y);

  const weights = [...(animal.poids || [])].sort((a, b) => +new Date(a.date) - +new Date(b.date));

  if (!weights.length) {
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); setC(doc, C.light);
    doc.text('Aucune mesure enregistrée.', MARGIN, y);
  } else {
    const tableW = CONTENT_W * 0.55;
    const chartX = MARGIN + tableW + 8;
    const chartW = CONTENT_W - tableW - 8;
    const tableY = y;

    // Table header
    doc.setFillColor(...C.accent);
    doc.rect(MARGIN, y - 3.5, tableW, 6.5, 'F');
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); setC(doc, C.white);
    doc.text('Date', MARGIN + 3, y);
    doc.text('Poids', MARGIN + tableW / 2, y);
    y += 5;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    weights.forEach((w, i) => {
      if (y > PAGE_H - 25) return; // safety
      if (i % 2 === 0) { doc.setFillColor(...C.rowAlt); doc.rect(MARGIN, y - 3, tableW, 5.5, 'F'); }
      setC(doc, C.black);
      doc.text(fmtShort(w.date), MARGIN + 3, y);
      doc.text(fmtWeight(w.poids), MARGIN + tableW / 2, y);
      doc.setDrawColor(...C.rule); doc.setLineWidth(0.08);
      doc.line(MARGIN, y + 2.5, MARGIN + tableW, y + 2.5);
      y += 5.5;
    });

    // Chart on the right
    if (weights.length >= 2) {
      const chartH = Math.min(55, y - tableY);
      weightChart(doc, weights, chartX, tableY, chartW, chartH);
    }
  }

  footer(doc, 3, totalPages);

  // ════════════════════════════════════════════════════════════
  // PAGE 4 – VACCINS & SOINS
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  y = MARGIN + 4;
  y = sectionTitle(doc, 'Vaccins et traitements', y);

  const soins = animal.soins || [];
  const vaccins = soins.filter(s => s.type === 'Vaccin' || s.type === 'vaccin');
  const traits = soins.filter(s => s.type !== 'Vaccin' && s.type !== 'vaccin');

  if (!vaccins.length && !traits.length) {
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); setC(doc, C.light);
    doc.text('Aucun soin enregistré.', MARGIN, y);
  } else {
    const colWidths = [30, 28, 28, 28, CONTENT_W - 30 - 28 - 28 - 28];

    const drawSoinTable = (items: SoinEntry[], isVaccin: boolean) => {
      // Sub-header
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); setC(doc, C.dark);
      doc.text(isVaccin ? 'Vaccins' : 'Traitements', MARGIN, y); y += 5;

      // Header row
      doc.setFillColor(...C.accent);
      doc.rect(MARGIN, y - 3.5, CONTENT_W, 6, 'F');
      doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); setC(doc, C.white);
      let cx = MARGIN + 2;
      const headers = isVaccin ? ['Nom', 'Date', 'Rappel', 'Catégorie', 'Notes'] : ['Type', 'Produit', 'Date', 'Rappel', 'Notes'];
      headers.forEach((h, i) => { doc.text(h, cx, y); cx += colWidths[i]; });
      y += 5;

      doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      items.forEach((s, i) => {
        if (y > PAGE_H - 25) { doc.addPage(); y = MARGIN + 4; }
        if (i % 2 === 0) { doc.setFillColor(...C.rowAlt); doc.rect(MARGIN, y - 3, CONTENT_W, 5.5, 'F'); }
        setC(doc, C.black);
        cx = MARGIN + 2;
        if (isVaccin) {
          doc.text(sanitize(s.nom || s.produit || '\u2014').substring(0, 20), cx, y); cx += colWidths[0];
          doc.text(fmtShort(s.date), cx, y); cx += colWidths[1];
          doc.text(s.prochain ? fmtShort(s.prochain) : '\u2014', cx, y); cx += colWidths[2];
          doc.text(s.obligatoire ? 'Obligatoire' : 'Recommandé', cx, y); cx += colWidths[3];
          doc.text(sanitize(s.notes || '').substring(0, 18), cx, y);
        } else {
          doc.text(sanitize(s.type || '\u2014').substring(0, 14), cx, y); cx += colWidths[0];
          doc.text(sanitize(s.produit || s.nom || '\u2014').substring(0, 18), cx, y); cx += colWidths[1];
          doc.text(fmtShort(s.date || s.debut), cx, y); cx += colWidths[2];
          doc.text(s.prochain ? fmtShort(s.prochain) : '\u2014', cx, y); cx += colWidths[3];
          doc.text(sanitize(s.notes || '').substring(0, 18), cx, y);
        }
        doc.setDrawColor(...C.rule); doc.setLineWidth(0.08);
        doc.line(MARGIN, y + 2.5, PAGE_W - MARGIN, y + 2.5);
        y += 5.5;
      });
      y += 4;
    };

    if (vaccins.length) drawSoinTable(vaccins, true);
    if (traits.length) drawSoinTable(traits, false);
  }

  footer(doc, 4, totalPages);

  // ════════════════════════════════════════════════════════════
  // PAGE 5 – OBSERVATIONS & SIGNATURE
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  y = MARGIN + 4;
  y = sectionTitle(doc, "Observations de l'éleveur", y);

  const notes = sanitize(animal.commercial_notes);
  if (notes) {
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); setC(doc, C.black);
    const lines = doc.splitTextToSize(notes, CONTENT_W);
    doc.text(lines, MARGIN, y);
    y += lines.length * 4 + 4;
  } else {
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); setC(doc, C.light);
    doc.text('Aucune observation saisie.', MARGIN, y);
    y += 6;
  }

  // Recommendations
  hRule(doc, y); y += 6;
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); setC(doc, C.accent);
  doc.text('RECOMMANDATIONS', MARGIN, y); y += 5;
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); setC(doc, C.dark);
  const recs = [
    "\u2022 Visite vétérinaire recommandée dans les 15 jours suivant l'adoption.",
    "\u2022 Respecter le calendrier de rappels vaccinaux indiqué.",
    "\u2022 Maintenir une alimentation adaptée à l'âge et à la race.",
    "\u2022 Prévoir une période d'adaptation dans un environnement calme.",
  ];
  for (const r of recs) { doc.text(r, MARGIN, y); y += 4.5; }

  // Signature & cachet side by side
  y += 8; hRule(doc, y); y += 8;
  const halfW = CONTENT_W / 2 - 4;

  // Left: Signature
  doc.setFontSize(7); setC(doc, C.medium); doc.setFont('helvetica', 'italic');
  doc.text("Signature de l'éleveur", MARGIN, y);
  y += 3;

  if (bp.signature_url) {
    try {
      const sig = await loadImg(bp.signature_url);
      const maxW = 40, maxH = 18;
      const ratio = Math.min(maxW / sig.width, maxH / sig.height);
      doc.addImage(sig, 'PNG', MARGIN, y, sig.width * ratio, sig.height * ratio);
    } catch { /* skip */ }
  }
  // signature line
  doc.setDrawColor(...C.rule); doc.setLineWidth(0.2);
  doc.line(MARGIN, y + 22, MARGIN + halfW, y + 22);

  // Right: Cachet box
  const boxX = MARGIN + halfW + 8;
  const boxY = y - 3;
  const boxW = halfW;
  const boxH = 28;
  doc.setDrawColor(...C.rule); doc.setLineWidth(0.3);
  doc.rect(boxX, boxY, boxW, boxH);
  doc.setFontSize(6.5); setC(doc, C.light); doc.setFont('helvetica', 'italic');
  doc.text("Cachet de l'élevage", boxX + boxW / 2, boxY + boxH / 2, { align: 'center' });

  footer(doc, 5, totalPages);

  // ════════════════════════════════════════════════════════════
  // PAGE 6 – QR TRANSFER
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  y = MARGIN + 4;
  y = sectionTitle(doc, 'Import du profil numérique', y);
  y += 6;

  const qrText = transferCode || `anomaya://transfer/${animal.id}`;
  try {
    const qr = await qrDataUrl(qrText);
    const sz = 48;
    doc.addImage(qr, 'PNG', (PAGE_W - sz) / 2, y, sz, sz);
    y += sz + 8;
  } catch { y += 6; }

  if (transferCode) {
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); setC(doc, C.medium);
    doc.text('Code de transfert', PAGE_W / 2, y, { align: 'center' }); y += 6;
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); setC(doc, C.black);
    doc.text(sanitize(transferCode), PAGE_W / 2, y, { align: 'center' }); y += 10;
  }

  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); setC(doc, C.dark);
  const instr = doc.splitTextToSize(
    'Scannez ce QR code depuis votre compte Anomaya pour importer automatiquement le profil complet.',
    CONTENT_W - 20
  );
  doc.text(instr, PAGE_W / 2, y, { align: 'center' });

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
