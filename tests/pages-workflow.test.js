import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('el despliegue de Pages declara permisos, artefacto y dependencia',async()=>{
  const workflow=await readFile('.github/workflows/pages.yml','utf8');
  for(const expected of [
    'contents: read',
    'pages: write',
    'id-token: write',
    'uses: actions/upload-pages-artifact@v4',
    'path: dist',
    'needs: build',
    'uses: actions/deploy-pages@v5'
  ])assert.match(workflow,new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});
