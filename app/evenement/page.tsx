'use client';
import {useEffect, useState} from 'react';
import {ArrowLeft, ArrowRight, CalendarDays, Check, Clock, Download, QrCode, ShieldCheck, UserPlus} from 'lucide-react';
import {dateLabel} from '../dates';
import {PERSON_STATUSES} from '../data';
import BirthdayFields from '../birthday-fields';
import VehicleField from '../vehicle-field';
import VehicleQuickAsk from '../vehicle-quick-ask';
import Scanner from '../scanner';
import {downloadImage} from '../download-image';

type PublicEvent = {name: string; day: string; opensAt: string; closesAt: string; status: 'upcoming' | 'open' | 'closed'};
type Step = 'loading' | 'confirm' | 'link' | 'scan' | 'new' | 'done' | 'closed' | 'error';

const hour = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris'}).replace(':', ' h ');

/**
 * Page ouverte par le QR d'un événement ponctuel (culte du matin, service…).
 * Même parcours que le dimanche : l'appareil reconnu confirme en un clic ; sinon inscription ou QR personnel.
 * Les présences sont enregistrées pour cet événement uniquement (pas pour la Com'Frat).
 */
export default function EventCheckin() {
  const [code, setCode] = useState('');
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [first, setFirst] = useState('');
  const [step, setStep] = useState<Step>('loading');
  const [already, setAlready] = useState(false);
  const [status, setStatus] = useState('Membre');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [qr, setQr] = useState('');
  const [qrBusy, setQrBusy] = useState(false);

  /** « Afficher à nouveau mon QR code » — récupère le QR personnel du propriétaire de l'appareil. */
  async function showMyQr() {
    setQrBusy(true); setError('');
    try {
      const r = await fetch('/api/checkin?mine=1', {cache: 'no-store'});
      const b = (await r.json()) as {token?: string; error?: string};
      if (!r.ok || !b.token) throw Error(b.error || 'QR introuvable.');
      const lib = await import('qrcode');
      setQr(await lib.toDataURL(location.origin + '/accueil?token=' + encodeURIComponent(b.token), {width: 300, margin: 2, color: {dark: '#162a40', light: '#ffffff'}}));
    } catch (e) { setError((e as Error).message); } finally { setQrBusy(false); }
  }

  useEffect(() => {
    const e = new URLSearchParams(location.search).get('e') || '';
    let live = true;
    const load = async () => {
      if (!e) { setError('QR d’événement manquant.'); setStep('error'); return; }
      try {
        const r = await fetch('/api/events/checkin?e=' + encodeURIComponent(e), {cache: 'no-store'});
        const b = (await r.json()) as {event?: PublicEvent; first?: string | null; alreadyPresent?: boolean; error?: string};
        if (!live) return;
        if (!r.ok || !b.event) throw Error(b.error || 'Événement introuvable.');
        setCode(e); setEvent(b.event);
        if (b.event.status !== 'open') { setStep('closed'); return; }
        if (b.first) { setFirst(b.first); setAlready(!!b.alreadyPresent); setStep(b.alreadyPresent ? 'done' : 'confirm'); }
        else {
          setStep('link');
          // Même chose que /accueil : si l'appareil a un cookie reconnu, on affiche le prénom
          // dans le hero (« BIENVENUE CORINNE »), même si la personne n'a pas encore été
          // check-in pour CET événement.
          try {
            const me = await fetch('/api/me', {cache: 'no-store'});
            if (me.ok) {
              const mb = (await me.json()) as {person?: {first?: string}};
              if (live && mb?.person?.first) setFirst(mb.person.first);
            }
          } catch { /* sans effet */ }
        }
      } catch (err) { if (live) { setError((err as Error).message); setStep('error'); } }
    };
    void load();
    return () => { live = false; };
  }, []);

  async function confirm(token?: string) {
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/events/checkin', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({e: code, ...(token ? {token} : {})})});
      const b = (await r.json()) as {first?: string; alreadyPresent?: boolean; error?: string};
      if (!r.ok) throw Error(b.error || 'Enregistrement impossible.');
      setFirst(b.first || first); setAlready(!!b.alreadyPresent); setStep('done');
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  async function register(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const values = Object.fromEntries(new FormData(e.currentTarget));
      const r = await fetch('/api/checkin', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...values, status, event: code})});
      const b = (await r.json()) as {error?: string};
      if (!r.ok) throw Error(b.error || 'Inscription impossible.');
      setFirst(String(values.first || '')); setAlready(false); setStep('done');
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  async function notMe() {
    try { await fetch('/api/checkin/forget', {method: 'POST'}); } catch { /* sans effet */ }
    setFirst(''); setStep('link');
  }

  const when = event ? `${dateLabel(event.day, {weekday: 'long', day: 'numeric', month: 'long'})}` : '';

  return (
    <main className="welcome-page">
      <header><a href="/"><ArrowLeft size={17}/> Accueil</a><span>COM’FRAT</span></header>
      <section className="welcome-card event-card">
        <div className="welcome-brand">
          <img className="welcome-logo" src="/logo-perseverants.webp" alt="Les Persévérants"/>
          <p className="eyebrow">Les Persévérants · Événement</p>
          {event && <p className="event-name"><CalendarDays size={16}/> {event.name} · {when}</p>}
        </div>

        {step === 'loading' && <p>Chargement de l’événement…</p>}

        {step === 'error' && <><h1>QR non reconnu</h1><p>{error}</p><a className="primary" href="/accueil">Retour à l’accueil</a></>}

        {step === 'closed' && event && <>
          <span className="event-closed-icon"><Clock size={28}/></span>
          <h1>{event.status === 'upcoming' ? 'Le scan n’est pas encore ouvert' : 'Le scan est fermé'}</h1>
          <p>{event.status === 'upcoming' ? `Il ouvrira le ${when} à ${hour(event.opensAt)}.` : 'Adressez-vous à l’équipe d’accueil pour enregistrer votre présence.'}</p>
        </>}

        {step === 'confirm' && <>
          <h1>Bonjour {first},</h1>
          <p>Merci d’être là ! Confirmez votre présence à « {event?.name} ».</p>
          <button className="primary confirm-button" disabled={busy} onClick={() => void confirm()}><Check/>{busy ? 'Enregistrement…' : 'CONFIRMER MA PRÉSENCE'}</button>
          {qr ? <div className="personal-qr"><img src={qr} alt="Votre QR personnel à conserver"/><button type="button" className="secondary" onClick={() => void downloadImage(qr, 'mon-qr-perseverants.png')}><Download size={16}/> Conserver mon QR personnel</button><small>Votre QR personnel peut associer cet appareil à votre fiche.</small></div>
          : <button type="button" className="secondary" disabled={qrBusy} onClick={showMyQr}><QrCode size={18}/> {qrBusy ? 'Chargement…' : 'Afficher à nouveau mon QR code'}</button>}
          <button type="button" className="secondary" onClick={() => setStep('scan')}><QrCode size={16}/> Scanner pour aider quelqu’un</button>
          <small>Si une autre personne a oublié son téléphone, scannez son QR personnel : sa présence sera enregistrée sans modifier votre identité sur cet appareil.</small>
          <button type="button" className="text-link not-me" onClick={() => void notMe()}>Ce n’est pas vous, {first} ? Changer de personne</button>
        </>}

        {step === 'link' && <>
          <h1>BIENVENUE{first ? ` ${first.toUpperCase()}` : ''}</h1>
          <p>Déjà inscrit·e à la Com’Frat ? Un simple scan de ton QR personnel suffit : pas besoin de ressaisir tes informations.</p>
          <div className="welcome-choices">
            <button className="secondary welcome-scan-button" onClick={() => setStep('scan')}><QrCode/> Je m’enregistre</button>
            <button className="primary link-registration" onClick={() => setStep('new')}><UserPlus/> C’est ma première inscription <ArrowRight/></button>
            {first && (qr ? <div className="personal-qr"><img src={qr} alt="Votre QR personnel à conserver"/><button type="button" className="secondary" onClick={() => void downloadImage(qr, 'mon-qr-perseverants.png')}><Download size={16}/> Conserver mon QR personnel</button><small>Présentez ce QR à l’accueil ou scannez-le à l’ouverture du scan.</small></div>
            : <button type="button" className="secondary" disabled={qrBusy} onClick={showMyQr}><QrCode size={18}/> {qrBusy ? 'Chargement…' : 'Afficher à nouveau mon QR code'}</button>)}
            <p className="welcome-hint">Déjà inscrit·e, sans ton QR ? Adresse-toi à l’équipe d’accueil : elle peut retrouver ta fiche.</p>
          </div>
        </>}

        {step === 'scan' && <>
          <h1>Scanne ton QR personnel{first ? `, ${first}` : ''}.</h1>
          <p>C’est le QR qui t’a été envoyé lors de ton inscription à la Com’Frat. Il t’identifie et confirme ta présence à « {event?.name} » en un clic.</p>
          <Scanner purpose="personal" onToken={(t) => void confirm(t)}/>
          <button type="button" className="secondary" onClick={() => setStep('link')}>Retour</button>
        </>}

        {step === 'new' && <>
          <h1>Faisons connaissance.</h1>
          <p>Une seule inscription, pour tous nos rendez-vous.</p>
          <form onSubmit={register} className="registration-form">
            <div className="form-grid">
              {[['first', 'Prénom', 'text'], ['last', 'Nom', 'text'], ['email', 'E-mail', 'email'], ['phone', 'Téléphone', 'tel'], ['city', 'Ville', 'text'], ['department', 'Département', 'text']].map(([name, label, type]) =>
                <label key={name}>{label}<input name={name} type={type} required maxLength={200}/></label>)}
            </div>
            <label>Je suis<select className="event-status-select" value={status} onChange={(e) => setStatus(e.target.value)}>{PERSON_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
            <BirthdayFields/>
            {status === 'Invité' && <label>Qui vous a invité·e ?<input name="inviter" required maxLength={200} placeholder="Prénom et nom, ou « Venue spontanée »"/></label>}
            <VehicleField required/>
            <p className="privacy-note"><ShieldCheck size={18}/> Ces informations servent à vous proposer des activités qui vous correspondent le mieux. Vous pouvez demander leur correction ou suppression à votre responsable.</p>
            <button className="primary" disabled={busy}>{busy ? 'Enregistrement…' : 'M’inscrire et confirmer ma présence'}<ArrowRight size={17}/></button>
            <button type="button" className="text-link" onClick={() => setStep('link')}>Retour</button>
          </form>
        </>}

        {step === 'done' && <>
          <span className="success-check"><Check size={32}/></span>
          <h1>Merci {first} !</h1>
          <p>{already ? 'Votre présence était déjà enregistrée' : 'Votre présence est enregistrée'} pour « {event?.name} » du {when}.</p>
          <VehicleQuickAsk/>
          <a className="primary" href="/accueil">Retour à l’accueil <ArrowRight size={17}/></a>
        </>}

        {error && step !== 'error' && <p className="form-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
