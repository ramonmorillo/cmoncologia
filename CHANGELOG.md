# Changelog

## 1.3.0 — sin publicar (rama `claude/zen-pasteur-u8tn7z`)

Adopción del flujo asistencial común del ecosistema CMO (patrón CMO Respiratorio) y correcciones de seguridad y de flujo. **Sin cambios en el modelo clínico**: `src/clinical.js`, `src/extractor.js` y `src/assessment-state.js` son idénticos byte a byte a la 1.2.0 (huellas SHA-256 en `tests/fixtures/clinical.sha256.json`). La fecha y el estado de publicación se fijan en el commit de publicación.

### Flujo
- Siete etapas con indicador de progreso: Inicio → Historia clínica → Revisión → Estratificación → Necesidades → Intervenciones → Informe. Se conservan el panel de puntuación en vivo, las variables, la modificación excepcional y los casos guardados.
- Inicio: hospital, farmacéutico/a, tipo de paciente y fecha obligatorios; elección de método y aviso de privacidad.
- **Análisis asistido con decisión previa** (antes, todo valor extraído se volcaba al formulario y los no críticos con estado «confirmado» puntuaban sin revisión): cada propuesta muestra su evidencia y criterio y se acepta, se acepta para corregir después o se descarta. Lo no decidido y lo descartado quedan pendientes; los valores manuales nunca se sobrescriben. El texto pegado no se guarda ni se exporta y se borra al incorporar las propuestas. Las reglas del extractor no se han tocado.
- **Resultado provisional**: ahora se puede finalizar con campos pendientes (con confirmación explícita); el resultado queda rotulado como provisional, con la cota superior de puntuación y la prioridad máxima posible si las pendientes resultaran positivas. Un campo pendiente nunca se interpreta como «No».
- Necesidades por bloque (confirmadas y potenciales) y estado de cada intervención del modelo (realizada, planificada, no procede) con plan de seguimiento y próxima valoración.
- La modificación clínica excepcional sigue exigiendo 15 caracteres, conserva el resultado del modelo y, si rebaja una Prioridad 1 automática, se advierte en pantalla e informe (la regla no se ha endurecido: pendiente de decisión del autor).

### Informe y exportación
- Un único modelo de informe (`cmo-report/1`) del que salen el texto para historia clínica, la vista previa, la impresión y un **PDF real** generado en local.
- JSON con esquema y versión (`cmo-export/1` + `cmo-onc-case/1`), CSV protegido frente a fórmulas e **importación validada que recalcula siempre el resultado** (antes se mostraba el resultado guardado en el fichero). Los ficheros JSON de la versión anterior siguen siendo importables.

### Defectos corregidos
- XSS por datos tecleados o importados insertados como HTML (justificación, motivos, identificador, valores de un JSON).
- El borrador activo se perdía al recargar (el estado vacío lo sobrescribía antes de leerlo).
- CSV sin neutralizar fórmulas (`src/storage.js`).
- Una edad negativa o valores fuera de dominio puntuaban 0 sin aviso: ahora quedan pendientes.
- Confirmaciones accesibles en lugar de `confirm()`/`alert()`; aviso al salir con datos sin guardar; borrado de casos con confirmación.

### Pruebas
- `npm test`: 58 (43 previas + regresión XSS + 14 del adaptador: paridad con el motor en 400 casos, fronteras 15/16 y 27/28, pendientes y cota superior, modificación, informe, importación hostil y formato anterior).
- `npm run test:e2e`: 5 recorridos en Chromium con auditoría axe WCAG A/AA opcional (`AXE_PATH`).

### Pendiente de decisión del autor
- Rebajar una Prioridad 1 automática con 15 caracteres: ¿exigir justificación reforzada?
- Incoherencias clínicas heredadas (`docs/ECOSISTEMA_CMO_AUDIT.md` del hub): máximos 97 frente a «/96»; HADS exactamente 10 puntúa 0; método «hads» sin valores no queda pendiente.
- «Corregir» una propuesta se hace después en la historia clínica (no hay edición dentro de la tabla de propuestas).

## 1.2.0 — 2026-10-30 — Identidad CMO Design System

Publicación: 1.1.1 → 1.2.0 (decisión del autor: versión menor por el cambio de interfaz). CMO Design System actualizado a 0.2.0 (firma multilingüe, compatible). `cmo-app-meta`: `status: "released"`, `releaseDate: "2026-10-30"`. Sin cambios en `clinical.js`.

### Identidad CMO Design System (antes «sin publicar»)

Cambio exclusivamente visual. Sin cambios en `src/clinical.js`, `src/extractor.js`, `src/assessment-state.js`, `src/storage.js` ni `src/app.js`.
- Copia fijada del CMO Design System 0.1.0 en `src/cmo-ds/` (manifiesto SHA-256), incluida en el build.
- `src/cmo-visual.css` reescrito como tema «Estratos» sobre tokens, sin `!important`; se carga tras `styles.css`. Colores semánticos de prioridad (`--level`) y de origen de datos sin cambios.
- Accesibilidad: foco de #ffbf47 (1,6:1) a #1f3aa8 (9,4:1); borde de campos de #9eb7b2 (2,1:1) a #7b8495 (≥3:1). Corrige un desbordamiento horizontal previo de 58 px en móvil.
- Nuevo pie con enlaces a aviso legal y privacidad y firma `<cmo-author-signature>` (modelo clínico atribuido a la SEFH); favicon del ecosistema.
- Pruebas: `tests/cmo-ds.test.js` (versión de la firma = `package.json` = `VERSION.md`, integridad de la copia, atribución SEFH).

## 1.1.1 — 2026-09-08

- Añadido workflow explícito de GitHub Pages con permisos mínimos, construcción,
  publicación del artefacto y despliegue secuencial para evitar errores 403 por
  configuración incompleta.
- Documentado el diagnóstico de restricciones de Pages, permisos de Actions e
  incidencias transitorias del servicio de artefactos.

## 1.1.0 — 2026-09-08

- Extracción clínica local, modular, conservadora y trazable con evidencia efímera.
- Estados Extraído/Revisar/Manual/Pendiente, protección de cambios manuales y reanálisis avisado.
- Bloqueo de finalización y de puntuación provisional para propuestas sin revisar de especial impacto.
- Nueva estratificación con confirmación, limpieza integral del caso activo y conservación del historial.
- Persistencia privada del caso activo sin texto clínico ni evidencia y nueva cobertura automatizada.

## 1.0.0 — 2026-09-08

- Primera implementación del motor clínico, interfaz responsive, almacenamiento local, finalización, modificación excepcional, exportaciones, actuaciones, periodicidad, pruebas y documentación.
