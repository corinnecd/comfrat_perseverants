'use client';
import {Car} from 'lucide-react';

/**
 * « Véhiculé(e) » — Oui / Non.
 * Sans `value` : champ de formulaire classique (name="vehicle"), lu par FormData.
 * Avec `value` + `onChange` : champ contrôlé (formulaires de modification).
 */
export default function VehicleField({required = false, value, onChange, label = 'Véhiculé(e)'}: {
  required?: boolean; value?: string; onChange?: (v: string) => void; label?: string;
}) {
  const controlled = onChange !== undefined;
  return (
    <fieldset className="vehicle-field">
      <legend><Car size={17}/> {label}{!required && <small> (facultatif)</small>}</legend>
      <div className="vehicle-options">
        {[['oui', 'Oui'], ['non', 'Non']].map(([v, l]) => (
          <label key={v} className="vehicle-option">
            <input type="radio" name="vehicle" value={v} required={required}
              {...(controlled ? {checked: value === v, onChange: () => onChange!(v)} : {})}/>
            <span>{l}</span>
          </label>
        ))}
      </div>
      <small className="vehicle-help">Utile pour organiser le covoiturage et les sorties de la famille.</small>
    </fieldset>
  );
}
