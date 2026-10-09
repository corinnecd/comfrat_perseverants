'use client';
import {useState} from 'react';
import {ChevronRight,Search} from 'lucide-react';
import type {Person,Attendance} from './data';
import {dateLabel} from './dates';
import {monthlyPresence,sundaysInMonth} from './monthly-presence';
export default function MonthlyPresenceCard({people,attendance,today,onProfile}:{people:Person[],attendance:Attendance[],today:string,onProfile:(p:Person)=>void}) {
  const [chosenMonth,setChosenMonth]=useState(''),[query,setQuery]=useState('');
  const month=chosenMonth||today.slice(0,7);
  const rows=monthlyPresence(people,attendance,month).filter(({person})=>(person.first+' '+person.last).toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')));
  const total=sundaysInMonth(month).length;
  return <section className="card monthly-presence-card" aria-labelledby="monthly-presence-title">
    <div className="card-heading"><div><h2 id="monthly-presence-title">Dimanches de présence par mois</h2><p>{dateLabel(month+'-01',{month:'long',year:'numeric'})} · {total} dimanches dans le mois</p></div><label className="monthly-month">Mois à consulter<input aria-label="Mois à consulter" type="month" min="2000-01" max={today.slice(0,7)} value={month} onChange={e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value))setChosenMonth(e.target.value);}}/></label></div>
    <p className="monthly-explanation">Pour chaque personne, le nombre de dimanches où sa présence a été enregistrée sur tous les dimanches du mois.{month===today.slice(0,7)&&' Le mois est en cours : les dimanches à venir sont inclus dans le total.'}</p>
    <label className="search monthly-search"><Search size={17}/><input aria-label="Rechercher dans les présences mensuelles" placeholder="Rechercher une personne…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <div className="monthly-presence-list">{rows.map(({person,count,total})=><button className="monthly-person" key={person.id} onClick={()=>onProfile(person)} aria-label={`${person.first} ${person.last}, ${count} dimanche${count>1?'s':''} sur ${total}, ouvrir la fiche`}><span className="monthly-name"><span className="avatar">{person.first[0]}{person.last[0]}</span><span><strong>{person.first} {person.last}</strong><small>{person.status}</small></span></span><span className="monthly-result"><span>{count} dimanche{count>1?'s':''} sur {total}</span><span className="monthly-meter" aria-hidden="true">{Array.from({length:total},(_,i)=><i key={i} className={i<count?'filled':''}/>)}</span></span><ChevronRight size={17}/></button>)}</div>
    {rows.length===0&&<p className="empty">{query?'Aucune personne ne correspond à cette recherche.':'Aucune personne inscrite pour ce mois.'}</p>}
  </section>;
}
