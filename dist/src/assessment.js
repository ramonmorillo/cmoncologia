// Adaptador de SIAF-CMO Oncología al flujo común CMO (núcleo en src/cmo-ds/).
// No contiene reglas clínicas: el único motor es calculate() de clinical.js (sin cambios).
// Aquí se gestionan solo el estado de la evaluación, las variables pendientes y su alcance máximo,
// el registro de intervenciones, el informe único y el esquema de exportación del caso.
import {BLOCKS, VARIABLES, MAX_SCORE, MIN_OVERRIDE_LENGTH, calculate, priorityFromScore, actionsForPriority, PERIODICITY, REASSESS_WHEN} from './clinical.js';
import {INTERVENTION_STATUSES, parseEnvelope} from './cmo-ds/cmo-report.js';

export const CASE_SCHEMA = 'cmo-onc-case/1';
export const APP_ID = 'cmo-oncohematologia';
export const TOOL_NAME = 'SIAF-CMO Oncología';
export const LEGACY_APPLICATION = 'SIAF-CMO Oncología';
export const SOURCE_DOCUMENT = 'SEFH, Modelo de Estratificación y Atención Farmacéutica para pacientes con enfermedades oncohematológicas';
export const priorityLabel = p => `Prioridad ${p}`;
export const PATIENT_TYPES = {oncology: 'Oncología', hematology: 'Hematología'};
export const GROUP_LABELS = {follow: 'Seguimiento farmacoterapéutico', education: 'Formación, educación y seguimiento del paciente', coordination: 'Coordinación con el equipo asistencial'};
export const SHORT_BLOCKS = {1: 'Demográficas', 2: 'Sociosanitarias, cognitivas y funcionales', 3: 'Clínicas y uso de servicios', 4: 'Tratamiento'};
export {MAX_SCORE, MIN_OVERRIDE_LENGTH};

// Campos de respuesta admitidos y su dominio (los mismos límites que los controles de la interfaz).
const BOOL = 'bool';
export const FIELDS = {
  age: [0, 120], weightPrevious: [0.1, 500], weightCurrent: [0.1, 500], weightLossInvoluntary: BOOL, pregnancy: BOOL, unhealthyHabits: BOOL, communicationBarriers: BOOL,
  psychiatricHistory: BOOL, distressMethod: ['none', 'hads', 'eva'], hadsTotal: [0, 42], hadsAnxiety: [0, 21], hadsDepression: [0, 21], distressEva: [0, 10],
  pfeifferErrors: [0, 10], literate: BOOL, ecog: ['0', '1', '2', '3', '4'], socialSupport: BOOL, chronicDiseases: [0, 30], doseAdjustment: BOOL, painEva: [0, 10],
  poorPainControl: BOOL, acuteCare: BOOL, dysphagia: BOOL, treatmentSituation: ['neither', 'firstOrChange', 'thirdOrLater'], homeMedicines: [0, 50], routeChange: BOOL,
  regimenModification: BOOL, highRiskMedication: BOOL, specialStorage: BOOL, complexRegimen: ['none', 'one', 'multiple'], interactionCam: BOOL, interactionPk: BOOL,
  interactionC: BOOL, interactionDX: BOOL, toxicityGrade: [0, 5], dispensingPercent: [0, 100], moriskyIncorrect: BOOL, clinicalTrial: BOOL, specialUse: BOOL, recentlyMarketed: BOOL
};
export const FIELD_NAMES = new Set(Object.keys(FIELDS));
export const FIELD_LABELS = {
  age: 'Edad (años)', weightPrevious: 'Peso hace 3 meses (kg)', weightCurrent: 'Peso actual (kg)', weightLossInvoluntary: 'Pérdida involuntaria', pregnancy: 'Embarazo',
  unhealthyHabits: 'Hábitos no saludables', communicationBarriers: 'Barreras de comunicación', psychiatricHistory: 'Antecedentes psiquiátricos', distressMethod: 'Método',
  hadsTotal: 'HADS total', hadsAnxiety: 'HADS ansiedad', hadsDepression: 'HADS depresión', distressEva: 'EVA Distress', pfeifferErrors: 'Errores Pfeiffer', literate: 'Sabe leer y escribir',
  ecog: 'ECOG', socialSupport: 'Soporte social', chronicDiseases: 'Enfermedades crónicas', doseAdjustment: 'Ajuste de dosis', painEva: 'EVA dolor', poorPainControl: 'Mal control del dolor',
  acuteCare: 'Ingreso/urgencias', dysphagia: 'Disfagia', treatmentSituation: 'Situación', homeMedicines: 'Medicamentos domiciliarios', routeChange: 'Cambio de vía/forma', regimenModification: 'Modificación del régimen',
  highRiskMedication: 'Medicación de alto riesgo', specialStorage: 'Almacenamiento especial', complexRegimen: 'Complejidad', interactionCam: 'Interacción CAM', interactionPk: 'Interacción PK',
  interactionC: 'Interacción categoría C', interactionDX: 'Interacción categoría D/X', toxicityGrade: 'Grado de toxicidad', dispensingPercent: '% dispensación', moriskyIncorrect: 'Morisky: respuesta incorrecta',
  clinicalTrial: 'Ensayo clínico', specialUse: 'Uso especial', recentlyMarketed: 'Comercializado recientemente', currentWeight: 'Peso actual', previousWeight: 'Peso previo', method: 'Método', total: 'Total',
  anxiety: 'Ansiedad', depression: 'Depresión', eva: 'EVA', errors: 'Errores', poorControl: 'Mal control', situation: 'Situación'
};
export const VALUE_LABELS = {none: 'Ninguna', neither: 'Ninguna', firstOrChange: 'Primer ciclo o cambio', thirdOrLater: 'Tercera línea o posterior', one: 'Un medicamento oral, pauta discontinua', multiple: 'Dos o más, pautas discontinuas/diferentes', hads: 'HADS', eva: 'EVA Distress'};
const EXTRA_FIELDS = {psychologicalDistress: ['hadsTotal', 'hadsAnxiety', 'hadsDepression', 'distressEva']};
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const isMissing = v => v === undefined || v === null || v === '';

