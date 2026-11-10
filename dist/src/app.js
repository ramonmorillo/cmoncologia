// Interfaz de SIAF-CMO Oncología sobre el flujo común CMO de 7 etapas (núcleo en src/cmo-ds/).
// Sin lógica clínica: el cálculo es de clinical.js (sin cambios) a través de assessment.js.
// Todo dato introducido, pegado o importado se escapa antes de insertarse en el documento.
import {BLOCKS, VARIABLES, weightLossPercent} from './clinical.js';
import {listCases, saveCase, getCase, deleteCase, duplicateCase, saveActiveCase, getActiveCase, clearActiveCase} from './storage.js';
import {extractClinicalText} from './extractor.js';
import {initialAssessmentState, mergeExtraction, markManual, confirmVariable, effectiveAnswers} from './assessment-state.js';
import * as A from './assessment.js';
import {createReport, validateReport, reportToText, reportToHtml, exportEnvelope, toCsv, escapeHtml as esc, INTERVENTION_STATUSES} from './cmo-ds/cmo-report.js';
import {reportToPdf} from './cmo-ds/cmo-pdf.js';
import {createStepper, toast, confirmDialog, guardUnsaved, copyText, download, printHtml, safeFilename} from './cmo-ds/cmo-flow.js';

const $ = s => document.querySelector(s), form = $('#assessmentForm');
const meta = (() => { try { return JSON.parse($('#cmo-app-meta').textContent); } catch { return {}; } })();
const VERSION = meta.appVersion || '';
let currentId = null, appState = initialAssessmentState(), applying = false, dirty = false, proposals = [], cur = null, stepper;
const extra = {statuses: {}, plan: {nextReview: '', notes: ''}, completedAt: '', status: ''};
const boolField=(name)=>`<fieldset><legend>${name}</legend><label><input type="radio" name="${name}" value="true"> Sí</label><label><input type="radio" name="${name}" value="false"> No</label></fieldset>`;
const number=(name,min=0,max='',step=1,unit='')=>`<label>${unit?`Valor (${unit})`:'Valor'}<input type="number" name="${name}" min="${min}" ${max!==''?`max="${max}"`:''} step="${step}"></label>`;
function controls(v){const map={
 age:number('age',0,120),weightLoss:`<div class="grid">${number('weightPrevious',0.1,'',0.1,'kg hace 3 meses')}${number('weightCurrent',0.1,'',0.1,'kg actual')}</div>${boolField('weightLossInvoluntary')}<output id="weightOutput">Pérdida calculada: —</output>`,pregnancy:boolField('pregnancy'),unhealthyHabits:boolField('unhealthyHabits'),communicationBarriers:boolField('communicationBarriers'),psychiatricHistory:boolField('psychiatricHistory'),
 psychologicalDistress:`<label>Método<select name="distressMethod"><option value="">Pendiente</option><option value="none">Sin sospecha / no procede</option><option value="hads">HADS</option><option value="eva">EVA Distress NCCN</option></select></label><div class="grid">${number('hadsTotal',0,42,1,'HADS total')}${number('hadsAnxiety',0,21,1,'HADS ansiedad')}${number('hadsDepression',0,21,1,'HADS depresión')}${number('distressEva',0,10,1,'EVA Distress')}</div><p class="rule">Complete solo un sistema. Si constan ambos, prevalece HADS.</p>`,
 pfeiffer:`${number('pfeifferErrors',0,10,1,'errores')}${boolField('literate')}`,ecog:`<label>ECOG<select name="ecog"><option value="">Pendiente</option>${[0,1,2,3,4].map(x=>`<option>${x}</option>`).join('')}</select></label>`,socialSupport:boolField('socialSupport'),comorbidities:number('chronicDiseases',0,30,1),doseAdjustment:boolField('doseAdjustment'),pain:`${number('painEva',0,10,1,'EVA dolor')}${boolField('poorPainControl')}`,acuteCare:boolField('acuteCare'),dysphagia:boolField('dysphagia'),treatmentSituation:`<label>Situación<select name="treatmentSituation"><option value="">Pendiente</option><option value="neither">Ninguna</option><option value="firstOrChange">Primer ciclo o cambio</option><option value="thirdOrLater">Tercera línea o posterior</option></select></label>`,polypharmacy:number('homeMedicines',0,50,1),routeChange:boolField('routeChange'),regimenModification:boolField('regimenModification'),highRiskMedication:boolField('highRiskMedication'),specialStorage:boolField('specialStorage'),complexRegimen:`<label>Situación<select name="complexRegimen"><option value="">Pendiente</option><option value="none">Ninguna</option><option value="one">Un medicamento oral, pauta discontinua</option><option value="multiple">Dos o más, pautas discontinuas/diferentes</option></select></label>`,
 interactions:['interactionCam','interactionPk','interactionC','interactionDX'].map(boolField).join(''),toxicity:number('toxicityGrade',0,5,1,'grado CTCAE/CTC'),adherence:`${number('dispensingPercent',0,100,0.1,'% dispensación')}${boolField('moriskyIncorrect')}`,specialTreatment:['clinicalTrial','specialUse','recentlyMarketed'].map(boolField).join('')};return map[v.id];}
