// Adaptador de flujo (src/assessment.js). El motor, el extractor y el estado de la extracción no se modifican.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {VARIABLES, BLOCKS, calculate, pendingFields, actionsForPriority, MAX_SCORE} from '../src/clinical.js';
import {exportStructured, exportCsv} from '../src/storage.js';
import * as A from '../src/assessment.js';
import {createReport, validateReport, reportToText, exportEnvelope, toCsv} from '../src/cmo-ds/cmo-report.js';
import {reportToPdf} from '../src/cmo-ds/cmo-pdf.js';

const form = (answers = {}, extra = {}) => ({metadata: {hospital: 'Hospital Ficticio', pharmacist: 'Farmacéutica Ficticia', patientId: 'ONC-0001', date: '2026-11-10', patientType: 'oncology'}, answers, override: null, statuses: {}, plan: {nextReview: '', notes: ''}, completedAt: '', ...extra});
// Todas las variables respondidas «No» / sin actividad; después se activan las indicadas.
const NEUTRAL = {weightPrevious: 70, weightCurrent: 70, weightLossInvoluntary: false, age: 50, pregnancy: false, unhealthyHabits: false, communicationBarriers: false, psychiatricHistory: false, distressMethod: 'none', pfeifferErrors: 0, literate: true, ecog: '0', socialSupport: false, chronicDiseases: 0, doseAdjustment: false, painEva: 0, poorPainControl: false, acuteCare: false, dysphagia: false, treatmentSituation: 'neither', homeMedicines: 0, routeChange: false, regimenModification: false, highRiskMedication: false, specialStorage: false, complexRegimen: 'none', interactionCam: false, interactionPk: false, interactionC: false, interactionDX: false, toxicityGrade: 0, dispensingPercent: 100, moriskyIncorrect: false, clinicalTrial: false, specialUse: false, recentlyMarketed: false};
const complete = (over = {}) => ({...NEUTRAL, ...over});

test('los ficheros clínicos no se han modificado (huellas de la versión 1.2.0)', () => {
  const expected = JSON.parse(fs.readFileSync(new URL('./fixtures/clinical.sha256.json', import.meta.url), 'utf8'));
  for (const [file, hash] of Object.entries(expected)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(`../src/${file}`, import.meta.url))).digest('hex'), hash, file);
});

test('el caso neutro está completo y puntúa 0', () => {
  const ev = A.evaluate(form(complete()));
  assert.equal(ev.result.score, 0); assert.equal(ev.pending.length, 0); assert.equal(ev.provisional, false);
});

test('fronteras 15/16 y 27/28 por el flujo nuevo: mismo resultado que el motor', () => {
  const base = {chronicDiseases: 2, doseAdjustment: true, dysphagia: true, treatmentSituation: 'firstOrChange'}; // 16
  const at = (over) => A.evaluate(form(complete(over)));
  assert.equal(at({chronicDiseases: 2, dysphagia: true, treatmentSituation: 'firstOrChange', homeMedicines: 6}).result.score, 15);
  assert.equal(at({chronicDiseases: 2, dysphagia: true, treatmentSituation: 'firstOrChange', homeMedicines: 6}).finalPriority, 3);
  assert.equal(at({chronicDiseases: 2, dysphagia: true, treatmentSituation: 'firstOrChange', homeMedicines: 6, acuteCare: true}).result.score, 16);
  assert.equal(at({chronicDiseases: 2, dysphagia: true, treatmentSituation: 'firstOrChange', homeMedicines: 6, acuteCare: true}).finalPriority, 2);
  const high = {...base, regimenModification: true, toxicityGrade: 2};
  assert.equal(at({...high, complexRegimen: 'one', acuteCare: true}).result.score, 27);
  assert.equal(at({...high, complexRegimen: 'one', acuteCare: true}).finalPriority, 2);
  assert.equal(at({...high, complexRegimen: 'multiple'}).result.score, 28);
  assert.equal(at({...high, complexRegimen: 'multiple'}).finalPriority, 1);
});

test('paridad con el motor en 400 casos pseudoaleatorios (mismos puntos, misma prioridad, mismos campos pendientes)', () => {
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let i = 0; i < 400; i++) {
    const answers = {};
    for (const [name, spec] of Object.entries(A.FIELDS)) {
      if (rnd() < 0.25) continue;
      answers[name] = spec === 'bool' ? rnd() < 0.5 : typeof spec[0] === 'string' ? spec[Math.floor(rnd() * spec.length)] : Math.round((spec[0] + rnd() * (spec[1] - spec[0])) * 10) / 10;
    }
    const ev = A.evaluate(form(answers)), direct = calculate(answers);
    assert.equal(ev.result.score, direct.score); assert.equal(ev.finalPriority, direct.finalPriority);
    assert.deepEqual([...new Set(ev.pending.flatMap(d => d.pendingFields))].sort(), [...pendingFields(answers)].sort());
    assert.equal(ev.provisional, direct.pending.length > 0);
  }
});

