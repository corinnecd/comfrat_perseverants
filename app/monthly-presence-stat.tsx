'use client';
import {useId,useState} from 'react';
import {CalendarDays} from 'lucide-react';
import type {Person,Attendance} from './data';
import {dateLabel} from './dates';
import {sundaysInMonth} from './monthly-presence';
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').trim();
export default function MonthlyPresenceStat({people,attendance,today}:{people:Person[],attendance:Attendance[],today:string}) {
  const [personId,setPersonId]=useState(''),[query,setQuery]=useState(''),[searching,setSearching]=useState(false),[active,setActive]=useState(-1);
  const listId=useId();
  const person=people.find(p=>p.id===personId);
  const terms=normalize(query).split(/\s+/);
  const open=searching&&normalize(query).length>=2;
  const matches=open?people.filter(p=>terms.every(term=>normalize(p.first+' '+p.last).includes(term))).slice(0,5):[];
  const days=sundaysInMonth(today.slice(0,7));
  const count=new Set(attendance.filter(a=>a.person===person?.id&&days.includes(a.day)).map(a=>a.day)).size;
  function choose(p:Person){setPersonId(p.id);setQuery(p.first+' '+p.last);setSearching(false);setActive(-1);}
  return <article className="stat-card monthly-person-stat"><div className="stat-top"><span>Nombre de présences par mois</span><i className="icon-tile blue"><CalendarDays size={19}/></i></div><strong>{person?`${count} sur ${days.length}`:'—'}</strong><small className="blue">{dateLabel(today,{month:'long',year:'numeric'})}</small>{people.length>0?<div className="monthly-person-search" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setSearching(false);}}><input role="combobox" aria-label="Rechercher par nom ou prénom" aria-autocomplete="list" aria-expanded={open&&matches.length>0} aria-controls={listId} aria-activedescendant={open&&active>=0&&matches[active]?listId+'-'+active:undefined} autoComplete="off" placeholder="Nom ou prénom…" value={query} onChange={e=>{setQuery(e.target.value);setPersonId('');setSearching(true);setActive(-1);}} onFocus={()=>{if(!person)setSearching(true);}} onKeyDown={e=>{if(e.key==='Escape'){setSearching(false);setActive(-1);}if(open&&matches.length){if(e.key==='ArrowDown'){e.preventDefault();setActive(i=>(i+1)%matches.length);}else if(e.key==='ArrowUp'){e.preventDefault();setActive(i=>(i<=0?matches.length:i)-1);}else if(e.key==='Enter'&&active>=0){e.preventDefault();choose(matches[active]);}}}}/>{open&&matches.length>0&&<div className="monthly-person-suggestions" role="listbox" id={listId} aria-label="Personnes correspondant à la recherche">{matches.map((p,i)=><button type="button" role="option" aria-selected={i===active} id={listId+'-'+i} key={p.id} onClick={()=>choose(p)}>{p.first} {p.last}</button>)}</div>}{open&&matches.length===0&&<small role="status">Aucun résultat</small>}{!person&&!open&&<small>Saisis un nom ou un prénom.</small>}</div>:<small>Aucune personne enregistrée</small>}</article>;
}
