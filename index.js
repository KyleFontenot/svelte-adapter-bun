var __dirname = "";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import { pipeline } from "node:stream";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import * as zlib from "node:zlib";
import glob from "tiny-glob";
import path, { resolve } from "node:path";
import { transformWithEsbuild } from "vite";
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
  }
};
let maybeHooksFileImport = undefined;
try {
  if (!existsSync(path.join(__dirname, "../src/websockets.js"))) {
    console.log('svelte::', __dirname)
    try {
      const wsfile = readFileSync(path.join(__dirname, "../src/websockets.ts"));
      maybeHooksFileImport = await transformWithEsbuild(wsfile.toString(), "../src/websockets.js");
    } catch (e) {
      console.warn(e);
    }
  }
  maybeHooksFileImport = await import("../src/websockets.js");
} catch (e) {
  console.log(e);
}
let wshooksfile = undefined;
if (maybeHooksFileImport) {
  if ("handleWebsocket" in maybeHooksFileImport) {
    wshooksfile = maybeHooksFileImport.handleWebsocket;
  }
}
export default function input_default({
  out = "build",
  precompress = false,
  envPrefix = "",
  development = false,
  dynamic_origin = false,
  xff_depth = 1,
  assets = true,
  websockets = false
} = {
    out: "build",
    precompress: false,
    envPrefix: "",
    development: false,
    dynamic_origin: false,
    xff_depth: 1,
    assets: true,
    websockets: false
  }) {
  return {
    name: "svelte-adapter-bun",
    async adapt(builder) {
      builder.rimraf(out);
      builder.mkdirp(out);
      builder.log.minor("Copying assets");
      builder.writeClient(`${out}/client${builder.config.kit.paths.base}`);
      builder.writePrerendered(`${out}/prerendered${builder.config.kit.paths.base}`);
      if (precompress) {
        builder.log.minor("Compressing assets");
        await Promise.all([
          compress(`${out}/client`, precompress),
          compress(`${out}/prerendered`, precompress)
        ]);
      }
      builder.log.minor("Building server");
      builder.writeServer(`${out}/server`);
      writeFileSync(`${out}/manifest.js`, `export const manifest = ${builder.generateManifest({ relativePath: "./server" })};\n\nexport const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n`);
      builder.log.minor("Patching server (websocket support)");
      const pkg = JSON.parse(readFileSync("./package.json", "utf8"));
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
            assets
          }),
          WEBSOCKETS: `${out}/server/websockets.js`
        }
      });
      const package_data = {
        name: "bun-sveltekit-app",
        version: "0.0.0",
        type: "module",
        private: true,
        main: "index.js",
        scripts: {
          start: "bun ./index.js"
        },
        dependencies: {
          cookie: "latest",
          devalue: "latest",
          "set-cookie-parser": "latest"
        }
      };
      try {
        mergeDeep(package_data, pkg);
        pkg.dependencies && Object.defineProperty(package_data, "dependencies", {
          ...pkg.dependencies,
          ...package_data.dependencies
        });
      } catch (error) {
        builder.log.error(error);
        builder.log.warn(`Parse package.json error: ${error.message}`);
      }
      writeFileSync(`${out}/package.json`, JSON.stringify(package_data, null, "\t"));
      builder.log.success("Start server with: bun ./build/index.js");
      return new Promise((resolve) => {
        resolve();
      });
    }
  };
}
export function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}
export function mergeDeep(target, ...sources) {
  if (!sources.length)
    return target;
  const source = sources.shift();
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key])
          Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  return mergeDeep(target, ...sources);
}
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
    "wasm"
  ];
  const files = await glob(`**/*.{${files_ext.join()}}`, {
    cwd: directory,
    dot: true,
    absolute: true,
    filesOnly: true
  });
  let doBr = false;
  let doGz = false;
  if (options === true) {
    doBr = doGz = true;
  } else if (typeof options === "object") {
    doBr = options.brotli ?? false;
    doGz = options.gzip ?? false;
  }
  await Promise.all(files.map((file) => Promise.all([
    doGz && compress_file(file, "gz"),
    doBr && compress_file(file, "br")
  ])));
}
async function compress_file(file, format = "gz") {
  const compress = format === "br" ? zlib.createBrotliCompress({
    params: {
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
      [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: statSync(file).size
    }
  }) : zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });
  const source = createReadStream(file);
  const destination = createWriteStream(`${file}.${format}`);
  await pipe(source, compress, destination);
}
async function determineWebsocketHandler(wsargument, out) {
  let _websockets;
  try {
    if (typeof wsargument !== "object") {
      if (wsargument === true) {
        if (existsSync(path.join(__dirname, "../src/websockets.ts"))) {
          const checkingbuild = await Bun.build({
            entrypoints: [path.join(__dirname, "../src/websockets.ts")],
            outdir: path.join(__dirname, `../${out}/server`),
            splitting: true,
            format: "esm",
            target: "bun"
          });
          const fileimport = await import(path.join(__dirname, `../${out}/server/websockets.js`));
          _websockets = fileimport;
        } else {
          const { handleWebsocket } = await import(path.join(__dirname, "../src/hooks.server.ts"));
          _websockets = handleWebsocket;
          await Bun.write(`${out}/server/websockets.js`, _websockets.toString());
        }
      } else if (typeof wsargument === "string") {
        try {
          await Bun.build({
            entrypoints: [wsargument],
            outdir: `./${out}/server`,
            splitting: true,
            format: "esm",
            target: "bun"
          });
        } catch (e) {
          console.log("problem building websocket funciton");
          console.log(e);
        }
      }
    } else if (typeof wsargument === "object") {
      await Bun.write(`${out}/server/websockets.js`, wsargument.toString());
      _websockets = await import(path.join(__dirname, `${out}/server/websockets.js`));
    }
    return _websockets;
  } catch (error) {
    console.error("Error in determineWebsocketHandler:", error);
    return;
  }
}