/** Respuestas saneadas: solo campos del modelo, con valores dentro de su dominio; lo demás queda pendiente. */
export function cleanAnswers(raw) {
  const out = {};
  for (const [name, spec] of Object.entries(FIELDS)) {
    const v = raw?.[name];
    if (isMissing(v)) continue;
    if (spec === BOOL) { if (v === true || v === 'true') out[name] = true; else if (v === false || v === 'false') out[name] = false; }
    else if (Array.isArray(spec) && typeof spec[0] === 'string') { if (spec.includes(String(v))) out[name] = String(v); }
    else { const n = Number(v); if (Number.isFinite(n) && n >= spec[0] && n <= spec[1] && typeof v !== 'boolean') out[name] = n; }
  }
  return out;
}

export const fieldText = (name, value) => (value === true ? 'Sí' : value === false ? 'No' : VALUE_LABELS[value] || String(value));
const fieldsOf = v => [...new Set([...v.required, ...(EXTRA_FIELDS[v.id] || [])])];
const responseOf = (v, a) => fieldsOf(v).filter(k => !isMissing(a[k])).map(k => `${FIELD_LABELS[k] || k}: ${fieldText(k, a[k])}`).join('; ');

/** Ejecuta el motor original y añade la información de flujo: pendientes, alcance máximo y modificación profesional. */
export function evaluate(form) {
  const answers = cleanAnswers(form.answers);
  const o = form.override;
  const override = o && [1, 2, 3].includes(Number(o.priority)) ? {priority: Number(o.priority), justification: str(o.justification, 2000)} : null;
  const result = calculate(answers, override);
  const details = VARIABLES.map(v => {
    const pendingFields = v.required.filter(k => isMissing(answers[k]));
    const points = v.score(answers);
    return {variable: v, pending: pendingFields.length > 0, pendingFields, points, active: points > 0, response: responseOf(v, answers)};
  });
  const pending = details.filter(d => d.pending);
  // Cota superior si todas las pendientes resultaran positivas: suma de los máximos declarados de cada variable.
  const gain = pending.reduce((n, d) => n + Math.max(0, d.variable.max - d.points), 0);
  const automaticPossible = !result.automaticPriority && pending.some(d => ['age', 'pregnancy', 'socialSupport'].includes(d.variable.id));
  const maxTotal = result.score + gain;
  const base = result.automaticPriority ?? result.calculatedPriority;
  const maxPriority = result.automaticPriority || automaticPossible ? 1 : priorityFromScore(maxTotal);
  return {
    answers, result, details, pending, provisional: pending.length > 0,
    maxPossible: {total: maxTotal, priority: maxPriority, automaticPossible}, priorityMayChange: maxPriority < base,
    finalPriority: result.finalPriority, override: result.override,
    overrideLowersAutomatic: !!result.override && result.automaticPriority === 1 && result.override.priority > 1,
    overrideIgnoredReason: o && [1, 2, 3].includes(Number(o.priority)) && !result.override ? `La justificación debe tener al menos ${MIN_OVERRIDE_LENGTH} caracteres: la modificación no se aplica.` : ''
  };
}

