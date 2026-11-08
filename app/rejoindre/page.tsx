'use client';
import {useEffect, useState} from 'react';
import {ArrowLeft, Clock, QrCode} from 'lucide-react';

/**
 * Raccourci partageable (par SMS, WhatsApp, e-mail…) pour celles et ceux qui n'arrivent pas
 * à scanner le QR du dimanche. On récupère le jeton de la session active côté serveur et on
 * redirige vers la page d'accueil classique avec « ?session=<jeton> », exactement comme si
 * la personne avait scanné le QR : elle voit « CONFIRMER MA PRÉSENCE » si son appareil est
 * déjà reconnu, sinon le bouton « C'est ma première inscription ».
 */
export default function RejoindrePage() {
  const [error, setError] = useState('');
  const [nextOpening, setNextOpening] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch('/api/checkin/session', {cache: 'no-store'});
        const b = (await r.json()) as {active?: boolean; token?: string; nextStartAt?: string; error?: string};
        if (!live) return;
        if (r.ok && b.active && b.token) {
          location.replace('/accueil?session=' + encodeURIComponent(b.token));
          return;
        }
        if (b.nextStartAt) setNextOpening(b.nextStartAt);
        setError(b.error || 'Le scan n’est pas ouvert pour le moment.');
      } catch {
        if (live) setError('Service indisponible. Réessayez dans un instant.');
      }
    })();
    return () => { live = false; };
  }, []);

  if (!error) {
    return (
      <main className="welcome-page">
        <header><a href="/"><ArrowLeft size={17}/> Accueil</a><span>COM’FRAT</span></header>
        <section className="welcome-card">
          <div className="welcome-brand">
            <img className="welcome-logo" src="/logo-perseverants.webp" alt="Les Persévérants"/>
            <p className="eyebrow">Les Persévérants · Com’Frat</p>
            <h1>Un instant…</h1>
            <p>Nous ouvrons le parcours d’enregistrement.</p>
          </div>
        </section>
      </main>
    );
  }

  const openingLabel = nextOpening
    ? new Date(nextOpening).toLocaleString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris'})
    : '';

  return (
    <main className="welcome-page">
      <header><a href="/"><ArrowLeft size={17}/> Accueil</a><span>COM’FRAT</span></header>
      <section className="welcome-card">
        <div className="welcome-brand">
          <img className="welcome-logo" src="/logo-perseverants.webp" alt="Les Persévérants"/>
          <p className="eyebrow">Les Persévérants · Com’Frat</p>
          <span className="event-closed-icon"><Clock size={28}/></span>
          <h1>Le scan n’est pas encore ouvert</h1>
          <p>{openingLabel ? `Il ouvrira ${openingLabel}.` : error}</p>
          <p>Vous pouvez revenir ici dès l’ouverture — ce lien vous emmènera directement au parcours d’enregistrement.</p>
          <a className="secondary" href="/accueil"><QrCode size={17}/> Retour à l’accueil</a>
        </div>
      </section>
    </main>
  );
}
