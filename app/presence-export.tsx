'use client';
import {useState} from 'react';
import {Copy, Send, Share2, Printer, MessageSquare, FileSpreadsheet} from 'lucide-react';
import {dateLabel} from './dates';
import {downloadCsv, escapeHtml, openPrintWindow} from './print-window';

export type PresenceRow = {first: string; last: string; status: string; parent: string; time: string; mode: string};

/** Heure d'arrivée à Paris (« 10 h 32 »). */
const hour = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris'}).replace(':', ' h ');
};

/**
 * Export de la liste des présents d'une rencontre (responsables uniquement) :
 * copier, e-mail, WhatsApp, partager, imprimer / PDF et fichier Excel (CSV).
 */
export default function PresenceExport({day, rows}: {day: string; rows: PresenceRow[]}) {
  const [notice, setNotice] = useState('');
  const sorted = [...rows].sort((a, b) => a.last.localeCompare(b.last, 'fr') || a.first.localeCompare(b.first, 'fr'));
  const kids = sorted.filter((r) => r.status === 'Enfant').length;
  const dayText = day ? dateLabel(day, {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'}) : '';
  const totalText = `${sorted.length} présent${sorted.length > 1 ? 's' : ''}${kids ? ` dont ${kids} enfant${kids > 1 ? 's' : ''}` : ''}`;

  const text = `COM’FRAT — Les Persévérants\nPrésents à la rencontre du ${dayText}\n${totalText}\n\n` +
    sorted.map((r, i) => `${i + 1}. ${r.first} ${r.last} — ${r.status}${r.parent ? ` (Parent : ${r.parent})` : ''}`).join('\n');

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(''), 4000); };
  async function copy() {
    try { await navigator.clipboard.writeText(text); flash('Liste copiée. Vous pouvez la coller dans un message.'); }
    catch { flash('Copie impossible depuis ce navigateur.'); }
  }
  async function share() {
    try { await navigator.share({title: 'Présents — COM’FRAT', text}); } catch { /* partage annulé */ }
  }
  function print() {
    const body = `<table><thead><tr><th>#</th><th>Nom</th><th>Statut</th><th>Arrivée</th></tr></thead><tbody>` +
      sorted.map((r, i) => `<tr><td>${i + 1}</td><td><strong>${escapeHtml(r.first + ' ' + r.last)}</strong>${r.parent ? `<br><small>Parent : ${escapeHtml(r.parent)}</small>` : ''}</td><td>${escapeHtml(r.status)}</td><td>${hour(r.time)}</td></tr>`).join('') +
      `</tbody></table><p class="total">${totalText}</p>`;
    if (!openPrintWindow('Présents à la rencontre', dayText, body)) flash('Autorisez l’ouverture d’une nouvelle fenêtre pour imprimer.');
  }
  function excel() {
    downloadCsv(`presents-${day}.csv`, [
      ['Prénom', 'Nom', 'Statut', 'Parent', 'Heure d’arrivée', 'Enregistré par'],
      ...sorted.map((r) => [r.first, r.last, r.status, r.parent, hour(r.time), r.mode]),
    ]);
  }

  const empty = sorted.length === 0;
  const mailto = `mailto:?subject=${encodeURIComponent('Présents COM’FRAT — ' + dayText)}&body=${encodeURIComponent(text)}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <div className="feedback-export presence-export">
      <div className="feedback-export-filters">
        <span className="presence-export-title">Exporter la liste du {day ? dateLabel(day, {day: 'numeric', month: 'long', year: 'numeric'}) : '…'}</span>
        <span className="feedback-export-count">{totalText}</span>
      </div>
      <div className="feedback-export-actions">
        <button className="secondary" onClick={copy} disabled={empty}><Copy size={15}/> Copier</button>
        <a className={'secondary' + (empty ? ' disabled' : '')} href={empty ? undefined : mailto}><Send size={15}/> E-mail</a>
        <a className={'secondary' + (empty ? ' disabled' : '')} href={empty ? undefined : wa} target="_blank" rel="noopener noreferrer"><MessageSquare size={15}/> WhatsApp</a>
        {typeof navigator !== 'undefined' && 'share' in navigator && <button className="secondary" onClick={() => void share()} disabled={empty}><Share2 size={15}/> Partager</button>}
        <button className="secondary" onClick={print} disabled={empty}><Printer size={15}/> Imprimer / PDF</button>
        <button className="secondary" onClick={excel} disabled={empty}><FileSpreadsheet size={15}/> Excel</button>
      </div>
      {notice && <p className="feedback-export-notice" role="status">{notice}</p>}
    </div>
  );
}
