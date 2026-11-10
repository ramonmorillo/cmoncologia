// Regresión de seguridad: los datos tecleados, pegados o importados se escapan antes de insertarse como HTML.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('resultado, justificación e identificador se escapan (también si proceden de un JSON importado)', () => {
  const src = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  for (const needle of ['esc(r.override.justification)', "esc(c.metadata?.patientId||'Sin identificador')", 'esc(r.finalPriority)', 'esc(r.score)', 'esc(c.id)']) assert.ok(src.includes(needle), needle);
  assert.doesNotMatch(src, /\$\{r\.override\.justification\}|\$\{c\.metadata\?\.patientId\|\|/);
});
