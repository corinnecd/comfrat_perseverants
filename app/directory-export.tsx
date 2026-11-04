'use client';
import {useState} from 'react';
import {Copy, Send, Share2, Printer, MessageSquare, FileSpreadsheet, FileDown} from 'lucide-react';
import {downloadTablePdf, pdfFileName} from './pdf-export';
import {dateLabel} from './dates';
import {BIRTH_MONTHS, vehicleLabel} from './person-details';
import {computeAge} from './birthday-utils';
import {downloadCsv, escapeHtml, openPrintWindow} from './print-window';

export type DirectoryRow = {
  first: string; last: string; status: string; phone: string; email: string; city: string; department: string;
  birthday_day?: number | null; birthday_month?: number | null; birthday_year?: number | null; age_range?: string | null; parent: string; lastPresence: string; vehicle?: string | null;
};

const birthday = (r: DirectoryRow) => r.birthday_day && r.birthday_month ? `${r.birthday_day === 1 ? '1er' : r.birthday_day} ${BIRTH_MONTHS[r.birthday_month - 1].toLowerCase()}${r.birthday_year ? ' ' + r.birthday_year : ''}` : '';
const ageOf = (r: DirectoryRow, asOf: string) => { const a = computeAge(r.birthday_day, r.birthday_month, r.birthday_year, asOf); return a !== null ? `${a} an${a > 1 ? 's' : ''}` : r.age_range || ''; };
const veh = (r: DirectoryRow) => r.status === 'Enfant' ? '' : vehicleLabel(r.vehicle) || 'Non renseigné';
const last = (r: DirectoryRow) => r.lastPresence ? dateLabel(r.lastPresence, {day: 'numeric', month: 'long', year: 'numeric'}) : '';

/**
 * Export du répertoire (ou de la liste « À recontacter ») tel qu'il est affiché, filtres compris :
 * copier, e-mail, WhatsApp, partager, imprimer / PDF et Excel. Responsables uniquement.
 */
