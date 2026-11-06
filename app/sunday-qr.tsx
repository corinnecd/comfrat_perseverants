'use client';
import {useCallback, useEffect, useState} from 'react';
import {Clock, Maximize2, Play, QrCode} from 'lucide-react';
import {dateLabel} from './dates';

type Session = {active: boolean; meetingDay?: string; nextStartAt?: string; url?: string; error?: string};

/** Lit le QR collectif de la rencontre et le rafraîchit toutes les 30 secondes (ouverture/fermeture automatiques). */
function useSundayQr() {
  const [session, setSession] = useState<Session | null>(null);
  const [image, setImage] = useState('');
  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/checkin/session', {cache: 'no-store'});
      const b = (await r.json()) as Session;
      let src = '';
      if (r.ok && b.active && b.url) {
        const qr = await import('qrcode');
        src = await qr.toDataURL(b.url, {width: 360, margin: 1, color: {dark: '#001b35', light: '#ffffff'}});
      }
      setSession(r.ok ? b : {active: false, error: b.error});
      setImage(src);
    } catch {
      setSession({active: false, error: 'QR indisponible'});
    }
  }, []);
  useEffect(() => {
    let live = true;
    let timer: number | undefined;
    const loop = async () => {
      if (!live) return;
      await refresh();
      if (live) timer = window.setTimeout(loop, 30000);
    };
    void loop();
    return () => { live = false; if (timer) window.clearTimeout(timer); };
  }, [refresh]);
  return {session, image, refresh};
}

const nextOpening = (s: Session | null) => s?.nextStartAt ? `Ouvre le ${dateLabel(s.nextStartAt.slice(0, 10), {weekday: 'long', day: 'numeric', month: 'long'})} à 18 h` : 'Ouvre le samedi à 18 h';

/** Bouton réservé aux responsables : pré-ouvre le QR du dimanche à venir, jusqu'au lundi soir 22 h. */
function OpenNowButton({onOpened}: {onOpened: () => void | Promise<void>}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function openNow() {
    if (!window.confirm('Ouvrir le QR du dimanche dès maintenant ? Il restera actif jusqu’au lundi soir à 22 h.')) return;
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/manage', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'openCheckinNow'})});
      const b = (await r.json()) as {error?: string};
      if (!r.ok) throw Error(b.error || 'Ouverture impossible.');
      await onOpened();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="sunday-qr-open-now">
      <button type="button" className="secondary" disabled={busy} onClick={openNow}><Play size={14}/> {busy ? 'Ouverture…' : 'Ouvrir le QR du dimanche maintenant'}</button>
      {error && <small className="form-error">{error}</small>}
    </div>
  );
}

/** Option A : mini-QR du menu latéral, visible sur toutes les pages. */
export function SundayQrMini() {
  const {session, image} = useSundayQr();
  return (
    <div className="sunday-qr-mini">
      <p className="sunday-qr-mini-title"><QrCode size={14}/> QR du dimanche</p>
      {session?.active && image ? (
        <a href="/accueil/qr" target="_blank" rel="noopener" className="sunday-qr-mini-code" title="Afficher en plein écran">
          <img src={image} alt="QR collectif du dimanche" width={112} height={112}/>
          <span><Maximize2 size={13}/> Agrandir</span>
        </a>
      ) : (
        <p className="sunday-qr-mini-off"><Clock size={13}/> {session ? nextOpening(session) : 'Chargement…'}</p>
      )}
    </div>
  );
}

/** Option B : carte QR en haut de la page Présences. */
export function SundayQrCard() {
  const {session, image, refresh} = useSundayQr();
  return (
    <div className="sunday-qr-card">
      {session?.active && image ? (
        <>
          <img src={image} alt="QR collectif du dimanche" width={132} height={132}/>
          <div>
            <p className="sunday-qr-card-title"><span className="qr-live-dot"/> QR du dimanche actif</p>
            <p className="sunday-qr-card-date">Rencontre du {dateLabel(session.meetingDay || '', {day: 'numeric', month: 'long'}).replace(/^1 /, '1er ')}</p>
            <a href="/accueil/qr" target="_blank" rel="noopener" className="text-link"><Maximize2 size={14}/> Afficher en plein écran</a>
          </div>
        </>
      ) : (
        <div>
          <p className="sunday-qr-card-title"><QrCode size={16}/> QR du dimanche</p>
          <p className="sunday-qr-card-date">{session ? nextOpening(session) : 'Chargement…'}</p>
          {session && !session.active && <OpenNowButton onOpened={refresh}/>}
        </div>
      )}
    </div>
  );
}
