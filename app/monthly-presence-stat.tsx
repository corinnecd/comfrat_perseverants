'use client';
import {useId,useState} from 'react';
import {CalendarDays,ChevronLeft,ChevronRight} from 'lucide-react';
import type {Person,Attendance} from './data';
import {dateLabel} from './dates';
import {sundaysInMonth} from './monthly-presence';
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').trim();
export default function MonthlyPresenceStat({people,attendance,today}:{people:Person[],attendance:Attendance[],today:string}) {
  const [personId,setPersonId]=useState(''),[query,setQuery]=useState(''),[searching,setSearching]=useState(false),[active,setActive]=useState(-1);
  const listId=useId();
  const FIRST_MONTH='2026-01';
  const shiftMonth=(m:string,n:number)=>{const d=new Date(m+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);return d.toISOString().slice(0,7);};
  const nextSunday=(()=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+(7-d.getUTCDay())%7);return d.toISOString().slice(0,10);})();
  const lastMonth=nextSunday.slice(0,7)>today.slice(0,7)?nextSunday.slice(0,7):today.slice(0,7);
  const [picked,setPicked]=useState('');
  const month=picked&&picked>=FIRST_MONTH&&picked<=lastMonth?picked:today.slice(0,7);
  const monthDay=month+'-01';
  const person=people.find(p=>p.id===personId);
  const terms=normalize(query).split(/\s+/);
  const open=searching&&normalize(query).length>=2;
  const matches=open?people.filter(p=>terms.every(term=>normalize(p.first+' '+p.last).includes(term))).slice(0,5):[];
  const days=sundaysInMonth(month);
  const yearStart=month.slice(0,4)+'-01';
  const yearSundays=Array.from({length:12},(_,i)=>shiftMonth(yearStart,i)).filter(m=>m<=month).flatMap(sundaysInMonth).filter(d=>d<=nextSunday);
  const yearCount=new Set(attendance.filter(a=>a.person===person?.id&&yearSundays.includes(a.day)).map(a=>a.day)).size;
  const count=new Set(attendance.filter(a=>a.person===person?.id&&days.includes(a.day)).map(a=>a.day)).size;
  // Keep input focus during pointer selection: Safari may blur to null before the option click.
  function choose(p:Person){setPersonId(p.id);setQuery(p.first+' '+p.last);setSearching(false);setActive(-1);}
  return <article className="stat-card monthly-person-stat"><div className="stat-top"><span>Nombre de présences en {dateLabel(monthDay,{month:'long'}).replace(/^./,letter=>letter.toLocaleUpperCase('fr'))}</span><i className="icon-tile blue"><CalendarDays size={19}/></i></div><strong>{person?`${count} sur ${days.length}`:'—'}</strong><div className="month-nav"><button type="button" aria-label="Mois précédent" disabled={month<=FIRST_MONTH} onClick={()=>setPicked(shiftMonth(month,-1))}><ChevronLeft size={16}/></button><small className="blue">{dateLabel(monthDay,{month:'long',year:'numeric'})}</small><button type="button" aria-label="Mois suivant" disabled={month>=lastMonth} onClick={()=>setPicked(shiftMonth(month,1))}><ChevronRight size={16}/></button></div>{person&&<small className="year-total">Depuis le 1er janvier {month.slice(0,4)} : <b>{yearCount} sur {yearSundays.length}</b> dimanches</small>}{people.length>0?<div className="monthly-person-search" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setSearching(false);}}><input role="combobox" aria-label="Rechercher par nom ou prénom" aria-autocomplete="list" aria-expanded={open&&matches.length>0} aria-controls={listId} aria-activedescendant={open&&active>=0&&matches[active]?listId+'-'+active:undefined} autoComplete="off" placeholder="Nom ou prénom…" value={query} onChange={e=>{setQuery(e.target.value);setPersonId('');setSearching(true);setActive(-1);}} onFocus={()=>{if(!person)setSearching(true);}} onKeyDown={e=>{if(e.key==='Escape'){setSearching(false);setActive(-1);}if(open&&matches.length){if(e.key==='ArrowDown'){e.preventDefault();setActive(i=>(i+1)%matches.length);}else if(e.key==='ArrowUp'){e.preventDefault();setActive(i=>(i<=0?matches.length:i)-1);}else if(e.key==='Enter'&&active>=0){e.preventDefault();choose(matches[active]);}}}}/>{open&&matches.length>0&&<div className="monthly-person-suggestions" role="listbox" id={listId} aria-label="Personnes correspondant à la recherche">{matches.map((p,i)=><button type="button" role="option" aria-selected={i===active} id={listId+'-'+i} key={p.id} onPointerDown={e=>e.preventDefault()} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(p)}>{p.first} {p.last}</button>)}</div>}{open&&matches.length===0&&<small role="status">Aucun résultat</small>}{!person&&!open&&<small>Saisis un nom ou un prénom.</small>}</div>:<small>Aucune personne enregistrée</small>}</article>;
}
