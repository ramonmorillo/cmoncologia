# Correspondencia con la fuente

Fuente común: *Modelo de Estratificación y Atención Farmacéutica para pacientes con enfermedades oncohematológicas* (SEFH), según la transcripción incluida en el encargo. Debe cotejarse con el documento primario; véase `AUDITORIA.md`.

| Variable | Bloque | Definición | Puntuación | Observaciones |
|---|---:|---|---:|---|
| Edad | 1 — Variables demográficas | Paciente pediátrico (0–18 años inclusive). | 0–4 | Regla ejecutable: `age` en `src/clinical.js` |
| Riesgo nutricional / pérdida de peso | 1 — Variables demográficas | Pérdida involuntaria >5% en los últimos 3 meses. | 0–3 | Regla ejecutable: `weightLoss` en `src/clinical.js` |
| Embarazo | 1 — Variables demográficas | Paciente embarazada. | 0–4 | Regla ejecutable: `pregnancy` en `src/clinical.js` |
| Hábitos de vida no saludables | 2 — Variables sociosanitarias, cognitivas y funcionales | Drogas y/o alcohol: >17 UBE/semana en mujeres o >28 en hombres. | 0–3 | Regla ejecutable: `unhealthyHabits` en `src/clinical.js` |
| Barreras culturales o de comunicación | 2 — Variables sociosanitarias, cognitivas y funcionales | Barreras culturales y/o de comunicación. | 0–2 | Regla ejecutable: `communicationBarriers` en `src/clinical.js` |
| Antecedentes psiquiátricos | 2 — Variables sociosanitarias, cognitivas y funcionales | Incluida depresión. | 0–2 | Regla ejecutable: `psychiatricHistory` en `src/clinical.js` |
| Ansiedad, depresión o malestar psicológico | 2 — Variables sociosanitarias, cognitivas y funcionales | Complete solo HADS o EVA Distress. Si existen ambos, prevalece HADS. | 0–3 | Regla ejecutable: `psychologicalDistress` en `src/clinical.js` |
| Deterioro cognitivo – Pfeiffer | 2 — Variables sociosanitarias, cognitivas y funcionales | Umbral: ≥3 errores si sabe leer/escribir; ≥4 si no. | 0–2 | Regla ejecutable: `pfeiffer` en `src/clinical.js` |
| Dependencia funcional – ECOG | 2 — Variables sociosanitarias, cognitivas y funcionales | ECOG 2: 2 puntos; ECOG 3: 3 puntos; resto: 0. | 0–3 | Regla ejecutable: `ecog` en `src/clinical.js` |
| Soporte social y condiciones socioeconómicas | 2 — Variables sociosanitarias, cognitivas y funcionales | Impiden llevar a cabo correctamente el tratamiento. | 0–4 | Regla ejecutable: `socialSupport` en `src/clinical.js` |
| Pluripatología / comorbilidades | 3 — Variables clínicas y uso de servicios sanitarios | ≥2 enfermedades crónicas, sin incluir la oncohematológica. | 0–4 | Regla ejecutable: `comorbidities` en `src/clinical.js` |
| Parámetros que repercuten en ajuste de dosis | 3 — Variables clínicas y uso de servicios sanitarios | Alteración hepática, renal, FEVI u otros parámetros valorados por el profesional. | 0–4 | Regla ejecutable: `doseAdjustment` en `src/clinical.js` |
| Mal control del dolor | 3 — Variables clínicas y uso de servicios sanitarios | EVA como información y confirmación profesional; el modelo no especifica punto de corte. | 0–4 | Regla ejecutable: `pain` en `src/clinical.js` |
| Hospitalización / urgencias | 3 — Variables clínicas y uso de servicios sanitarios | Al menos un ingreso o visita a urgencias en el último mes. | 0–1 | Regla ejecutable: `acuteCare` en `src/clinical.js` |
| Dificultad de deglución | 3 — Variables clínicas y uso de servicios sanitarios | Presencia de dificultad de deglución. | 0–4 | Regla ejecutable: `dysphagia` en `src/clinical.js` |
| Línea / situación del tratamiento | 3 — Variables clínicas y uso de servicios sanitarios | Primer ciclo/cambio o tercera línea y posteriores. Una sola puntuación, máximo 4. | 0–4 | Regla ejecutable: `treatmentSituation` en `src/clinical.js` |
| Polimedicación | 4 — Variables relacionadas con el tratamiento | ≥6 medicamentos domiciliarios, excluido el proceso oncológico. | 0–3 | Regla ejecutable: `polypharmacy` en `src/clinical.js` |
| Cambio de vía / forma / genérico / biosimilar | 4 — Variables relacionadas con el tratamiento | Cambio valorado por el profesional. | 0–1 | Regla ejecutable: `routeChange` en `src/clinical.js` |
| Modificación del régimen regular | 4 — Variables relacionadas con el tratamiento | Ajuste o retraso de dosis antineoplásica en los últimos 2 meses. | 0–4 | Regla ejecutable: `regimenModification` en `src/clinical.js` |
| Medicación de alto riesgo | 4 — Variables relacionadas con el tratamiento | Otro medicamento de alto riesgo según ISMP, además del antineoplásico. | 0–3 | Regla ejecutable: `highRiskMedication` en `src/clinical.js` |
| Condiciones especiales de almacenamiento | 4 — Variables relacionadas con el tratamiento | Requiere condiciones especiales de conservación. | 0–1 | Regla ejecutable: `specialStorage` en `src/clinical.js` |
| Complejidad de la pauta | 4 — Variables relacionadas con el tratamiento | Una pauta oral discontinua: 2; dos o más discontinuas/diferentes: 4. | 0–4 | Regla ejecutable: `complexRegimen` en `src/clinical.js` |
| Interacciones (valoración profesional) | 4 — Variables relacionadas con el tratamiento | Registro, no comprobación automática. Las categorías pueden coexistir. | 0–13 | Regla ejecutable: `interactions` en `src/clinical.js` |
| Toxicidad asociada | 4 — Variables relacionadas con el tratamiento | Grado CTCAE/CTC ≥2 en los últimos 3 ciclos. | 0–4 | Regla ejecutable: `toxicity` en `src/clinical.js` |
| Adherencia | 4 — Variables relacionadas con el tratamiento | Dispensación ≤90% Y al menos una respuesta Morisky incorrecta. | 0–4 | Regla ejecutable: `adherence` en `src/clinical.js` |
| Tratamiento en condiciones especiales | 4 — Variables relacionadas con el tratamiento | Las tres condiciones pueden coexistir y se contabilizan de forma acumulativa. | 0–9 | Regla ejecutable: `specialTreatment` en `src/clinical.js` |
