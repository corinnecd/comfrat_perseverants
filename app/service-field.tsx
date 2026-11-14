'use client';
import {useState} from 'react';
import {HandHeart} from 'lucide-react';

/**
 * « Je sers dans un département ? » — Oui / Non, puis « Lequel ? » si Oui.
 * Sans `value` : champs de formulaire classiques (name="serves" et name="service_department"), lus par FormData.
 * Avec `value` + `onChange` : champs contrôlés (formulaires de modification).
 */
export default function ServiceField({required = false, value, department, onChange}: {
  required?: boolean; value?: string; department?: string;
  onChange?: (serves: string, department: string) => void;
}) {
  const controlled = onChange !== undefined;
  const [localServes, setLocalServes] = useState('');
  const [localDept, setLocalDept] = useState('');
  const serves = controlled ? value || '' : localServes;
  const dept = controlled ? department || '' : localDept;
  const pick = (v: string) => {
    const nextDept = v === 'oui' ? dept : '';
    if (controlled) onChange!(v, nextDept); else { setLocalServes(v); setLocalDept(nextDept); }
  };
  const typeDept = (d: string) => { if (controlled) onChange!(serves, d); else setLocalDept(d); };
  return (
    <fieldset className="vehicle-field service-field">
      <legend><HandHeart size={17}/> Je sers dans un département ?{!required && <small> (facultatif)</small>}</legend>
      <div className="vehicle-options">
        {[['oui', 'Oui'], ['non', 'Non']].map(([v, l]) => (
          <label key={v} className="vehicle-option">
            <input type="radio" name="serves" value={v} required={required} checked={serves === v} onChange={() => pick(v)}/>
            <span>{l}</span>
          </label>
        ))}
      </div>
      {serves === 'oui' && (
        <label className="service-department">Si oui, lequel ?
          <input name="service_department" required maxLength={200} value={dept} onChange={(e) => typeDept(e.target.value)} placeholder="Ex. : accueil, louange, intercession, enfants…"/>
        </label>
      )}
    </fieldset>
  );
}
