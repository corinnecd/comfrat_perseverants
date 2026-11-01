'use client';
import {useMemo, useState} from 'react';
import {Copy, Send, Share2, Printer, MessageSquare} from 'lucide-react';
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
    let html = '';
    for (const f of filtered) {
      html += `<article><header><strong>${escapeHtml(f.first + ' ' + f.last)}</strong><span>${dateLabel(f.day, {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}</span></header>`;
      if ((kind === 'both' || kind === 'prayers') && f.prayer_requested === 1 && f.prayer_text) html += `<section><h3>Sujet de prière</h3><p>${escapeHtml(f.prayer_text)}</p></section>`;
      if ((kind === 'both' || kind === 'testimonies') && f.testimony_requested === 1 && f.testimony_text) html += `<section><h3>Témoignage</h3><p>${escapeHtml(f.testimony_text)}</p></section>`;
      html += '</article>';
    }
    if (!openPrintWindow('Prières et témoignages', periodLabel, html || '<p>Aucun partage pour ce choix.</p>')) setNotice('Autorisez l’ouverture d’une nouvelle fenêtre pour imprimer.');
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
        <button className="secondary" onClick={printPdf} disabled={filtered.length === 0}><Printer size={15}/> Imprimer / PDF</button>
      </div>
      {notice && <p className="feedback-export-notice" role="status">{notice}</p>}
    </div>
  );
}
