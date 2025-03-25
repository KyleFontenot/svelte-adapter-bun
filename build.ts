import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import type { BuildConfig } from 'bun';
import { } from 'node:fs';

const outdir = 'dist';

try {
  await rm(`./${outdir}`, { recursive: true, force: true });
} catch (e) {
  console.warn(e);
}

// TODO convert all these to Promise.allSettled for cleaning up and checking statuses of the builds

await Bun.build({
  entrypoints: ['src/adapter.ts'],
  outdir: "./dist",
  external: [
    'SERVER',
    'MANIFEST',
    'BUILD_OPTIONS',
    'WEBSOCKETS_INTERNAL',
    "./src/determineWebsocketHandler",
    'tiny-glob',
    'dedent',
    'path',
    'fs',
    'stream',
    'util',
    'zlib'
  ],
  splitting: true,
  format: 'esm',
  target: 'bun',
} satisfies BuildConfig);

await Bun.write(
  "./dist/templates/index.js",
  await Bun.file("src/templates/index.ts").text()
);

await Bun.write(
  "./dist/templates/handler.js",
  await Bun.file("src/templates/handler.ts").text()
);


// await Bun.build({
//   entrypoints: ['./src/handler.js'],
//   outdir: `./${outdir}`,
//   splitting: true,
//   external: ['SERVER', 'MANIFEST', 'BUILD_OPTIONS'],
//   minify: true,
//   format: 'esm',
//   target: 'bun',
//   naming: "handler.min.js"
// } satisfies BuildConfig);

// await Bun.build({
//   entrypoints: ['./src/determineWebsocketHandler.js'],
//   outdir: `./${outdir}`,
//   splitting: true,
//   minify: true,
//   format: 'esm',
//   target: 'bun',
//   naming: "determineWebsocketHandler.js"
// } satisfies BuildConfig);

// await Bun.build({
//   entrypoints: ['./src/adapter.ts'],
//   outdir: `./${outdir}`,
//   splitting: true,
//   external: ['SERVER', 'MANIFEST', 'BUILD_OPTIONS'],
//   minify: true,
//   format: 'esm',
//   target: 'bun',
//   naming: "adapter.min.js"
// } satisfies BuildConfig
// );

await Bun.build({
  entrypoints: ['./src/viteWsPlugin.ts'],
  outdir: `./${outdir}`,
  external: ["./determineWebsocketHandler"],
  splitting: true,
  format: 'esm',
  target: 'bun',
} satisfies BuildConfig);

await Bun.build({
  entrypoints: ['./src/viteWsPlugin.ts'],
  outdir: `./${outdir}`,
  splitting: true,
  minify: true,
  external: ["./determineWebsocketHandler"],
  format: 'esm',
  target: 'bun',
  naming: "viteWsPlugin.min.js"
} satisfies BuildConfig);

await Promise.all([copyFile('src/.env.example', 'dist/.env.example')]);
