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
import dedent from "dedent";
import type { Adapter } from "@sveltejs/kit";
import path from "node:path";
const pipe = promisify(pipeline);
const files = fileURLToPath(new URL("./dist", import.meta.url).href);
const defaultWebSocketHandler = {
  open() {
    console.log("Inside default websocket");
  },
  message(_, msg) {
    console.log(msg.toString());
  },
  close() {
    console.log("Closed");
  },
};

const hooksfile = await import("../../src/hooks.server");

const hooksServerP = path.resolve(projectRoot, 'src/hooks.server.ts');

export default function (
  {
    out = "build",
    precompress = false,
    envPrefix = "",
    development = false,
    dynamic_origin = false,
    xff_depth = 1,
    assets = true,
    websockets = defaultWebSocketHandler,
  } =
    {
      out: "build",
      precompress: false,
      envPrefix: "",
      development: false,
      dynamic_origin: false,
      xff_depth: 1,
      assets: true,
      websockets: defaultWebSocketHandler,
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
      if (!Bun) {
        throw "Needs to use the Bun exectuable, make sure Bun is installed and run `bunx --bun vite build` to build";
      }

      const hooksHandler = hooksfile?.handleWebsocket || websockets;
      const AVAILABLE_METHODS = ["open", "message", "close", "drain"];
      const insertFnToAggregator = (method) =>
        method in hooksHandler ? `${hooksHandler[method].toString()}\n` : "";


      const aggregatedhandler = dedent(`const websocketHandler = {
          ${AVAILABLE_METHODS.map((method) => insertFnToAggregator(method))}
        }
        export default websocketHandler`);
      // const transpiler = new Bun.Transpiler({
      //   loader: 'ts',
      // });
      // await Bun.write(`${out}/server/websockets.js`, transpiler.transformSync(websockets);
      try {
        await Bun.write(`${out}/server/websockets.js`, aggregatedhandler);
      }
      catch (e) {
        console.log(e)
      }
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
        builder.log.error(error)
        builder.log.warn(`Parse package.json error: ${error.message}`);
      }
      writeFileSync(
        `${out}/package.json`,
        JSON.stringify(package_data, null, "\t"),
      );
      builder.log.success("Start server with: bun ./build/index.js");
      return
    },
    async emulate() {
      return {
        async platform({ config, prerender }) {
          console.log("Platform emulation config", config);
          return {
            ws: hooksfile?.handleWebsocket || websockets
          }
        }
      }
    },
  };
}
export function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
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
// function patchServerWebsocketHandler(out: string) {
//   const src = readFileSync(`${out}/index.js`, 'utf8');
//   const regex_gethook = /(this\.#options\.hooks\s+=\s+{)\s+(handle:)/gm;
//   const substr_gethook = '$1 \nhandleWebsocket: module.handleWebsocket || null,\n$2';
//   const result1 = src.replace(regex_gethook, substr_gethook);
//   const regex_sethook = /(this\.#options\s+=\s+options;)/gm;
//   const substr_sethook = '$1\nthis.websocket = ()=>this.#options.hooks.handleWebsocket;';
//   const result = result1.replace(regex_sethook, substr_sethook);
//   writeFileSync(`${out}/index.js`, result, 'utf8');
// }
