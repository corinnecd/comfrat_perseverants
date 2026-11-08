'use client';
import {useEffect, useState} from 'react';
import {ArrowLeft, Clock} from 'lucide-react';

/**
 * Raccourci partageable pour un événement ponctuel (culte, veillée, service). Prend ?nom=…
 * et redirige vers /evenement?e=<jeton> dès qu'un événement actif est trouvé par nom.
 * Même parcours qu'un scan du QR.
 */
export default function RejoindreEvenement() {
  const [error, setError] = useState('');
  const [eventName, setEventName] = useState('');

  useEffect(() => {
    let live = true;
    const nom = new URLSearchParams(location.search).get('nom') || '';
    if (!nom) { setError('Nom de l’événement manquant dans le lien.'); return; }
    setEventName(nom);
    (async () => {
      try {
        const r = await fetch('/api/events/by-name?nom=' + encodeURIComponent(nom), {cache: 'no-store'});
        const b = (await r.json()) as {token?: string; name?: string; status?: string; error?: string};
        if (!live) return;
        if (r.ok && b.token) {
          location.replace('/evenement?e=' + encodeURIComponent(b.token));
          return;
        }
        setError(b.error || 'Événement introuvable.');
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
            <p className="eyebrow">Les Persévérants · Événement</p>
            <h1>Un instant…</h1>
            <p>Nous ouvrons le parcours d’enregistrement pour « {eventName} ».</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="welcome-page">
      <header><a href="/"><ArrowLeft size={17}/> Accueil</a><span>COM’FRAT</span></header>
      <section className="welcome-card">
        <div className="welcome-brand">
          <img className="welcome-logo" src="/logo-perseverants.webp" alt="Les Persévérants"/>
          <p className="eyebrow">Les Persévérants · Événement</p>
          <span className="event-closed-icon"><Clock size={28}/></span>
          <h1>Événement introuvable</h1>
          <p>{error}</p>
          <p>Vérifiez l’orthographe du nom ou demandez à l’équipe d’accueil.</p>
          <a className="secondary" href="/accueil">Retour à l’accueil</a>
        </div>
      </section>
    </main>
  );
}
