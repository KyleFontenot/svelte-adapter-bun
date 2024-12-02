
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
// const minifybuild = await Bun.build({
//   entrypoints: ['./src/index.min.js'],
//   outdir: `./${outdir}`,
//   splitting: true,
//   external: ['SERVER', 'MANIFEST', 'BUILD_OPTIONS'],
//   minify: true,
//   format: 'esm',
//   target: 'bun',
// } satisfies BuildConfig
// );

const transpiler = new Bun.Transpiler({
  loader: 'ts',
});
// const transpiled = transpiler.transformSync('index.ts');
const idxts = Bun.file('./index.ts')
Bun.write('./index.js', transpiler.transformSync(await idxts.text()))
// console.log(transpiled)

// const indexTs = await Bun.build({
//   entrypoints: ['./index.ts'],
//   outdir: '.',
//   splitting: false,
//   external: ['SERVER', 'MANIFEST', 'BUILD_OPTIONS'],
//   format: 'esm',
//   target: 'bun',
// } satisfies BuildConfig);

// console.log(indexTs)
// console.log(build.logs);
// await Promise.all([copyFile('src/.env.example', 'dist/.env.example')]);
