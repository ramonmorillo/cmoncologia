// Regresión de seguridad: los datos tecleados, pegados o importados se escapan antes de insertarse como HTML.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('resultado, justificación, identificador y propuestas se escapan (también si proceden de un JSON importado)', () => {
  const src = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(src, /escapeHtml as esc/);
  for (const needle of ['esc(ev.override.justification)', "esc(c.metadata?.patientId || 'Sin identificador')", 'esc(c.id)', 'esc(p.trace.evidence)', 'esc(p.trace.reason)', 'esc(d.response)']) assert.ok(src.includes(needle), needle);
  assert.doesNotMatch(src, /\$\{ev\.override\.justification\}|\$\{c\.metadata\?\.patientId\s*\|\|/);
});
