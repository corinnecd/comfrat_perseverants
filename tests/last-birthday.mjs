import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=ts.transpile(readFileSync('app/birthday-utils.ts','utf8'),{module:ts.ModuleKind.ESNext});
const {lastBirthday}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
assert.equal(lastBirthday(10,11,'2026-11-14'),'2026-11-10');
assert.equal(lastBirthday(14,11,'2026-11-14'),'2025-11-14'); // aujourd'hui : reste dans « Prochains anniversaires »
assert.equal(lastBirthday(20,11,'2026-11-14'),'2025-11-20');
assert.equal(lastBirthday(28,12,'2027-01-05'),'2026-12-28');
assert.equal(lastBirthday(29,2,'2026-03-10'),'2026-02-28');
console.log('PASS: dernier anniversaire passé (y compris 29 février et passage d’année).');
