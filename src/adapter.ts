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
import { inspect, promisify } from "node:util";
import * as zlib from "node:zlib";
import glob from "tiny-glob";
import dedent from "dedent";
import type { Adapter } from "@sveltejs/kit";
import type { WebSocketHandler } from "bun";
import { fallbackWebSocketHandler, determineWebSocketHandler } from "./determineWebsocketHandler";
import deepMerge from "./deepMerge";

const pipe = promisify(pipeline);
const files = fileURLToPath(new URL("./dist", import.meta.url).href);

interface AdapterConfig {
  out: string;
  precompress: boolean;
  envPrefix: string;
  development: boolean;
  dynamic_origin: boolean;
  xff_depth: number;
  assets: boolean;
  ws?: WebSocketHandler;
}

export default async function adapter(
  passedOptions: AdapterConfig
): Promise<Adapter> {
  const options = deepMerge<Partial<AdapterConfig>>(
    {
      out: "build",
      precompress: false,
      envPrefix: "",
      development: false,
      dynamic_origin: false,
      xff_depth: 1,
      assets: true,
      ws: undefined,
    },
    passedOptions
  );
  const { out = "build", precompress } = options;

  const websocketHandlerDetermined = await determineWebSocketHandler({
    ws: options.ws,
    debug: false,
  });



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
      const pkg = JSON.parse(readFileSync("./package.json", "utf8"));
      if (!Bun) {
        throw "Needs to use the Bun exectuable, make sure Bun is installed and run `bunx --bun vite build` to build";
      }
      const { assets, development, dynamic_origin, xff_depth, envPrefix } = options;


      const WEBSOCKET_EVENTS = ["open", "message", "close", "drain"];
      const insertFnToAggregator = (wsEvent: typeof WEBSOCKET_EVENTS[number]) => {
        if (wsEvent in (websocketHandlerDetermined as unknown as Record<string, (...args: unknown[]) => string>)) {
          return `${(websocketHandlerDetermined as unknown as Record<string, (...args: unknown[]) => string>)[wsEvent]()}\n`;
        }
        return ""
      }

      const filteredHandler = dedent(
        `const websocketHandler = {
          ${WEBSOCKET_EVENTS.map((wsEvent) => insertFnToAggregator(wsEvent))}
        }
        export default websocketHandler`
      );
      try {
        await Bun.write(`${out}/server/websockets.js`, filteredHandler);
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
        // async platform({ config, prerender }) {
        //   console.log("Platform emulation config", config);
        //   console.log('inspect::', inspect(websocketHandlerDetermined))
        //   return {
        //     ws: websocketHandlerDetermined
        //   }
        // }
      }
    },
  };
}
export function isObject(item: unknown) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}
export function mergeDeep(target: Record<string, unknown>, ...sources: { [key: string]: unknown }[]): Record<string, unknown> {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
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