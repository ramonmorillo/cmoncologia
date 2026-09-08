import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist/src', { recursive: true });
for (const file of ['index.html', 'PRIVACY.md', 'LEGAL_NOTICE.md']) await cp(file, `dist/${file}`);
for (const file of ['clinical.js', 'storage.js', 'app.js', 'styles.css']) await cp(`src/${file}`, `dist/src/${file}`);
console.log('Build estático generado en dist/ (base /cmoncologia/).');
