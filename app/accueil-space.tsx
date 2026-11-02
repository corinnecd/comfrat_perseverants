'use client';
import {useEffect, useState} from 'react';
import {Baby, Cake, Check, MessageSquareWarning, Search, Send, UserPlus, Users} from 'lucide-react';
import {CHILD_STATUS} from './data';
import {dateLabel} from './dates';
import type {Person} from './data';
import {useToday} from './use-today';
import {birthdayOn} from './birthday-utils';
import {BIRTH_MONTHS, CHILD_AGE_RANGES} from './person-details';
import {SundayQrCard} from './sunday-qr';

type Light = Pick<Person, 'id' | 'first' | 'last' | 'status' | 'birthday_day' | 'birthday_month'>;
const normalize = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const emptyChild = {first: '', last: '', phone: '', birthday_day: '', birthday_month: '', age_range: '', consent: false};

/** Espace des bénévoles de l'accueil : noms, présences du jour et anniversaires uniquement. */
/** Bloc présences des bénévoles : recherche par nom, présence en un clic, ajout d'un enfant, liste des présents. */
export default function AccueilPanel({showQr = true}: {showQr?: boolean}) {
  const today = useToday();
  const [people, setPeople] = useState<Light[]>([]);
  const [present, setPresent] = useState<Set<string>>(new Set());
  const [day, setDay] = useState('');
  const [query, setQuery] = useState('');
  const [childFor, setChildFor] = useState<Light | null>(null);
  const [fixFor, setFixFor] = useState<Light | null>(null);
  const [fixText, setFixText] = useState('');
  const [child, setChild] = useState(emptyChild);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  type Payload = {people?: Light[]; attendance?: {person: string}[]; meetingDay?: string; error?: string};
  const fetchData = async () => { const r = await fetch('/api/manage', {cache: 'no-store'}); return {ok: r.ok, b: (await r.json()) as Payload}; };
  function apply({ok, b}: {ok: boolean; b: Payload}) {
    if (!ok) { setError(b.error || 'Données indisponibles.'); return; }
    setPeople(b.people || []); setPresent(new Set((b.attendance || []).map((a) => a.person))); setDay(b.meetingDay || '');
  }
  async function load() { apply(await fetchData()); }
  useEffect(() => {
    let live = true;
    fetchData().then((res) => { if (live) apply(res); }).catch(() => { if (live) setError('Connexion indisponible. Réessayez.'); });
    return () => { live = false; };
  }, []);

  async function post(body: Record<string, unknown>, success: string) {
    setBusy(true); setError(''); setMessage('');
    try {
      const r = await fetch('/api/manage', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
      const b = (await r.json()) as {error?: string; alreadyPresent?: boolean};
      if (!r.ok) throw Error(b.error || 'Enregistrement impossible.');
      await load();
      setMessage(b.alreadyPresent ? 'Déjà enregistré·e pour cette rencontre.' : success);
      return true;
    } catch (e) { setError((e as Error).message); return false; } finally { setBusy(false); }
  }

  async function addChild(e: React.FormEvent) {
    e.preventDefault();
    if (childFor && await post({action: 'addChild', parentId: childFor.id, ...child}, `${child.first} est enregistré·e et marqué·e présent·e.`)) { setChild(emptyChild); setChildFor(null); }
  }

  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const matches = terms.length && normalize(query).length >= 2 ? people.filter((p) => terms.every((t) => normalize(p.first + ' ' + p.last).includes(t))).slice(0, 8) : [];
  const presentList = people.filter((p) => present.has(p.id)).sort((a, b) => a.last.localeCompare(b.last, 'fr') || a.first.localeCompare(b.first, 'fr'));
  const kids = presentList.filter((p) => p.status === CHILD_STATUS).length;
  const isBirthday = (p: Light) => birthdayOn(p.birthday_day, p.birthday_month, today) || (!!day && day >= today && birthdayOn(p.birthday_day, p.birthday_month, day));
  const setC = (k: keyof typeof emptyChild) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setChild((c) => ({...c, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value}));

  return (
    <div className="accueil-space-grid">
          <section className="card accueil-search-card">
            <div className="card-heading"><div><h2>Enregistrer une présence</h2><p>Rencontre du {day ? dateLabel(day, {weekday: 'long', day: 'numeric', month: 'long'}) : '…'}</p></div></div>
            <div className="accueil-search-body">
              <label className="search"><Search size={16}/><input placeholder="Nom ou prénom…" value={query} onChange={(e) => { setQuery(e.target.value); setChildFor(null); setFixFor(null); }} aria-label="Rechercher une personne"/></label>
              {message && <p className="children-notice" role="status"><Check size={16}/> {message}</p>}
              {error && <p className="form-error" role="alert">{error}</p>}
              {matches.length > 0 && (
                <ul className="accueil-results">
                  {matches.map((p) => (
                    <li key={p.id}>
                      <span><strong>{p.first} {p.last}</strong>{p.status === CHILD_STATUS && <span className="status-type child"><Baby size={12}/>Enfant</span>}{isBirthday(p) && <span className="birthday-badge"><Cake size={13}/> Anniversaire</span>}</span>
                      <span className="accueil-result-actions">
                        {present.has(p.id)
                          ? <span className="children-present"><Check size={15}/> Présent·e</span>
                          : <button className="primary" disabled={busy} onClick={() => post({action: 'attend', id: p.id}, `${p.first} ${p.last} est enregistré·e.`)}><Check size={15}/> Présent·e</button>}
                        {p.status !== CHILD_STATUS && <button className="secondary" onClick={() => { setChildFor(p); setFixFor(null); setChild({...emptyChild, last: p.last}); setMessage(''); }}><Baby size={15}/> Ajouter un enfant</button>}<button className="secondary" onClick={() => { setFixFor(p); setChildFor(null); setFixText(''); setMessage(''); }}><MessageSquareWarning size={15}/> Signaler une correction</button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {query.trim().length >= 2 && matches.length === 0 && <p className="accueil-hint">Aucune personne trouvée. Si c’est sa première visite, utilisez « Nouvelle inscription ».</p>}
              {!query && <p className="accueil-hint">Tapez au moins deux lettres du nom ou du prénom.</p>}
              {fixFor && (
                <form className="registration-form children-form accueil-child-form" onSubmit={async (e) => { e.preventDefault(); if (await post({action: 'requestCorrection', id: fixFor.id, message: fixText}, `Demande transmise aux responsables pour ${fixFor.first} ${fixFor.last}.`)) { setFixFor(null); setFixText(''); } }}>
                  <h3><MessageSquareWarning size={17}/> Correction pour {fixFor.first} {fixFor.last}</h3>
                  <label>Que faut-il corriger ?<textarea required maxLength={500} value={fixText} onChange={(e) => setFixText(e.target.value)} placeholder="Ex. : nouveau numéro 06…, nom mal orthographié, statut Membre…"/></label>
                  <p className="accueil-hint">Un responsable vérifiera et appliquera la correction. Si la personne a son téléphone, elle peut aussi corriger elle-même avec « Modifier mes informations » après son scan.</p>
                  <div className="button-row"><button className="primary" disabled={busy}><Send size={16}/> Transmettre</button><button type="button" className="secondary" onClick={() => setFixFor(null)}>Annuler</button></div>
                </form>
              )}
              {childFor && (
                <form className="registration-form children-form accueil-child-form" onSubmit={addChild}>
                  <h3><Baby size={17}/> Enfant de {childFor.first} {childFor.last}</h3>
                  <div className="form-grid">
                    <label>Prénom<input required maxLength={200} value={child.first} onChange={setC('first')}/></label>
                    <label>Nom<input required maxLength={200} value={child.last} onChange={setC('last')}/></label>
                    <label>Anniversaire · jour<select required value={child.birthday_day} onChange={setC('birthday_day')}><option value="">Jour</option>{Array.from({length: 31}, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>
                    <label>Anniversaire · mois<select required value={child.birthday_month} onChange={setC('birthday_month')}><option value="">Mois</option>{BIRTH_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
                  </div>
                  <label>Tranche d’âge<select required value={child.age_range} onChange={setC('age_range')}><option value="">Choisir</option>{CHILD_AGE_RANGES.map((a) => <option key={a} value={a}>{a}</option>)}</select></label>
                  <label>Téléphone de l’enfant <small>(facultatif)</small><input type="tel" maxLength={25} value={child.phone} onChange={setC('phone')}/></label>
                  <label className="children-consent"><input type="checkbox" required checked={child.consent} onChange={setC('consent')}/> Le parent présent a donné son accord pour enregistrer ces informations.</label>
                  <div className="button-row"><button className="primary" disabled={busy}><UserPlus size={16}/> Ajouter et marquer présent·e</button><button type="button" className="secondary" onClick={() => setChildFor(null)}>Annuler</button></div>
                </form>
              )}
            </div>
          </section>

          <section className="card accueil-present-card">
            <div className="card-heading"><div><h2>Personnes présentes</h2><p>{presentList.length} présente{presentList.length > 1 ? 's' : ''}{kids ? ` · dont ${kids} enfant${kids > 1 ? 's' : ''}` : ''}</p></div><span className="count-pill">{presentList.length}</span></div>
            {presentList.length ? (
              <ul className="accueil-present-list">
                {(showAll ? presentList : presentList.slice(0, 10)).map((p) => (
                  <li key={p.id}><span className="avatar">{p.first[0]}{p.last[0]}</span><strong>{p.first} {p.last}</strong>{p.status === CHILD_STATUS && <span className="status-type child"><Baby size={12}/>Enfant</span>}{isBirthday(p) && <span className="birthday-badge"><Cake size={13}/> Anniversaire</span>}</li>
                ))}
              </ul>
            ) : null}
            {presentList.length > 10 && <div className="list-more"><button className="secondary" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Voir moins' : `Voir plus · ${presentList.length - 10} autre${presentList.length - 10 > 1 ? 's' : ''}`}</button></div>}
            {presentList.length ? null : <div className="empty"><Users size={28}/><h3>Personne pour l’instant</h3><p>Les présences apparaîtront ici au fil des arrivées.</p></div>}
            {showQr && <div className="accueil-qr"><SundayQrCard/></div>}
          </section>
    </div>
  );
}
