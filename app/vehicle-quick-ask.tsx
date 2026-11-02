'use client';
import {useEffect, useState} from 'react';
import {Car, Check} from 'lucide-react';

/**
 * Après la présence : si la fiche n'indique pas encore « Véhiculé(e) », on pose la question une fois.
 * La personne est reconnue par son QR personnel (token) ou par l'appareil (cookie).
 */
export default function VehicleQuickAsk({token}: {token?: string}) {
  const [ask, setAsk] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    fetch('/api/me' + (token ? '?token=' + encodeURIComponent(token) : ''), {cache: 'no-store'})
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => { if (live && b?.person && !b.person.vehicle) setAsk(true); })
      .catch(() => {});
    return () => { live = false; };
  }, [token]);

  async function answer(vehicle: 'oui' | 'non') {
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/me', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({token, action: 'vehicle', vehicle})});
      const b = (await r.json()) as {error?: string};
      if (!r.ok) throw Error(b.error || 'Enregistrement impossible.');
      setDone(true);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  if (done) return <p className="children-notice vehicle-ask-done" role="status"><Check size={16}/> Merci, c’est noté sur votre fiche.</p>;
  if (!ask) return null;
  return (
    <section className="vehicle-ask">
      <p className="vehicle-ask-title"><Car size={18}/> Une petite question pour la famille</p>
      <p className="vehicle-ask-question">Véhiculé(e) ?</p>
      <div className="vehicle-options">
        <button type="button" className="vehicle-option" disabled={busy} onClick={() => void answer('oui')}>Oui</button>
        <button type="button" className="vehicle-option" disabled={busy} onClick={() => void answer('non')}>Non</button>
      </div>
      <small className="vehicle-help">Utile pour organiser le covoiturage et les sorties de la famille. Modifiable à tout moment dans « Modifier mes informations ».</small>
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}
