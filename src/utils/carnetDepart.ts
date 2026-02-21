import jsPDF from 'jspdf';
import type { Animal, WeightEntry, SoinEntry } from '@/types/animal';
import { displayBreed } from '@/utils/breeds';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - 2 * MARGIN;

function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text(`Généré par Anomaya — Page ${pageNum}/${totalPages}`, PAGE_W / 2, PAGE_H - 10, { align: 'center' });
}

function drawLine(doc: jsPDF, y: number) {
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN, y);
  drawLine(doc, y + 3);
  return y + 12;
}

function labelValue(doc: jsPDF, label: string, value: string, y: number): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(label, MARGIN, y);
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.text(value || '—', MARGIN + 55, y);
  return y + 7;
}

function formatDate(iso?: string | null): string {
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
  const totalPages = 5;

  // ===== PAGE 1 — Cover =====
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Photo
  if (animal.photo) {
    try {
      const img = await loadImage(animal.photo);
      const maxW = 120;
      const maxH = 120;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      doc.addImage(img, 'JPEG', (PAGE_W - w) / 2, 40, w, h);
    } catch {
      // Skip photo if loading fails
    }
  }

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(animal.nom, PAGE_W / 2, 180, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const raceText = animal.race ? displayBreed(animal.race) : '';
  if (raceText) doc.text(raceText, PAGE_W / 2, 192, { align: 'center' });

  doc.setFontSize(12);
  doc.text(`Né(e) le ${formatDate(animal.naissance)}`, PAGE_W / 2, 204, { align: 'center' });
  doc.text(getSexLabel(animal.sexe), PAGE_W / 2, 214, { align: 'center' });

  if (breederName) {
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text(`Éleveur : ${breederName}`, PAGE_W / 2, 235, { align: 'center' });
  }

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Carnet de Départ', PAGE_W / 2, 260, { align: 'center' });

  addFooter(doc, 1, totalPages);

  // ===== PAGE 2 — Identity =====
  doc.addPage();
  let y = 30;
  y = sectionTitle(doc, 'Identité', y);
  y = labelValue(doc, 'Nom', animal.nom, y);
  y = labelValue(doc, 'Sexe', getSexLabel(animal.sexe), y);
  y = labelValue(doc, 'Race', raceText || '—', y);
  y = labelValue(doc, 'Date de naissance', formatDate(animal.naissance), y);
  y = labelValue(doc, 'Numéro de puce', animal.puce || '—', y);
  y = labelValue(doc, 'Mère', motherName || '—', y);
  y = labelValue(doc, 'Père', fatherName || '—', y);

  y += 10;
  y = sectionTitle(doc, 'Contact éleveur', y);
  y = labelValue(doc, 'Nom', breederName || '—', y);
  y = labelValue(doc, 'Email', breederEmail || '—', y);
  y = labelValue(doc, 'Téléphone', breederPhone || '—', y);

  if (animal.buyer_name) {
    y += 10;
    y = sectionTitle(doc, 'Nouveau propriétaire', y);
    y = labelValue(doc, 'Nom', animal.buyer_name || '—', y);
    if (animal.buyer_phone) y = labelValue(doc, 'Téléphone', animal.buyer_phone, y);
    if (animal.buyer_email) y = labelValue(doc, 'Email', animal.buyer_email, y);
    if (animal.planned_departure_date) y = labelValue(doc, 'Date de départ', formatDate(animal.planned_departure_date), y);
  }

  addFooter(doc, 2, totalPages);

  // ===== PAGE 3 — Weight History =====
  doc.addPage();
  y = 30;
  y = sectionTitle(doc, 'Historique du poids', y);

  const weights = [...(animal.poids || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (weights.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('Aucune mesure de poids enregistrée.', MARGIN, y);
  } else {
    // Table header
    doc.setFillColor(245, 245, 245);
    doc.rect(MARGIN, y - 4, CONTENT_W, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Date', MARGIN + 3, y);
    doc.text('Poids', MARGIN + 80, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    for (const w of weights) {
      if (y > PAGE_H - 30) { doc.addPage(); y = 30; }
      doc.text(formatDate(w.date), MARGIN + 3, y);
      doc.text(formatWeightValue(w.poids), MARGIN + 80, y);
      y += 6;
    }
  }

  addFooter(doc, 3, totalPages);

  // ===== PAGE 4 — Vaccines & Treatments =====
  doc.addPage();
  y = 30;
  y = sectionTitle(doc, 'Vaccins & Traitements', y);

  const soins = animal.soins || [];
  const vaccins = soins.filter((s) => s.type === 'Vaccin' || s.type === 'vaccin');
  const traitements = soins.filter((s) => s.type !== 'Vaccin' && s.type !== 'vaccin');

  if (vaccins.length === 0 && traitements.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('Aucun vaccin ou traitement enregistré.', MARGIN, y);
  } else {
    if (vaccins.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text('Vaccins', MARGIN, y);
      y += 8;

      // Table header
      doc.setFillColor(245, 245, 245);
      doc.rect(MARGIN, y - 4, CONTENT_W, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text('Nom', MARGIN + 3, y);
      doc.text('Date', MARGIN + 60, y);
      doc.text('Prochain rappel', MARGIN + 100, y);
      doc.text('Type', MARGIN + 145, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      for (const v of vaccins) {
        if (y > PAGE_H - 30) { doc.addPage(); y = 30; }
        doc.text((v.nom || v.produit || '—').substring(0, 30), MARGIN + 3, y);
        doc.text(formatDate(v.date), MARGIN + 60, y);
        doc.text(v.prochain ? formatDate(v.prochain) : '—', MARGIN + 100, y);
        doc.text(v.obligatoire ? 'Obligatoire' : 'Recommandé', MARGIN + 145, y);
        y += 6;
      }
      y += 6;
    }

    if (traitements.length > 0) {
      if (y > PAGE_H - 50) { doc.addPage(); y = 30; }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text('Traitements', MARGIN, y);
      y += 8;

      doc.setFillColor(245, 245, 245);
      doc.rect(MARGIN, y - 4, CONTENT_W, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text('Type', MARGIN + 3, y);
      doc.text('Produit', MARGIN + 40, y);
      doc.text('Date', MARGIN + 100, y);
      doc.text('Notes', MARGIN + 140, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      for (const t of traitements) {
        if (y > PAGE_H - 30) { doc.addPage(); y = 30; }
        doc.text((t.type || '—').substring(0, 20), MARGIN + 3, y);
        doc.text((t.produit || t.nom || '—').substring(0, 30), MARGIN + 40, y);
        doc.text(formatDate(t.date || t.debut), MARGIN + 100, y);
        doc.text((t.notes || '').substring(0, 20), MARGIN + 140, y);
        y += 6;
      }
    }
  }

  addFooter(doc, 4, totalPages);

  // ===== PAGE 5 — Notes & Transfer =====
  doc.addPage();
  y = 30;
  y = sectionTitle(doc, 'Notes de l\'éleveur', y);

  const commercialNotes = animal.commercial_notes;
  if (commercialNotes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(commercialNotes, CONTENT_W);
    doc.text(lines, MARGIN, y);
    y += lines.length * 5 + 10;
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('Aucune note.', MARGIN, y);
    y += 10;
  }

  // Transfer section
  if (transferCode) {
    y += 10;
    y = sectionTitle(doc, 'Transfert de profil', y);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text('Code de transfert :', MARGIN, y);
    y += 8;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(transferCode, PAGE_W / 2, y, { align: 'center' });
    y += 12;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    const instructions = [
      '1. Le nouveau propriétaire télécharge l\'application Anomaya.',
      '2. Il se connecte ou crée un compte.',
      '3. Il entre le code de transfert ci-dessus pour récupérer le profil.',
    ];
    for (const line of instructions) {
      doc.text(line, MARGIN, y);
      y += 6;
    }
  }

  addFooter(doc, 5, totalPages);

  return doc;
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
