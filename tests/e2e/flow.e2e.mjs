// Recorrido extremo a extremo de SIAF-CMO Oncología en Chromium (Playwright). Datos ficticios.
//   npm run test:e2e            (requiere Playwright con Chromium; reconstruye dist/)
//   AXE_PATH=<axe.min.js>       añade la auditoría WCAG A/AA en cada etapa
//   E2E_OUT=<carpeta>           guarda el PDF, el texto y las capturas
import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import * as A from '../../src/assessment.js';

const require = createRequire(import.meta.url);
let chromium;
try { ({chromium} = require('playwright')); } catch { try { ({chromium} = await import('playwright')); } catch { chromium = null; } }
const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = path.join(repo, 'dist');
const BASE_PATH = '/cmoncologia/';
const OUT = process.env.E2E_OUT;
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.md': 'text/markdown'};
let server, browser, origin;
const external = [];

before(async () => {
  if (!chromium) return;
  execSync('node scripts/build.js', {cwd: repo, stdio: 'ignore'});
  server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (!url.startsWith(BASE_PATH)) { res.writeHead(404); res.end(); return; }
    let file = path.join(DIST, url.slice(BASE_PATH.length));
    if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
    if (file.endsWith(path.sep) || file === DIST) file = path.join(file, 'index.html');
    fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, {'content-type': TYPES[path.extname(file)] || 'application/octet-stream'}); res.end(data); });
  });
  await new Promise(r => server.listen(0, r));
  origin = `http://localhost:${server.address().port}`;
  browser = await chromium.launch();
  if (OUT) fs.mkdirSync(OUT, {recursive: true});
});
after(async () => { await browser?.close(); server?.close(); });

