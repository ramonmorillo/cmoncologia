# Reglas de extracción local

## Principios

`src/extractor.js` procesa el texto exclusivamente en memoria mediante extractores deterministas por variable. Cada resultado contiene `variableId`, valor propuesto, `confirmed`, `suggested` o `not_found`, evidencia breve, motivo, método, origen y fecha. **Una extracción nunca finaliza un caso ni sustituye la revisión profesional.** La ausencia de una mención siempre produce `not_found`, nunca un «No».

## Cobertura

Se buscan datos explícitos de edad, pesos actual y previo, embarazo, hábitos, barreras de comunicación, antecedentes psiquiátricos, HADS/EVA Distress, Pfeiffer y alfabetización, ECOG, impacto social impeditivo, número de comorbilidades, alteración renal/hepática/FEVI, EVA dolor, ingresos/urgencias, disfagia, línea, número de medicamentos, cambio de vía, modificación de dosis, medicación de alto riesgo, conservación, pauta discontinua, interacción profesional C/D/X, toxicidad, dispensación/Morisky y condiciones especiales de tratamiento.

No se deduce una interacción de una lista de fármacos, una pauta discontinua del nombre de un medicamento, mal control del dolor de una EVA aislada, ni polimedicación de una lista parcial.

## Negación y ambigüedad

Las negaciones clínicas explícitas («niega», «sin antecedentes», «no presenta») pueden confirmar un valor negativo. Expresiones epistemológicas («no consta», «sin datos», «no se documenta») quedan pendientes. «Posible», «probable» y hallazgos que requieren criterio profesional generan `suggested`.

## Temporalidad

Se confirma un ingreso/urgencia dentro del último mes, un ajuste/retraso dentro de dos meses y toxicidad en el ciclo anterior/últimos tres ciclos. Un evento de hace años se descarta. Si existe el evento sin fecha suficiente, se sugiere. Los pesos solo se consideran completos cuando constan el actual y el de hace tres meses.

## Confirmación reforzada y limitaciones

Edad pediátrica, embarazo, impacto social, Pfeiffer, ECOG, ajuste de dosis, cambio/retraso, línea, interacción, toxicidad y adherencia se bloquean para puntuación hasta confirmación humana, aun cuando el patrón sea explícito. El procesamiento por expresiones regulares no comprende toda la narrativa clínica, abreviaturas locales, referencias cruzadas ni temporalidad compleja; ante duda deja el campo pendiente.
