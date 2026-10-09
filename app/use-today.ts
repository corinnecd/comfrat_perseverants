'use client';
import { useEffect, useState } from 'react';
import { parisDay } from './dates';
export function useToday() {
  const [today, setToday] = useState(parisDay);
  useEffect(() => {
    const refresh = () => setToday(parisDay());
    refresh();
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return today;
}
