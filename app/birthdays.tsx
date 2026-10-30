'use client';
import {Cake, CalendarHeart, Gift, PartyPopper} from 'lucide-react';
import type {Person} from './data';
import {dateLabel} from './dates';
import {nextBirthday} from './birthday-utils';

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
    .filter(({date}) => date !== sunday && (toDate(date).getTime() - toDate(today).getTime()) / DAY <= 30)
    .sort((a, b) => a.date.localeCompare(b.date) || a.p.first.localeCompare(b.p.first, 'fr'));
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
        <BirthdayArt/>
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
        <p className="birthday-note">{withBirthday.length} personne{withBirthday.length > 1 ? 's' : ''} sur {people.length} {withBirthday.length > 1 ? 'ont' : 'a'} renseigné son anniversaire.</p>
      </section>
    </div>
  );
}

/** Illustration originale : ballons, gâteau et étoiles. */
function BirthdayArt() {
  const balloons: [number, number, string, number][] = [[62, 70, '#efb437', 0], [118, 48, '#e8735a', 0.6], [170, 78, '#4f9d8a', 1.2], [222, 56, '#e9a3b8', 1.8]];
  return (
    <svg className="birthday-art" viewBox="0 0 280 260" role="img" aria-label="Ballons et gâteau d’anniversaire">
      {balloons.map(([x, y, c, delay], i) => (
        <g key={i} className="balloon" style={{animationDelay: `${delay}s`}}>
          <path d={`M${x} ${y + 34} q -6 30 4 58 q 8 22 -2 44`} stroke="#f3e6c8" strokeWidth="1.4" fill="none" opacity=".75"/>
          <ellipse cx={x} cy={y} rx="22" ry="28" fill={c}/>
          <ellipse cx={x - 7} cy={y - 10} rx="5" ry="8" fill="#fff" opacity=".35"/>
          <path d={`M${x - 4} ${y + 27} l4 7 l4 -7 z`} fill={c}/>
        </g>
      ))}
      <g transform="translate(92 150)">
        <rect x="0" y="40" width="112" height="52" rx="10" fill="#fffaf0"/>
        <path d="M0 52 q14 12 28 0 t28 0 t28 0 t28 0 v-6 a10 10 0 0 0 -10 -6 h-92 a10 10 0 0 0 -10 6 z" fill="#e9a3b8"/>
        <rect x="14" y="8" width="84" height="36" rx="8" fill="#efb437"/>
        <path d="M14 18 q10.5 9 21 0 t21 0 t21 0 t21 0 v-2 a8 8 0 0 0 -8 -8 h-68 a8 8 0 0 0 -8 8 z" fill="#fff4dc"/>
        {[34, 56, 78].map((x, i) => (
          <g key={x}>
            <rect x={x - 2.5} y="-14" width="5" height="22" rx="2" fill={['#4f9d8a', '#e8735a', '#1f3b57'][i]}/>
            <path className="flame" style={{animationDelay: `${i * 0.25}s`}} d={`M${x} -28 c5 6 5 11 0 13 c-5 -2 -5 -7 0 -13 z`} fill="#ffcc4d"/>
          </g>
        ))}
        <rect x="-10" y="90" width="132" height="8" rx="4" fill="#d9b468"/>
      </g>
      {[[30, 150], [250, 140], [262, 214], [20, 222], [150, 20]].map(([x, y], i) => (
        <path key={i} className="sparkle" style={{animationDelay: `${i * 0.4}s`}} d={`M${x} ${y - 8} l2.4 5.6 l5.6 2.4 l-5.6 2.4 l-2.4 5.6 l-2.4 -5.6 l-5.6 -2.4 l5.6 -2.4 z`} fill="#ffd476"/>
      ))}
    </svg>
  );
}
