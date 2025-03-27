import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import type { BuildConfig } from 'bun';
import path from 'node:path';
import { exit } from 'node:process';
const outdir = 'dist';
function relativeDirPath(target: string) {
  return path.join(__dirname, target)
}

async function transformAndCopy(from: string, to: string) {
  const theFile = await Bun.file(from).text();
  const transpiled = transpiler.transformSync(theFile);
  await writeFile(to, transpiled);
}

try {
  await rm(`./${outdir}`, { recursive: true, force: true });
  await mkdir(`./${outdir}`);
  await mkdir(`./${outdir}/templates`);
} catch (e) {
  console.warn(e);
}


async function buildFile(options: Partial<BuildConfig> = {
  entrypoints: ['src/adapter.ts'],
  external: [],
  splitting: true,

}) {
  try {
    if (!options.entrypoints) {
      throw "No entrypoints provided"
    }
    const build = await Bun.build({
      entrypoints: options.entrypoints,
      outdir: "./dist",
      external: options.external ?? [],
      splitting: options.splitting ?? true,
      format: 'esm',
      target: 'bun',
    } satisfies BuildConfig);
    return build.outputs.map((output) => output.path);
  }
  catch (e) {
    console.error(e);
    exit(1);
  }
}

type PartialPreConfig = {
  entrypoints: string[],
  external: string[],
  outdir?: string;
  splitting: boolean,
  naming?: string
}

const candidates: PartialPreConfig[] = [
  {
    entrypoints: ['src/adapter.ts'],
    external: [
      'SERVER',
      'MANIFEST',
      'BUILD_OPTIONS',
      'WEBSOCKETS_INTERNAL',
      'tiny-glob',
      'dedent',
      'path',
      'fs',
      'stream',
      'util',
      'zlib'
    ],
    splitting: true,
  },
  {
    entrypoints: ['./src/viteWsPlugin.ts'],
    external: ["./determineWebsocketHandler"],
    splitting: true,
  },
  {
    entrypoints: ['./src/viteWsPlugin.ts'],
    splitting: true,
    external: ["./determineWebsocketHandler"],
    naming: "viteWsPlugin.min.js"
  }
];
const transpiler = new Bun.Transpiler({ loader: 'ts' });

const buildAllFiles = await Promise.allSettled([
  ...candidates.map(async (candidate) => {
    return await buildFile(candidate);
  }),
  await copyFile(relativeDirPath('src/.env.example'), relativeDirPath('dist/.env.example')),

  await transformAndCopy('src/templates/index.ts', 'dist/templates/index.js'),
  await transformAndCopy('src/templates/handler.ts', 'dist/templates/handler.js'),
]);

console.log('inspect::', buildAllFiles);
