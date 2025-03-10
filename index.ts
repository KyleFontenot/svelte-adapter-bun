import {
  createReadStream,
  createWriteStream,
  existsSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { pipeline } from "node:stream";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import * as zlib from "node:zlib";
import glob from "tiny-glob";
// import dedent from "dedent";
import type { Adapter } from "@sveltejs/kit";
import path, { resolve } from "node:path";
import { transformWithEsbuild } from "vite";
// import { Transpiler } from "bun";
import type { WebSocketHandler } from "bun";
import type { BuildConfig } from "bun";

const pipe = promisify(pipeline);
const files = fileURLToPath(new URL("./dist", import.meta.url).href);

const __dirname = process.cwd();
let maybeHooksFileImport = undefined;

try {
  if (!existsSync(path.join(__dirname, "/src/websockets.js"))) {
    // const transpiler = new Transpiler()j
    // const tsfile = readFileSync(path.join(__dirname, "../src/websockets.ts"), 'utf-8')
    try {
      const wsfile = readFileSync(path.join(__dirname, "/src/websockets.ts"));
      maybeHooksFileImport = await transformWithEsbuild(
        wsfile.toString(),
        "../src/websockets.js",
      );
    } catch (e) {
      console.warn(e);
    }
  }
  maybeHooksFileImport = await import("../src/websockets.js");
} catch (e) {
  console.warn(e);
}

let wshooksfile = undefined;
if (maybeHooksFileImport) {
  if ("handleWebsocket" in maybeHooksFileImport) {
    wshooksfile = maybeHooksFileImport.handleWebsocket;
  }
}
interface AdapterOptions {
  out?: string;
  precompress?: boolean;
  envPrefix?: string;
  development?: boolean;
  dynamic_origin?: boolean;
  xff_depth?: number;
  assets?: boolean;
  websockets?: boolean | WebSocketHandler | string;
}
export default function (
  {
    out = "build",
    precompress = false,
    envPrefix = "",
    development = false,
    dynamic_origin = false,
    xff_depth = 1,
    assets = true,
    websockets = false,
  }: AdapterOptions = {
      out: "build",
      precompress: false,
      envPrefix: "",
      development: false,
      dynamic_origin: false,
      xff_depth: 1,
      assets: true,
      websockets: false,
    },
): Adapter {
  return {
    name: "svelte-adapter-bun",
    async adapt(builder) {
      builder.rimraf(out);
      builder.mkdirp(out);
      builder.log.minor("Copying assets");
      builder.writeClient(`${out}/client${builder.config.kit.paths.base}`);
      builder.writePrerendered(
        `${out}/prerendered${builder.config.kit.paths.base}`,
      );
      if (precompress) {
        builder.log.minor("Compressing assets");
        await Promise.all([
          compress(`${out}/client`, precompress),
          compress(`${out}/prerendered`, precompress),
        ]);
      }
      builder.log.minor("Building server");
      builder.writeServer(`${out}/server`);
      writeFileSync(
        `${out}/manifest.js`,
        `export const manifest = ${builder.generateManifest({ relativePath: "./server" })};\n\n` +
        `export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n`,
      );
      builder.log.minor("Patching server (websocket support)");
      // patchServerWebsocketHanfilesdler(`${out}/server`);
      const pkg = JSON.parse(readFileSync("./package.json", "utf8"));
      // const transpiler = new Bun.Transpiler({
      //   loader: 'ts',
      // });
      // const transpiled = transpiler.transformSync(`${websockets()}`);
      // if (!Bun) {
      //   throw "Needs to use the Bun exectuable, make sure Bun is installed and run `bunx --bun vite build` to build";
      // }

      const _websockets = await determineWebsocketHandler(websockets, out);

      builder.copy(files, out, {
        replace: {
          SERVER: "./server/index.js",
          MANIFEST: "./manifest.js",
          ENV_PREFIX: JSON.stringify(envPrefix),
          dotENV_PREFIX: envPrefix,
          BUILD_OPTIONS: JSON.stringify({
            development,
            dynamic_origin,
            xff_depth,
            assets,
          }),
          WEBSOCKETS: `${out}/server/websockets.js`,
        },
      });
      const package_data = {
        name: "bun-sveltekit-app",
        version: "0.0.0",
        type: "module",
        private: true,
        main: "index.js",
        scripts: {
          start: "bun ./index.js",
        },
        dependencies: {
          cookie: "latest",
          devalue: "latest",
          "set-cookie-parser": "latest",
        },
      };
      try {
        mergeDeep(package_data, pkg);
        pkg.dependencies &&
          Object.defineProperty(package_data, "dependencies", {
            ...pkg.dependencies,
            ...package_data.dependencies,
          });
      } catch (error) {
        builder.log.error(error);
        builder.log.warn(`Parse package.json error: ${error.message}`);
      }
      writeFileSync(
        `${out}/package.json`,
        JSON.stringify(package_data, null, "\t"),
      );

      builder.log.success("Start server with: bun ./build/index.js");
      return new Promise((resolve) => {
        resolve();
      });
    },
    // async emulate() {
    //   return {
    //     async platform({ config, prerender }) {
    //       return {
    //         ws: await determineWebsocketHandler(websockets, out)
    //       }
    //     }
    //   }
    // },
  };
}
export function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}
export function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  return mergeDeep(target, ...sources);
}

