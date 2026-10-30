'use client';
import {useState} from 'react';
import {Check, Pencil} from 'lucide-react';

type Headcount = {adults: number; day: string; validated: boolean; updated: string} | null;

/** Validation de l'effectif adulte du jour (responsables et équipe d'accueil) : confirmation en un clic si rien n'a changé, ou saisie d'un nouveau nombre. */
export default function HeadcountValidator({headcount, onSaved}: {headcount: Headcount; onSaved: () => Promise<void> | void}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(headcount ? String(headcount.adults) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(e: React.FormEvent | null, adults = Number(value)) {
    e?.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/manage', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'setHeadcount', adults})});
      const b = (await r.json()) as {error?: string};
      if (!r.ok) throw Error(b.error || 'Enregistrement impossible.');
      setEditing(false);
      await onSaved();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  if (!editing) return headcount?.validated
    ? <button type="button" className="headcount-link" onClick={() => { setValue(String(headcount.adults)); setEditing(true); }}><Check size={13}/> Effectif validé · modifier</button>
    : headcount
      ? <div className="headcount-actions">
          <button type="button" className="headcount-alert" disabled={busy} onClick={() => save(null, headcount.adults)}><Check size={13}/> {busy ? '…' : `Confirmer ${headcount.adults} (inchangé)`}</button>
          <button type="button" className="headcount-link" onClick={() => { setValue(String(headcount.adults)); setEditing(true); }}><Pencil size={13}/> Nouveau nombre</button>
          {error && <small className="form-error">{error}</small>}
        </div>
      : <button type="button" className="headcount-alert" onClick={() => { setValue(''); setEditing(true); }}><Pencil size={13}/> Saisir l’effectif du jour</button>;

  return (
    <form className="headcount-form" onSubmit={save}>
      <label>Effectif adulte de la famille<input type="number" min={1} max={100000} required value={value} onChange={(e) => setValue(e.target.value)} autoFocus/></label>
      <div><button className="primary" disabled={busy}><Check size={14}/> {busy ? '…' : 'Valider'}</button><button type="button" className="secondary" onClick={() => setEditing(false)}>Annuler</button></div>
      {error && <small className="form-error">{error}</small>}
    </form>
  );
}
