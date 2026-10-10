'use client';
import {useState} from 'react';
import {CalendarDays} from 'lucide-react';
import type {Person,Attendance} from './data';
import {dateLabel} from './dates';
import {sundaysInMonth} from './monthly-presence';
export default function MonthlyPresenceStat({people,attendance,today}:{people:Person[],attendance:Attendance[],today:string}) {
  const [personId,setPersonId]=useState('');
  const person=people.find(p=>p.id===personId)||people[0];
  const days=sundaysInMonth(today.slice(0,7));
  const count=new Set(attendance.filter(a=>a.person===person?.id&&days.includes(a.day)).map(a=>a.day)).size;
  return <article className="stat-card monthly-person-stat"><div className="stat-top"><span>Nombre de présences par mois</span><i className="icon-tile blue"><CalendarDays size={19}/></i></div><strong>{count} sur {days.length}</strong><small className="blue">{dateLabel(today,{month:'long',year:'numeric'})}</small>{people.length>0?<select aria-label="Personne dont consulter les présences du mois" value={person?.id||''} onChange={e=>setPersonId(e.target.value)}>{people.map(p=><option key={p.id} value={p.id}>{p.first} {p.last}</option>)}</select>:<small>Aucune personne enregistrée</small>}</article>;
}
