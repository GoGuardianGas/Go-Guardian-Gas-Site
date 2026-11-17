import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { build } from 'esbuild';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const entry of await readdir('.', { withFileTypes: true })) {
  if ((!entry.isDirectory() && /\.(html|ico|png|webmanifest|xml|txt)$/.test(entry.name)) ||
      ['css', 'js', 'images', 'icons', 'documents', 'articles', 'card', 'guardian-permits'].includes(entry.name)) {
    await cp(entry.name, `dist/${entry.name}`, { recursive: true });
  }
}
await build({ entryPoints: ['src/permits/staff-auth.js'], bundle: true, format: 'esm', platform: 'browser', outfile: 'dist/guardian-permits/staff-auth.js', minify: true });
console.log('Website and Guardian Permits built. Server code and configuration excluded from public output.');