$('#blocks').innerHTML=BLOCKS.map(b=>`<section class="block"><div class="block-title"><span>${b.id}</span><div><h2>${b.title}</h2><small id="subtotal${b.id}">0 puntos</small></div></div>${VARIABLES.filter(v=>v.block===b.id).map(v=>`<article class="card variable" data-id="${v.id}"><div class="variable-head"><h3>${v.label}</h3><div><span class="origin pending">Pendiente</span> <span class="points">0 / ${v.max}</span></div></div><p>${v.help}</p>${controls(v)}</article>`).join('')}</section>`).join('');

// ---------- Lectura del formulario ----------
function answers() { const a = {}; new FormData(form).forEach((v, k) => { a[k] = v === 'true' ? true : v === 'false' ? false : v; }); return a; }
function metadata() { const a = answers(); return {hospital: String(a.hospital || '').trim(), pharmacist: String(a.pharmacist || '').trim(), patientId: String(a.patientId || '').trim(), date: a.date || '', patientType: a.patientType || ''}; }
function overrideFromDom() { return $('#overrideEnabled').checked ? {priority: Number($('#overridePriority').value), justification: $('#overrideJustification').value.trim()} : null; }
function currentForm() {
  appState = {...appState, currentId, metadata: metadata(), answers: answers()};
  return {metadata: metadata(), answers: effectiveAnswers(appState), override: overrideFromDom(), statuses: extra.statuses, plan: {nextReview: $('#nextReview').value, notes: $('#planNotes').value}, completedAt: extra.completedAt, status: extra.status};
}
const hasData = () => { const m = metadata(); return !!(m.hospital || m.pharmacist || m.patientId || m.patientType || Object.keys(appState.answers || {}).some(k => A.FIELD_NAMES.has(k) && appState.answers[k] !== '')); };
const announce = text => { $('#live').textContent = text; };
const tile = (value, label) => `<div><strong>${value}</strong><small>${label}</small></div>`;