/** Intervenciones del modelo (acumulativas) con identificadores estables: la lista de P2 es prefijo de la de P1. */
export function interventionCatalog(priority) {
  return Object.entries(actionsForPriority(priority)).flatMap(([group, items]) => items.map((label, i) => ({id: `${group}.${i}`, group, groupLabel: GROUP_LABELS[group], label})));
}
export const interventionStatus = (form, id) => (Object.hasOwn(INTERVENTION_STATUSES, form.statuses?.[id]) ? form.statuses[id] : 'recommended');

export function needsByBlock(ev) {
  return BLOCKS.map(block => ({block, confirmed: ev.details.filter(d => d.variable.block === block.id && d.active), potential: ev.details.filter(d => d.variable.block === block.id && d.pending)}));
}

/** Entrada para createReport() (cmo-report/1): única fuente del texto para HCE, la impresión y el PDF. */
export function buildReportInput(form, ev, {version = ''} = {}) {
  const r = ev.result, m = form.metadata || {};
  const catalog = interventionCatalog(ev.finalPriority);
  const byStatus = status => catalog.filter(a => interventionStatus(form, a.id) === status).map(a => ({group: a.groupLabel, label: a.label}));
  const warnings = [];
  if (ev.provisional) {
    warnings.push(`Resultado provisional: ${ev.pending.length} variable(s) con campos pendientes de valoración. Un campo pendiente no se ha considerado negativo: no puntúa hasta que se complete.`);
    warnings.push(`Si las variables pendientes resultaran positivas, la puntuación podría alcanzar hasta ${ev.maxPossible.total} puntos (cota superior: suma de los máximos de cada variable) y la prioridad podría llegar a ${priorityLabel(ev.maxPossible.priority)}${ev.maxPossible.automaticPossible ? ' (una variable pendiente puede activar la prioridad automática)' : ''}${ev.priorityMayChange ? '' : '; la prioridad no cambiaría'}.`);
  }
  if (ev.overrideLowersAutomatic) warnings.push('La modificación profesional disminuye una Prioridad 1 automática: documente una justificación reforzada.');
  const need = (d, pendingLabel) => ({label: d.variable.label, detail: pendingLabel || [d.response, `${d.points} p`].filter(Boolean).join(' · ')});
  return {
    title: 'Atención farmacéutica oncohematológica — Modelo CMO',
    tool: {name: TOOL_NAME, version},
    model: {name: SOURCE_DOCUMENT, source: `Basado en el modelo «${SOURCE_DOCUMENT}» (metodología CMO, MAPEX-SEFH).`},
    evaluationDate: form.completedAt, status: form.completedAt && !ev.provisional ? 'final' : 'provisional',
    hospital: m.hospital, pharmacist: m.pharmacist, patientId: m.patientId,
    context: [{label: 'Tipo de paciente', value: PATIENT_TYPES[m.patientType] || ''}],
    stratification: {
      score: r.score, maxScore: MAX_SCORE, subtotals: BLOCKS.map(b => ({label: SHORT_BLOCKS[b.id], points: r.subtotals[b.id]})),
      calculatedLevel: priorityLabel(r.calculatedPriority), finalLevel: priorityLabel(ev.finalPriority), levelCode: ev.finalPriority,
      rules: r.automaticReasons.map(x => `Prioridad 1 automática: ${x}`),
      explanation: '',
      override: ev.override ? {level: priorityLabel(ev.override.priority), motive: 'Modificación clínica excepcional', justification: ev.override.justification} : null,
      pending: ev.pending.map(d => d.variable.label)
    },
    factors: ev.details.filter(d => d.active && d.variable.block !== 4).map(d => ({dimension: SHORT_BLOCKS[d.variable.block], label: d.variable.label, detail: d.response, points: d.points})),
    needs: {
      confirmed: ev.details.filter(d => d.active && d.variable.block === 4).map(d => need(d)),
      potential: ev.details.filter(d => d.pending && d.variable.block === 4).map(d => need(d, 'pendiente de valoración'))
    },
    interventions: {done: byStatus('done'), planned: byStatus('planned'), recommended: byStatus('recommended'), notApplicableCount: byStatus('not_applicable').length},
    plan: {
      periodicity: `${PERIODICITY[ev.finalPriority]} Reestratificar: ${REASSESS_WHEN.join(' ')}`,
      nextReview: form.plan?.nextReview || '', notes: form.plan?.notes || ''
    },
    warnings
  };
}

