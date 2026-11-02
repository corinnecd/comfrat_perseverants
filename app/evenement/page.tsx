'use client';
import {useEffect, useState} from 'react';
import {ArrowLeft, ArrowRight, CalendarDays, Check, Clock, ShieldCheck, UserPlus} from 'lucide-react';
import {dateLabel} from '../dates';
import {PERSON_STATUSES} from '../data';
import BirthdayFields from '../birthday-fields';
import VehicleField from '../vehicle-field';
import VehicleQuickAsk from '../vehicle-quick-ask';
import Scanner from '../scanner';

type PublicEvent = {name: string; day: string; opensAt: string; closesAt: string; status: 'upcoming' | 'open' | 'closed'};
type Step = 'loading' | 'confirm' | 'link' | 'new' | 'done' | 'closed' | 'error';

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
        else setStep('link');
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
          <button type="button" className="text-link not-me" onClick={() => void notMe()}>Ce n’est pas vous, {first} ? Changer de personne</button>
        </>}

        {step === 'link' && <>
          <h1>Bienvenue !</h1>
          <p>C’est votre première fois ? Inscrivez-vous en une minute : votre présence sera enregistrée.</p>
          <button className="primary link-registration" onClick={() => setStep('new')}><UserPlus/> C’est ma première inscription <ArrowRight/></button>
          <p>Déjà inscrit·e ? Scannez votre QR personnel pour retrouver votre fiche sur cet appareil.</p>
          <Scanner purpose="personal" onToken={(t) => void confirm(t)}/>
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
