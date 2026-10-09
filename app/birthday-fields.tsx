'use client';
import {useState} from 'react';
import {AGE_RANGES,BIRTH_MONTHS} from './person-details';
export default function BirthdayFields() {
  const [day,setDay]=useState(''),[month,setMonth]=useState('');
  return <section className="birthday-fields" aria-labelledby="birthday-title">
    <h2 id="birthday-title">Hâte de te souhaiter ton anniversaire le :</h2>
    <div className="birthday-date">
      <label>Jour<select name="birthday_day" value={day} onChange={e=>setDay(e.target.value)} required={!!month} autoComplete="bday-day"><option value="">Jour</option>{Array.from({length:31},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label>
      <label>Mois<select name="birthday_month" value={month} onChange={e=>setMonth(e.target.value)} required={!!day} autoComplete="bday-month"><option value="">Mois</option>{BIRTH_MONTHS.map((name,i)=><option key={name} value={i+1}>{name}</option>)}</select></label>
    </div>
    <label>Tranche d’âge<select name="age_range" defaultValue=""><option value="">Choisir ma tranche d’âge</option>{AGE_RANGES.map(age=><option key={age} value={age}>{age}</option>)}</select></label>
    <p className="birthday-hint">Facultatif · Le jour et le mois suffisent, sans l’année de naissance.</p>
  </section>;
}