test('«Pendiente» no es «No»: sin datos es provisional con cota superior; un «No» explícito deja de ser pendiente', () => {
  const empty = A.evaluate(form({}));
  assert.equal(empty.pending.length, VARIABLES.length); assert.equal(empty.provisional, true);
  assert.equal(empty.maxPossible.priority, 1); assert.equal(empty.maxPossible.automaticPossible, true); assert.equal(empty.priorityMayChange, true);
  assert.ok(empty.maxPossible.total >= MAX_SCORE);
  const partial = A.evaluate(form({pregnancy: false, socialSupport: false, age: 50}));
  assert.equal(partial.pending.length, VARIABLES.length - 3);
  assert.equal(partial.pending.some(d => d.variable.id === 'pregnancy'), false);
  const full = A.evaluate(form(complete()));
  assert.equal(full.maxPossible.total, full.result.score); assert.equal(full.priorityMayChange, false);
});

test('valores fuera de dominio no puntúan ni se aceptan (edad negativa, dispensación > 100, prioridad inventada)', () => {
  assert.equal(A.cleanAnswers({age: -5, dispensingPercent: 250, ecog: '9', pregnancy: 'quizá', homeMedicines: '8', inventado: 1}).age, undefined);
  const c = A.cleanAnswers({age: -5, dispensingPercent: 250, ecog: '9', pregnancy: 'quizá', homeMedicines: '8', inventado: 1});
  assert.deepEqual(c, {homeMedicines: 8});
  const ev = A.evaluate(form({age: -5}));
  assert.equal(ev.pending.some(d => d.variable.id === 'age'), true, 'edad negativa = pendiente (antes puntuaba 0 sin aviso)');
});

test('prioridad automática y modificación profesional: se conserva lo calculado y se avisa si rebaja una P1 automática', () => {
  const preg = form(complete({pregnancy: true}));
  let ev = A.evaluate(preg);
  assert.equal(ev.finalPriority, 1); assert.deepEqual(ev.result.automaticReasons, ['Embarazo']);
  preg.override = {priority: 3, justification: 'corta'};
  ev = A.evaluate(preg);
  assert.equal(ev.finalPriority, 1); assert.match(ev.overrideIgnoredReason, /al menos 15/);
  preg.override.justification = 'Justificación clínica ficticia suficiente';
  ev = A.evaluate(preg);
  assert.equal(ev.finalPriority, 3); assert.equal(ev.result.automaticPriority, 1); assert.equal(ev.overrideLowersAutomatic, true);
  const text = reportToText(createReport(A.buildReportInput({...preg, completedAt: '2026-11-10T09:00:00'}, ev, {version: '1.3.0'})));
  assert.match(text, /Resultado calculado por el modelo: Prioridad 3/, 'el cálculo por puntuación se conserva');
  assert.match(text, /Prioridad 1 automática: Embarazo/);
  assert.match(text, /Modificación por criterio profesional: Prioridad 3/);
  assert.match(text, /justificación reforzada/);
});

test('intervenciones: el catálogo es exactamente actionsForPriority() y los identificadores son estables entre prioridades', () => {
  for (const p of [1, 2, 3]) {
    const catalog = A.interventionCatalog(p), original = actionsForPriority(p);
    for (const g of Object.keys(original)) assert.deepEqual(catalog.filter(c => c.group === g).map(c => c.label), original[g]);
    assert.equal(new Set(catalog.map(c => c.id)).size, catalog.length);
  }
  const p1 = new Map(A.interventionCatalog(1).map(c => [c.id, c.label]));
  for (const c of A.interventionCatalog(2)) assert.equal(p1.get(c.id), c.label, 'un estado registrado en P2 sigue siendo válido si la prioridad sube a P1');
});

test('informe: cada variable que puntúa aparece una vez; necesidades = bloque de tratamiento; intervenciones por estado', () => {
  const f = form(complete({chronicDiseases: 3, dysphagia: true, regimenModification: true, toxicityGrade: 3, homeMedicines: 8}), {completedAt: '2026-11-10T09:30:00', statuses: {'follow.0': 'done', 'education.0': 'planned', 'follow.1': 'not_applicable'}, plan: {nextReview: '2027-01-10', notes: 'Revisión telefónica.'}});
  const ev = A.evaluate(f), report = createReport(A.buildReportInput(f, ev, {version: '1.3.0'}));
  assert.deepEqual(validateReport(report), []); assert.equal(report.status, 'final');
  assert.equal(report.factors.length + report.needs.confirmed.length, ev.result.positiveVariables.length);
  assert.deepEqual(report.needs.confirmed.map(n => n.label).sort(), ev.details.filter(d => d.active && d.variable.block === 4).map(d => d.variable.label).sort());
  const catalog = A.interventionCatalog(ev.finalPriority);
  assert.equal(report.interventions.done.length + report.interventions.planned.length + report.interventions.recommended.length + report.interventions.notApplicableCount, catalog.length);
  const text = reportToText(report);
  assert.match(text, /RESULTADO DE ESTRATIFICACIÓN: PRIORIDAD \d$/m);
  assert.match(text, new RegExp(`Puntuación total: ${ev.result.score}/${MAX_SCORE}`));
  assert.match(text, /Próxima valoración prevista: 10\/01\/2027/);
  assert.match(text, /Valoración en ciclos alternos|Valoración cada \d ciclos/);
  assert.ok(Buffer.from(reportToPdf(report)).toString('latin1').includes('ONC-0001'));
});

