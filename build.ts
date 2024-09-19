import { log } from 'node:console';
import { copyFile, rm } from 'node:fs/promises';

const outdir = 'dist';

// try {
//   await rm(`./${outdir}`, { recursive: true, force: true });
// } catch (e) {
//   console.warn(e);
// }

const build = await Bun.build({
  entrypoints: ['./src/index.js', './src/handler.js', './src/mime.conf.js'],
  outdir: `./${outdir}`,
  splitting: true,
  external: ['SERVER', 'MANIFEST'],
  format: 'esm',
  target: 'bun',
});
log(build);
// await Promise.all([copyFile('src/.env.example', 'dist/.env.example')]);
