'use client';
import {useState} from 'react';
import {Check} from 'lucide-react';
import type {Person} from './data';
import {ALL_STATUSES, CHILD_STATUS} from './data';
import {AGE_RANGES, BIRTH_MONTHS, CHILD_AGE_RANGES} from './person-details';

/** Formulaire de modification d'une fiche (équipe). Mêmes champs et mêmes contrôles que l'inscription. */
export default function PersonEditForm({person, onSaved, onCancel}: {person: Person; onSaved: (updated: Person) => void; onCancel: () => void}) {
  const [values, setValues] = useState({
    first: person.first, last: person.last, email: person.email, phone: person.phone,
    city: person.city, department: person.department, status: person.status, inviter: person.inviter || '',
    birthday_day: person.birthday_day ? String(person.birthday_day) : '',
    birthday_month: person.birthday_month ? String(person.birthday_month) : '',
    age_range: person.age_range || '',
  });
  const isChild = values.status === CHILD_STATUS;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setValues((v) => ({...v, [key]: e.target.value}));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/manage', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'update', id: person.id, ...values})});
      const b = (await r.json()) as {error?: string};
      if (!r.ok) throw Error(b.error || 'Enregistrement impossible.');
      onSaved({
        ...person, ...values,
        email: values.email.trim().toLowerCase(),
        inviter: values.status === 'Invité' ? values.inviter : '',
        birthday_day: values.birthday_day ? Number(values.birthday_day) : null,
        birthday_month: values.birthday_month ? Number(values.birthday_month) : null,
        age_range: values.age_range || null,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const fields: [keyof typeof values, string, string, string?][] = [
    ['first', 'Prénom', 'text', 'given-name'], ['last', 'Nom', 'text', 'family-name'],
    ['email', 'E-mail', 'email', 'email'], ['phone', 'Téléphone', 'tel', 'tel'],
    ['city', 'Ville', 'text'], ['department', 'Département', 'text'],
  ];
  return (
    <form className="registration-form person-edit-form" onSubmit={save}>
      <div className="form-grid">
        {fields.map(([key, label, type, auto]) => (
          <label key={key}>{key === 'phone' && isChild ? 'Téléphone (facultatif)' : key === 'email' && isChild ? 'E-mail du parent' : label}<input type={type} required={!(key === 'phone' && isChild)} maxLength={200} autoComplete={auto} value={values[key]} onChange={set(key)}/></label>
        ))}
      </div>
      <label>Statut
        <select value={values.status} onChange={set('status')}>{ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      </label>
      {values.status === 'Invité' && <label>Invité·e par<input required maxLength={200} value={values.inviter} onChange={set('inviter')}/></label>}
      <div className="form-grid">
        <label>Anniversaire · jour
          <select value={values.birthday_day} onChange={set('birthday_day')} required={!!values.birthday_month}><option value="">—</option>{Array.from({length: 31}, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select>
        </label>
        <label>Anniversaire · mois
          <select value={values.birthday_month} onChange={set('birthday_month')} required={!!values.birthday_day}><option value="">—</option>{BIRTH_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
        </label>
      </div>
      <label>Tranche d’âge
        <select value={values.age_range} onChange={set('age_range')}><option value="">Non renseignée</option>{(isChild ? CHILD_AGE_RANGES : AGE_RANGES).map((a) => <option key={a} value={a}>{a}</option>)}</select>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="button-row">
        <button className="primary" disabled={busy}><Check size={17}/> {busy ? 'Enregistrement…' : 'Enregistrer les modifications'}</button>
        <button type="button" className="secondary" onClick={onCancel} disabled={busy}>Annuler</button>
      </div>
    </form>
  );
}
