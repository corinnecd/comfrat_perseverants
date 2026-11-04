'use client';
import {useState} from 'react';
import {AGE_RANGES, BIRTH_MONTHS, YOUNG_AGE_RANGES} from './person-details';
const CURRENT_YEAR = new Date().getUTCFullYear();
/** Pour les moins de 18 ans : 22 années de proposition (jusqu'à l'année courante). */
const YOUNG_YEARS = Array.from({length: 22}, (_, i) => CURRENT_YEAR - i);
export default function BirthdayFields() {
  const [day, setDay] = useState(''), [month, setMonth] = useState(''), [year, setYear] = useState(''), [age, setAge] = useState('');
  const requireYear = YOUNG_AGE_RANGES.includes(age);
  return <section className="birthday-fields" aria-labelledby="birthday-title">
    <h2 id="birthday-title">Hâte de te souhaiter ton anniversaire le :</h2>
    <div className="birthday-date">
      <label>Jour<select name="birthday_day" value={day} onChange={e => setDay(e.target.value)} required={!!month || requireYear} autoComplete="bday-day"><option value="">Jour</option>{Array.from({length: 31}, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>
      <label>Mois<select name="birthday_month" value={month} onChange={e => setMonth(e.target.value)} required={!!day || requireYear} autoComplete="bday-month"><option value="">Mois</option>{BIRTH_MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}</select></label>
      {requireYear && <label>Année<select name="birthday_year" value={year} onChange={e => setYear(e.target.value)} required autoComplete="bday-year"><option value="">Année</option>{YOUNG_YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select></label>}
    </div>
    <label>Tranche d’âge<select name="age_range" value={age} onChange={e => setAge(e.target.value)}><option value="">Choisir ma tranche d’âge</option>{AGE_RANGES.map(a => <option key={a} value={a}>{a}</option>)}</select></label>
    <p className="birthday-hint">{requireYear ? 'Pour les moins de 18 ans, la date de naissance complète (jour, mois, année) est demandée.' : 'Facultatif · Le jour et le mois suffisent, sans l’année de naissance.'}</p>
  </section>;
}
