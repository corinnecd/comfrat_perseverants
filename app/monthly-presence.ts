import type {Attendance,Person} from './data';
import {parisDay} from './dates';
export function sundaysInMonth(month:string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
  const [year,number]=month.split('-').map(Number);
  const cursor=new Date(Date.UTC(year,number-1,1,12));
  cursor.setUTCDate(1+(7-cursor.getUTCDay())%7);
  const days:string[]=[];
  while(cursor.getUTCMonth()===number-1) {days.push(cursor.toISOString().slice(0,10));cursor.setUTCDate(cursor.getUTCDate()+7);}
  return days;
}
export function monthlyPresence(people:Person[],attendance:Attendance[],month:string) {
  const sundays=sundaysInMonth(month),validDays=new Set(sundays);
  if(!sundays.length)return [];
  const visits=new Map<string,Set<string>>();
  for(const a of attendance)if(validDays.has(a.day)) {if(!visits.has(a.person))visits.set(a.person,new Set());visits.get(a.person)!.add(a.day);}
  const end=new Date(month+'-01T12:00:00Z');end.setUTCMonth(end.getUTCMonth()+1);
  return people.filter(p=>parisDay(new Date(p.created))<end.toISOString().slice(0,10)).map(person=>({person,count:visits.get(person.id)?.size||0,total:sundays.length}));
}
