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
import type { WebSocketHandler } from "bun";
import { determineWebSocketHandler } from "./determineWebsocketHandler";
import deepMerge from "./deepMerge";
import type { Builder } from "@sveltejs/kit"
// import serialize from "./serialize";
import { serialize, deserialize } from "bun:jsc";
import path from "node:path";
import { exit } from "node:process";

const pipe = promisify(pipeline);

interface AdapterConfig {
  out: string;
  precompress: boolean;
  envPrefix: string;
  development: boolean;
  dynamicOrigin: boolean;
  xffDepth: number;
  assets: boolean;
  ws?: WebSocketHandler | string;
}

// TODO fill in thie serializeObj function to be able to write tothe file if the options.ws arguemnt is a function instead of a path string
// function serializeObj(obj: Record<string | number | symbol, unknown>) {
//   const objMut = { ...obj };
//   // TODO check more types of variabels besides objects as paramters
//   for (const val in Object.values(obj)) {
//     if (val instanceof Function) {
//       // TODO: check more
//       val = val.toString();
//     }
//   }
//   return serialize(objMut)
// }

export default async function adapter(
  passedOptions: AdapterConfig
): Promise<Adapter> {
  const options = deepMerge<Partial<AdapterConfig>>(
    {
      out: "build",
      precompress: false,
      envPrefix: "",
      development: false,
      dynamicOrigin: false,
      xffDepth: 1,
      assets: true,
      ws: undefined,
    },
    passedOptions
  );
  const { out = "build", precompress } = options;

  const websocketHandlerDetermined = await determineWebSocketHandler({
    outDir: out,
    ws: options.ws,
    debug: false,
  });

  return {
    name: "svelte-adapter-bun",
    async adapt(builder: Builder) {
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
      const pkg = JSON.parse(readFileSync("./package.json", "utf8"));
      if (!Bun) {
        throw "Needs to use the Bun exectuable, make sure Bun is installed and run `bunx --bun vite build` to build";
      }
      const { assets, development, dynamicOrigin, xffDepth, envPrefix } = options;

      const WEBSOCKET_EVENTS = ["open", "message", "close", "drain"];



      // const insertFnToAggregator = (wsEvent: typeof WEBSOCKET_EVENTS[number]) => {
      //   if (wsEvent in (websocketHandlerDetermined as unknown as Record<string, (...args: unknown[]) => string>)) {
      //     return `${(websocketHandlerDetermined as unknown as Record<string, (...args: unknown[]) => string>)[wsEvent]()}\n`;
      //   }
      //   return ""
      // }

      // const filteredHandler = dedent(
      //   `const websocketHandler = {
      //     ${WEBSOCKET_EVENTS.map((wsEvent) => insertFnToAggregator(wsEvent))}
      //   }
      //   export default websocketHandler`
      // );

      // try {
      //   await Bun.write(`${out}/server/websockets.js`, filteredHandler);
      // }
      // catch (e) {
      //   console.log(e)
      // }

      builder.copy(fileURLToPath(new URL("./templates", import.meta.url).href), out, {
        replace: {
          SERVER: "./server/index.js",
          MANIFEST: "./manifest.js",
          ENV_PREFIX: JSON.stringify(envPrefix),
          dotENV_PREFIX: envPrefix,
          BUILD_OPTIONS: JSON.stringify({
            development,
            dynamicOrigin,
            xffDepth,
            assets,
          })
        }
      });

      // TODO: is the options.ws arguemtn is a function, write websocketDetermined to the the target file.
      // Bun.write(`${out}/server/testing.js`, serializeObj(websocketDetermined));

      if (typeof options.ws === "string") {
        await Bun.build({
          entrypoints: [options.ws],
          outdir: `${options.out}/server`,
          target: 'bun',
          minify: true,
          sourcemap: "external",
          format: 'esm',
          splitting: true,
          naming: "websockets.js"
        })
      }
      else {
        const seriealizedWsHandler = serialize(websocketHandlerDetermined);
        await Bun.write(`${out}/server/websockets.js`, seriealizedWsHandler);
      }

      // const writeWebSocketHandler = await Bun.write(`${out}/server/websockets.js`, websocketHandlerDetermined);

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
        deepMerge(package_data, pkg);
        pkg.dependencies &&
          Object.defineProperty(package_data, "dependencies", {
            ...pkg.dependencies,
            ...package_data.dependencies,
          });
      } catch (error: unknown) {
        builder.log.error(String(error))
        builder.log.warn(`Parse package.json error: ${String((error as Error).message)}`);
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
          return {
            ws: websocketHandlerDetermined
          }
        }
      }
    },
  };
}
export function isObject(item: unknown) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}


/**
 * @param {string} directory
 * @param {import('.').CompressOptions} options
 */
async function compress(directory: string, options) {
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
async function compress_file(file: string, format = "gz") {
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