async function open(viewport = {width: 1280, height: 900}) {
  const context = await browser.newContext({viewport, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write']});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:') && u !== 'about:srcdoc') external.push(u); });
  await page.goto(origin + BASE_PATH);
  return {page, errors, context};
}
const stage = page => page.locator('#stepper').getAttribute('data-current');
const identify = async page => { await page.fill('[name="hospital"]', 'Hospital Ficticio'); await page.fill('[name="pharmacist"]', 'Farmacéutica Ficticia'); await page.fill('[name="patientId"]', 'ONC-0001'); await page.selectOption('[name="patientType"]', 'oncology'); };
const yes = (page, name) => page.click(`label:has(input[name="${name}"][value="true"])`);
const dialog = (page, label) => page.click(`dialog.cmo-modal button:has-text("${label}")`);
const save = async (download, name) => { const file = path.join(OUT || fs.mkdtempSync('/tmp/cmo-onc-'), name); await download.saveAs(file); return file; };
// Rellena todo lo que siga pendiente con respuestas sin actividad («No», 0, «Ninguna»), disparando los eventos reales.
const answerRest = page => page.evaluate(() => {
  const f = document.getElementById('assessmentForm');
  const fire = el => el.dispatchEvent(new Event('input', {bubbles: true}));
  const numbers = {age: '50', weightPrevious: '70', weightCurrent: '70', pfeifferErrors: '0', chronicDiseases: '0', painEva: '0', homeMedicines: '0', toxicityGrade: '0', dispensingPercent: '100'};
  const selects = {distressMethod: 'none', ecog: '0', treatmentSituation: 'neither', complexRegimen: 'none'};
  for (const el of f.querySelectorAll('input[type=radio]')) {
    const group = f.querySelectorAll(`input[name="${el.name}"]`);
    if (![...group].some(r => r.checked) && el.value === (el.name === 'literate' ? 'true' : 'false')) { el.checked = true; fire(el); }
  }
  for (const [n, v] of Object.entries(numbers)) { const el = f.elements[n]; if (el && el.value === '') { el.value = v; fire(el); } }
  for (const [n, v] of Object.entries(selects)) { const el = f.elements[n]; if (el && el.value === '') { el.value = v; fire(el); } }
});
async function axe(page, label) {
  if (!process.env.AXE_PATH) return;
  await page.evaluate(() => { const t = document.querySelector('.cmo-toast'); if (t) t.hidden = true; });
  await page.addScriptTag({path: process.env.AXE_PATH});
  const violations = await page.evaluate(async () => (await window.axe.run(document, {preload: false, runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']})).violations.map(v => `${v.id}(${v.nodes.length}): ${v.nodes.map(n => n.html.slice(0, 90)).join(' | ')}`));
  assert.deepEqual(violations, [], `axe ${label}`);
}
const skip = {skip: !chromium && 'Playwright no disponible'};

test('recorrido manual: P1 por puntuación (28), provisional → definitivo, informes y exportación', skip, async () => {
  const {page, errors} = await open();
  await axe(page, 'paso 1');
  await page.click('#startManual');
  assert.match(await page.textContent('#identityError'), /Indique el hospital/);
  assert.equal(await stage(page), '1');
  await identify(page);
  await page.click('#startManual');
  assert.equal(await stage(page), '2');
  assert.equal(await page.textContent('#livePriority'), 'Sin valorar', 'sin datos no se muestra una prioridad firme');
  await page.fill('[name="chronicDiseases"]', '2'); await yes(page, 'dysphagia'); await page.selectOption('[name="treatmentSituation"]', 'firstOrChange');
  await yes(page, 'regimenModification'); await page.fill('[name="toxicityGrade"]', '2'); await page.selectOption('[name="complexRegimen"]', 'multiple');
  await page.fill('[name="homeMedicines"]', '8'); await yes(page, 'acuteCare');
  assert.equal(await page.textContent('#liveScore'), '28');
  assert.equal(await page.textContent('#livePriority'), 'Prioridad 1');
  assert.match(await page.textContent('#pendingText'), /resultado provisional/);
  await axe(page, 'paso 2');
  if (OUT) await page.screenshot({path: path.join(OUT, 'paso2-1280.png')});
  await page.click('[data-stage="2"] [data-next]');
  assert.equal(await page.locator('#reviewRows tr').count(), 26);
  await axe(page, 'paso 3');
  await page.click('[data-stage="3"] [data-next]');
  assert.match(await page.textContent('#resultCard'), /Prioridad 1 \(provisional\)/);
  assert.match(await page.textContent('#resultCard'), /podría alcanzar hasta \d+ puntos \(cota superior\)/);
  await axe(page, 'paso 4 provisional');
  // El informe está bloqueado hasta finalizar
  await page.click('[data-go="7"]');
  assert.equal(await page.isDisabled('#downloadPdf'), true);
  assert.match(await page.textContent('#reportBlocked'), /Finalice la estratificación/);
  // Finalizar con pendientes: diálogo → volver a completar
  await page.click('[data-go="4"]'); await page.click('#finish'); await dialog(page, 'Volver a completar');
  assert.equal(await stage(page), '2');
  await answerRest(page);
  assert.equal(await page.textContent('#liveScore'), '28', 'responder «No» a lo pendiente no cambia la puntuación');
  assert.match(await page.textContent('#pendingText'), /completas/);
  await page.click('[data-go="4"]');
  assert.doesNotMatch(await page.textContent('#resultCard'), /provisional/i);
  await axe(page, 'paso 4');
  await page.click('#finish');
  assert.match(await page.textContent('#resultStatus'), /Finalizada/);
  await page.click('[data-go="5"]');
  assert.match(await page.textContent('#needs'), /necesidades farmacoterapéuticas[\s\S]*Polimedicación/);
  await axe(page, 'paso 5');
  await page.click('[data-go="6"]');
  assert.equal(await page.locator('[data-intervention]').count(), A.interventionCatalog(1).length, 'Prioridad 1: intervenciones acumuladas');
  await page.selectOption('[data-intervention="follow.0"]', 'done'); await page.selectOption('[data-intervention="education.0"]', 'planned'); await page.selectOption('[data-intervention="follow.1"]', 'not_applicable');
  await page.fill('#nextReview', '2027-02-10'); await page.fill('#planNotes', '<img src=x onerror="window.__xss=1"> Revisión telefónica.');
  await axe(page, 'paso 6');
  assert.match(await page.textContent('#resultStatus, #finishState') || '', /./);
  await page.click('[data-go="7"]');
  const text = await page.inputValue('#reportText');
  assert.match(text, /RESULTADO DE ESTRATIFICACIÓN: PRIORIDAD 1$/m);
  assert.match(text, /Puntuación total: 28\/96/);
  assert.match(text, /Identificador del paciente \(seudonimizado\): ONC-0001/);
  assert.match(text, /Realizadas en esta consulta:\n\s+- Seguimiento farmacoterapéutico: Validación del tratamiento/);
  assert.match(text, /Planificadas \/ pendientes:/);
  assert.match(text, /Próxima valoración prevista: 10\/02\/2027/);
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  assert.equal(await page.locator('#reportPreview img').count(), 0, 'lo tecleado se escapa en la vista previa');
  await axe(page, 'paso 7');
  await page.click('#copyReport');
  await page.waitForFunction(() => document.getElementById('copyStatus').textContent !== '');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), text);
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.click('#downloadPdf')]);
  const bytes = fs.readFileSync(await save(pdf, 'informe-P1-ficticio.pdf'));
  assert.equal(bytes.subarray(0, 8).toString('latin1'), '%PDF-1.4'); assert.ok(bytes.toString('latin1').includes('ONC-0001'));
  const [txt] = await Promise.all([page.waitForEvent('download'), page.click('#downloadTxt')]);
  assert.equal(fs.readFileSync(await save(txt, 'informe-P1-ficticio.txt'), 'utf8'), text);
  const printed = page.evaluate(() => new Promise(r => document.addEventListener('cmo:print', () => r(document.querySelector('iframe.cmo-print-frame').contentDocument.body.textContent), {once: true})));
  await page.click('#printReport');
  assert.ok((await printed).includes('Resultado de estratificación: Prioridad 1'));
  const [json] = await Promise.all([page.waitForEvent('download'), page.click('#exportJson')]);
  const jsonFile = await save(json, 'caso-ficticio.json');
  const env = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  assert.equal(env.schema, 'cmo-export/1'); assert.equal(env.dataSchema, 'cmo-onc-case/1'); assert.equal(env.app.id, 'cmo-oncohematologia'); assert.equal(env.report.stratification.score, 28);
  const [csv] = await Promise.all([page.waitForEvent('download'), page.click('#exportCsv')]);
  assert.match(fs.readFileSync(await save(csv, 'caso-ficticio.csv'), 'utf8'), /"prioridad_final";"1"/);

  // Casos locales: guardar, listar, abrir, eliminar con confirmación
  await page.click('#saveCase');
  await page.click('#openCases');
  assert.match(await page.textContent('#caseList'), /ONC-0001[\s\S]*Finalizado · P1/);
  await page.click('#caseList [data-delete]'); await dialog(page, 'Cancelar');
  assert.equal(await page.locator('#caseList [data-delete]').count(), 1, 'cancelar conserva el caso');
  await page.click('#caseList [data-delete]'); await dialog(page, 'Eliminar');
  assert.match(await page.textContent('#caseList'), /No hay casos guardados/);
  await page.click('#closeCases');

  // Recarga: el borrador se recupera (antes se perdía) y la fecha de finalización se conserva
  await page.reload();
  assert.equal(await page.textContent('#liveScore'), '28');
  assert.equal(await page.inputValue('[name="patientId"]'), 'ONC-0001');
  assert.match(await page.textContent('.cmo-toast'), /recuperado el borrador/);

  // Reinicio con confirmación; importación de un fichero inválido y del válido
  await page.click('#newAssessment'); await dialog(page, 'Cancelar');
  assert.equal(await page.textContent('#liveScore'), '28', 'cancelar conserva los datos');
  await page.click('#newAssessment'); await dialog(page, 'Borrar todo');
  assert.equal(await page.textContent('#liveScore'), '0'); assert.equal(await stage(page), '1');
  assert.equal(await page.evaluate(() => localStorage.getItem('siaf-cmo-oncologia-active-v1')), null);
  const wrong = path.join(path.dirname(jsonFile), 'otro.json'); fs.writeFileSync(wrong, '{"schema":"otro"}');
  await page.setInputFiles('#importFile', wrong);
  await page.waitForFunction(() => /No se ha podido importar/.test(document.querySelector('.cmo-toast')?.textContent || ''));
  await page.setInputFiles('#importFile', jsonFile);
  await page.waitForFunction(() => document.getElementById('liveScore').textContent === '28');
  assert.equal(await stage(page), '3');
  assert.match(await page.textContent('.cmo-toast'), /importado y recalculado/);
  assert.deepEqual(errors, []);
});

