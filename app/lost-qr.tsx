'use client';
import {useState} from 'react';
import {ArrowRight, Download, QrCode, Search} from 'lucide-react';
import {downloadImage} from './download-image';

/**
 * « Afficher mon QR code » pour les personnes déjà inscrites qui ont perdu leur QR :
 * prénom + nom (et e-mail seulement si plusieurs fiches portent ce nom), puis le QR s'affiche.
 * `onContinue` : suite du parcours (en général, recharger la page pour confirmer la présence).
 */
export default function LostQr({onContinue, continueLabel = 'Continuer et confirmer ma présence'}: {onContinue?: () => void; continueLabel?: string}) {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState(''), [email, setEmail] = useState(''), [first, setFirst] = useState('');
  const [needEmail, setNeedEmail] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [qr, setQr] = useState(''), [name, setName] = useState('');

  async function find(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/checkin/retrouver', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({last, email, first})});
      const b = (await r.json()) as {first?: string; token?: string; needEmail?: boolean; error?: string};
      if (!r.ok) throw Error(b.error || 'Recherche impossible.');
      if (b.needEmail) { setNeedEmail(true); setError('Plusieurs personnes portent ce prénom et ce nom. Indiquez aussi votre e-mail.'); return; }
      const lib = await import('qrcode');
      setQr(await lib.toDataURL(location.origin + '/accueil?token=' + encodeURIComponent(b.token!), {width: 300, margin: 2, color: {dark: '#162a40', light: '#ffffff'}}));
      setName(b.first || '');
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  if (!open) return <button type="button" className="secondary lost-qr-open" onClick={() => setOpen(true)}><QrCode size={17}/> Afficher mon QR code</button>;

  if (qr) return (
    <div className="personal-qr lost-qr">
      <p><strong>Voici ton QR code{name ? `, ${name}` : ''} !</strong></p>
      <img src={qr} alt="Votre QR personnel à conserver"/>
      <button type="button" className="secondary" onClick={() => void downloadImage(qr, 'mon-qr-perseverants.png')}><Download size={16}/> Conserver mon QR personnel</button>
      <small>Fais une capture d’écran ou télécharge-le pour les prochaines fois. Ton téléphone est maintenant reconnu.</small>
      {onContinue && <button type="button" className="primary" onClick={onContinue}>{continueLabel} <ArrowRight size={17}/></button>}
    </div>
  );

  return (
    <form className="registration-form lost-qr-form" onSubmit={find}>
      <p className="welcome-hint">Indique ton prénom et ton nom, comme lors de ton inscription.</p>
      <label>Prénom<input required maxLength={200} autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)}/></label>
      <label>Nom<input required maxLength={200} autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)}/></label>
      {needEmail && <label>E-mail<input required type="email" maxLength={200} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}/></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary" disabled={busy}><Search size={17}/> {busy ? 'Recherche…' : 'Afficher mon QR code'}</button>
      <button type="button" className="text-link" onClick={() => { setOpen(false); setError(''); }}>Annuler</button>
    </form>
  );
}
