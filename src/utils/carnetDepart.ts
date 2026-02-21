import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { Animal, WeightEntry, SoinEntry } from '@/types/animal';
import { displayBreed } from '@/utils/breeds';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 22;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const COL_W = CONTENT_W / 2 - 4;

// ─── Color palette ────────────────────────────────────────────
const C = {
  dark: [35, 35, 40] as [number, number, number],
  medium: [100, 100, 110] as [number, number, number],
  light: [155, 155, 165] as [number, number, number],
  faint: [220, 220, 225] as [number, number, number],
  bg: [248, 248, 250] as [number, number, number],
  accent: [90, 80, 160] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

// ─── Helpers ──────────────────────────────────────────────────
function setColor(doc: jsPDF, c: [number, number, number]) {
  doc.setTextColor(...c);
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  doc.setFontSize(7);
  setColor(doc, C.light);
  doc.setFont('helvetica', 'normal');
  doc.text('Généré par Anomaya — www.anomaya.app', PAGE_W / 2, PAGE_H - 12, { align: 'center' });
  doc.text(`${pageNum} / ${totalPages}`, PAGE_W / 2, PAGE_H - 7, { align: 'center' });
}

function drawSeparator(doc: jsPDF, y: number) {
  doc.setDrawColor(...C.faint);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

function sectionTitle(doc: jsPDF, title: string, y: number, icon?: string): number {
  if (icon) {
    doc.setFontSize(12);
    doc.text(icon, MARGIN, y);
  }
  const x = icon ? MARGIN + 8 : MARGIN;
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  setColor(doc, C.dark);
  doc.text(title, x, y);
  drawSeparator(doc, y + 4);
  return y + 14;
}

function labelValue(doc: jsPDF, label: string, value: string, x: number, y: number): number {
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  setColor(doc, C.medium);
  doc.text(label, x, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  setColor(doc, C.dark);
  doc.text(value || '—', x, y + 5);
  return y + 14;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateShort(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR');
}

function formatWeightValue(grams: number): string {
  if (grams < 1000) return `${Math.round(grams)} g`;
  return `${(grams / 1000).toFixed(2)} kg`;
}

function getSexLabel(sexe: string): string {
  return sexe === 'Femelle' ? 'Femelle ♀' : 'Mâle ♂';
}

function getStatusLabel(status?: string): string {
  const map: Record<string, string> = {
    sold: 'Vendu', kept: 'Gardé', reserved: 'Réservé',
    option: 'Option', available: 'Disponible',
  };
  return map[status || ''] || '—';
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// ─── Weight chart (canvas-based) ─────────────────────────────
function drawWeightChart(
  doc: jsPDF,
  weights: WeightEntry[],
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (weights.length < 2) return;

  const vals = weights.map((e) => e.poids);
  const minV = Math.min(...vals) * 0.9;
  const maxV = Math.max(...vals) * 1.1;
  const rangeV = maxV - minV || 1;

  const padL = 12;
  const padB = 8;
  const cw = w - padL;
  const ch = h - padB;

  // grid lines
  doc.setDrawColor(...C.faint);
  doc.setLineWidth(0.15);
  for (let i = 0; i <= 4; i++) {
    const gy = y + ch - (ch * i) / 4;
    doc.line(x + padL, gy, x + w, gy);
  }

  // axis labels
  doc.setFontSize(6);
  setColor(doc, C.light);
  doc.setFont('helvetica', 'normal');
  for (let i = 0; i <= 4; i++) {
    const v = minV + (rangeV * i) / 4;
    const gy = y + ch - (ch * i) / 4;
    doc.text(formatWeightValue(v), x, gy + 1);
  }

  // line
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.6);
  const points: [number, number][] = weights.map((e, i) => [
    x + padL + (cw * i) / (weights.length - 1),
    y + ch - ((e.poids - minV) / rangeV) * ch,
  ]);

  for (let i = 1; i < points.length; i++) {
    doc.line(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
  }

  // dots
  doc.setFillColor(...C.accent);
  for (const p of points) {
    doc.circle(p[0], p[1], 0.8, 'F');
  }

  // date labels
  doc.setFontSize(5.5);
  setColor(doc, C.light);
  const showEvery = Math.max(1, Math.floor(weights.length / 6));
  weights.forEach((e, i) => {
    if (i % showEvery === 0 || i === weights.length - 1) {
      doc.text(
        formatDateShort(e.date),
        points[i][0],
        y + ch + 6,
        { align: 'center' }
      );
    }
  });
}

// ─── QR Code generation ──────────────────────────────────────
async function generateQRDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 400,
    margin: 1,
    color: { dark: '#232328', light: '#ffffff' },
  });
}

// ─── Main export interface ───────────────────────────────────
export interface CarnetDepartData {
  animal: Animal;
  motherName?: string;
  fatherName?: string;
  breederName?: string;
  breederEmail?: string;
  breederPhone?: string;
  transferCode?: string;
}

export async function generateCarnetDepart(data: CarnetDepartData): Promise<jsPDF> {
  const { animal, motherName, fatherName, breederName, breederEmail, breederPhone, transferCode } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const totalPages = 6;
  const raceText = animal.race ? displayBreed(animal.race) : '';
  const generationDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // ═══════════════════════════════════════════════════════════
  // PAGE 1 — COVER (Emotional & Premium)
  // ═══════════════════════════════════════════════════════════
  doc.setFillColor(...C.white);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Photo
  let photoBottom = 130;
  if (animal.photo) {
    try {
      const img = await loadImage(animal.photo);
      const maxW = 140;
      const maxH = 130;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const imgX = (PAGE_W - w) / 2;
      const imgY = 35;
      // Rounded rect clip effect — draw white border
      doc.addImage(img, 'JPEG', imgX, imgY, w, h);
      doc.setDrawColor(...C.faint);
      doc.setLineWidth(0.5);
      doc.rect(imgX, imgY, w, h);
      photoBottom = imgY + h + 12;
    } catch {
      // skip photo
    }
  }

  // Animal name
  let cy = photoBottom;
  doc.setFontSize(30);
  doc.setFont('helvetica', 'bold');
  setColor(doc, C.dark);
  doc.text(animal.nom, PAGE_W / 2, cy, { align: 'center' });
  cy += 10;

  // Race
  if (raceText) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    setColor(doc, C.medium);
    doc.text(raceText, PAGE_W / 2, cy, { align: 'center' });
    cy += 8;
  }

  // Birth date & sex
  doc.setFontSize(11);
  setColor(doc, C.medium);
  doc.text(`Né(e) le ${formatDate(animal.naissance)}  •  ${getSexLabel(animal.sexe)}`, PAGE_W / 2, cy, { align: 'center' });
  cy += 20;

  // Divider
  drawSeparator(doc, cy);
  cy += 12;

  // Subtitle
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  setColor(doc, C.dark);
  doc.text('Carnet de suivi officiel', PAGE_W / 2, cy, { align: 'center' });
  cy += 10;

  if (breederName) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    setColor(doc, C.medium);
    doc.text(`Élevage : ${breederName}`, PAGE_W / 2, cy, { align: 'center' });
    cy += 8;
  }

  doc.setFontSize(9);
  setColor(doc, C.light);
  doc.text(`Généré le ${generationDate}`, PAGE_W / 2, cy, { align: 'center' });

  addFooter(doc, 1, totalPages);

  // ═══════════════════════════════════════════════════════════
  // PAGE 2 — IDENTITÉ & ORIGINES (Two-column)
  // ═══════════════════════════════════════════════════════════
  doc.addPage();
  let y = 30;
  y = sectionTitle(doc, '🐾  Identité & Origines', y);

  const leftX = MARGIN;
  const rightX = MARGIN + COL_W + 8;

  let yL = y;
  let yR = y;

  // Left column
  yL = labelValue(doc, 'Nom', animal.nom, leftX, yL);
  yL = labelValue(doc, 'Sexe', getSexLabel(animal.sexe), leftX, yL);
  yL = labelValue(doc, 'Race', raceText || '—', leftX, yL);
  yL = labelValue(doc, 'Date de naissance', formatDate(animal.naissance), leftX, yL);
  yL = labelValue(doc, 'Numéro de puce', animal.puce || '—', leftX, yL);

  // Right column
  yR = labelValue(doc, 'Mère', motherName || '—', rightX, yR);
  yR = labelValue(doc, 'Père', fatherName || '—', rightX, yR);
  yR = labelValue(doc, 'Éleveur', breederName || '—', rightX, yR);
  yR = labelValue(doc, 'Contact', breederEmail || breederPhone || '—', rightX, yR);
  yR = labelValue(doc, 'Statut', getStatusLabel(animal.commercial_status || undefined), rightX, yR);

  y = Math.max(yL, yR) + 8;

  // Buyer info section
  if (animal.buyer_name) {
    drawSeparator(doc, y);
    y += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    setColor(doc, C.dark);
    doc.text('Nouveau propriétaire', MARGIN, y);
    y += 10;

    yL = y;
    yR = y;
    yL = labelValue(doc, 'Nom', animal.buyer_name || '—', leftX, yL);
    if (animal.buyer_phone) yL = labelValue(doc, 'Téléphone', animal.buyer_phone, leftX, yL);
    if (animal.buyer_email) yR = labelValue(doc, 'Email', animal.buyer_email, rightX, yR);
    if (animal.planned_departure_date) yR = labelValue(doc, 'Date de départ', formatDate(animal.planned_departure_date), rightX, yR);
  }

  addFooter(doc, 2, totalPages);

  // ═══════════════════════════════════════════════════════════
  // PAGE 3 — SUIVI DE CROISSANCE
  // ═══════════════════════════════════════════════════════════
  doc.addPage();
  y = 30;
  y = sectionTitle(doc, '⚖️  Suivi du poids', y);

  const weights = [...(animal.poids || [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (weights.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    setColor(doc, C.light);
    doc.text('Aucune mesure de poids enregistrée.', MARGIN, y);
    y += 10;
  } else {
    // Table header
    doc.setFillColor(...C.bg);
    doc.roundedRect(MARGIN, y - 5, CONTENT_W, 9, 1, 1, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setColor(doc, C.medium);
    doc.text('Date', MARGIN + 4, y);
    doc.text('Poids', MARGIN + CONTENT_W / 2, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    setColor(doc, C.dark);
    doc.setFontSize(9);
    for (const w of weights) {
      if (y > PAGE_H - 90) {
        doc.addPage();
        y = 30;
      }
      // Alternating row background
      if (weights.indexOf(w) % 2 === 0) {
        doc.setFillColor(252, 252, 254);
        doc.rect(MARGIN, y - 4, CONTENT_W, 7, 'F');
      }
      doc.text(formatDateShort(w.date), MARGIN + 4, y);
      doc.text(formatWeightValue(w.poids), MARGIN + CONTENT_W / 2, y);
      y += 7;
    }

    // Weight graph
    if (weights.length >= 2) {
      y += 8;
      drawSeparator(doc, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      setColor(doc, C.dark);
      doc.text('Courbe de croissance', MARGIN, y);
      y += 6;

      const chartH = Math.min(55, PAGE_H - y - 30);
      drawWeightChart(doc, weights, MARGIN, y, CONTENT_W, chartH);
      y += chartH + 10;
    }
  }

  addFooter(doc, 3, totalPages);

  // ═══════════════════════════════════════════════════════════
  // PAGE 4 — VACCINS & SOINS
  // ═══════════════════════════════════════════════════════════
  doc.addPage();
  y = 30;
  y = sectionTitle(doc, '💉  Suivi vétérinaire', y);

  const soins = animal.soins || [];
  const vaccins = soins.filter((s) => s.type === 'Vaccin' || s.type === 'vaccin');
  const traitements = soins.filter((s) => s.type !== 'Vaccin' && s.type !== 'vaccin');

  if (vaccins.length === 0 && traitements.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    setColor(doc, C.light);
    doc.text('Aucun vaccin ou traitement enregistré.', MARGIN, y);
  } else {
    // Vaccins
    if (vaccins.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      setColor(doc, C.dark);
      doc.text('Vaccins', MARGIN, y);
      y += 8;

      // Header
      doc.setFillColor(...C.bg);
      doc.roundedRect(MARGIN, y - 5, CONTENT_W, 9, 1, 1, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      setColor(doc, C.medium);
      doc.text('Nom', MARGIN + 4, y);
      doc.text('Date', MARGIN + 55, y);
      doc.text('Rappel', MARGIN + 95, y);
      doc.text('Statut', MARGIN + 135, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      for (const v of vaccins) {
        if (y > PAGE_H - 30) { doc.addPage(); y = 30; }
        setColor(doc, C.dark);
        doc.text((v.nom || v.produit || '—').substring(0, 25), MARGIN + 4, y);
        doc.text(formatDateShort(v.date), MARGIN + 55, y);
        doc.text(v.prochain ? formatDateShort(v.prochain) : '—', MARGIN + 95, y);
        setColor(doc, v.obligatoire ? C.accent : C.medium);
        doc.setFont('helvetica', v.obligatoire ? 'bold' : 'normal');
        doc.text(v.obligatoire ? 'Obligatoire' : 'Recommandé', MARGIN + 135, y);
        doc.setFont('helvetica', 'normal');
        y += 7;
      }
      y += 6;
    }

    // Traitements
    if (traitements.length > 0) {
      if (y > PAGE_H - 50) { doc.addPage(); y = 30; }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      setColor(doc, C.dark);
      doc.text('Traitements', MARGIN, y);
      y += 8;

      doc.setFillColor(...C.bg);
      doc.roundedRect(MARGIN, y - 5, CONTENT_W, 9, 1, 1, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      setColor(doc, C.medium);
      doc.text('Type', MARGIN + 4, y);
      doc.text('Produit', MARGIN + 40, y);
      doc.text('Date', MARGIN + 95, y);
      doc.text('Notes', MARGIN + 135, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setColor(doc, C.dark);
      for (const t of traitements) {
        if (y > PAGE_H - 30) { doc.addPage(); y = 30; }
        doc.text((t.type || '—').substring(0, 18), MARGIN + 4, y);
        doc.text((t.produit || t.nom || '—').substring(0, 28), MARGIN + 40, y);
        doc.text(formatDateShort(t.date || t.debut), MARGIN + 95, y);
        doc.text((t.notes || '').substring(0, 18), MARGIN + 135, y);
        y += 7;
      }
    }
  }

  addFooter(doc, 4, totalPages);

  // ═══════════════════════════════════════════════════════════
  // PAGE 5 — NOTES & RECOMMANDATIONS
  // ═══════════════════════════════════════════════════════════
  doc.addPage();
  y = 30;
  y = sectionTitle(doc, '❤️  Observations de l\'éleveur', y);

  const notes = animal.commercial_notes;
  if (notes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    setColor(doc, C.dark);
    const lines = doc.splitTextToSize(notes, CONTENT_W);
    doc.text(lines, MARGIN, y);
    y += lines.length * 5 + 12;
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    setColor(doc, C.light);
    doc.text('Aucune observation.', MARGIN, y);
    y += 12;
  }

  // Recommendations placeholder
  drawSeparator(doc, y);
  y += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  setColor(doc, C.dark);
  doc.text('Recommandations', MARGIN, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  setColor(doc, C.medium);
  const recLines = [
    '• Prévoir une visite vétérinaire dans les 15 jours suivant l\'adoption.',
    '• Respecter le calendrier de rappels vaccinaux.',
    '• Maintenir une alimentation adaptée à l\'âge et la race.',
    '• Observer une période d\'adaptation dans un environnement calme.',
  ];
  for (const line of recLines) {
    doc.text(line, MARGIN, y);
    y += 6;
  }

  // Space for future notes
  y += 10;
  drawSeparator(doc, y);
  y += 8;
  doc.setFontSize(9);
  setColor(doc, C.light);
  doc.setFont('helvetica', 'italic');
  doc.text('Espace réservé pour notes supplémentaires :', MARGIN, y);
  y += 4;
  // Draw ruled lines
  doc.setDrawColor(...C.faint);
  doc.setLineWidth(0.2);
  for (let i = 0; i < 6; i++) {
    y += 8;
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  }

  addFooter(doc, 5, totalPages);

  // ═══════════════════════════════════════════════════════════
  // PAGE 6 — TRANSFERT NUMÉRIQUE (QR Code)
  // ═══════════════════════════════════════════════════════════
  doc.addPage();

  // Centered layout
  let qy = 60;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  setColor(doc, C.dark);
  doc.text('Importer ce profil dans Anomaya', PAGE_W / 2, qy, { align: 'center' });
  qy += 6;

  drawSeparator(doc, qy);
  qy += 16;

  // QR Code
  const qrText = transferCode || `anomaya://transfer/${animal.id}`;
  try {
    const qrDataUrl = await generateQRDataUrl(qrText);
    const qrSize = 60;
    doc.addImage(qrDataUrl, 'PNG', (PAGE_W - qrSize) / 2, qy, qrSize, qrSize);
    qy += qrSize + 12;
  } catch {
    // QR generation failed, show text only
    qy += 10;
  }

  // Transfer code
  if (transferCode) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    setColor(doc, C.medium);
    doc.text('Code de transfert :', PAGE_W / 2, qy, { align: 'center' });
    qy += 10;

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    setColor(doc, C.dark);
    doc.text(transferCode, PAGE_W / 2, qy, { align: 'center' });
    qy += 16;
  }

  // Instructions
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  setColor(doc, C.medium);
  const instructions = [
    'Scannez ce code depuis votre compte Anomaya pour',
    'importer automatiquement le profil complet.',
    '',
    '1.  Téléchargez l\'application Anomaya.',
    '2.  Connectez-vous ou créez un compte.',
    '3.  Entrez le code de transfert ou scannez le QR code.',
  ];
  for (const line of instructions) {
    doc.text(line, PAGE_W / 2, qy, { align: 'center' });
    qy += 6;
  }

  addFooter(doc, 6, totalPages);

  return doc;
}

export function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename);
}

export async function sharePdf(doc: jsPDF, filename: string): Promise<boolean> {
  if (!navigator.share || !navigator.canShare) return false;
  try {
    const blob = doc.output('blob');
    const file = new File([blob], filename, { type: 'application/pdf' });
    if (!navigator.canShare({ files: [file] })) return false;
    await navigator.share({ files: [file], title: filename });
    return true;
  } catch {
    return false;
  }
}