test('análisis asistido: nada puntúa sin decisión; lo aceptado entra, lo descartado y lo no decidido quedan pendientes', skip, async () => {
  const {page, errors} = await open();
  await identify(page);
  await page.click('#startAssisted');
  await page.click('#analyzeClinical');
  assert.match(await page.textContent('.cmo-toast'), /Pegue primero/);
  await page.fill('#clinicalText', 'Paciente de 67 años. Toma 8 medicamentos domiciliarios. ECOG 3. Niega consumo de alcohol. Posible disfagia.');
  await page.click('#analyzeClinical');
  assert.equal(await page.locator('#proposals tbody tr').count(), 5);
  assert.equal(await page.textContent('#liveScore'), '0', 'analizar no puntúa (antes, los valores «confirmados» no críticos puntuaban sin revisión)');
  assert.match(await page.textContent('#proposals'), /Toma 8 medicamentos/);
  assert.match(await page.textContent('#proposals'), /Requiere valoración profesional/);
  await axe(page, 'propuestas');
  const decide = (label, value) => page.selectOption(`select[aria-label="Decisión para ${label}"]`, value);
  await decide('Edad', 'accept'); await decide('Polimedicación', 'accept'); await decide('Dependencia funcional – ECOG', 'discard');
  await page.click('#applyProposals');
  assert.equal(await stage(page), '2');
  assert.equal(await page.textContent('#liveScore'), '3', '8 medicamentos puntúan 3; edad 67 no puntúa en este modelo');
  assert.equal(await page.inputValue('[name="age"]'), '67'); assert.equal(await page.inputValue('[name="homeMedicines"]'), '8');
  assert.equal(await page.inputValue('[name="ecog"]'), '', 'lo descartado queda pendiente');
  assert.equal(await page.isChecked('input[name="dysphagia"][value="true"]') || await page.isChecked('input[name="dysphagia"][value="false"]'), false, 'lo sin decidir queda pendiente');
  assert.equal(await page.isChecked('input[name="unhealthyHabits"][value="false"]'), false, 'una negación propuesta y sin decidir no se registra como «No»');
  assert.equal(await page.inputValue('#clinicalText'), '', 'el texto clínico no se conserva');
  const draft = await page.evaluate(() => localStorage.getItem('siaf-cmo-oncologia-active-v1'));
  assert.ok(!/Toma 8|ECOG 3|Niega consumo/.test(draft), 'ni el texto ni la evidencia llegan al borrador');
  await page.click('[data-go="3"]');
  assert.equal(await page.locator('#reviewRows .cmo-flag--assisted').count(), 2);
  // Modificación profesional con justificación; informe provisional
  await page.click('[data-go="4"]'); await page.check('#overrideEnabled'); await page.selectOption('#overridePriority', '2'); await page.fill('#overrideJustification', 'corta');
  assert.match(await page.textContent('#overrideState'), /no se aplica/);
  await page.fill('#overrideJustification', 'Justificación ficticia suficientemente larga');
  assert.match(await page.textContent('#resultStatus'), /Prioridad 2Prioridad final/);
  await page.click('#finish'); await dialog(page, 'Finalizar como provisional');
  await page.click('[data-go="7"]');
  const text = await page.inputValue('#reportText');
  assert.match(text, /PRIORIDAD 2 \(PROVISIONAL\)/);
  assert.match(text, /Resultado calculado por el modelo: Prioridad 3/);
  assert.match(text, /Modificación por criterio profesional: Prioridad 2/);
  assert.doesNotMatch(text, /Paciente de 67|Toma 8 medicamentos|Niega consumo/, 'el texto clínico pegado no llega al informe');
  // Cambiar un dato clínico tras finalizar invalida el informe
  await page.click('[data-go="2"]'); await page.fill('[name="homeMedicines"]', '9');
  await page.click('[data-go="7"]');
  assert.equal(await page.isDisabled('#copyReport'), true);
  assert.deepEqual(errors, []);
});

