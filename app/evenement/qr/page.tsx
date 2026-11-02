'use client';
import {useEffect, useState} from 'react';
import {ArrowLeft, CalendarDays, Clock, RefreshCw, ShieldCheck} from 'lucide-react';
import {dateLabel} from '../../dates';

type PublicEvent = {name: string; day: string; opensAt: string; closesAt: string; status: 'upcoming' | 'open' | 'closed'};
const hour = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris'}).replace(':', ' h ');

/** QR d'un événement ponctuel, à afficher sur un écran ou une tablette à l'entrée. */
export default function EventQr() {
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [image, setImage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const e = new URLSearchParams(location.search).get('e') || '';
    let live = true;
    let timer: number | undefined;
    const refresh = async () => {
      try {
        if (!e) throw Error('QR d’événement manquant.');
        const r = await fetch('/api/events/checkin?e=' + encodeURIComponent(e), {cache: 'no-store'});
        const b = (await r.json()) as {event?: PublicEvent; error?: string};
        if (!r.ok || !b.event) throw Error(b.error || 'Événement introuvable.');
        let src = '';
        if (b.event.status === 'open') {
          const qr = await import('qrcode');
          src = await qr.toDataURL(location.origin + '/evenement?e=' + encodeURIComponent(e), {width: 480, margin: 2, color: {dark: '#001b35', light: '#ffffff'}});
        }
        if (live) { setEvent(b.event); setImage(src); setError(''); }
      } catch (err) { if (live) setError((err as Error).message); }
      finally { if (live) timer = window.setTimeout(refresh, 15000); }
    };
    void refresh();
    return () => { live = false; if (timer) window.clearTimeout(timer); };
  }, []);

  return (
    <main className="qr-display">
      <header><a href="/gestion"><ArrowLeft size={18}/> Espace responsable</a><img src="/logo-perseverants.webp" alt="Les Persévérants"/></header>
      <section className="qr-display-card">
        <p className="eyebrow">LES PERSÉVÉRANTS · ÉVÉNEMENT</p>
        <h1>{event ? event.name : 'Événement'}</h1>
        <p className="qr-display-lede">{event?.status === 'open' ? 'Scannez, puis confirmez votre présence.' : event?.status === 'upcoming' ? `Le scan ouvrira à ${hour(event.opensAt)}.` : event ? 'Le scan de cet événement est fermé.' : ''}</p>
        {error ? <div className="qr-display-state"><RefreshCw/><p>{error}</p><small>La page réessaie automatiquement.</small></div>
          : !event ? <div className="qr-display-state"><RefreshCw/><p>Chargement…</p></div>
          : event.status === 'open' && image ? <>
            <div className="qr-display-code"><img src={image} alt={'QR de l’événement ' + event.name}/></div>
            <div className="qr-display-active"><span className="qr-live-dot"/> Scan ouvert jusqu’à {hour(event.closesAt)}</div>
          </>
          : <div className="qr-display-state"><Clock/><p>{event.status === 'upcoming' ? 'Le QR apparaîtra ici automatiquement à l’ouverture.' : 'Merci à tous !'}</p></div>}
        {event && <p className="qr-display-date"><CalendarDays size={16}/> {dateLabel(event.day, {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})} · {hour(event.opensAt)} – {hour(event.closesAt)}</p>}
        <div className="qr-display-foot"><ShieldCheck size={16}/> Présences enregistrées pour cet événement uniquement</div>
      </section>
      <footer>Chaque personne compte. Vous aussi.</footer>
    </main>
  );
}
