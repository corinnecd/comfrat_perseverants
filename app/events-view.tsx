'use client';
import {useCallback, useEffect, useState} from 'react';
import {CalendarPlus, Check, ChevronDown, ChevronUp, Clock, Maximize2, Play, Search, Square, Trash2, X} from 'lucide-react';
import {dateLabel} from './dates';
import type {Person} from './data';
import PresenceExport from './presence-export';

type EventItem = {id: string; name: string; day: string; opens_at: string; closes_at: string; token: string; present: number; status: 'upcoming' | 'open' | 'closed'};
type Attendee = {person: string; time: string; mode: string; first: string; last: string; status: string; parent: string | null; vehicle: string | null};

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris'});
const hourLabel = (iso: string) => hhmm(iso).replace(':', ' h ');
const parisDayOf = (iso: string) => new Date(iso).toLocaleDateString('en-CA', {timeZone: 'Europe/Paris'});
/** Jour de fermeture affiché juste si différent de l'ouverture (veillée qui traverse minuit). */
const closeHourLabel = (opens: string, closes: string) => parisDayOf(opens) === parisDayOf(closes)
  ? hourLabel(closes)
  : hourLabel(closes) + ' (lendemain)';
const STATUS_LABEL = {upcoming: 'À venir', open: 'Scan ouvert', closed: 'Terminé'} as const;
const normalize = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Prochain dimanche (ou aujourd'hui si on est dimanche), pour pré-remplir la date. */
function nextSunday() {
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return d.toLocaleDateString('en-CA', {timeZone: 'Europe/Paris'});
}

/**
 * Événements ponctuels (culte du matin, service, rencontre spéciale) : chacun a son QR et sa liste de présents.
 * Ces présences ne comptent pas dans les statistiques de la Com'Frat.
 */
export default function EventsView({people}: {people: Person[]}) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({name: 'Culte du matin', day: nextSunday(), opens: '08:30', closes: '13:00'});
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const r = await fetch('/api/events', {cache: 'no-store'});
    const b = (await r.json()) as {events?: EventItem[]; error?: string};
    if (!r.ok) throw Error(b.error || 'Événements indisponibles.');
    setEvents(b.events || []);
  }, []);
  const loadAttendees = useCallback(async (id: string) => {
    const r = await fetch('/api/events?id=' + encodeURIComponent(id), {cache: 'no-store'});
    const b = (await r.json()) as {attendees?: Attendee[]; error?: string};
    if (!r.ok) throw Error(b.error || 'Présents indisponibles.');
    setAttendees(b.attendees || []);
  }, []);

  useEffect(() => {
    let live = true;
    load().catch((e) => { if (live) setError((e as Error).message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [load]);

  async function post(body: Record<string, unknown>, success?: string) {
    setBusy(true); setError(''); setMessage('');
    try {
      const r = await fetch('/api/events', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
      const b = (await r.json()) as {error?: string; alreadyPresent?: boolean; id?: string};
      if (!r.ok) throw Error(b.error || 'Action impossible.');
      await load();
      if (openId) await loadAttendees(openId);
      if (success) setMessage(b.alreadyPresent ? 'Déjà enregistré·e pour cet événement.' : success);
      return b;
    } catch (e) { setError((e as Error).message); return null; } finally { setBusy(false); }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const b = await post({action: 'create', ...form}, `« ${form.name} » est créé. Son QR s’ouvrira automatiquement à ${form.opens.replace(':', ' h ')}.`);
    if (b) setShowForm(false);
  }

  async function toggle(id: string) {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id); setQuery(''); setAttendees([]);
    try { await loadAttendees(id); } catch (e) { setError((e as Error).message); }
  }

  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const attendeeIds = new Set(attendees.map((a) => a.person));
  const matches = terms.length && normalize(query).length >= 2
    ? people.filter((p) => terms.every((t) => normalize(p.first + ' ' + p.last).includes(t))).slice(0, 6)
    : [];

  return (
    <section className="card events-card">
      <div className="card-heading">
        <div><h2><CalendarPlus size={18}/> Événements</h2><p>Culte du matin, service, rencontre spéciale : chaque événement a son propre QR et sa liste de présents, à part de la Com’Frat.</p></div>
        <button className="primary" onClick={() => setShowForm((v) => !v)}><CalendarPlus size={16}/> Nouvel événement</button>
      </div>

      {showForm && (
        <form className="event-form" onSubmit={create}>
          <label>Nom de l’événement<input required maxLength={120} value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}/></label>
          <label>Date<input type="date" required value={form.day} onChange={(e) => setForm({...form, day: e.target.value})}/></label>
          <label>Ouverture du scan<input type="time" required value={form.opens} onChange={(e) => setForm({...form, opens: e.target.value})}/></label>
          <label>Fermeture du scan<input type="time" required value={form.closes} onChange={(e) => setForm({...form, closes: e.target.value})}/></label>
          <div className="event-form-actions">
            <button className="primary" disabled={busy}><Check size={16}/> Créer l’événement</button>
            <button type="button" className="secondary" onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </form>
      )}

      {message && <p className="children-notice event-message" role="status"><Check size={16}/> {message}</p>}
      {error && <p className="form-error event-message" role="alert">{error}</p>}

      {loading ? <p className="empty">Chargement…</p> : events.length === 0 ? (
        <div className="empty"><CalendarPlus size={28}/><h3>Aucun événement pour le moment</h3><p>Créez-en un pour le culte du matin ou un service : il aura son propre QR.</p></div>
      ) : (
        <ul className="event-list">
          {events.map((ev) => (
            <li key={ev.id} className={'event-item ' + ev.status}>
              <div className="event-item-head">
                <div>
                  <strong>{ev.name}</strong>
                  <small>{dateLabel(ev.day, {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})} · <Clock size={12}/> {hourLabel(ev.opens_at)} – {closeHourLabel(ev.opens_at, ev.closes_at)}</small>
                </div>
                <span className={'event-badge ' + ev.status}>{STATUS_LABEL[ev.status]}</span>
                <span className="count-pill">{ev.present} présent{ev.present > 1 ? 's' : ''}</span>
              </div>
              <div className="event-item-actions">
                <a className="secondary" href={'/evenement/qr?e=' + encodeURIComponent(ev.token)} target="_blank" rel="noopener"><Maximize2 size={15}/> Afficher le QR</a>
                {ev.status !== 'open' && ev.status !== 'closed' && <button className="secondary" disabled={busy} onClick={() => void post({action: 'open', id: ev.id}, 'Scan ouvert.')}><Play size={15}/> Ouvrir maintenant</button>}
                {ev.status === 'closed' && <button className="secondary" disabled={busy} onClick={() => void post({action: 'open', id: ev.id}, 'Scan rouvert.')}><Play size={15}/> Rouvrir</button>}
                {ev.status === 'open' && <button className="secondary" disabled={busy} onClick={() => void post({action: 'close', id: ev.id}, 'Scan fermé.')}><Square size={15}/> Fermer le scan</button>}
                <button className="secondary" onClick={() => void toggle(ev.id)}>{openId === ev.id ? <ChevronUp size={15}/> : <ChevronDown size={15}/>} Voir les présents</button>
                {ev.present === 0 && <button className="secondary event-delete" disabled={busy} onClick={() => { if (window.confirm(`Supprimer « ${ev.name} » ?`)) void post({action: 'delete', id: ev.id}, 'Événement supprimé.'); }}><Trash2 size={15}/> Supprimer</button>}
              </div>

              {openId === ev.id && (
                <div className="event-detail">
                  <PresenceExport day={ev.day} label={ev.name} rows={attendees.map((a) => ({first: a.first, last: a.last, status: a.status, parent: a.parent || '', time: a.time, mode: a.mode, vehicle: a.vehicle}))}/>
                  <label className="search event-search"><Search size={16}/><input placeholder="Ajouter une présence : nom ou prénom…" value={query} onChange={(e) => setQuery(e.target.value)}/></label>
                  {matches.length > 0 && (
                    <ul className="accueil-results">
                      {matches.map((p) => (
                        <li key={p.id}>
                          <span><strong>{p.first} {p.last}</strong></span>
                          {attendeeIds.has(p.id)
                            ? <span className="children-present"><Check size={15}/> Présent·e</span>
                            : <button className="primary" disabled={busy} onClick={() => void post({action: 'attend', id: ev.id, person: p.id}, `${p.first} ${p.last} est enregistré·e.`)}><Check size={15}/> Présent·e</button>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {attendees.length === 0 ? <p className="accueil-hint">Personne pour l’instant.</p> : (
                    <ul className="event-attendees">
                      {attendees.map((a) => (
                        <li key={a.person} className={a.status === 'Enfant' ? 'child-row' : undefined}>
                          <span className="avatar">{a.first[0]}{a.last[0]}</span>
                          <span><strong>{a.first} {a.last}</strong>{a.parent && <span className="parent-label"> (Parent : {a.parent})</span>}<small>{a.status} · {hourLabel(a.time)} · {a.mode}</small></span>
                          <button className="arrow-button" title="Retirer cette présence" disabled={busy} onClick={() => { if (window.confirm(`Retirer la présence de ${a.first} ${a.last} ?`)) void post({action: 'unattend', id: ev.id, person: a.person}, 'Présence retirée.'); }}><X size={16}/></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
