'use client';
import {useState} from 'react';
import {Check, QrCode, UserCheck} from 'lucide-react';

/**
 * « Déjà inscrit·e : je valide ma présence » — sans scanner ni QR :
 * la personne tape son prénom et son nom (e-mail seulement si deux fiches portent le même nom).
 * Quand la fiche est retrouvée, l'appareil est reconnu et `onFound` enregistre la présence.
 * En cas de blocage seulement, `scanner` (le scan du QR personnel) est proposé en second temps.
 */
export default function AlreadyRegistered({onFound, scanner}: {onFound: (first: string) => Promise<void> | void; scanner?: React.ReactNode}) {
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState(''), [last, setLast] = useState(''), [email, setEmail] = useState('');
  const [needEmail, setNeedEmail] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [scan, setScan] = useState(false);

  async function find(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/checkin/retrouver', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({first, last, email})});
      const b = (await r.json()) as {first?: string; needEmail?: boolean; error?: string};
      if (!r.ok) throw Error(b.error || 'Recherche impossible.');
      if (b.needEmail) { setNeedEmail(true); setError('Plusieurs personnes portent ce prénom et ce nom. Indique aussi ton e-mail.'); return; }
      await onFound(b.first || first);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  if (!open) return <button type="button" className="secondary already-registered-open" onClick={() => setOpen(true)}><UserCheck size={18}/> Déjà inscrit·e : je valide ma présence</button>;

  return (
    <form className="registration-form already-registered-form" onSubmit={find}>
      <p className="welcome-hint">Indique ton prénom et ton nom, comme lors de ton inscription.</p>
      <label>Prénom<input required maxLength={200} autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)}/></label>
      <label>Nom<input required maxLength={200} autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)}/></label>
      {needEmail && <label>E-mail<input required type="email" maxLength={200} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}/></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary confirm-button" disabled={busy}><Check size={18}/> {busy ? 'Enregistrement…' : 'JE VALIDE MA PRÉSENCE'}</button>
      {scanner && (scan ? <div className="already-registered-scan">{scanner}</div> : <button type="button" className="secondary" onClick={() => setScan(true)}><QrCode size={16}/> Ça ne marche pas ? Scanner mon QR personnel</button>)}
      <button type="button" className="text-link" onClick={() => { setOpen(false); setScan(false); setError(''); }}>Retour</button>
    </form>
  );
}
