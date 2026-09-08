export const MAX_SCORE = 96;
export const MIN_OVERRIDE_LENGTH = 15;

export const BLOCKS = [
  { id: 1, title: 'Variables demográficas' },
  { id: 2, title: 'Variables sociosanitarias, cognitivas y funcionales' },
  { id: 3, title: 'Variables clínicas y uso de servicios sanitarios' },
  { id: 4, title: 'Variables relacionadas con el tratamiento' }
];

const bool = (value, points) => value === true ? points : 0;
const suppliedNumber = value => value !== '' && value !== undefined && value !== null && Number.isFinite(Number(value));
export const weightLossPercent = (previous, current) =>
  suppliedNumber(previous) && suppliedNumber(current) && Number(previous) > 0 ? ((Number(previous) - Number(current)) / Number(previous)) * 100 : null;

export const VARIABLES = [
  {id:'age', block:1, label:'Edad', help:'Paciente pediátrico (0–18 años inclusive).', max:4, required:['age'], score:a=>suppliedNumber(a.age)&&Number(a.age)>=0&&Number(a.age)<=18?4:0},
  {id:'weightLoss', block:1, label:'Riesgo nutricional / pérdida de peso', help:'Pérdida involuntaria >5% en los últimos 3 meses.', max:3, required:['weightPrevious','weightCurrent','weightLossInvoluntary'], score:a=>a.weightLossInvoluntary===true&&weightLossPercent(a.weightPrevious,a.weightCurrent)>5?3:0},
  {id:'pregnancy', block:1, label:'Embarazo', help:'Paciente embarazada.', max:4, required:['pregnancy'], score:a=>bool(a.pregnancy,4)},
  {id:'unhealthyHabits', block:2, label:'Hábitos de vida no saludables', help:'Drogas y/o alcohol: >17 UBE/semana en mujeres o >28 en hombres.', max:3, required:['unhealthyHabits'], score:a=>bool(a.unhealthyHabits,3)},
  {id:'communicationBarriers', block:2, label:'Barreras culturales o de comunicación', help:'Barreras culturales y/o de comunicación.', max:2, required:['communicationBarriers'], score:a=>bool(a.communicationBarriers,2)},
  {id:'psychiatricHistory', block:2, label:'Antecedentes psiquiátricos', help:'Incluida depresión.', max:2, required:['psychiatricHistory'], score:a=>bool(a.psychiatricHistory,2)},
  {id:'psychologicalDistress', block:2, label:'Ansiedad, depresión o malestar psicológico', help:'Complete solo HADS o EVA Distress. Si existen ambos, prevalece HADS.', max:3, required:['distressMethod'], score:a=>{if(a.distressMethod==='none')return 0;if(a.distressMethod==='hads'||suppliedNumber(a.hadsTotal)){if(!suppliedNumber(a.hadsTotal)||Number(a.hadsTotal)<15)return 0;const values=[a.hadsAnxiety,a.hadsDepression].filter(suppliedNumber).map(Number);if(!values.length)return 0;const specific=Math.max(...values);return specific>10?3:specific<10?2:0;}if(!suppliedNumber(a.distressEva))return 0;const e=Number(a.distressEva);return e>=7?3:e>=5?2:0;}},
  {id:'pfeiffer', block:2, label:'Deterioro cognitivo – Pfeiffer', help:'Umbral: ≥3 errores si sabe leer/escribir; ≥4 si no.', max:2, required:['pfeifferErrors','literate'], score:a=>a.literate===true&&Number(a.pfeifferErrors)>=3||a.literate===false&&Number(a.pfeifferErrors)>=4?2:0},
  {id:'ecog', block:2, label:'Dependencia funcional – ECOG', help:'ECOG 2: 2 puntos; ECOG 3: 3 puntos; resto: 0.', max:3, required:['ecog'], score:a=>Number(a.ecog)===3?3:Number(a.ecog)===2?2:0},
  {id:'socialSupport', block:2, label:'Soporte social y condiciones socioeconómicas', help:'Impiden llevar a cabo correctamente el tratamiento.', max:4, required:['socialSupport'], score:a=>bool(a.socialSupport,4)},
  {id:'comorbidities', block:3, label:'Pluripatología / comorbilidades', help:'≥2 enfermedades crónicas, sin incluir la oncohematológica.', max:4, required:['chronicDiseases'], score:a=>Number(a.chronicDiseases)>=2?4:0},
  {id:'doseAdjustment', block:3, label:'Parámetros que repercuten en ajuste de dosis', help:'Alteración hepática, renal, FEVI u otros parámetros valorados por el profesional.', max:4, required:['doseAdjustment'], score:a=>bool(a.doseAdjustment,4)},
  {id:'pain', block:3, label:'Mal control del dolor', help:'EVA como información y confirmación profesional; el modelo no especifica punto de corte.', max:4, required:['painEva','poorPainControl'], score:a=>bool(a.poorPainControl,4)},
  {id:'acuteCare', block:3, label:'Hospitalización / urgencias', help:'Al menos un ingreso o visita a urgencias en el último mes.', max:1, required:['acuteCare'], score:a=>bool(a.acuteCare,1)},
  {id:'dysphagia', block:3, label:'Dificultad de deglución', help:'Presencia de dificultad de deglución.', max:4, required:['dysphagia'], score:a=>bool(a.dysphagia,4)},
  {id:'treatmentSituation', block:3, label:'Línea / situación del tratamiento', help:'Primer ciclo/cambio o tercera línea y posteriores. Una sola puntuación, máximo 4.', max:4, required:['treatmentSituation'], score:a=>['firstOrChange','thirdOrLater'].includes(a.treatmentSituation)?4:0},
  {id:'polypharmacy', block:4, label:'Polimedicación', help:'≥6 medicamentos domiciliarios, excluido el proceso oncológico.', max:3, required:['homeMedicines'], score:a=>Number(a.homeMedicines)>=6?3:0},
  {id:'routeChange', block:4, label:'Cambio de vía / forma / genérico / biosimilar', help:'Cambio valorado por el profesional.', max:1, required:['routeChange'], score:a=>bool(a.routeChange,1)},
  {id:'regimenModification', block:4, label:'Modificación del régimen regular', help:'Ajuste o retraso de dosis antineoplásica en los últimos 2 meses.', max:4, required:['regimenModification'], score:a=>bool(a.regimenModification,4)},
  {id:'highRiskMedication', block:4, label:'Medicación de alto riesgo', help:'Otro medicamento de alto riesgo según ISMP, además del antineoplásico.', max:3, required:['highRiskMedication'], score:a=>bool(a.highRiskMedication,3)},
  {id:'specialStorage', block:4, label:'Condiciones especiales de almacenamiento', help:'Requiere condiciones especiales de conservación.', max:1, required:['specialStorage'], score:a=>bool(a.specialStorage,1)},
  {id:'complexRegimen', block:4, label:'Complejidad de la pauta', help:'Una pauta oral discontinua: 2; dos o más discontinuas/diferentes: 4.', max:4, required:['complexRegimen'], score:a=>a.complexRegimen==='one'?2:a.complexRegimen==='multiple'?4:0},
  {id:'interactions', block:4, label:'Interacciones (valoración profesional)', help:'Registro, no comprobación automática. Las categorías pueden coexistir.', max:13, required:['interactionCam','interactionPk','interactionC','interactionDX'], score:a=>bool(a.interactionCam,3)+bool(a.interactionPk,3)+bool(a.interactionC,3)+bool(a.interactionDX,4)},
  {id:'toxicity', block:4, label:'Toxicidad asociada', help:'Grado CTCAE/CTC ≥2 en los últimos 3 ciclos.', max:4, required:['toxicityGrade'], score:a=>Number(a.toxicityGrade)>=2?4:0},
  {id:'adherence', block:4, label:'Adherencia', help:'Dispensación ≤90% Y al menos una respuesta Morisky incorrecta.', max:4, required:['dispensingPercent','moriskyIncorrect'], score:a=>Number(a.dispensingPercent)<=90&&a.moriskyIncorrect===true?4:0},
  {id:'specialTreatment', block:4, label:'Tratamiento en condiciones especiales', help:'Las tres condiciones pueden coexistir y se contabilizan de forma acumulativa.', max:9, required:['clinicalTrial','specialUse','recentlyMarketed'], score:a=>bool(a.clinicalTrial,4)+bool(a.specialUse,3)+bool(a.recentlyMarketed,2)}
];

