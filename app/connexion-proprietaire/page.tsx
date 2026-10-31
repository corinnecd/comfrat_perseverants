'use client';
import {useState} from 'react';
import {ArrowLeft, LockKeyhole} from 'lucide-react';
import PasswordInput from '../password-input';

/** Connexion du propriétaire par phrase secrète (COMFRAT_OWNER_SECRET). */
export default function OwnerSignIn() {
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const returnTo = () => {
    const v = new URLSearchParams(location.search).get('return_to') || '/gestion';
    return v.startsWith('/') && !v.startsWith('//') ? v : '/gestion';
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/owner-session', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({secret})});
      const b = (await r.json().catch(() => ({}))) as {error?: string};
      if (!r.ok) throw Error(b.error || 'Connexion impossible.');
      location.assign(returnTo());
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }
  return (
    <main className="access-page">
      <section className="card access-card">
        <img className="access-logo" src="/logo-perseverants.webp" alt="Les Persévérants"/>
        <p className="eyebrow">COM’FRAT · ACCÈS PROPRIÉTAIRE</p>
        <h1>Connexion propriétaire</h1>
        <p className="access-intro">Saisissez la phrase secrète du propriétaire pour créer ou modifier les codes d’accès.</p>
        <form className="feedback-code-form" onSubmit={submit}>
          <label>Phrase secrète<PasswordInput aria-label="Phrase secrète" autoComplete="current-password" required maxLength={200} value={secret} onChange={(e) => setSecret(e.target.value)}/></label>
          <small>La session reste ouverte 12 heures sur cet appareil.</small>
          <button className="primary" disabled={busy}><LockKeyhole size={16}/> {busy ? 'Vérification…' : 'Se connecter'}</button>
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
        <a className="secondary access-checkin-link" href="/gestion"><ArrowLeft size={16}/> Retour à l’espace équipe</a>
      </section>
    </main>
  );
}
