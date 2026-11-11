# Privacidad

La aplicación no tiene backend, analítica, cookies ni llamadas a APIs externas. El análisis clínico es determinista y ocurre exclusivamente en la memoria del navegador.

- El texto pegado **no se escribe en `localStorage`**, no forma parte del caso guardado y no aparece en JSON, CSV ni PDF.
- Los fragmentos breves de evidencia solo viven en la sesión en memoria. Al guardar se eliminan; al recargar, finalizar o reiniciar no se recuperan.
- El caso activo persiste únicamente datos estructurados y trazas sin evidencia. El historial usa una clave independiente.
- Las propuestas del análisis solo se incorporan tras la decisión del profesional; el texto pegado se borra al incorporarlas.
- La exportación JSON/CSV contiene solo datos estructurados confirmados. Un identificador seudonimizado sigue siendo un dato personal.
- «Nueva estratificación» elimina la clave del caso activo y limpia el texto, resultados, override, avisos y extracción sin tocar casos históricos.

Aunque se recomienda omitir cualquier identificador, el usuario debe pseudonimizar, proteger el dispositivo, controlar el acceso y eliminar los casos cuando dejen de ser necesarios.
