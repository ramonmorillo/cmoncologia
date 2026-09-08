# SIAF-CMO Oncología

Aplicación web estática, local y responsive de apoyo a la estratificación farmacéutica de pacientes oncohematológicos mediante el modelo CMO de la SEFH.

## Funciones

- Motor clínico separado de la interfaz, prioridad por puntuación y tres condiciones de Prioridad 1 automática.
- Borradores y casos finalizados en `localStorage`, recuperación, duplicado y borrado.
- Exportación JSON/CSV, resumen imprimible y PDF mediante el diálogo del navegador.
- Modificación clínica excepcional trazable y actuaciones acumulativas.
- Sin backend, analítica, cookies, APIs externas ni transmisión de datos.

## Desarrollo

```bash
npm test
npm run build
npm run dev
```

El servidor local debe abrirse en `http://localhost:4173/cmoncologia/`; para ello puede enlazarse el repositorio como subdirectorio o probarse directamente `dist/index.html` bajo dicho path.

## GitHub Pages

1. Ejecute `npm run build`.
2. Publique el contenido de `dist/` en la raíz de una rama `gh-pages`.
3. En **Settings → Pages**, elija **Deploy from a branch**, rama `gh-pages`, carpeta `/ (root)`.
4. Compruebe `https://ramonmorillo.github.io/cmoncologia/`.

`<base href="/cmoncologia/">` fija la ruta de publicación. Consulte `AUDITORIA.md` antes de uso clínico.

## Importación clínica y nueva estratificación

El bloque inicial permite pegar y analizar localmente texto clínico. Las propuestas conservan estado y trazabilidad, se pueden revisar y editar, y no se incorporan al cálculo cuando son dudosas o de especial impacto sin confirmación. El texto completo nunca se persiste ni exporta. **Nueva estratificación** confirma el borrado, limpia solo el caso activo y conserva el historial guardado. Consulte `EXTRACTION_RULES.md`.
