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

El workflow `.github/workflows/pages.yml` prueba y construye la aplicación, sube
`dist/` como artefacto de Pages y solo después ejecuta el despliegue. En el
repositorio, seleccione **Settings → Pages → Source: GitHub Actions**. Puede
ejecutarlo manualmente desde **Actions → Deploy to GitHub Pages → Run workflow**
o dejar que se ejecute al actualizar `main`.

Si GitHub devuelve `403 Forbidden` al listar artefactos o crear el despliegue:

1. Confirme que Pages usa **GitHub Actions**, no una rama `gh-pages`.
2. En **Settings → Actions → General → Workflow permissions**, permita que las
   acciones creen y aprueben despliegues de Pages según la política de la cuenta.
3. Compruebe que el job `build` terminó y publicó `github-pages` antes del job
   `deploy`; el workflow impide que este último se adelante mediante `needs`.
4. Si el mensaje indica expresamente un error de un intermediario o de la API de
   artefactos, vuelva a ejecutar únicamente los jobs fallidos: ese caso también
   puede ser una incidencia transitoria de GitHub y no un error de la aplicación.

`<base href="/cmoncologia/">` fija la ruta de publicación en
`https://ramonmorillo.github.io/cmoncologia/`. Consulte `AUDITORIA.md` antes de
uso clínico.

## Importación clínica y nueva estratificación

El bloque inicial permite pegar y analizar localmente texto clínico. Las propuestas conservan estado y trazabilidad, se pueden revisar y editar, y no se incorporan al cálculo cuando son dudosas o de especial impacto sin confirmación. El texto completo nunca se persiste ni exporta. **Nueva estratificación** confirma el borrado, limpia solo el caso activo y conserva el historial guardado. Consulte `EXTRACTION_RULES.md`.
