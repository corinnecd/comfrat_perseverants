'use client';
import {useState} from 'react';
import {Check, Pencil} from 'lucide-react';
import {AGE_RANGES, BIRTH_MONTHS} from './person-details';

type Fields = {first: string; last: string; email: string; phone: string; city: string; department: string; birthday_day: string; birthday_month: string; age_range: string};

/** « Modifier mes informations » : la personne corrige elle-même sa fiche, sur son propre appareil. */
export default function SelfEdit({token, onSaved}: {token: string; onSaved?: (first: string) => void}) {
  const [values, setValues] = useState<Fields | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function open() {
    setBusy(true); setError(''); setSaved(false);
    try {
      const r = await fetch('/api/me' + (token ? '?token=' + encodeURIComponent(token) : ''), {cache: 'no-store'});
      const b = (await r.json()) as {person?: Record<string, string | number | null>; error?: string};
      if (!r.ok || !b.person) throw Error(b.error || 'Fiche introuvable.');
      const p = b.person;
      setValues({first: String(p.first ?? ''), last: String(p.last ?? ''), email: String(p.email ?? ''), phone: String(p.phone ?? ''), city: String(p.city ?? ''), department: String(p.department ?? ''), birthday_day: p.birthday_day ? String(p.birthday_day) : '', birthday_month: p.birthday_month ? String(p.birthday_month) : '', age_range: p.age_range ? String(p.age_range) : ''});
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!values) return;
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/me', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({token, ...values})});
      const b = (await r.json()) as {error?: string};
      if (!r.ok) throw Error(b.error || 'Enregistrement impossible.');
      setSaved(true); setValues(null); onSaved?.(values.first);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setValues((v) => (v ? {...v, [k]: e.target.value} : v));
  const fields: [keyof Fields, string, string, string?][] = [['first', 'Prénom', 'text', 'given-name'], ['last', 'Nom', 'text', 'family-name'], ['email', 'E-mail', 'email', 'email'], ['phone', 'Téléphone', 'tel', 'tel'], ['city', 'Ville', 'text'], ['department', 'Département', 'text']];

  if (!values) return (
    <div className="self-edit">
      {saved && <p className="children-notice" role="status"><Check size={16}/> Vos informations ont été mises à jour. Merci !</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="button" className="text-link self-edit-open" disabled={busy} onClick={open}><Pencil size={14}/> {busy ? 'Chargement…' : 'Modifier mes informations'}</button>
    </div>
  );

  return (
    <form className="registration-form self-edit-form" onSubmit={save}>
      <h2><Pencil size={18}/> Mes informations</h2>
      <p className="children-intro">Corrigez ce qui a changé. Ces informations restent visibles uniquement par vous et par les responsables.</p>
      <div className="form-grid">
        {fields.map(([k, label, type, auto]) => <label key={k}>{label}<input type={type} required maxLength={200} autoComplete={auto} value={values[k]} onChange={set(k)}/></label>)}
        <label>Anniversaire · jour<select value={values.birthday_day} onChange={set('birthday_day')} required={!!values.birthday_month}><option value="">—</option>{Array.from({length: 31}, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>
        <label>Anniversaire · mois<select value={values.birthday_month} onChange={set('birthday_month')} required={!!values.birthday_day}><option value="">—</option>{BIRTH_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
      </div>
      <label>Tranche d’âge<select value={values.age_range} onChange={set('age_range')}><option value="">Non renseignée</option>{AGE_RANGES.map((a) => <option key={a} value={a}>{a}</option>)}</select></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="button-row">
        <button className="primary" disabled={busy}><Check size={16}/> {busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        <button type="button" className="secondary" disabled={busy} onClick={() => setValues(null)}>Annuler</button>
      </div>
    </form>
  );
}