test('importación hostil: se sanea, se recalcula y no ejecuta nada', skip, async () => {
  const {page, errors} = await open();
  const dir = fs.mkdtempSync('/tmp/cmo-onc-imp-');
  const evil = {schema: 'cmo-export/1', app: {id: 'cmo-oncohematologia', name: 'x', version: '1'}, exportedAt: '2026-11-10T10:00:00Z', dataSchema: 'cmo-onc-case/1', report: null, data: {schema: 'cmo-onc-case/1', metadata: {hospital: 'H', pharmacist: '<img src=x onerror="window.__xss=1">', patientId: '<img src=x onerror="window.__xss=1">', date: '2026-11-10', patientType: 'oncology'}, answers: {age: -5, ecog: '99', dysphagia: true, pregnancy: 'quizá'}, override: {priority: 9, justification: 'x'}, statuses: {zzz: 'done'}, result: {score: 1, finalPriority: 3}, completedAt: '2026-11-10T09:00:00'}};
  const legacy = {schemaVersion: 1, application: 'SIAF-CMO Oncología', exportedAt: '2026-09-01T00:00:00Z', case: {id: 'abc', status: 'completed', updatedAt: '2026-09-01T10:00:00Z', metadata: {hospital: 'H', pharmacist: 'F', date: '2026-09-01', patientType: 'hematology', patientId: 'LEG-1'}, answers: {dysphagia: true, pregnancy: false}, result: {score: 99, finalPriority: 1}}};
  fs.writeFileSync(path.join(dir, 'evil.json'), JSON.stringify(evil)); fs.writeFileSync(path.join(dir, 'legacy.json'), JSON.stringify(legacy));
  await page.setInputFiles('#importFile', path.join(dir, 'evil.json'));
  await page.waitForFunction(() => document.getElementById('liveScore').textContent === '4');
  assert.equal(await stage(page), '3');
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  assert.equal(await page.locator('img[src="x"]').count(), 0);
  assert.equal(await page.inputValue('[name="age"]'), '', 'edad fuera de dominio descartada');
  assert.equal(await page.isChecked('#overrideEnabled'), false, 'prioridad inventada descartada');
  await page.click("#casesButton"); // el diálogo de casos conserva la acción de importar
  await page.click('#closeCases');
  await page.setInputFiles('#importFile', path.join(dir, 'legacy.json'));
  await dialog(page, "Importar y sustituir");
  await page.waitForFunction(() => document.querySelector('.cmo-toast')?.textContent.includes('formato anterior'));
  assert.equal(await page.textContent('#liveScore'), '4', 'se recalcula: 4 puntos por disfagia, no los 99 del fichero');
  assert.equal(await page.inputValue('[name="patientType"]'), 'hematology');
  assert.deepEqual(errors, []);
});

test('móvil 375 px: sin desbordamiento horizontal en ninguna etapa', skip, async () => {
  const {page, errors} = await open({width: 375, height: 740});
  await identify(page); await page.click('#startManual'); await yes(page, 'pregnancy');
  for (let n = 2; n <= 7; n++) {
    await page.click(`#stepper [data-go="${n}"]`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, `paso ${n}: desbordamiento ${overflow}px`);
    assert.equal(await page.locator('#stepper [aria-current="step"]').count(), 1);
  }
  if (OUT) await page.screenshot({path: path.join(OUT, 'paso7-375.png')});
  assert.deepEqual(errors, []);
});

test('sin peticiones a terceros en todo el recorrido', skip, () => { assert.deepEqual(external, []); });
