'use client';
import {useMemo, useState} from 'react';
import {Copy, Send, Share2, Printer, MessageSquare, FileDown, FileSpreadsheet} from 'lucide-react';
import {downloadPrayersPdf, pdfFileName} from './pdf-export';
import {downloadCsv} from './print-window';
import {dateLabel} from './dates';
import {escapeHtml, openPrintWindow} from './print-window';

type FeedbackItem = {
  person: string;
  day: string;
  first: string;
  last: string;
  status: string;
  prayer_requested: number;
  prayer_text: string;
  testimony_requested: number;
  testimony_text: string;
};

/**
 * Barre d'outils d'export des prières et témoignages (responsables uniquement).
 * - Choix de la période : toutes, dernière rencontre, ce mois, ou une date précise.
 * - Choix du contenu : prières, témoignages, ou les deux.
 * - Boutons : copier, e-mail, WhatsApp, partager (téléphone), imprimer / PDF.
 * Rien n'est envoyé : l'export reste dans l'appareil du responsable.
 */
export default function FeedbackToolbar({feedback}: {feedback: FeedbackItem[]}) {
  const [period, setPeriod] = useState<'all' | 'last' | 'month' | 'day'>('all');
  const [kind, setKind] = useState<'both' | 'prayers' | 'testimonies'>('both');
  const [day, setDay] = useState<string>('');
  const [notice, setNotice] = useState('');

  // Dates disponibles (dimanches avec au moins un partage), les plus récentes en premier.
  const days = useMemo(() => [...new Set(feedback.map((f) => f.day))].sort().reverse(), [feedback]);
  const lastDay = days[0];

  const filtered = useMemo(() => {
    const now = new Date();
    const yyyyMm = now.toISOString().slice(0, 7);
    return feedback.filter((f) => {
      if (period === 'last' && f.day !== lastDay) return false;
      if (period === 'month' && !f.day.startsWith(yyyyMm)) return false;
      if (period === 'day' && f.day !== day) return false;
      if (kind === 'prayers' && f.prayer_requested !== 1) return false;
      if (kind === 'testimonies' && f.testimony_requested !== 1) return false;
      return true;
    });
  }, [feedback, period, kind, day, lastDay]);

  const periodLabel = period === 'all' ? 'toutes rencontres confondues'
    : period === 'last' ? `rencontre du ${lastDay ? dateLabel(lastDay, {day: 'numeric', month: 'long', year: 'numeric'}) : '—'}`
    : period === 'month' ? `au cours du mois de ${dateLabel(new Date().toISOString().slice(0, 10), {month: 'long', year: 'numeric'})}`
    : day ? `rencontre du ${dateLabel(day, {day: 'numeric', month: 'long', year: 'numeric'})}` : 'date non choisie';

  const text = useMemo(() => {
    const title = `COM’FRAT — Les Persévérants\nPrières et témoignages · ${periodLabel}\n\n`;
    if (filtered.length === 0) return title + '(Aucun partage pour ce choix.)';
    const blocks = filtered.map((f) => {
      const parts: string[] = [`• ${f.first} ${f.last} — ${dateLabel(f.day, {day: 'numeric', month: 'long', year: 'numeric'})}`];
      if ((kind === 'both' || kind === 'prayers') && f.prayer_requested === 1 && f.prayer_text) {
        parts.push(`  Prière : ${f.prayer_text}`);
      }
      if ((kind === 'both' || kind === 'testimonies') && f.testimony_requested === 1 && f.testimony_text) {
        parts.push(`  Témoignage : ${f.testimony_text}`);
      }
      return parts.join('\n');
    });
    return title + blocks.join('\n\n');
  }, [filtered, kind, periodLabel]);

  async function copy() {
    try { await navigator.clipboard.writeText(text); setNotice('Copié. Vous pouvez le coller où vous voulez.'); }
    catch { setNotice('Copie impossible depuis ce navigateur.'); }
    setTimeout(() => setNotice(''), 4000);
  }
  async function share() {
    try { await navigator.share({title: 'Prières et témoignages — COM’FRAT', text}); } catch { /* partage annulé */ }
  }
  function printPdf() {
    const prayers = filtered.filter((f) => (kind === 'both' || kind === 'prayers') && f.prayer_requested === 1 && f.prayer_text).length;
    const testimonies = filtered.filter((f) => (kind === 'both' || kind === 'testimonies') && f.testimony_requested === 1 && f.testimony_text).length;
    const parts: string[] = [];
    if (kind !== 'testimonies') parts.push(`${prayers} sujet${prayers > 1 ? 's' : ''} de prière`);
    if (kind !== 'prayers') parts.push(`${testimonies} témoignage${testimonies > 1 ? 's' : ''}`);
    let html = `<p class="pt-summary">${parts.join(' · ')}</p>`;
    for (const f of filtered) {
      const date = dateLabel(f.day, {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
      html += `<article class="pt-card"><header class="pt-head"><div><span class="pt-last">${escapeHtml(f.last.toUpperCase())}</span> <span class="pt-first">${escapeHtml(f.first)}</span>${f.status ? `<span class="pt-status">${escapeHtml(f.status)}</span>` : ''}</div><span class="pt-date">${date.replace(/^./, (c) => c.toUpperCase())}</span></header>`;
      if ((kind === 'both' || kind === 'prayers') && f.prayer_requested === 1 && f.prayer_text) html += `<section class="pt-box pt-prayer"><h3>🙏 Sujet de prière</h3><p>${escapeHtml(f.prayer_text)}</p></section>`;
      if ((kind === 'both' || kind === 'testimonies') && f.testimony_requested === 1 && f.testimony_text) html += `<section class="pt-box pt-testimony"><h3>✨ Témoignage</h3><p>${escapeHtml(f.testimony_text)}</p></section>`;
      html += '</article>';
    }
    if (!filtered.length) html = '<p>Aucun partage pour ce choix.</p>';
    const css = `
      .pt-summary{font-family:Arial,sans-serif;font-size:13px;color:#5b6b7b;margin:0 0 18px}
      .pt-card{border:1px solid #e3d9c7;border-radius:12px;padding:16px 18px;margin:0 0 14px;background:#fffdf8;break-inside:avoid;page-break-inside:avoid}
      .pt-card+.pt-card{border-top:1px solid #e3d9c7}
      .pt-head{display:flex;justify-content:space-between;align-items:baseline;gap:16px;margin:0 0 12px;padding:0 0 10px;border-bottom:1px solid #eee3d0;font-family:Arial,sans-serif}
      .pt-last{font-size:17px;font-weight:800;color:#001b35;letter-spacing:.3px}
      .pt-first{font-size:17px;font-weight:700;color:#001b35}
      .pt-status{display:inline-block;margin-left:10px;font-size:11px;font-weight:600;color:#7a6a4f;background:#f6ecdd;border-radius:999px;padding:2px 9px;vertical-align:middle}
      .pt-date{font-size:13px;font-weight:700;color:#9a6510;white-space:nowrap}
      .pt-box{border-radius:8px;padding:10px 14px;margin:10px 0 0;border-left:5px solid}
      .pt-box h3{margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase}
      .pt-box p{margin:0;font-size:15px;font-weight:700;line-height:1.5;color:#1b2d3f;white-space:pre-wrap}
      .pt-prayer{background:#fdf1dc;border-color:#d98f0f}.pt-prayer h3{color:#9a5a00}
      .pt-testimony{background:#e9f5ee;border-color:#3f9a68}.pt-testimony h3{color:#2d7450}`;
    if (!openPrintWindow('Prières et témoignages', periodLabel, html, css, true)) setNotice('Autorisez l’ouverture d’une nouvelle fenêtre pour imprimer.');
  }


  const wantPrayer = (f: FeedbackItem) => (kind === 'both' || kind === 'prayers') && f.prayer_requested === 1 && !!f.prayer_text;
  const wantTestimony = (f: FeedbackItem) => (kind === 'both' || kind === 'testimonies') && f.testimony_requested === 1 && !!f.testimony_text;
  function summaryText() {
    const prayers = filtered.filter(wantPrayer).length, testimonies = filtered.filter(wantTestimony).length;
    const parts: string[] = [];
    if (kind !== 'testimonies') parts.push(`${prayers} sujet${prayers > 1 ? 's' : ''} de prière`);
    if (kind !== 'prayers') parts.push(`${testimonies} témoignage${testimonies > 1 ? 's' : ''}`);
    return parts.join(' · ');
  }
  async function exportPdf() {
    try {
      await downloadPrayersPdf({
        subtitle: periodLabel, summary: summaryText(),
        items: filtered.map((f) => ({first: f.first, last: f.last, status: f.status,
          date: dateLabel(f.day, {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'}).replace(/^./, (c) => c.toUpperCase()),
          prayer: wantPrayer(f) ? f.prayer_text : undefined, testimony: wantTestimony(f) ? f.testimony_text : undefined})),
        filename: pdfFileName(`prieres-temoignages-${period === 'day' && day ? day : period}`),
      });
    } catch { setNotice('Export PDF impossible. Réessayez.'); }
  }
  function exportExcel() {
    downloadCsv(`prieres-temoignages-${period === 'day' && day ? day : period}.csv`, [
      ['Date', 'Prénom', 'Nom', 'Statut', 'Sujet de prière', 'Témoignage'],
      ...filtered.map((f) => [f.day, f.first, f.last, f.status, wantPrayer(f) ? f.prayer_text : '', wantTestimony(f) ? f.testimony_text : '']),
    ]);
  }

  const mailto = `mailto:?subject=${encodeURIComponent('Prières et témoignages — COM’FRAT')}&body=${encodeURIComponent(text)}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <div className="feedback-export">
      <div className="feedback-export-filters">
        <label>Période
          <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
            <option value="all">Toutes les rencontres</option>
            <option value="last" disabled={!lastDay}>Dernière rencontre</option>
            <option value="month">Ce mois-ci</option>
            <option value="day">Une rencontre précise…</option>
          </select>
        </label>
        {period === 'day' && (
          <label>Rencontre
            <select value={day} onChange={(e) => setDay(e.target.value)}>
              <option value="">Choisir…</option>
              {days.map((d) => <option key={d} value={d}>{dateLabel(d, {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}</option>)}
            </select>
          </label>
        )}
        <label>Contenu
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="both">Prières et témoignages</option>
            <option value="prayers">Prières seulement</option>
            <option value="testimonies">Témoignages seulement</option>
          </select>
        </label>
        <span className="feedback-export-count">{filtered.length} partage{filtered.length > 1 ? 's' : ''}</span>
      </div>
      <div className="feedback-export-actions">
        <button className="secondary" onClick={copy} disabled={filtered.length === 0}><Copy size={15}/> Copier</button>
        <a className={'secondary' + (filtered.length === 0 ? ' disabled' : '')} href={filtered.length === 0 ? undefined : mailto}><Send size={15}/> E-mail</a>
        <a className={'secondary' + (filtered.length === 0 ? ' disabled' : '')} href={filtered.length === 0 ? undefined : wa} target="_blank" rel="noopener noreferrer"><MessageSquare size={15}/> WhatsApp</a>
        {typeof navigator !== 'undefined' && 'share' in navigator && <button className="secondary" onClick={() => void share()} disabled={filtered.length === 0}><Share2 size={15}/> Partager</button>}
        <button className="secondary export-strong" onClick={() => void exportPdf()} disabled={filtered.length === 0}><FileDown size={15}/> Exporter PDF</button>
        <button className="secondary export-strong" onClick={exportExcel} disabled={filtered.length === 0}><FileSpreadsheet size={15}/> Exporter Excel</button>
        <button className="secondary" onClick={printPdf} disabled={filtered.length === 0}><Printer size={15}/> Imprimer</button>
      </div>
      {notice && <p className="feedback-export-notice" role="status">{notice}</p>}
    </div>
  );
}