/** Valida y sanea un caso (importación, borrador o caso guardado, incluido el formato anterior). */
export function normalizeCase(input) {
  const src = input && typeof input === 'object' ? input : {};
  const meta = {...(src.answers || {}), ...(src.metadata || {})};
  const o = src.override || src.result?.override;
  const ids = new Set(interventionCatalog(1).map(i => i.id));
  const f = {
    metadata: {
      hospital: str(meta.hospital, 200), pharmacist: str(meta.pharmacist, 200), patientId: str(meta.patientId, 60),
      date: /^\d{4}-\d{2}-\d{2}$/.test(meta.date || '') ? meta.date : '', patientType: Object.hasOwn(PATIENT_TYPES, meta.patientType) ? meta.patientType : ''
    },
    answers: cleanAnswers(src.answers),
    override: o && [1, 2, 3].includes(Number(o.priority)) ? {priority: Number(o.priority), justification: str(o.justification, 2000)} : null,
    statuses: Object.fromEntries(Object.entries(src.statuses && typeof src.statuses === 'object' ? src.statuses : {}).filter(([id, s]) => ids.has(id) && Object.hasOwn(INTERVENTION_STATUSES, s) && s !== 'recommended')),
    plan: {nextReview: /^\d{4}-\d{2}-\d{2}$/.test(src.plan?.nextReview || '') ? src.plan.nextReview : '', notes: str(src.plan?.notes, 2000)},
    completedAt: ''
  };
  // Los casos guardados con el formato anterior no tenían fecha de finalización: se toma la de la última actualización.
  const done = src.status === 'draft' ? '' : src.completedAt || (src.status === 'completed' ? src.updatedAt || src.createdAt : '');
  f.completedAt = !Number.isNaN(Date.parse(done || '')) ? String(done).slice(0, 40) : '';
  f.status = f.completedAt ? (evaluate(f).provisional ? 'provisional' : 'completed') : 'draft';
  return f;
}

/** Datos estructurados confirmados (cmo-onc-case/1). El texto clínico pegado y las evidencias no se exportan. */
export const serializeCase = form => ({schema: CASE_SCHEMA, ...normalizeCase(form)});

/** Importación segura: sobre cmo-export/1 o exportación anterior (schemaVersion 1). El resultado nunca se toma del fichero. */
export function importAny(raw) {
  const parsed = parseEnvelope(raw, {appId: APP_ID});
  if (parsed.ok) {
    if (parsed.value.dataSchema !== CASE_SCHEMA) return {ok: false, error: `Esquema de datos no compatible (se esperaba ${CASE_SCHEMA}).`};
    return {ok: true, form: normalizeCase(parsed.value.data), legacy: false};
  }
  try {
    const legacy = JSON.parse(raw);
    if (legacy?.application === LEGACY_APPLICATION && legacy.schemaVersion === 1 && legacy.case?.answers && typeof legacy.case.answers === 'object' && raw.length <= 1_000_000) return {ok: true, form: normalizeCase(legacy.case), legacy: true};
  } catch { /* no es JSON */ }
  return {ok: false, error: parsed.error};
}

export function csvRows(form, ev) {
  const r = ev.result, m = form.metadata || {};
  return [['campo', 'valor'], ['esquema', CASE_SCHEMA], ['hospital', m.hospital], ['farmaceutico', m.pharmacist], ['fecha_evaluacion', form.completedAt], ['identificador_pseudonimizado', m.patientId],
    ['estado', form.completedAt && !ev.provisional ? 'definitiva' : 'provisional'], ['puntuacion', r.score], ['puntuacion_maxima', MAX_SCORE],
    ...BLOCKS.map(b => [`puntuacion_bloque_${b.id}`, r.subtotals[b.id]]), ['prioridad_calculada', r.calculatedPriority], ['prioridad_final', ev.finalPriority],
    ['prioridad_automatica', r.automaticReasons.join('; ')], ['modificacion_profesional', ev.override ? ev.override.justification : ''], ['variables_pendientes', ev.pending.length],
    ...ev.details.map(d => [`variable_${d.variable.id}`, d.pending ? 'pendiente' : `${d.response} (${d.points} p)`])];
}
