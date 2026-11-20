'use client';
import {useState} from 'react';
import {ArrowRight, Check, QrCode, UserCheck, X} from 'lucide-react';
import {Dialog, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';

/**
 * « Déjà inscrit·e : je valide ma présence » — sans scanner ni QR :
 * la personne tape son prénom et son nom (e-mail seulement si deux fiches portent le même nom).
 * Quand une fiche est trouvée, une fenêtre « C'est bien toi ? » (prénom, nom, fin du téléphone) demande confirmation ;
 * seulement après « Oui, c'est bien moi », l'appareil est reconnu et `onFound` enregistre la présence.
 * En cas de blocage seulement, `scanner` (le scan du QR personnel) est proposé en second temps.
 */
export default function AlreadyRegistered({onFound, scanner}: {onFound: (first: string) => Promise<void> | void; scanner?: React.ReactNode}) {
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState(''), [last, setLast] = useState(''), [email, setEmail] = useState('');
  const [needEmail, setNeedEmail] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [scan, setScan] = useState(false);
  const [match, setMatch] = useState<{first: string; last: string; phoneEnd: string} | null>(null);
  const lookup = (link: boolean) => fetch('/api/checkin/retrouver', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({first, last, email, link})});

  async function find(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await lookup(false);
      const b = (await r.json()) as {match?: {first: string; last: string; phoneEnd: string}; needEmail?: boolean; error?: string};
      if (!r.ok) throw Error(b.error || 'Recherche impossible.');
      if (b.needEmail) { setNeedEmail(true); setError('Plusieurs personnes portent ce prénom et ce nom. Indique aussi ton e-mail.'); return; }
      if (b.match) setMatch(b.match);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  async function itsMe() {
    if (!match) return;
    setBusy(true); setError('');
    try {
      const r = await lookup(true);
      const b = (await r.json()) as {first?: string; error?: string};
      if (!r.ok) throw Error(b.error || 'Enregistrement impossible.');
      setMatch(null);
      await onFound(b.first || match.first);
    } catch (err) { setMatch(null); setError((err as Error).message); } finally { setBusy(false); }
  }

  if (!open) return <button type="button" className="secondary already-registered-open" onClick={() => setOpen(true)}><UserCheck size={18}/> Déjà inscrit·e : je valide ma présence</button>;

  return (
    <form className="registration-form already-registered-form" onSubmit={find}>
      <p className="welcome-hint">Indique ton prénom et ton nom, comme lors de ton inscription.</p>
      <label>Prénom<input required maxLength={200} autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)}/></label>
      <label>Nom<input required maxLength={200} autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)}/></label>
      {needEmail && <label>E-mail<input required type="email" maxLength={200} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}/></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary" disabled={busy}>{busy ? 'Recherche…' : 'Continuer'} <ArrowRight size={17}/></button>
      {scanner && (scan ? <div className="already-registered-scan">{scanner}</div> : <button type="button" className="secondary" onClick={() => setScan(true)}><QrCode size={16}/> Ça ne marche pas ? Scanner mon QR personnel</button>)}
      <button type="button" className="text-link" onClick={() => { setOpen(false); setScan(false); setError(''); }}>Retour</button>
      <Dialog open={!!match} onOpenChange={(o) => { if (!o && !busy) setMatch(null); }}>
        <DialogContent className="app-dialog its-me-dialog">
          <DialogTitle>C’est bien toi ?</DialogTitle>
          <DialogDescription>Vérifie que c’est bien ta fiche avant de valider ta présence.</DialogDescription>
          {match && <div className="its-me-card">
            <strong>{match.first} {match.last.toUpperCase()}</strong>
            {match.phoneEnd && <small>Téléphone se terminant par •• {match.phoneEnd}</small>}
          </div>}
          <button type="button" className="primary confirm-button" disabled={busy} onClick={() => void itsMe()}><Check size={18}/> {busy ? 'Enregistrement…' : 'Oui, c’est bien moi — je valide ma présence'}</button>
          <button type="button" className="secondary" disabled={busy} onClick={() => setMatch(null)}><X size={16}/> Non, ce n’est pas moi</button>
        </DialogContent>
      </Dialog>
    </form>
  );
}
