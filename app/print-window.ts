/** Échappe les caractères HTML (textes saisis par les participants). */
export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c] as string));
}

/**
 * Ouvre une page propre, prête à imprimer ou à enregistrer en PDF
 * (dans la fenêtre d'impression : « Enregistrer au format PDF »).
 * Retourne false si le navigateur a bloqué la nouvelle fenêtre.
 */
export function openPrintWindow(title: string, subtitle: string, bodyHtml: string, extraCss = '', withLogo = false) {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)} — COM’FRAT</title><style>
    body{font-family:Georgia,serif;color:#1b2d3f;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.55}
    h1{font-size:22px;margin:0 0 4px}h2{font-size:12px;color:#9a6510;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 26px;font-family:Arial,sans-serif}
    article{border-top:1px solid #e3d9c7;padding:16px 0}article:first-of-type{border-top:0}
    article header{display:flex;justify-content:space-between;gap:16px;font-size:13px;color:#5b6b7b;margin-bottom:10px}
    article header strong{color:#1b2d3f}section h3{font-size:11px;color:#9a6510;letter-spacing:1px;text-transform:uppercase;margin:8px 0 4px;font-family:Arial,sans-serif}
    section p{margin:0 0 10px;white-space:pre-wrap}
    table{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px}
    th{text-align:left;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#7a6a4f;border-bottom:2px solid #e3d9c7;padding:8px 6px}
    td{border-bottom:1px solid #eee7dd;padding:8px 6px;vertical-align:top}td small{color:#7a6a4f}
    .total{margin-top:16px;font-family:Arial,sans-serif;font-size:13px;color:#5b6b7b}
    tr.child td{background:#fff0cd;color:#6e4a06}tr.child td:first-child{box-shadow:inset 4px 0 0 #e3a529}
    @media print{body{margin:10mm}}
    *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .doc-head{display:flex;align-items:center;gap:18px;margin-bottom:6px}.doc-head img{width:86px;height:auto}
    ${extraCss}
  </style></head><body>${withLogo ? `<div class="doc-head"><img src="${location.origin}/logo-perseverants.png" alt=""><div><h1>${escapeHtml(title)}</h1><h2 style="margin:0">COM’FRAT — Les Persévérants · ${escapeHtml(subtitle)}</h2></div></div><div style="height:22px"></div>` : `<h1>${escapeHtml(title)}</h1><h2>COM’FRAT — Les Persévérants · ${escapeHtml(subtitle)}</h2>`}${bodyHtml}</body></html>`);
  w.document.close();
  w.focus();
  // Attendre le chargement des images (logo) avant d'ouvrir l'impression, 3 s au maximum.
  const images = Array.from(w.document.images).filter((img) => !img.complete);
  const ready = Promise.race([
    Promise.all(images.map((img) => new Promise((resolve) => { img.onload = img.onerror = resolve; }))),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
  void ready.then(() => setTimeout(() => w.print(), 200));
  return true;
}

/** Télécharge un fichier CSV lisible par Excel (séparateur « ; », accents conservés). */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
  const href = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
