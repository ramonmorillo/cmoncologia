# Auditoría clínica

## Resultado de revisión

Se contrastaron todas las reglas con la especificación clínica facilitada en el encargo. No fue posible acceder desde este entorno al repositorio respiratorio ni al documento primario de SEFH (la conexión saliente devolvió 403/401); por ello esta versión **requiere cotejo final con el documento original antes del uso asistencial**.

| Regla revisada | Fuente disponible | Resultado / ambigüedad |
|---|---|---|
| Pesos de todos los criterios | Especificación del encargo | Reproducidos literalmente |
| Umbrales 15/16/27/28 | Especificación | Conforme |
| P1 automática (3 causas) | Especificación | Conforme, sin puntos artificiales |
| Peso y ECOG, EVA, Pfeiffer, toxicidad, adherencia | Especificación | Conforme |
| Dolor | Especificación | Confirmación profesional; sin corte inventado |
| HADS, subescala exactamente 10 | Especificación dice `>10` y `<10` | No cubierta por ninguno; implementación conservadora 0 |
| Interacciones | Se enumeran cuatro categorías, sin regla explícita de coexistencia | Se registran y suman separadamente; requiere validación primaria |
| Condiciones especiales | Se pide aclarar coexistencia “conforme al original” sin proporcionar regla | Implementación acumulativa y visible; requiere validación primaria |
| 22 variables | La lista facilitada contiene 26 apartados puntuables | Se implementan los 26 criterios solicitados |
| Máximo 96 | La suma literal de máximos solicitados es 97 | No se capó ni alteró ningún peso; UI conserva denominador publicado 96. Requiere resolución editorial |
| Actuaciones y periodicidad | Listado del encargo | Implementadas de forma acumulativa; la expresión “entre otras” impide certificar exhaustividad sin original |
| Doble contabilización | Revisión del motor/UI | Situación terapéutica y pauta excluyentes; cada control alimenta una sola variable |