// ---------- Etapa 1: inicio y análisis asistido ----------
function identityOk() {
  const m = metadata();
  const missing = [!m.hospital && 'el hospital o centro', !m.pharmacist && 'el farmacéutico/a responsable', !m.patientType && 'el tipo de paciente', !m.date && 'la fecha'].filter(Boolean);
  $('#identityError').textContent = missing.length ? `Indique ${missing.join(', ')} para continuar.` : '';
  for (const n of ['hospital', 'pharmacist', 'patientType', 'date']) form.elements[n].setAttribute('aria-invalid', String(!m[n]));
  if (missing.length) form.elements[!m.hospital ? 'hospital' : !m.pharmacist ? 'pharmacist' : !m.patientType ? 'patientType' : 'date'].focus();
  return !missing.length;
}
const describe = v => v === null || v === undefined ? '—' : typeof v === 'object' ? Object.entries(v).filter(([, x]) => x !== null && x !== undefined && x !== '').map(([k, x]) => `${A.FIELD_LABELS[k] || k}: ${A.fieldText(k, x)}`).join('; ') || '—' : A.fieldText('', v);
function renderProposals() {
  const rows = proposals;
  if (!rows.length) { $('#proposals').innerHTML = '<p class="muted">No se han encontrado datos explícitos. Todas las variables quedan pendientes; complételas manualmente.</p>'; $('#applyProposals').hidden = true; return; }
  $('#proposals').innerHTML = `<p class="muted">${rows.length} propuesta(s). Decida cada una: aceptar, aceptar y corregir después en la historia clínica, o descartar. Las propuestas sin decidir quedan pendientes y las variables sin mención no se interpretan como «No».</p>
  <div class="cmo-table-wrap" tabindex="0" role="region" aria-label="Propuestas del análisis"><table class="cmo-review"><thead><tr><th scope="col">Variable</th><th scope="col">Valor propuesto</th><th scope="col">Evidencia y criterio</th><th scope="col">Decisión</th></tr></thead><tbody>${rows.map((p, i) => {
    const v = VARIABLES.find(x => x.id === p.id);
    return `<tr data-state="${p.decision === 'discard' ? 'discarded' : p.decision ? 'accepted' : ''}"><th scope="row">${esc(v.label)}</th><td>${esc(describe(p.trace.proposedValue))}</td>
      <td><span class="cmo-evidence">«${esc(p.trace.evidence)}»</span><span class="cmo-evidence">${esc(p.trace.reason)}</span>${p.trace.confidenceStatus === 'suggested' ? '<span class="cmo-flag cmo-flag--pending">Requiere valoración profesional</span>' : ''}</td>
      <td><select data-proposal="${i}" aria-label="Decisión para ${esc(v.label)}"><option value="">Sin decidir (queda pendiente)</option><option value="accept"${p.decision === 'accept' ? ' selected' : ''}>Aceptar</option><option value="edit"${p.decision === 'edit' ? ' selected' : ''}>Aceptar y corregir después</option><option value="discard"${p.decision === 'discard' ? ' selected' : ''}>Descartar</option></select></td></tr>`;
  }).join('')}</tbody></table></div>`;
  $('#applyProposals').hidden = false;
}
function applyProposals() {
  if (!identityOk()) return;
  const accepted = proposals.filter(p => p.decision === 'accept' || p.decision === 'edit');
  const undecided = proposals.filter(p => !p.decision).length;
  // Solo las propuestas aceptadas llegan al formulario; los valores manuales se conservan siempre.
  let next = mergeExtraction(appState, {results: Object.fromEntries(accepted.map(p => [p.id, p.trace]))}, {preserveManual: true});
  for (const p of accepted) next = confirmVariable(next, p.id);
  appState = next;
  applyAnswers({...answers(), ...appState.answers});
  $('#clinicalText').value = ''; proposals = []; $('#proposals').innerHTML = ''; $('#applyProposals').hidden = true;
  touch({clinical: true});
  stepper.go(2);
  toast(`${accepted.length} variable(s) incorporada(s) tras su decisión.${undecided ? ` ${undecided} sin decidir quedan pendientes.` : ''}${accepted.some(p => p.decision === 'edit') ? ' Revise las marcadas para corregir.' : ''}`);
}
function applyAnswers(a) {
  applying = true;
  Object.entries(a).forEach(([k, v]) => { if (!A.FIELD_NAMES.has(k)) return; form.querySelectorAll(`[name="${CSS.escape(k)}"]`).forEach(el => el.type === 'radio' ? (el.checked = String(v) === el.value) : (el.value = v ?? '')); });
  applying = false;
}

