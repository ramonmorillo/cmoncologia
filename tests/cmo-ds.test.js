import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const meta = JSON.parse(/<script type="application\/json" id="cmo-app-meta">([\s\S]*?)<\/script>/.exec(html)[1]);

test('firma CMO: la versión de la firma coincide con package.json y VERSION.md', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const versionMd = fs.readFileSync(new URL('../VERSION.md', import.meta.url), 'utf8');
  assert.equal(meta.schema, 'cmo-app-meta/1');
  assert.equal(meta.appVersion, pkg.version);
  assert.match(versionMd, new RegExp('^' + pkg.version.replace(/\./g, '\\.') + ' ', 'm'));
});

test('firma CMO: fecha solo con estado publicado y nunca generada en tiempo de ejecución', () => {
  if (meta.status === 'released') assert.match(meta.releaseDate, /^\d{4}-\d{2}-\d{2}$/);
  else assert.equal(meta.releaseDate, null);
  const sig = fs.readFileSync(new URL('../src/cmo-ds/cmo-author-signature.js', import.meta.url), 'utf8');
  assert.doesNotMatch(sig, /new Date\(|Date\.now\(/);
});

test('firma CMO: conserva la atribución del modelo clínico a la SEFH', () => {
  assert.ok(meta.credits.some(c => /SEFH/.test(c.name)));
});

test('CMO Design System: copia fijada íntegra (sin ediciones manuales)', () => {
  const dir = new URL('../src/cmo-ds/', import.meta.url);
  const man = JSON.parse(fs.readFileSync(new URL('CMO-DS-VERSION.json', dir), 'utf8'));
  assert.equal(man.version, meta.designSystem);
  for (const [f, h] of Object.entries(man.files)) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(f, dir))).digest('hex'), h, f);
  }
});
