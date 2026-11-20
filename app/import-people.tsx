'use client';
import {useState} from 'react';
import {Check, Download, FileUp, Info, Upload} from 'lucide-react';
import {downloadCsv} from './print-window';
import {IMPORT_HEADERS, columnFor} from './people-import';
import type {Person} from './data';

type Preview = {toImport: number; already: number; invalidCount: number; invalid: {line: number; reason: string}[]};

/** Lit un CSV (séparateur ; ou ,) en tableau de lignes. */
function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/)[0] || '';
  const sep = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) { if (c === '"' && clean[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c; continue; }
    if (c === '"') quoted = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && clean[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

async function readFile(file: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const {readSheet} = await import('read-excel-file/browser');
    const data = (await readSheet(file)) as unknown[][];
    return data.map((r) => r.map((v) => (v === null || v === undefined ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v))));
  }
  if (/\.csv$/i.test(file.name)) return parseCsv(await file.text());
  throw Error('Choisissez un fichier Excel (.xlsx) ou CSV (.csv).');
}

/**
 * Import des membres depuis un fichier Excel ou CSV (responsables uniquement).
 * 1. Lecture du fichier dans le navigateur, colonnes reconnues par leur nom.
 * 2. Aperçu calculé par le serveur (à importer / déjà présentes / lignes invalides), sans rien enregistrer.
 * 3. Import après confirmation. Les fiches importées sont « à compléter » et ne comptent dans aucune statistique avant.
 */
export default function ImportPeople({pending, demo, onDone}: {pending: Person[]; demo: boolean; onDone: () => Promise<void> | void}) {
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [ignored, setIgnored] = useState<string[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState('');

  async function post(dryRun: boolean, data: Record<string, string>[]) {
    const r = await fetch('/api/manage', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'importPeople', dryRun, rows: data})});
    const b = (await r.json()) as Preview & {imported?: number; error?: string};
    if (!r.ok) throw Error(b.error || 'Import impossible.');
    return b;
  }

  async function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(''); setDone(''); setPreview(null); setRows(null); setIgnored([]);
    if (demo) { setError('Passez aux données réelles pour importer un fichier.'); return; }
    setBusy(true);
    try {
      const table = await readFile(file);
      if (table.length < 2) throw Error('Le fichier ne contient aucune ligne de données.');
      const headers = table[0].map((h) => String(h));
      const cols = headers.map((h) => columnFor(h));
      if (!cols.includes('first') || !cols.includes('last') || !cols.includes('email')) throw Error('Colonnes « Prénom », « Nom » et « E-mail » introuvables sur la première ligne du fichier.');
      setIgnored(headers.filter((h, i) => h.trim() && !cols[i]));
      const data = table.slice(1).map((r) => Object.fromEntries(cols.flatMap((c, i) => (c ? [[c, String(r[i] ?? '').trim()]] : []))));
      setFileName(file.name); setRows(data);
      setPreview(await post(true, data));
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  async function commit() {
    if (!rows || !preview) return;
    if (!window.confirm(`Importer ${preview.toImport} personne${preview.toImport > 1 ? 's' : ''} depuis « ${fileName} » ?\n\nLes fiches existantes ne seront pas modifiées.`)) return;
    setBusy(true); setError('');
    try {
      const b = await post(false, rows);
      setDone(`${b.imported} personne${(b.imported || 0) > 1 ? 's importées' : ' importée'}. Elles compléteront leur fiche en validant leur présence.`);
      setRows(null); setPreview(null);
      await onDone();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <section className="card import-card">
      <div className="card-heading">
        <div>
          <h2><FileUp size={18}/> Importer des membres</h2>
          <p>Fichier Excel (.xlsx) ou CSV avec au minimum les colonnes Prénom, Nom et E-mail. Les fiches importées comptent dans les statistiques une fois complétées par la personne.</p>
        </div>
        <span className="count-pill import-pill" title="Fiches importées en attente de complément">{pending.length} à compléter</span>
      </div>
      <div className="import-body">
        <div className="button-row">
          <label className={'primary import-file' + (busy ? ' disabled' : '')}><Upload size={16}/> {busy ? 'Lecture…' : 'Choisir un fichier'}<input type="file" accept=".xlsx,.csv" onChange={(e) => void choose(e)} disabled={busy} hidden/></label>
          <button type="button" className="secondary" onClick={() => downloadCsv('modele-import-membres.csv', [IMPORT_HEADERS])}><Download size={16}/> Télécharger le modèle</button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {done && <p className="children-notice" role="status"><Check size={16}/> {done}</p>}
        {preview && (
          <div className="import-preview">
            <p><strong>Aperçu de « {fileName} »</strong> — rien n’est encore enregistré.</p>
            <ul>
              <li><strong>{preview.toImport}</strong> personne{preview.toImport > 1 ? 's' : ''} à importer</li>
              <li><strong>{preview.already}</strong> déjà présente{preview.already > 1 ? 's' : ''} dans l’application (ignorée{preview.already > 1 ? 's' : ''}, non modifiée{preview.already > 1 ? 's' : ''})</li>
              <li><strong>{preview.invalidCount}</strong> ligne{preview.invalidCount > 1 ? 's' : ''} invalide{preview.invalidCount > 1 ? 's' : ''}{preview.invalidCount ? ' (ignorée' + (preview.invalidCount > 1 ? 's' : '') + ')' : ''}</li>
            </ul>
            {preview.invalid.length > 0 && <details><summary>Voir les lignes invalides</summary><ul className="import-invalid">{preview.invalid.map((x) => <li key={x.line}>Ligne {x.line} : {x.reason}</li>)}</ul></details>}
            {ignored.length > 0 && <p className="import-note"><Info size={14}/> Colonnes ignorées : {ignored.join(', ')}</p>}
            <div className="button-row">
              <button type="button" className="primary" disabled={busy || preview.toImport === 0} onClick={() => void commit()}><Check size={16}/> Importer {preview.toImport} personne{preview.toImport > 1 ? 's' : ''}</button>
              <button type="button" className="secondary" disabled={busy} onClick={() => { setPreview(null); setRows(null); }}>Annuler</button>
            </div>
          </div>
        )}
        {pending.length > 0 && <details className="import-pending"><summary>{pending.length > 1 ? `Voir les ${pending.length} fiches à compléter` : 'Voir la fiche à compléter'}</summary><ul>{[...pending].sort((a, b) => a.last.localeCompare(b.last, 'fr')).map((p) => <li key={p.id}>{p.first} {p.last} <small>{p.email}</small></li>)}</ul></details>}
      </div>
    </section>
  );
}
