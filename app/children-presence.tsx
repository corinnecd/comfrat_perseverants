'use client';
import {useState} from 'react';
import {Baby, Check, Plus, UserPlus} from 'lucide-react';
import {BIRTH_MONTHS, CHILD_AGE_RANGES} from './person-details';
import {computeAge} from './birthday-utils';

type Child = {id: string; first: string; last: string; birthday_day: number | null; birthday_month: number | null; birthday_year: number | null; age_range: string | null; present: boolean};
const empty = {first: '', last: '', phone: '', birthday_day: '', birthday_month: '', birthday_year: '', age_range: '', consent: false};
const CURRENT_YEAR = new Date().getUTCFullYear();
/** Années proposées : 18 dernières années, de la plus récente à la plus ancienne (enfants de moins de 16 ans + marge). */
const CHILD_BIRTH_YEARS = Array.from({length: 18}, (_, i) => CURRENT_YEAR - i);

/** Après la confirmation de présence d'un parent : « Mon enfant est présent ». */
export default function ChildrenPresence({token}: {token: string}) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<Child[] | null>(null);
  const [meetingOpen, setMeetingOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function start() {
    setOpen(true); setError(''); setBusy(true);
    try {
      const r = await fetch('/api/children?token=' + encodeURIComponent(token), {cache: 'no-store'});
      const b = (await r.json()) as {children?: Child[]; meetingDay?: string | null; error?: string};
      if (!r.ok) throw Error(b.error || 'Service indisponible.');
      setChildren(b.children || []); setMeetingOpen(!!b.meetingDay); setAdding(!(b.children || []).length);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function send(body: Record<string, unknown>, success: string) {
    setBusy(true); setError(''); setNotice('');
    try {
      const r = await fetch('/api/children', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({token, ...body})});
      const b = (await r.json()) as {children?: Child[]; present?: boolean; error?: string};
      if (!r.ok) throw Error(b.error || 'Enregistrement impossible.');
      setChildren(b.children || []);
      setNotice(body.action === 'add' && b.present === false ? 'Enfant enregistré. Sa présence pourra être confirmée dimanche.' : success);
      return true;
    } catch (e) { setError((e as Error).message); return false; } finally { setBusy(false); }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (await send({action: 'add', ...form}, `${form.first} est bien enregistré·e comme présent·e.`)) { setForm(empty); setAdding(false); }
  }

  const set = (key: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({...f, [key]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value}));

  if (!open) return <button type="button" className="secondary children-start" onClick={start}><Baby size={18}/> Mon enfant est présent</button>;

  return (
    <section className="children-box" aria-labelledby="children-title">
      <h2 id="children-title"><Baby size={20}/> Mes enfants présents</h2>
      <p className="children-intro">Pour les enfants de moins de 16 ans. Ajoutez chaque enfant une seule fois : les dimanches suivants, un clic suffit.</p>
      {children && children.length > 0 && (
        <ul className="children-list">
          {children.map((c) => (
            <li key={c.id}>
              <span><strong>{c.first} {c.last}</strong>{(() => { const age = computeAge(c.birthday_day, c.birthday_month, c.birthday_year, new Date().toISOString().slice(0, 10)); return age !== null ? <small>{age} an{age > 1 ? 's' : ''}</small> : c.age_range ? <small>{c.age_range}</small> : null; })()}</span>
              {c.present
                ? <span className="children-present"><Check size={15}/> Présent·e</span>
                : <button type="button" className="secondary" disabled={busy || !meetingOpen} onClick={() => send({action: 'present', id: c.id}, `${c.first} est bien enregistré·e comme présent·e.`)}><Check size={15}/> Présent·e</button>}
            </li>
          ))}
        </ul>
      )}
      {!meetingOpen && <p className="children-intro">La présence des enfants s’enregistre du samedi 18 h au lundi 22 h.</p>}
      {notice && <p className="children-notice" role="status"><Check size={16}/> {notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {adding ? (
        <form className="registration-form children-form" onSubmit={add}>
          <div className="form-grid">
            <label>Prénom de l’enfant<input required maxLength={200} value={form.first} onChange={set('first')} autoComplete="off"/></label>
            <label>Nom de l’enfant<input required maxLength={200} value={form.last} onChange={set('last')} autoComplete="off"/></label>
            <label>Naissance · jour<select required value={form.birthday_day} onChange={set('birthday_day')}><option value="">Jour</option>{Array.from({length: 31}, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>
            <label>Naissance · mois<select required value={form.birthday_month} onChange={set('birthday_month')}><option value="">Mois</option>{BIRTH_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
            <label>Naissance · année<select required value={form.birthday_year} onChange={set('birthday_year')}><option value="">Année</option>{CHILD_BIRTH_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select></label>
          </div>
          <label>Tranche d’âge<select required value={form.age_range} onChange={set('age_range')}><option value="">Choisir</option>{CHILD_AGE_RANGES.map((a) => <option key={a} value={a}>{a}</option>)}</select></label>
          <label>Téléphone de l’enfant <small>(facultatif)</small><input type="tel" maxLength={25} value={form.phone} onChange={set('phone')} autoComplete="off"/></label>
          <label className="children-consent"><input type="checkbox" required checked={form.consent} onChange={set('consent')}/> Je suis son parent ou responsable légal et j’accepte que ces informations soient enregistrées pour l’accueil des enfants.</label>
          <button className="primary" disabled={busy}><UserPlus size={17}/> {busy ? 'Enregistrement…' : 'Ajouter cet enfant'}</button>
          {children && children.length > 0 && <button type="button" className="text-link" onClick={() => setAdding(false)}>Annuler</button>}
        </form>
      ) : (
        <button type="button" className="secondary" disabled={busy} onClick={() => { setAdding(true); setNotice(''); }}><Plus size={16}/> Ajouter un autre enfant</button>
      )}
    </section>
  );
}