// ---------- Actualización ----------
function touch({clinical = false} = {}) {
  dirty = hasData();
  if (clinical && extra.completedAt) { extra.completedAt = ''; extra.status = ''; toast('Ha modificado datos clínicos tras finalizar: vuelva a validar en el paso 4.', {type: 'warn'}); }
  refresh();
}
function refresh() {
  const f = currentForm(), ev = A.evaluate(f), r = ev.result;
  const total = new Set(VARIABLES.flatMap(v => v.required)).size, done = total - new Set(ev.pending.flatMap(d => d.pendingFields)).size, pct = Math.round(done / total * 100);
  $('#liveScore').textContent = r.score;
  $('#livePriority').textContent = ev.pending.length === VARIABLES.length ? 'Sin valorar' : `Prioridad ${ev.finalPriority}`;
  $('#livePriority').className = `priority p${ev.finalPriority}`;
  $('#progressBar').style.width = `${pct}%`; $('#progressText').textContent = `${pct}%`;
  $('#pendingText').textContent = ev.pending.length ? `${ev.pending.length} variables con campos pendientes · resultado provisional` : 'Variables clínicas completas';
  BLOCKS.forEach(b => { $('#subtotal' + b.id).textContent = `${r.subtotals[b.id]} puntos`; });
  const a = ev.answers;
  for (const d of ev.details) {
    const card = form.querySelector(`[data-id="${d.variable.id}"]`), trace = appState.extraction?.[d.variable.id];
    card.querySelector('.points').textContent = `${d.points} / ${d.variable.max}`;
    const badge = card.querySelector('.origin'), manual = d.variable.required.some(k => appState.manualFields?.includes(k)) || trace?.confidenceStatus === 'manual';
    badge.textContent = d.pending ? 'Pendiente' : manual ? 'Manual' : trace?.reviewed ? 'Extraído, confirmado' : 'Manual';
    badge.className = `origin ${d.pending ? 'pending' : manual ? 'manual' : 'extraido'}`;
  }
  const p = weightLossPercent(a.weightPrevious, a.weightCurrent);
  $('#weightOutput').textContent = `Pérdida calculada: ${p === null ? '—' : p.toFixed(2) + ' %'}`;
  cur = {form: f, ev, report: createReport(A.buildReportInput(f, ev, {version: VERSION}))};
  renderStage(stepper?.current || 1);
  if (hasData()) saveActiveCase({...appState, statuses: extra.statuses, plan: f.plan, completedAt: extra.completedAt, status: extra.status, override: f.override}); else clearActiveCase();
}
const stateLabel = () => (extra.completedAt ? (cur.ev.provisional ? 'Finalizada (provisional)' : 'Finalizada') : cur.ev.provisional ? 'Provisional' : 'Sin finalizar');
function renderStage(n) {
  if (!cur) return;
  const {ev, form: f} = cur, r = ev.result, P = A.priorityLabel;
  if (n === 3) {
    $('#reviewStatus').innerHTML = tile(ev.details.length - ev.pending.length, 'Variables completas') + tile(ev.pending.length, 'Con campos pendientes') + tile(ev.details.filter(d => !d.pending && appState.extraction?.[d.variable.id]?.reviewed).length, 'Desde análisis asistido');
    $('#reviewRows').innerHTML = ev.details.map(d => `<tr><th scope="row">${d.variable.label}</th><td>${A.SHORT_BLOCKS[d.variable.block]}</td><td>${d.pending ? `<span class="cmo-flag cmo-flag--pending">Pendiente</span>${d.response ? ` ${esc(d.response)}` : ''}` : esc(d.response)}</td><td>${d.pending ? '—' : d.points}</td><td>${d.pending ? '—' : appState.extraction?.[d.variable.id]?.reviewed ? '<span class="cmo-flag cmo-flag--assisted">Análisis asistido</span>' : 'Manual'}</td></tr>`).join('');
  }
  if (n === 4) {
    $('#resultStatus').innerHTML = tile(`${r.score} / ${A.MAX_SCORE}`, 'Puntuación') + tile(P(r.calculatedPriority), 'Prioridad por puntuación') + tile(P(ev.finalPriority), 'Prioridad final') + tile(stateLabel(), 'Estado');
    $('#resultCard').innerHTML = `<article class="result-card p${ev.finalPriority}"><p class="cmo-level" data-level="${ev.finalPriority}">${P(ev.finalPriority)}${ev.provisional ? ' (provisional)' : ''}</p><p>${ev.finalPriority === 1 ? 'Alta' : ev.finalPriority === 2 ? 'Necesidad intermedia de' : 'Necesidad estándar de'} seguimiento farmacéutico.</p>`
      + (r.automaticPriority ? `<p class="warning"><strong>Prioridad 1 automática:</strong> ${esc(r.automaticReasons.join(', '))}.</p>` : '')
      + (ev.override ? `<p><strong>Modificación clínica:</strong> ${esc(ev.override.justification)}. El modelo calcula ${P(r.automaticPriority ?? r.calculatedPriority)}.</p>` : '')
      + (ev.overrideLowersAutomatic ? '<p class="warning"><strong>Atención:</strong> la modificación disminuye una Prioridad 1 automática; documente una justificación reforzada.</p>' : '')
      + (ev.provisional ? `<p class="warning"><strong>Resultado provisional:</strong> ${ev.pending.length} variable(s) con campos pendientes no puntúan (no se consideran negativos). Si resultaran positivas, la puntuación podría alcanzar hasta ${ev.maxPossible.total} puntos (cota superior) y la prioridad podría llegar a ${P(ev.maxPossible.priority)}${ev.priorityMayChange ? '' : '; no cambiaría'}.</p><details><summary>Ver variables pendientes</summary><ul>${ev.pending.map(d => `<li>${d.variable.label}</li>`).join('')}</ul></details>` : '')
      + `<div class="chips">${BLOCKS.map(b => `<span>B${b.id}: ${r.subtotals[b.id]}</span>`).join('')}</div><h3>Variables positivas</h3><ul>${r.positiveVariables.map(v => `<li>${v.label}: <strong>${v.points} puntos</strong></li>`).join('') || '<li>Ninguna</li>'}</ul></article>`;
    $('#overrideState').textContent = !f.override ? 'Sin modificación profesional.' : ev.override ? `Modificación aplicada: ${P(ev.override.priority)} (el modelo calcula ${P(r.automaticPriority ?? r.calculatedPriority)}).` : ev.overrideIgnoredReason;
    $('#finishState').textContent = extra.completedAt ? `Estratificación finalizada${ev.provisional ? ' como provisional' : ''}. Puede generar los informes en el paso 7.` : 'La finalización fija la fecha de evaluación y habilita los informes.';
  }
  if (n === 5) {
    $('#needs').innerHTML = A.needsByBlock(ev).map(x => `<section class="card"><h3>Bloque ${x.block.id}. ${x.block.title}${x.block.id === 4 ? ' · necesidades farmacoterapéuticas' : ''}</h3><h4>Confirmadas (variables que puntúan)</h4><ul>${x.confirmed.map(d => `<li>${d.variable.label}${d.response ? ` · ${esc(d.response)}` : ''} <strong>(${d.points} p)</strong></li>`).join('') || '<li class="muted">Ninguna</li>'}</ul>${x.potential.length ? `<h4>Potenciales, pendientes de evaluación</h4><ul>${x.potential.map(d => `<li>${d.variable.label} <span class="cmo-flag cmo-flag--pending">Pendiente</span></li>`).join('')}</ul>` : ''}</section>`).join('');
  }
  if (n === 6) {
    const catalog = A.interventionCatalog(ev.finalPriority);
    const html = Object.entries(A.GROUP_LABELS).map(([g, title]) => `<section class="card"><h3>${title}</h3><ul class="intervention-list">${catalog.filter(i => i.group === g).map(i => `<li><span id="int-${i.id}">${i.label}</span><select data-intervention="${i.id}" aria-labelledby="int-${i.id}">${Object.entries(INTERVENTION_STATUSES).map(([k, label]) => `<option value="${k}"${A.interventionStatus(f, i.id) === k ? ' selected' : ''}>${label}</option>`).join('')}</select></li>`).join('')}</ul></section>`).join('');
    if ($('#interventionBlocks').dataset.priority !== String(ev.finalPriority) || !$('#interventionBlocks').children.length) { $('#interventionBlocks').innerHTML = html; $('#interventionBlocks').dataset.priority = String(ev.finalPriority); }
    $('#periodicity').textContent = `${cur.report.plan.periodicity}`;
  }
  if (n === 7) {
    const blocked = !extra.completedAt ? 'Finalice la estratificación en el paso 4 («Validar y finalizar») para generar los informes.' : validateReport(cur.report).filter(x => !/pendientes/.test(x)).join(' ');
    $('#reportBlocked').hidden = !blocked; $('#reportBlocked').textContent = blocked;
    ['copyReport', 'downloadPdf', 'printReport', 'downloadTxt'].forEach(id => { $('#' + id).disabled = !!blocked; });
    $('#reportText').value = blocked ? '' : reportToText(cur.report);
    $('#reportPreview').innerHTML = blocked ? '' : reportToHtml(cur.report);
    cur.blocked = blocked;
  }
}