export default function DirectoryExport({title, filterLabel, rows}: {title: string; filterLabel: string; rows: DirectoryRow[]}) {
  const [notice, setNotice] = useState('');
  const sorted = [...rows].sort((a, b) => a.last.localeCompare(b.last, 'fr') || a.first.localeCompare(b.first, 'fr'));
  const today = new Date().toLocaleDateString('en-CA', {timeZone: 'Europe/Paris'});
  const subtitle = `${filterLabel} · au ${dateLabel(today, {day: 'numeric', month: 'long', year: 'numeric'})}`;
  const count = `${sorted.length} personne${sorted.length > 1 ? 's' : ''}`;

  const text = `COM’FRAT — Les Persévérants\n${title} (${subtitle})\n${count}\n\n` + sorted.map((r, i) =>
    `${i + 1}. ${r.first} ${r.last} — ${r.status}${r.parent ? ` (Parent : ${r.parent})` : ''}${r.phone ? `\n   ${r.phone}` : ''}${veh(r) ? `\n   Véhiculé(e) : ${veh(r)}` : ''}`).join('\n');

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(''), 4000); };
  async function copy() {
    try { await navigator.clipboard.writeText(text); flash('Liste copiée. Vous pouvez la coller dans un message.'); }
    catch { flash('Copie impossible depuis ce navigateur.'); }
  }
  async function share() {
    try { await navigator.share({title: `${title} — COM’FRAT`, text}); } catch { /* partage annulé */ }
  }
  function print() {
    const body = `<table><thead><tr><th>#</th><th>Nom</th><th>Statut</th><th>Contact</th><th>Véhiculé(e)</th><th>Anniversaire</th><th>Âge</th><th>Dernière présence</th></tr></thead><tbody>` +
      sorted.map((r, i) => `<tr${r.status === 'Enfant' ? ' class="child"' : ''}><td>${i + 1}</td><td><strong>${escapeHtml(r.first + ' ' + r.last)}</strong>${r.parent ? `<br><small>Parent : ${escapeHtml(r.parent)}</small>` : ''}${r.city ? `<br><small>${escapeHtml(r.city)}${r.department ? ' · ' + escapeHtml(r.department) : ''}</small>` : ''}</td><td>${escapeHtml(r.status)}</td><td>${escapeHtml(r.phone)}${r.email ? `<br><small>${escapeHtml(r.email)}</small>` : ''}</td><td>${veh(r)}</td><td>${birthday(r)}</td><td>${ageOf(r, today)}</td><td>${last(r)}</td></tr>`).join('') +
      `</tbody></table><p class="total">${count}</p>`;
    if (!openPrintWindow(title, subtitle, body)) flash('Autorisez l’ouverture d’une nouvelle fenêtre pour imprimer.');
  }
  async function pdf() {
    try {
      await downloadTablePdf({
        title, subtitle, summary: count, landscape: true,
        head: ['#', 'Nom', 'Statut', 'Téléphone', 'E-mail', 'Ville', 'Véhiculé(e)', 'Anniversaire', 'Âge', 'Dernière présence'],
        body: sorted.map((r, i) => [i + 1, `${r.first} ${r.last}${r.parent ? `\nParent : ${r.parent}` : ''}`, r.status, r.phone, r.email, [r.city, r.department].filter(Boolean).join(' · '), veh(r), birthday(r), ageOf(r, today), last(r)]),
        filename: pdfFileName(`${title}-${today}`),
        highlightRows: sorted.flatMap((r, i) => (r.status === 'Enfant' ? [i] : [])), highlightLegend: 'Enfants',
        columnStyles: {0: {cellWidth: 10, halign: 'right'}, 1: {fontStyle: 'bold'}},
      });
    } catch { flash('Export PDF impossible. Réessayez.'); }
  }
  function excel() {
    const slug = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    downloadCsv(`${slug}-${today}.csv`, [
      ['Prénom', 'Nom', 'Statut', 'Téléphone', 'E-mail', 'Ville', 'Département', 'Véhiculé(e)', 'Anniversaire', 'Âge', 'Parent', 'Dernière présence'],
      ...sorted.map((r) => [r.first, r.last, r.status, r.phone, r.email, r.city, r.department, veh(r), birthday(r), ageOf(r, today), r.parent, r.lastPresence]),
    ]);
  }

  const empty = sorted.length === 0;
  const mailto = `mailto:?subject=${encodeURIComponent(`${title} COM’FRAT — ${count}`)}&body=${encodeURIComponent(text)}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <div className="feedback-export presence-export">
      <div className="feedback-export-filters">
        <span className="presence-export-title">Exporter {filterLabel === 'tous les statuts' ? 'la liste' : 'la liste filtrée'} · {filterLabel}</span>
        <span className="feedback-export-count">{count}</span>
      </div>
      <div className="feedback-export-actions">
        <button className="secondary" onClick={copy} disabled={empty}><Copy size={15}/> Copier</button>
        <a className={'secondary' + (empty ? ' disabled' : '')} href={empty ? undefined : mailto}><Send size={15}/> E-mail</a>
        <a className={'secondary' + (empty ? ' disabled' : '')} href={empty ? undefined : wa} target="_blank" rel="noopener noreferrer"><MessageSquare size={15}/> WhatsApp</a>
        {typeof navigator !== 'undefined' && 'share' in navigator && <button className="secondary" onClick={() => void share()} disabled={empty}><Share2 size={15}/> Partager</button>}
        <button className="secondary export-strong" onClick={() => void pdf()} disabled={empty}><FileDown size={15}/> Exporter PDF</button>
        <button className="secondary export-strong" onClick={excel} disabled={empty}><FileSpreadsheet size={15}/> Exporter Excel</button>
        <button className="secondary" onClick={print} disabled={empty}><Printer size={15}/> Imprimer</button>
      </div>
      {notice && <p className="feedback-export-notice" role="status">{notice}</p>}
    </div>
  );
}
