'use client';
import {useState} from 'react';
import {ArrowRight, Check, QrCode, UserCheck, UserPlus, X} from 'lucide-react';
import {Dialog, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';
import {PERSON_STATUSES} from './data';
import BirthdayFields from './birthday-fields';
import VehicleField from './vehicle-field';
import ServiceField from './service-field';

/**
 * « Déjà inscrit·e : je valide ma présence » — sans scanner ni QR :
 * la personne tape son prénom et son nom (e-mail seulement si deux fiches portent le même nom).
 * Quand une fiche est trouvée, une fenêtre « C'est bien toi ? » (prénom, nom, fin du téléphone) demande confirmation ;
 * seulement après « Oui, c'est bien moi », l'appareil est reconnu et `onFound` enregistre la présence.
 * En cas de blocage seulement, `scanner` (le scan du QR personnel) est proposé en second temps.
 */
export default function AlreadyRegistered({onFound, scanner, onNewRegistration}: {onFound: (first: string, token: string) => Promise<void> | void; scanner?: React.ReactNode; onNewRegistration?: () => void}) {
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState(''), [last, setLast] = useState(''), [email, setEmail] = useState('');
  const [needEmail, setNeedEmail] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [scan, setScan] = useState(false);
  const [match, setMatch] = useState<{first: string; last: string; phoneEnd: string; emailHint?: string} | null>(null);
  const [completing, setCompleting] = useState<{token: string; first: string; last: string; email: string} | null>(null);
  const [status, setStatus] = useState('Membre');
  const [notMe, setNotMe] = useState(false);
  const lookup = (link: boolean) => fetch('/api/checkin/retrouver', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({first, last, email, link})});

  async function find(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(''); setNotMe(false);
    try {
      const r = await lookup(false);
      const b = (await r.json()) as {match?: {first: string; last: string; phoneEnd: string; emailHint?: string}; needEmail?: boolean; error?: string};
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
      const b = (await r.json()) as {first?: string; last?: string; email?: string; token?: string; incomplete?: boolean; error?: string};
      if (!r.ok || !b.token) throw Error(b.error || 'Enregistrement impossible.');
      setMatch(null);
      // Fiche importée : on complète d'abord les informations manquantes.
      if (b.incomplete) { setCompleting({token: b.token, first: b.first || match.first, last: b.last || match.last, email: b.email || ''}); return; }
      await onFound(b.first || match.first, b.token);
    } catch (err) { setMatch(null); setError((err as Error).message); } finally { setBusy(false); }
  }

  async function complete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!completing) return;
    setBusy(true); setError('');
    try {
      const values = Object.fromEntries(new FormData(e.currentTarget));
      const r = await fetch('/api/checkin/completer', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...values, status, token: completing.token})});
      const b = (await r.json()) as {first?: string; token?: string; error?: string};
      if (!r.ok || !b.token) throw Error(b.error || 'Enregistrement impossible.');
      setCompleting(null);
      await onFound(b.first || completing.first, b.token);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  if (completing) return (
    <form className="registration-form complete-profile-form" onSubmit={complete}>
      <h2>Bienvenue {completing.first} !</h2>
      <p className="welcome-hint">Ta fiche existe déjà. Complète simplement les informations manquantes, puis valide ta présence.</p>
      <div className="form-grid">
        {([['first', 'Prénom', 'text', completing.first, 'given-name'], ['last', 'Nom', 'text', completing.last, 'family-name'], ['email', 'E-mail', 'email', completing.email, 'email'], ['phone', 'Téléphone', 'tel', '', 'tel'], ['city', 'Ville', 'text', '', 'address-level2'], ['department', 'Code postal', 'text', '', 'postal-code']] as const).map(([name, label, type, value, auto]) =>
          <label key={name}>{label}<input name={name} type={type} required maxLength={200} defaultValue={value} autoComplete={auto} inputMode={name === 'department' ? 'numeric' : undefined}/></label>)}
      </div>
      <label>Je suis<select value={status} onChange={(e) => setStatus(e.target.value)}>{PERSON_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
      <BirthdayFields/>
      {status === 'Invité' && <label>Qui vous a invité·e ?<input name="inviter" required maxLength={200} placeholder="Prénom et nom, ou « Venue spontanée »"/></label>}
      <VehicleField required/>
      <ServiceField required/>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary confirm-button" disabled={busy}><Check size={18}/> {busy ? 'Enregistrement…' : 'JE VALIDE MA PRÉSENCE'}</button>
    </form>
  );

  if (!open) return <button type="button" className="secondary already-registered-open" onClick={() => setOpen(true)}><UserCheck size={18}/> Déjà inscrit·e : je valide ma présence</button>;

  return (
    <form className="registration-form already-registered-form" onSubmit={find}>
      <p className="welcome-hint">Indique ton prénom et ton nom, comme lors de ton inscription.</p>
      <label>Prénom<input required maxLength={200} autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)}/></label>
      <label>Nom<input required maxLength={200} autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)}/></label>
      {needEmail && <label>E-mail<input required type="email" maxLength={200} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}/></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {notMe && <div className="not-me-panel" role="status">
        <strong><UserCheck size={17}/> Adresse-toi à l’équipe d’accueil</strong>
        <p>Vérifie d’abord l’orthographe de ton prénom et de ton nom, puis appuie à nouveau sur « Continuer ». Sinon, l’équipe d’accueil retrouvera ta fiche avec ton nom et validera ta présence. Si tu as gardé ton QR code (photo ou capture), tu peux aussi le lui montrer.</p>
        {onNewRegistration && <button type="button" className="text-link" onClick={onNewRegistration}><UserPlus size={15}/> Je ne suis pas encore inscrit·e : c’est ma première inscription</button>}
      </div>}
      <button className="primary" disabled={busy}>{busy ? 'Recherche…' : 'Continuer'} <ArrowRight size={17}/></button>
      {scanner && (scan ? <div className="already-registered-scan">{scanner}</div> : <button type="button" className="secondary" onClick={() => setScan(true)}><QrCode size={16}/> Ça ne marche pas ? Scanner mon QR personnel</button>)}
      <button type="button" className="text-link" onClick={() => { setOpen(false); setScan(false); setNotMe(false); setError(''); }}>Retour</button>
      <Dialog open={!!match} onOpenChange={(o) => { if (!o && !busy) setMatch(null); }}>
        <DialogContent className="app-dialog its-me-dialog">
          <DialogTitle>C’est bien toi ?</DialogTitle>
          <DialogDescription>Vérifie que c’est bien ta fiche avant de valider ta présence.</DialogDescription>
          {match && <div className="its-me-card">
            <strong>{match.first} {match.last.toUpperCase()}</strong>
            {match.phoneEnd ? <small>Téléphone se terminant par •• {match.phoneEnd}</small> : match.emailHint ? <small>E-mail : {match.emailHint}</small> : null}
          </div>}
          <button type="button" className="primary confirm-button" disabled={busy} onClick={() => void itsMe()}><Check size={18}/> {busy ? 'Enregistrement…' : 'Oui, c’est bien moi — je valide ma présence'}</button>
          <button type="button" className="secondary" disabled={busy} onClick={() => { setMatch(null); setNotMe(true); setScan(false); }}><X size={16}/> Non, ce n’est pas moi</button>
        </DialogContent>
      </Dialog>
    </form>
  );
}
