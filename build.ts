import { log } from 'node:console';
import { copyFile, rm } from 'node:fs/promises';
import type { BuildConfig } from 'bun';

const outdir = 'dist';

try {
  await rm(`./${outdir}`, { recursive: true, force: true });
} catch (e) {
  console.warn(e);
}

const build = await Bun.build({
  entrypoints: ['./src/index.js', './src/handler.js'],
  outdir: `./${outdir}`,
  splitting: true,
  external: ['SERVER', 'MANIFEST', 'BUILD_OPTIONS'],
  format: 'esm',
  target: 'bun',
} satisfies BuildConfig);

const minifybuild = await Bun.build({
  entrypoints: ['./src/index.min.js'],
  outdir: `./${outdir}`,
  splitting: true,
  external: ['SERVER', 'MANIFEST', 'BUILD_OPTIONS'],
  minify: true,
  format: 'esm',
  target: 'bun',
} satisfies BuildConfig
);

const viteplugin = await Bun.build({
  entrypoints: ['./src/viteWsPlugin'],
  outdir: `./${outdir}`,
  splitting: true,
  format: 'esm',
  target: 'bun',
} satisfies BuildConfig);

await Promise.all([copyFile('src/.env.example', 'dist/.env.example')]);
