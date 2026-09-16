import test from 'node:test';import assert from 'node:assert/strict';
import {extractClinicalText} from '../src/extractor.js';
const one=(text,id)=>extractClinicalText(text,new Date('2026-09-08T12:00:00Z')).results[id];
test('edad explícita',()=>{const r=one('Paciente de 67 años','age');assert.equal(r.proposedValue,67);assert.equal(r.confidenceStatus,'confirmed')});
test('negación psiquiátrica explícita y no consta prudente',()=>{assert.deepEqual([one('Sin antecedentes psiquiátricos','psychiatricHistory').proposedValue,one('Sin antecedentes psiquiátricos','psychiatricHistory').confidenceStatus],[false,'confirmed']);assert.notEqual(one('No consta antecedente psiquiátrico','psychiatricHistory').proposedValue,false)});
test('ECOG 2 y 3',()=>{assert.equal(one('ECOG 2','ecog').proposedValue,2);assert.equal(one('PS ECOG: 3','ecog').proposedValue,3)});
test('toxicidad reciente confirmada e histórica descartada',()=>{const recent=one('Presentó toxicidad grado 2 en el ciclo anterior','toxicity');assert.equal(recent.proposedValue,2);assert.equal(recent.confidenceStatus,'confirmed');assert.equal(one('Antecedente de toxicidad grado 2 hace tres años','toxicity').confidenceStatus,'not_found')});
test('temporalidad de ingreso',()=>{assert.equal(one('Ingreso hospitalario hace 2 semanas','acuteCare').confidenceStatus,'confirmed');assert.equal(one('Ingreso hospitalario en 2021','acuteCare').confidenceStatus,'not_found')});
test('pesos cuantitativos',()=>{assert.deepEqual(one('Peso actual 75 kg, peso hace 3 meses 80 kg','weightLoss').proposedValue,{currentWeight:75,previousWeight:80})});
test('disfagia negada y posible',()=>{assert.deepEqual([one('Niega disfagia','dysphagia').proposedValue,one('Niega disfagia','dysphagia').confidenceStatus],[false,'confirmed']);assert.equal(one('Posible disfagia','dysphagia').confidenceStatus,'suggested')});
test('tercera línea',()=>{assert.deepEqual(one('3ª línea de tratamiento','treatmentSituation').proposedValue,{line:3,situation:'thirdOrLater'})});
test('adherencia conserva los dos componentes',()=>{assert.deepEqual(one('Dispensación 85%. Morisky no adherente','adherence').proposedValue,{dispensingPercent:85,moriskyIncorrect:true});assert.deepEqual(one('Dispensación 85%. Morisky adherente','adherence').proposedValue,{dispensingPercent:85,moriskyIncorrect:false})});
test('interacción profesional Lexicomp D',()=>{assert.equal(one('Interacción farmacológica nivel D según Lexicomp','interactions').proposedValue,'D')});
test('capecitabina no implica pauta compleja',()=>{assert.equal(one('Tratamiento con capecitabina','complexRegimen').confidenceStatus,'not_found')});
test('texto irrelevante no genera falsos positivos',()=>{const e=extractClinicalText('Consulta programada. Paciente estable.');assert.ok(Object.values(e.results).every(x=>x.confidenceStatus==='not_found'))});

test('audición: ausencia explícita frente a dato no documentado',()=>{
 assert.equal(one('No presenta dificultades auditivas.','communicationBarriers').proposedValue,false);
 assert.equal(one('Consulta de seguimiento.','communicationBarriers').confidenceStatus,'not_found');
 assert.equal(one('No consta información sobre dificultades auditivas.','communicationBarriers').confidenceStatus,'not_found');
 assert.equal(one('Presenta hipoacusia.','communicationBarriers').proposedValue,true);
});
test('ECOG actual prevalece y contradicciones requieren revisión',()=>{
 assert.equal(one('ECOG previo 2. Actualmente ECOG 1.','ecog').proposedValue,1);
 assert.equal(one('ECOG 2. ECOG 1.','ecog').confidenceStatus,'suggested');
 assert.equal(one('ECOG previo 2.','ecog').confidenceStatus,'suggested');
});
test('olvidos documentados no inventan resultados de una escala validada',()=>{
 const r=one('Ha olvidado tres dosis de lenalidomida durante el último ciclo.','adherence');
 assert.equal(r.confidenceStatus,'suggested');
 assert.deepEqual(r.proposedValue,{dispensingPercent:null,moriskyIncorrect:null});
 assert.match(r.evidence,/tres dosis/);
 for(const text of ['Su esposa prepara el pastillero.','Recogida regular.','No ha olvidado tres dosis.'])assert.equal(one(text,'adherence').confidenceStatus,'not_found');
 for(const text of ['Omite algunas tomas.','Duda si ha tomado la medicación.','Interrumpió el tratamiento.'])assert.equal(one(text,'adherence').confidenceStatus,'suggested');
});
test('medicación domiciliaria con dosis y duplicados',()=>{
 const r=one('Medicación domiciliaria: apixabán 5 mg/12h, metformina 850 mg/12h, empagliflozina 10 mg/día, omeprazol 20 mg, enalapril 5 mg, atorvastatina 20 mg, apixaban 5 mg.','polypharmacy');
 assert.equal(r.proposedValue,6);
 assert.equal(r.confidenceStatus,'suggested');
 assert.equal(one('Tratamiento oncológico: lenalidomida 10 mg.','polypharmacy').confidenceStatus,'not_found');
});
test('filtrado glomerular con unidades conserva evidencia y no decide ajuste',()=>{
 for(const unit of ['mL/min/1,73 m²','ml / min / 1.73 m2']){
  const text=`FG estimado 48 ${unit}`;
  const r=one(text,'doseAdjustment');
  assert.equal(r.confidenceStatus,'suggested');assert.equal(r.proposedValue,null);assert.equal(r.evidence,text);
 }
});
test('normalización interna y negación local preservan el original',()=>{
 const text='No presenta disfagia. Actualmente presenta dificultad para deglutir.';
 assert.equal(one(text,'dysphagia').proposedValue,true);
 assert.equal(one('Niega depresion.','psychiatricHistory').proposedValue,false);
 assert.equal(one('Hay días que me vengo abajo.','psychiatricHistory').confidenceStatus,'not_found');
 assert.equal(one('Pérdida de 4 kg.','weightLoss').confidenceStatus,'not_found');
 assert.equal(one('Utiliza WhatsApp.','communicationBarriers').confidenceStatus,'not_found');
});
test('cognición: distingue negación, presencia y falta de datos sin inventar Pfeiffer',()=>{
 for(const text of ['No presenta deterioro cognitivo.','Sin deterioro cognitivo.','No refiere deterioro cognitivo.','Niega deterioro cognitivo.']){
  const r=one(text,'pfeiffer');assert.equal(r.confidenceStatus,'suggested');assert.match(r.reason,/Ausencia/);assert.equal(r.proposedValue.errors,null);
 }
 assert.match(one('Presenta deterioro cognitivo.','pfeiffer').reason,/Presencia/);
 assert.equal(one('No consta información sobre deterioro cognitivo.','pfeiffer').confidenceStatus,'not_found');
});
test('una negación de otro síntoma no niega la dificultad deglutoria',()=>{
 assert.equal(one('No presenta dolor, presenta disfagia.','dysphagia').proposedValue,true);
});
