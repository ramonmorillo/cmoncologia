# Reglas clínicas

La fuente declarada es *Modelo de Estratificación y Atención Farmacéutica para pacientes con enfermedades oncohematológicas* (SEFH). `src/clinical.js` es la única fuente ejecutable de pesos y reglas.

- P1: ≥28; P2: 16–27; P3: ≤15.
- P1 automática, sin sumar puntos: edad 0–18, embarazo o soporte/condiciones socioeconómicas impeditivas.
- HADS prevalece si se informan ambos métodos. Con total ≥15: subescala >10 aporta 3; subescala <10 aporta 2; el valor exactamente 10 queda en 0 por literalidad y se documenta como ambigüedad.
- Dolor exige confirmación profesional: no se inventa umbral EVA.
- Situación terapéutica y complejidad posológica son mutuamente excluyentes.
- Interacciones y condiciones especiales se implementan acumulativas por la petición recibida, pendiente de cotejo del original.
- La prioridad excepcional requiere 15 caracteres, deja intactos score y prioridad calculada y registra fecha.

## Separación respecto de la extracción

El extractor propone datos estructurados, pero no contiene pesos, umbrales ni prioridades. Las reglas anteriores siguen ejecutándose exclusivamente en `src/clinical.js`. Las propuestas sugeridas y las confirmadas de especial cautela se excluyen del cálculo provisional hasta revisión humana.