export function priorityFromScore(score){return score>=28?1:score>=16?2:3;}
export function automaticReasons(a){return [...(suppliedNumber(a.age)&&Number(a.age)>=0&&Number(a.age)<=18?['Paciente pediátrico']:[]),...(a.pregnancy===true?['Embarazo']:[]),...(a.socialSupport===true?['Soporte social/condiciones socioeconómicas impeditivas']:[])];}
export function pendingFields(a={}){return [...new Set(VARIABLES.flatMap(v=>v.required).filter(k=>a[k]===undefined||a[k]===null||a[k]===''))];}
export function calculate(a={}, override=null){
 const items=VARIABLES.map(v=>({...v,points:v.score(a)})); const score=items.reduce((n,v)=>n+v.points,0);
 const calculatedPriority=priorityFromScore(score), reasons=automaticReasons(a), automaticPriority=reasons.length?1:null;
 let finalPriority=automaticPriority??calculatedPriority, appliedOverride=null;
 if(override?.priority&&[1,2,3].includes(Number(override.priority))&&String(override.justification||'').trim().length>=MIN_OVERRIDE_LENGTH){finalPriority=Number(override.priority);appliedOverride={...override,priority:finalPriority};}
 const subtotals=Object.fromEntries(BLOCKS.map(b=>[b.id,items.filter(v=>v.block===b.id).reduce((n,v)=>n+v.points,0)]));
 return {score,calculatedPriority,automaticPriority,automaticReasons:reasons,finalPriority,override:appliedOverride,subtotals,positiveVariables:items.filter(v=>v.points>0).map(({id,label,block,points})=>({id,label,block,points})),pending:pendingFields(a)};
}