/**
 * @param {string} directory
 * @param {import('.').CompressOptions} options
 */
async function compress(directory, options) {
  if (!existsSync(directory)) {
    return;
  }
  const files_ext = options.files ?? [
    "html",
    "js",
    "json",
    "css",
    "svg",
    "xml",
    "wasm",
  ];
  const files = await glob(`**/*.{${files_ext.join()}}`, {
    cwd: directory,
    dot: true,
    absolute: true,
    filesOnly: true,
  });
  let doBr = false;
  let doGz = false;
  if (options === true) {
    doBr = doGz = true;
  } else if (typeof options === "object") {
    doBr = options.brotli ?? false;
    doGz = options.gzip ?? false;
  }
  await Promise.all(
    files.map((file) =>
      Promise.all([
        doGz && compress_file(file, "gz"),
        doBr && compress_file(file, "br"),
      ]),
    ),
  );
}
async function compress_file(file, format = "gz") {
  const compress =
    format === "br"
      ? zlib.createBrotliCompress({
        params: {
          [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
          [zlib.constants.BROTLI_PARAM_QUALITY]:
            zlib.constants.BROTLI_MAX_QUALITY,
          [zlib.constants.BROTLI_PARAM_SIZE_HINT]: statSync(file).size,
        },
      })
      : zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });
  const source = createReadStream(file);
  const destination = createWriteStream(`${file}.${format}`);
  await pipe(source, compress, destination);
}

async function determineWebsocketHandler(
  wsargument: boolean | string | WebSocketHandler,
  out: string,
): Promise<WebSocketHandler> {
  let _websockets: WebSocketHandler;
  try {
    if (typeof wsargument !== "object") {

      if (wsargument === true) {
        // console.log("Exists", existsSync(path.join(__dirname, "../src/websockets.ts")))
        if (existsSync(path.join(__dirname, "/src/websockets.ts"))) {
          // _websockets = await import("../src/websockets");
          const checkingbuild = await Bun.build({
            entrypoints: [path.join(__dirname, "/src/websockets.ts")],
            outdir: path.join(__dirname, `/${out}/server`),
            splitting: true,
            format: "esm",
            target: "bun",
          } satisfies BuildConfig);

          // _websockets = Bun.file(path.join(__dirname, "../src/websockets.ts"))
          const fileimport = await import(
            path.join(__dirname, `/${out}/server/websockets.js`)
          );
          _websockets = fileimport;
        } else {
          const { handleWebsocket } = await import(
            path.join(__dirname, "/src/hooks.server.ts")
          );
          _websockets = handleWebsocket;
          try {
            await Bun.write(
              `${out}/server/websockets.js`,
              _websockets.toString(),
            );
          }
          catch (e) {
            console.error("Error outputing file")
          }

          // await Bun.write(
          //   `${out}/server/websockets.js`,
          //   _websockets.toString(),
          // );
          // _websockets = await import(path.join(__dirname, `${out}/server/websockets.js`))
        }
      }
      // else if (typeof wsargument === false) {
      // }
      else if (typeof wsargument === "string") {
        try {
          await Bun.build({
            entrypoints: [wsargument],
            outdir: `./${out}/server`,
            splitting: true,
            format: "esm",
            target: "bun",
          } satisfies BuildConfig);
          //TODO allow a path to the websocket handler
          // _websockets = await Bun.file(path.join(__dirname, wsargument))
        } catch (e) {
          console.log("problem building websocket funciton");
          console.log(e);
        }
      }
    } else if (typeof wsargument === "object") {
      await Bun.write(`${out}/server/websockets.js`, wsargument.toString());
      _websockets = await import(
        path.join(__dirname, `${out}/server/websockets.js`)
      );
    }
    return _websockets;
  } catch (error) {
    console.error("Error in determineWebsocketHandler:", error);
    return;
  }
}