// ---------- Acciones ----------
async function finish() {
  const {ev} = cur;
  if (cur.form.override && !ev.override) { toast(ev.overrideIgnoredReason, {type: 'warn'}); $('#overrideJustification').focus(); return; }
  if (ev.provisional) {
    const ok = await confirmDialog({title: 'Variables clínicas pendientes', message: `Existen ${ev.pending.length} variable(s) con campos pendientes. Puede volver a la historia clínica para completarlas o finalizar como resultado PROVISIONAL (quedará indicado en el informe).`, confirmLabel: 'Finalizar como provisional', cancelLabel: 'Volver a completar'});
    if (!ok) { stepper.go(2); return; }
  }
  extra.completedAt = new Date().toISOString();
  extra.status = ev.provisional ? 'provisional' : 'completed';
  dirty = true; refresh();
  toast(`Estratificación finalizada: ${A.priorityLabel(ev.finalPriority)}${ev.provisional ? ' (provisional)' : ''}.`);
}
const fileBase = () => safeFilename('cmo-onc', cur.form.metadata.patientId || 'caso', (extra.completedAt || '').slice(0, 10));
function loadForm(f, {id = null, stage = 1} = {}) {
  applying = true; form.reset(); applying = false;
  currentId = id; appState = {...initialAssessmentState(), currentId: id};
  Object.entries(f.metadata).forEach(([k, v]) => { if (form.elements[k]) form.elements[k].value = v; });
  if (!f.metadata.date) form.date.value = new Date().toISOString().slice(0, 10);
  applyAnswers(f.answers);
  appState.answers = {...f.answers}; appState.manualFields = Object.keys(f.answers);
  extra.statuses = {...f.statuses}; extra.plan = {...f.plan}; extra.completedAt = f.completedAt; extra.status = f.status === 'draft' ? '' : f.status;
  $('#nextReview').value = f.plan.nextReview; $('#planNotes').value = f.plan.notes;
  $('#overrideEnabled').checked = !!f.override; $('#overrideFields').hidden = !f.override;
  if (f.override) { $('#overridePriority').value = String(f.override.priority); $('#overrideJustification').value = f.override.justification; }
  $('#interventionBlocks').innerHTML = '';
  refresh(); dirty = false;
}
function recordForStorage() {
  const f = serializeNow();
  return {id: currentId, status: f.completedAt ? f.status : 'draft', ...f, result: {score: cur.ev.result.score, finalPriority: cur.ev.finalPriority, calculatedPriority: cur.ev.result.calculatedPriority}};
}
const serializeNow = () => A.serializeCase(currentForm());
async function importFile(file) {
  if (!file) return;
  const res = A.importAny(await file.text());
  if (!res.ok) { toast(`No se ha podido importar: ${res.error}`, {type: 'error'}); return; }
  if (hasData() && !(await confirmDialog({title: 'Sustituir la evaluación actual', message: 'La importación sustituye los datos de la evaluación en curso. El resultado se recalcula con el motor del modelo.', confirmLabel: 'Importar y sustituir', danger: true}))) return;
  loadForm(res.form); $('#casesDialog').close?.();
  stepper.go(3);
  toast(res.legacy ? 'Caso importado (formato anterior) y recalculado. Revise los datos.' : 'Caso importado y recalculado. Revise los datos antes de continuar.');
}
function renderCases() {
  $('#caseList').innerHTML = listCases().map(c => `<article class="saved"><div><strong>${esc(c.metadata?.patientId || 'Sin identificador')}</strong><small>${esc(c.metadata?.date || '')} · ${c.status === 'completed' ? 'Finalizado' : c.status === 'provisional' ? 'Provisional' : 'Borrador'} · P${esc(c.result?.finalPriority ?? '')}</small></div><div><button type="button" data-load="${esc(c.id)}">Abrir</button><button type="button" data-copy="${esc(c.id)}" class="secondary">Duplicar</button><button type="button" data-delete="${esc(c.id)}" class="danger">Eliminar</button></div></article>`).join('') || '<p>No hay casos guardados.</p>';
}
async function resetAll() {
  if (hasData() && !(await confirmDialog({title: 'Nueva estratificación', message: 'Se borrarán todos los datos de la estratificación actual. Esta acción no se puede deshacer. Los casos guardados se conservan.', confirmLabel: 'Borrar todo', danger: true}))) return;
  clearActiveCase(); proposals = []; $('#clinicalText').value = ''; $('#proposals').innerHTML = ''; $('#applyProposals').hidden = true; $('#clinicalImport').hidden = true; $('#identityError').textContent = '';
  loadForm(A.normalizeCase({})); dirty = false; stepper.reset(); form.hospital.focus();
  toast('Nueva estratificación preparada. Los casos guardados se conservan.');
}

