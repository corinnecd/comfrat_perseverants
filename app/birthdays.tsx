'use client';
import {useState} from 'react';
import {Cake, CalendarHeart, Gift, History, PartyPopper} from 'lucide-react';
import type {Person} from './data';
import {dateLabel} from './dates';
import {lastBirthday, nextBirthday} from './birthday-utils';

/** Filtre des anniversaires déjà passés, pour rattraper ceux qu'on aurait manqués. */
const PAST_RANGES = [
  {key: '7', label: '7 derniers jours', days: 7},
  {key: '30', label: '30 derniers jours', days: 30},
  {key: '90', label: '3 derniers mois', days: 91},
] as const;

const DAY = 86400000;
const toDate = (day: string) => new Date(day + 'T12:00:00Z');
const toDay = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (day: string, n: number) => toDay(new Date(toDate(day).getTime() + n * DAY));
/** Le dimanche mis à la une : aujourd'hui si on est dimanche, sinon le prochain dimanche. */
function featuredSunday(today: string) {
  const weekday = toDate(today).getUTCDay();
  return weekday === 0 ? today : addDays(today, 7 - weekday);
}

const initials = (p: Person) => (p.first[0] || '') + (p.last[0] || '');

export default function BirthdaysPage({people, today}: {people: Person[]; today: string}) {
  const sunday = featuredSunday(today);
  const weekday = toDate(today).getUTCDay();
  const withBirthday = people.filter((p) => p.birthday_day && p.birthday_month);
  const celebrants = withBirthday
    .filter((p) => nextBirthday(p.birthday_day!, p.birthday_month!, sunday) === sunday)
    .sort((a, b) => a.first.localeCompare(b.first, 'fr'));
  const upcoming = withBirthday
    .map((p) => ({p, date: nextBirthday(p.birthday_day!, p.birthday_month!, today)}))
    .filter(({date}) => (toDate(date).getTime() - toDate(today).getTime()) / DAY <= 30)
    .sort((a, b) => a.date.localeCompare(b.date) || a.p.first.localeCompare(b.p.first, 'fr'));
  const [range, setRange] = useState<(typeof PAST_RANGES)[number]['key']>('7');
  const rangeDays = PAST_RANGES.find((r) => r.key === range)!.days;
  const past = withBirthday
    .map((p) => ({p, date: lastBirthday(p.birthday_day!, p.birthday_month!, today)}))
    .filter(({date}) => (toDate(today).getTime() - toDate(date).getTime()) / DAY <= rangeDays)
    .sort((a, b) => b.date.localeCompare(a.date) || a.p.first.localeCompare(b.p.first, 'fr'));
  const daysAgo = (date: string) => {
    const n = Math.round((toDate(today).getTime() - toDate(date).getTime()) / DAY);
    return n === 1 ? 'Hier' : `Il y a ${n} jours`;
  };
  const sundayText = dateLabel(sunday, {weekday: 'long', day: 'numeric', month: 'long'});
  const kicker = weekday === 0 ? `Aujourd’hui, ${sundayText}` : weekday === 6 ? `Demain, ${sundayText}` : sundayText.replace(/^./, (c) => c.toUpperCase());
  const inDays = (date: string) => {
    const n = Math.round((toDate(date).getTime() - toDate(today).getTime()) / DAY);
    return n === 0 ? 'Aujourd’hui' : n === 1 ? 'Demain' : `Dans ${n} jours`;
  };

  return (
    <div className="birthdays">
      <section className="birthday-hero" aria-labelledby="birthday-hero-title">
        <div className="birthday-confetti" aria-hidden="true">{Array.from({length: 18}, (_, i) => <i key={i}/>)}</div>
        <div className="birthday-hero-copy">
          <p className="birthday-kicker"><PartyPopper size={16}/> {kicker}</p>
          <h2 id="birthday-hero-title">{celebrants.length ? 'Joyeux anniversaire !' : 'Pas d’anniversaire ce dimanche'}</h2>
          <p className="birthday-lede">{celebrants.length
            ? `Toute la Famille des Persévérants fête ${celebrants.length > 1 ? 'ces ' + celebrants.length + ' personnes' : 'cette personne'} ce dimanche. Un mot, un sourire, une bénédiction : faisons-leur une belle fête !`
            : 'Personne ne fête son anniversaire ce dimanche. Découvrez ci-dessous les prochains anniversaires à préparer.'}</p>
          {celebrants.length > 0 && (
            <ul className="birthday-names">
              {celebrants.map((p, i) => (
                <li key={p.id} style={{animationDelay: `${i * 80}ms`}}>
                  <span className={'birthday-avatar tone-' + (i % 5)}>{initials(p)}</span>
                  <span><strong>{p.first} {p.last.toUpperCase()}</strong><small><Cake size={13}/> {dateLabel(sunday, {day: 'numeric', month: 'long'})}</small></span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <picture className="birthday-photo"><source media="(max-width:760px)" srcSet="/anniversaire-mobile.webp"/><img src="/anniversaire.webp" alt="Une femme souffle les bougies de son gâteau d’anniversaire, entourée de sa famille et de ses amis qui applaudissent" width={1400} height={933} decoding="async"/></picture>
      </section>

      <section className="card birthday-upcoming">
        <div className="card-heading">
          <div><h2><CalendarHeart size={18}/> Prochains anniversaires</h2><p>Les 30 prochains jours, pour préparer un petit mot à l’avance.</p></div>
          <span className="count-pill">{upcoming.length}</span>
        </div>
        {upcoming.length ? (
          <ul className="birthday-list">
            {upcoming.map(({p, date}, i) => (
              <li key={p.id}>
                <span className={'birthday-avatar small tone-' + (i % 5)}>{initials(p)}</span>
                <span className="birthday-list-name"><strong>{p.first} {p.last.toUpperCase()}</strong><small>{dateLabel(date, {weekday: 'long', day: 'numeric', month: 'long'})}</small></span>
                <span className="birthday-when">{inDays(date)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty"><Gift size={28}/><h3>Aucun anniversaire dans les 30 prochains jours</h3><p>Les dates s’ajoutent à l’inscription ou depuis « Modifier la fiche ».</p></div>
        )}
      </section>

      <section className="card birthday-upcoming birthday-past">
        <div className="card-heading">
          <div><h2><History size={18}/> Anniversaires passés</h2><p>Pour rattraper un anniversaire manqué : un petit mot, même en retard, fait toujours plaisir.</p></div>
          <span className="count-pill">{past.length}</span>
        </div>
        <div className="birthday-past-filters" role="group" aria-label="Période des anniversaires passés">
          {PAST_RANGES.map((r) => (
            <button key={r.key} type="button" className={range === r.key ? 'primary' : 'secondary'} aria-pressed={range === r.key} onClick={() => setRange(r.key)}>{r.label}</button>
          ))}
        </div>
        {past.length ? (
          <ul className="birthday-list">
            {past.map(({p, date}, i) => (
              <li key={p.id}>
                <span className={'birthday-avatar small tone-' + (i % 5)}>{initials(p)}</span>
                <span className="birthday-list-name"><strong>{p.first} {p.last.toUpperCase()}</strong><small>{dateLabel(date, {weekday: 'long', day: 'numeric', month: 'long'})}</small></span>
                <span className="birthday-when">{daysAgo(date)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty"><Gift size={28}/><h3>Aucun anniversaire sur cette période</h3><p>Choisissez une période plus longue pour remonter plus loin.</p></div>
        )}
        <p className="birthday-note">{withBirthday.length} personne{withBirthday.length > 1 ? 's' : ''} sur {people.length} {withBirthday.length > 1 ? 'ont' : 'a'} renseigné son anniversaire.</p>
      </section>
    </div>
  );
}