const A={
  3:{follow:['Validación del tratamiento antineoplásico y de soporte.','Conciliación de la medicación concomitante.','Revisión de automedicación y medicina complementaria/alternativa.','Monitorización de interacciones.','Seguimiento de adherencia.','Prevención y minimización de reacciones adversas.'],education:['Proporcionar información escrita.','Facilitar herramientas fiables de autogestión.','Promover hábitos de vida saludables.'],coordination:['Coordinación asistencial.','Participación en programas orientados a objetivos farmacoterapéuticos.']},
  2:{follow:['Aplicar doble método de seguimiento de adherencia.','Monitorizar la actividad del tratamiento.','Registrar resultados comunicados por el paciente (PRO) en cada visita.'],education:['Atención programada presencial o mediante teleasistencia.','Valorar un sistema personalizado de dosificación (SPD) coordinado con Farmacia Comunitaria.'],coordination:['Coordinación intrahospitalaria especializada.']},
  1:{follow:['Realizar entrevista clínica en todos los ciclos.','Hacer seguimiento de objetivos farmacoterapéuticos.','Mantener contacto adicional entre visitas mediante teleasistencia.'],education:['Incorporar al paciente al plan farmacoterapéutico.','Entregar material personalizado.','Educar a familiares y cuidadores.','Realizar seguimiento entre visitas.'],coordination:['Planificar coordinadamente la próxima visita.','Coordinar activamente los niveles asistenciales.','Emitir informes periódicos al equipo multidisciplinar.','Disponer de sistemas que señalen los pacientes de Prioridad 1 al resto del equipo.']}
};
export function actionsForPriority(priority){const levels=priority===1?[3,2,1]:priority===2?[3,2]:[3];return ['follow','education','coordination'].reduce((o,k)=>(o[k]=levels.flatMap(l=>A[l][k]),o),{});}
export const PERIODICITY={1:'Valoración en ciclos alternos.',2:'Valoración cada 3 ciclos.',3:'Valoración cada 6 ciclos.'};
export const REASSESS_WHEN=['Al inicio del tratamiento.','Ante un cambio de esquema de tratamiento.','Siempre que el farmacéutico lo considere necesario.'];