function bind() {
  form.addEventListener('submit', e => e.preventDefault());
  form.addEventListener('input', e => {
    if (applying || !e.target.name) return;
    if (A.FIELD_NAMES.has(e.target.name)) { appState = markManual(appState, e.target.name, e.target.type === 'radio' ? e.target.value === 'true' : e.target.value); touch({clinical: true}); } else touch();
  });
  $('#startManual').addEventListener('click', () => { if (identityOk()) stepper.go(2); });
  $('#startAssisted').addEventListener('click', () => { $('#clinicalImport').hidden = false; $('#clinicalText').focus(); });
  $('#analyzeClinical').addEventListener('click', () => {
    const text = $('#clinicalText').value.trim();
    if (!text) { toast('Pegue primero texto clínico seudonimizado para analizar.', {type: 'warn'}); $('#clinicalText').focus(); return; }
    const results = extractClinicalText(text).results;
    proposals = Object.entries(results).filter(([, t]) => t.confidenceStatus !== 'not_found').map(([id, trace]) => ({id, trace, decision: ''}));
    renderProposals(); announce(`${proposals.length} propuestas detectadas.`);
  });
  $('#clearText').addEventListener('click', () => { $('#clinicalText').value = ''; proposals = []; $('#proposals').innerHTML = '<p class="muted">Texto borrado.</p>'; $('#applyProposals').hidden = true; });
  $('#proposals').addEventListener('change', e => { const i = e.target.dataset.proposal; if (i === undefined) return; proposals[i].decision = e.target.value; e.target.closest('tr').dataset.state = e.target.value === 'discard' ? 'discarded' : e.target.value ? 'accepted' : ''; });
  $('#applyProposals').addEventListener('click', applyProposals);

  $('#overrideEnabled').addEventListener('change', e => { $('#overrideFields').hidden = !e.target.checked; touch({clinical: true}); });
  ['overridePriority', 'overrideJustification'].forEach(id => $('#' + id).addEventListener('input', () => touch({clinical: true})));
  $('#finish').addEventListener('click', finish);
  $('#interventionBlocks').addEventListener('change', e => { const id = e.target.dataset.intervention; if (!id) return; if (e.target.value === 'recommended') delete extra.statuses[id]; else extra.statuses[id] = e.target.value; touch(); });
  ['nextReview', 'planNotes'].forEach(id => $('#' + id).addEventListener('input', () => touch()));

  $('#copyReport').addEventListener('click', async () => { const ok = await copyText($('#reportText').value); $('#copyStatus').textContent = ok ? 'Informe copiado al portapapeles. Revíselo antes de incorporarlo a la historia clínica.' : 'No se ha podido copiar automáticamente: despliegue «Ver texto para historia clínica» y cópielo manualmente.'; });
  $('#downloadPdf').addEventListener('click', () => { download(`${fileBase()}.pdf`, reportToPdf(cur.report), 'application/pdf'); toast('PDF generado.'); });
  $('#printReport').addEventListener('click', () => printHtml(reportToHtml(cur.report), cur.report.title));
  $('#downloadTxt').addEventListener('click', () => { download(`${fileBase()}.txt`, $('#reportText').value); toast('Texto descargado.'); });
  $('#exportJson').addEventListener('click', () => { download(`${fileBase()}.json`, JSON.stringify(exportEnvelope({app: {id: A.APP_ID, name: A.TOOL_NAME, version: VERSION}, exportedAt: new Date().toISOString(), dataSchema: A.CASE_SCHEMA, data: serializeNow(), report: cur.blocked ? null : cur.report}), null, 2), 'application/json'); dirty = false; toast('Datos estructurados exportados (JSON).'); });
  $('#exportCsv').addEventListener('click', () => { download(`${fileBase()}.csv`, toCsv(A.csvRows(cur.form, cur.ev)), 'text/csv;charset=utf-8'); toast('Datos estructurados exportados (CSV).'); });
  $('#saveCase').addEventListener('click', () => { const saved = saveCase(recordForStorage()); currentId = saved.id; dirty = false; toast('Caso guardado localmente en este navegador (sin cifrar).'); });
  $('#openCases').addEventListener('click', () => { renderCases(); $('#casesDialog').showModal(); });
  $('#casesButton').addEventListener('click', () => { renderCases(); $('#casesDialog').showModal(); });
  $('#closeCases').addEventListener('click', () => $('#casesDialog').close());
  $('#caseList').addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.load) { const rec = getCase(b.dataset.load); if (!rec) return; if (hasData() && !(await confirmDialog({title: 'Abrir caso guardado', message: 'Se sustituirá la evaluación en curso.', confirmLabel: 'Abrir', danger: true}))) return; loadForm(A.normalizeCase(rec), {id: rec.id}); $('#casesDialog').close(); stepper.go(rec.completedAt ? 4 : 2); }
    if (b.dataset.copy) { duplicateCase(b.dataset.copy); renderCases(); }
    if (b.dataset.delete && await confirmDialog({title: 'Eliminar caso', message: '¿Eliminar este caso local? Esta acción no se puede deshacer.', confirmLabel: 'Eliminar', danger: true})) { deleteCase(b.dataset.delete); renderCases(); }
  });
  $('#importFile').addEventListener('change', async e => { await importFile(e.target.files[0]); e.target.value = ''; });
  $('#newAssessment').addEventListener('click', resetAll);
}

// ---------- Arranque ----------
$('#importFile').accept = 'application/json,.json';
bind();
stepper = createStepper({
  nav: $('#stepper'), stages: document.querySelectorAll('.cmo-stage'), announce,
  canEnter: n => (n > 1 && !identityOk() ? 'Indique hospital, farmacéutico/a, tipo de paciente y fecha para continuar.' : true),
  onEnter: n => { renderStage(n); }
});
// Borrador de la evaluación en curso: se recupera ANTES de la primera actualización (antes se sobrescribía con un estado vacío).
const draft = getActiveCase();
if (draft) { loadForm(A.normalizeCase(draft)); appState.extraction = draft.extraction || {}; }
else { form.date.value = new Date().toISOString().slice(0, 10); refresh(); }
if (draft && hasData()) { dirty = true; toast('Se ha recuperado el borrador de este navegador.'); if (metadata().hospital && metadata().pharmacist) stepper.go(2, {focus: false}); }
guardUnsaved(() => dirty && hasData());
