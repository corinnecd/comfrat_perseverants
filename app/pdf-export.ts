/**
 * Export en vrai fichier PDF (téléchargé directement, sans passer par l'impression).
 * jsPDF est chargé seulement au clic, pour ne pas alourdir le site.
 * Police Helvetica intégrée : accents français, « », ’ et œ pris en charge.
 */
type RGB = [number, number, number];
const NAVY: RGB = [0, 27, 53];
const GOLD: RGB = [154, 101, 16];
const GREY: RGB = [91, 107, 123];
const LINE: RGB = [227, 217, 199];

let logoCache: string | null | undefined;
/** Logo réduit et compressé (JPEG sur fond blanc) : quelques dizaines de Ko au lieu de 400. */
async function logo() {
  if (logoCache !== undefined) return logoCache;
  try {
    const img = new Image();
    img.src = '/logo-perseverants.png';
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 260; canvas.height = Math.round(260 * img.naturalHeight / img.naturalWidth);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    logoCache = canvas.toDataURL('image/jpeg', 0.85);
  } catch { logoCache = null; }
  return logoCache;
}

/** Nettoie le texte pour la police PDF (retire les émojis et caractères hors police). */
const clean = (s: string) => String(s ?? '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/[  ]/g, ' ');

export const pdfFileName = (base: string) =>
  base.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.pdf';

async function newDoc(title: string, subtitle: string, landscape = false) {
  const {jsPDF} = await import('jspdf');
  const doc = new jsPDF({orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4'});
  const img = await logo();
  let x = 14;
  if (img) { doc.addImage(img, 'JPEG', 14, 10, 22, 19.4); x = 40; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(...NAVY);
  doc.text(clean(title), x, 18);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...GOLD);
  doc.text(clean(`COM’FRAT — LES PERSÉVÉRANTS · ${subtitle}`).toUpperCase(), x, 24.5);
  return {doc, top: 36};
}

function footer(doc: import('jspdf').jsPDF) {
  const pages = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GREY);
    doc.text('COM’FRAT — Les Persévérants · Chaque personne compte.', 14, h - 8);
    doc.text(`Page ${i} / ${pages}`, w - 14, h - 8, {align: 'right'});
  }
}

/** Liste sous forme de tableau (présents, répertoire, à recontacter, récap…). */
export async function downloadTablePdf(opts: {
  title: string; subtitle: string; summary?: string; head: string[]; body: (string | number)[][];
  filename: string; landscape?: boolean; columnStyles?: Record<number, {cellWidth?: number | 'auto' | 'wrap'; halign?: 'left' | 'right' | 'center'; fontStyle?: 'bold' | 'normal'}>;
}) {
  const {doc, top} = await newDoc(opts.title, opts.subtitle, opts.landscape);
  const autoTable = (await import('jspdf-autotable')).default;
  let y = top;
  if (opts.summary) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...GREY);
    doc.text(clean(opts.summary), 14, y); y += 5;
  }
  autoTable(doc, {
    startY: y,
    head: [opts.head.map(clean)],
    body: opts.body.map((r) => r.map((c) => clean(String(c ?? '')))),
    margin: {left: 14, right: 14, bottom: 16},
    styles: {font: 'helvetica', fontSize: 9, cellPadding: 2.4, textColor: [27, 45, 63], lineColor: LINE, lineWidth: 0.1, overflow: 'linebreak'},
    headStyles: {fillColor: [246, 236, 221], textColor: [122, 106, 79], fontStyle: 'bold', fontSize: 8},
    alternateRowStyles: {fillColor: [253, 250, 244]},
    columnStyles: opts.columnStyles,
  });
  footer(doc);
  doc.save(opts.filename);
}

export type PrayerPdfItem = {first: string; last: string; status: string; date: string; prayer?: string; testimony?: string};

/** Prières et témoignages : une fiche par personne, nom en gras, date dorée, encadrés de couleur. */
export async function downloadPrayersPdf(opts: {subtitle: string; summary: string; items: PrayerPdfItem[]; filename: string}) {
  const {doc, top} = await newDoc('Prières et témoignages', opts.subtitle);
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const left = 14, width = W - 28, bottom = H - 16;
  let y = top;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...GREY);
  doc.text(clean(opts.summary), left, y); y += 6;

  const boxes = (it: PrayerPdfItem) => [
    ...(it.prayer ? [{label: 'SUJET DE PRIÈRE', text: it.prayer, fill: [253, 241, 220] as RGB, bar: [217, 143, 15] as RGB, color: [154, 90, 0] as RGB}] : []),
    ...(it.testimony ? [{label: 'TÉMOIGNAGE', text: it.testimony, fill: [233, 245, 238] as RGB, bar: [63, 154, 104] as RGB, color: [45, 116, 80] as RGB}] : []),
  ];

  for (const it of opts.items) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    const blocks = boxes(it).map((b) => ({...b, lines: doc.splitTextToSize(clean(b.text), width - 16) as string[]}));
    const cardH = 14 + blocks.reduce((h, b) => h + 10 + b.lines.length * 5.2 + 3, 0) + 2;
    if (y + Math.min(cardH, bottom - top) > bottom) { doc.addPage(); y = 16; }

    // Carte
    doc.setDrawColor(...LINE); doc.setFillColor(255, 253, 248); doc.setLineWidth(0.3);
    doc.roundedRect(left, y, width, cardH, 3, 3, 'FD');
    // Nom + statut + date
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...NAVY);
    const name = clean(`${it.last.toUpperCase()} ${it.first}`);
    doc.text(name, left + 5, y + 8);
    if (it.status) {
      const nx = left + 5 + doc.getTextWidth(name) + 3;
      doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      const sw = doc.getTextWidth(clean(it.status)) + 5;
      doc.setFillColor(246, 236, 221); doc.roundedRect(nx, y + 4.3, sw, 5, 2.5, 2.5, 'F');
      doc.setTextColor(122, 106, 79); doc.text(clean(it.status), nx + 2.5, y + 7.7);
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...GOLD);
    doc.text(clean(it.date), left + width - 5, y + 8, {align: 'right'});
    doc.setDrawColor(238, 227, 208); doc.line(left + 5, y + 11.5, left + width - 5, y + 11.5);

    let by = y + 14;
    for (const b of blocks) {
      const bh = 8 + b.lines.length * 5.2 + 2;
      doc.setFillColor(...b.fill); doc.roundedRect(left + 5, by, width - 10, bh, 2, 2, 'F');
      doc.setFillColor(...b.bar); doc.rect(left + 5, by, 1.6, bh, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...b.color);
      doc.text(b.label, left + 10, by + 5.2);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(27, 45, 63);
      doc.text(b.lines, left + 10, by + 10.8, {lineHeightFactor: 1.35});
      by += bh + 3;
    }
    y += cardH + 5;
  }
  if (!opts.items.length) { doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.text('Aucun partage pour ce choix.', left, y + 4); }
  footer(doc);
  doc.save(opts.filename);
}
