'use client';
import {useEffect,useState} from 'react';
import {getCheckinWindow,meetingDayAt,lastCompletedSunday} from './meeting-calendar';
import {parisDay,sunday} from './dates';
export function useMeetingCalendar(){const read=()=>{const window=getCheckinWindow();return {meetingDay:meetingDayAt(),completedSunday:lastCompletedSunday(),followupSince:window.active?parisDay(new Date(window.startsAt)):sunday()};};const [value,setValue]=useState(read);useEffect(()=>{const refresh=()=>setValue(read());const timer=window.setInterval(refresh,30000);window.addEventListener('focus',refresh);return()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh);};},[]);return value;}
