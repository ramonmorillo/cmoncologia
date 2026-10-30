# Changelog

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