test('informe provisional: lista pendientes y cota superior; nunca se rotula como definitivo', () => {
  const f = form({age: 50, pregnancy: false}, {completedAt: '2026-11-10T09:30:00'});
  const text = reportToText(createReport(A.buildReportInput(f, A.evaluate(f))));
  assert.match(text, /\(PROVISIONAL\)/); assert.match(text, /no se ha considerado negativo/); assert.match(text, /cota superior/);
  assert.match(text, /Potenciales, pendientes de evaluación/);
});

test('necesidades por bloque: confirmadas y potenciales', () => {
  const n = A.needsByBlock(A.evaluate(form({dysphagia: true, pregnancy: false})));
  assert.equal(n.length, BLOCKS.length);
  assert.deepEqual(n[2].confirmed.map(d => d.variable.id), ['dysphagia']);
  assert.ok(n[3].potential.length > 0 && n[3].confirmed.length === 0);
});

test('exportación e importación: ida y vuelta, formato anterior y entradas hostiles', () => {
  const f = form(complete({dysphagia: true}), {override: {priority: 2, justification: 'Justificación clínica suficiente'}, statuses: {'follow.0': 'done'}, plan: {nextReview: '2027-02-01', notes: 'n'}, completedAt: '2026-11-10T09:30:00'});
  const data = A.serializeCase(f);
  assert.equal(data.schema, A.CASE_SCHEMA); assert.ok(!JSON.stringify(data).includes('evidence'));
  const env = JSON.stringify(exportEnvelope({app: {id: A.APP_ID, name: A.TOOL_NAME, version: '1.3.0'}, exportedAt: '2026-11-10T10:00:00Z', dataSchema: A.CASE_SCHEMA, data}));
  const back = A.importAny(env);
  assert.equal(back.ok, true); assert.deepEqual(A.evaluate(back.form).result, A.evaluate(f).result); assert.deepEqual(back.form.override, f.override);
  // Hostil: resultado falsificado, XSS en el identificador, valores y estados inventados, otra aplicación
  const evil = JSON.parse(env); evil.data.metadata.patientId = '<img src=x onerror=alert(1)>'; evil.data.answers.age = -1; evil.data.answers.ecog = '99'; evil.data.statuses = {'follow.0': 'hecho', zzz: 'done'}; evil.data.result = {score: 1, finalPriority: 3};
  const clean = A.importAny(JSON.stringify(evil));
  assert.equal(clean.ok, true); assert.equal(clean.form.answers.age, undefined); assert.equal(clean.form.answers.ecog, undefined); assert.deepEqual(clean.form.statuses, {}); assert.equal(clean.form.result, undefined);
  assert.equal(A.importAny(JSON.stringify({...JSON.parse(env), app: {id: 'otra'}})).ok, false);
  assert.equal(A.importAny('no json').ok, false); assert.equal(A.importAny('{"schema":"x"}').ok, false);
  // Formato anterior (schemaVersion 1) con resultado guardado que no se debe creer
  const legacy = exportStructured({id: 'x', status: 'completed', updatedAt: '2026-10-01T10:00:00Z', metadata: {hospital: 'H', pharmacist: 'F', date: '2026-10-01', patientType: 'hematology'}, answers: complete({dysphagia: true, hospital: 'H'}), result: {score: 99, finalPriority: 1}});
  const old = A.importAny(legacy);
  assert.equal(old.ok, true); assert.equal(old.legacy, true); assert.equal(old.form.completedAt, '2026-10-01T10:00:00Z', 'un caso finalizado anterior conserva su estado');
  assert.equal(A.evaluate(old.form).result.score, 4, 'el resultado se recalcula: 4 puntos por disfagia, no los 99 del fichero');
});

test('CSV: fórmulas neutralizadas en la exportación nueva y en la de casos guardados', () => {
  const f = form(complete(), {completedAt: '2026-11-10T09:30:00'}); f.metadata.patientId = '=HYPERLINK("x")';
  assert.ok(toCsv(A.csvRows(f, A.evaluate(f))).includes(`"'=HYPERLINK(""x"")"`));
  assert.ok(exportCsv({metadata: {patientId: '=cmd|x'}, result: {}}).includes(`"'=cmd|x"`));
});

test('la aplicación no contiene red, almacenamiento nuevo ni rótulos de IA para las reglas locales', () => {
  for (const file of ['app.js', 'assessment.js']) {
    const src = fs.readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /\bfetch\s*\(|XMLHttpRequest|WebSocket|sessionStorage|indexedDB|\balert\s*\(|\bconfirm\s*\(|https?:\/\//, file);
  }
  assert.doesNotMatch(fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8'), /extracción automática con inteligencia artificial/i);
});
