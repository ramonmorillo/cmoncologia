# Plan de pruebas

`npm test` cubre las reglas clínicas preexistentes (umbrales, prioridad automática, peso, ECOG, Distress, Pfeiffer, toxicidad, adherencia, override, pendientes y subtotales), almacenamiento e intercambio.

La batería de extracción añade edad, negación explícita frente a «no consta», ECOG 2/3, toxicidad reciente frente a histórica, ingresos recientes frente a antiguos, pesos, disfagia negada/posible, tercera línea, componentes de adherencia, interacción Lexicomp, capecitabina sin inferencia de pauta y texto irrelevante. Las pruebas de flujo verifican conservación/reemplazo avisado de cambios manuales, bloqueo de sugerencias y variables críticas, estado inicial y reset del caso activo sin borrar históricos.

`npm run build` valida y copia todos los módulos al artefacto estático. La revisión manual debe recorrer importar, analizar, ver evidencia, confirmar/modificar, completar pendientes, finalizar, exportar y reiniciar; además debe comprobar teclado, foco, diálogo, impresión y anchos 375/768/1440 px.

La suite también comprueba que el workflow de GitHub Pages declara los permisos
`contents: read`, `pages: write` e `id-token: write`, publica `dist/` y obliga al
despliegue a esperar al artefacto de construcción.
