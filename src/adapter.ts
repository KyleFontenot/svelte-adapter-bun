import {
  createReadStream,
  createWriteStream,
  existsSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { exit } from "node:process";
import { pipeline } from "node:stream";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import * as zlib from "node:zlib";
import type { Adapter, Emulator } from "@sveltejs/kit";
import type { Builder } from "@sveltejs/kit";
import glob from "tiny-glob";
import deepMerge from "./deepMerge";
import { determineWebSocketHandler } from "./determineWebsocketHandler";

const pipe = promisify(pipeline);

function generateModuleFromObject(obj: Record<string, () => void>) {
  let code = "export default {\n";

  for (const key of Object.keys(obj)) {
    try {
      const value = obj[key];

      if (typeof value === 'function') {
        // This works with ALL function types because 
        // it simply uses the native toString() method
        code += `  ${key}: ${value.toString()},\n`;
      } else {
        code += `  ${key}: ${JSON.stringify(value)},\n`;
      }
    } catch (e) {
      console.warn(`Could not process property ${key}:`, e);
    }
  }

  code += "};\n";
  return code;
}

type TLSOptions = {
  cert: string;
  key: string;
  ca?: string;
}

export interface AdapterConfig {
  out?: string;
  precompress?: boolean;
  envPrefix?: string;
  development?: boolean;
  dynamicOrigin?: boolean;
  xffDepth?: number;
  assets?: boolean;
  wsfile?: string;
  tls?: TLSOptions;
  ssl?: TLSOptions;
}


async function build(options: {
  entrypoints: Bun.BuildConfig["entrypoints"]
  outdir: Bun.BuildConfig["outdir"]
  define?: Bun.BuildConfig["define"],
  naming?: Bun.BuildConfig["naming"],
}, preserveModules = false) {
  const base = {
    entrypoints: options.entrypoints,
    outdir: options.outdir,
    target: "bun" as const,
    format: "esm" as const,
    splitting: true,
    preserveModules: true,
    packages: "external" as const,
    external: [
      "SERVER",
      "MANIFEST",
      "ENV_PREFIX",
      "dotENV_PREFIX",
      "BUILD_OPTIONS",
    ],
    define: options.define
  }
  try {
    if (preserveModules) {
      for (const entrypoint of options.entrypoints) {
        await Promise.all([
          Bun.build({
            ...base,
            entrypoints: [entrypoint],
            minify: false,
            naming: "[dir]/[name].[ext]",
          }),
          Bun.build({
            ...base,
            entrypoints: [entrypoint],
            minify: true,
            naming: "[dir]/[name].min.[ext]",
          })
        ])
      }
    } else {
      await Promise.all([
        Bun.build({
          ...base,
          entrypoints: options.entrypoints,
          minify: false,
          naming: "[dir]/[name].[ext]",
        }),
        Bun.build({
          ...base,
          entrypoints: options.entrypoints,
          minify: true,
          naming: "[dir]/[name].min.[ext]",
        })
      ])
    }

  }
  catch (e) {
    console.error(e);
    exit(1)
  }
}

export default async function adapter(
  passedOptions: AdapterConfig,
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
      wsfile: undefined,
      tls: undefined,
      ssl: undefined
    },
    passedOptions,
  );
  const { out = "build", precompress } = options;

  const websocketHandlerDetermined = await determineWebSocketHandler({
    outDir: out,
    ws: options.wsfile,
    debug: false,
  });

  return {
    name: "svelte-adapter-bun",

    async adapt(builder: Builder) {
      // console.log("inspecting routes::", builder.routes);
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
      const { assets, development, dynamicOrigin, xffDepth, envPrefix = "" } = options;


      const buildOptions = {
        // biome-ignore lint/style/useNamingConvention: intentional naming
        SERVER: "./server/index.js",
        // biome-ignore lint/style/useNamingConvention: intentional naming
        MANIFEST: "./manifest.js",
        // biome-ignore lint/style/useNamingConvention: intentional naming
        ENV_PREFIX: JSON.stringify(envPrefix),
        // biome-ignore lint/style/useNamingConvention: intentional naming
        dotENV_PREFIX: envPrefix,
        // biome-ignore lint/style/useNamingConvention: intentional naming
        BUILD_OPTIONS: JSON.stringify({
          development,
          dynamicOrigin,
          xffDepth,
          assets,
        }),
      }

      // await build({
      //   entrypoints: [
      //     fileURLToPath(new URL("./templates/index.js", import.meta.url).href),
      //     fileURLToPath(new URL("./templates/handler.js", import.meta.url).href)
      //   ],
      //   outdir: `${out}`,
      //   define: buildOptions
      // });

      // writeFileSync(`${out}/buildoptions.js`,
      //   `export default buildOptions = {
      // ${JSON.stringify(buildOptions, null, 2)}}`
      // )

      // const tls = options.tls ?? options.ssl;

      // tls && await build({
      //   entrypoints: [
      //     fileURLToPath(new URL("./templates/tls.js", import.meta.url).href)],
      //   outdir: `${out}`,
      //   define: buildOptions
      // });

      //TODO : conditional tls. inclusion

      builder.copy(
        fileURLToPath(new URL("./templates", import.meta.url).href),
        out,
        {
          replace: buildOptions
        },
      );


      if (options.wsfile) {
        if (typeof options.wsfile !== "string") {
          throw "The websocket config, 'wsfile' can only be a relative path string."
        }
        try {
          await build({
            entrypoints: [options.wsfile],
            outdir: `${out}/server`,
          })

        }
        catch (e) {
          console.error("Error building the websocket handler:", e)
        }
        // if (typeof options.ws === 'object'){
        //    TODO : Use a directly passed WEbSocketHandler or use the WebSocketHandler from hooks.server.ts
        // const handler = fixObjectForSerialization(websocketHandlerDetermined);
        // Bun.write`${out}/server/testing.js`, serializeObj(websocketDetermined));
        // }
      }

      // TODO : make this reflect the user's package.json better
      const packageData = {
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
        deepMerge(packageData, pkg);
        pkg.dependencies &&
          Object.defineProperty(packageData, "dependencies", {
            ...pkg.dependencies,
            ...packageData.dependencies,
          });
        console.log('')
      } catch (error: unknown) {
        builder.log.error(String(error));
        builder.log.warn(
          `Parse package.json error: ${String((error as Error).message)}`,
        );
      }
      writeFileSync(
        `${out}/package.json`,
        JSON.stringify(packageData, null, "\t"),
      );
      builder.log.success("Start server with: bun ./build/index.js");
      return;
    },
    async emulate(): Promise<Emulator> {

      return {
        async platform({ config, prerender }) {
          return {
            ws: websocketHandlerDetermined,
          };
        },
      };
    },
  };
}
export function isObject(item: unknown) {
  return item && typeof item === "object" && !Array.isArray(item);
}

/**
 * @param {string} directory
 * @param {import('.').CompressOptions} options
 */
interface CompressOptions {
  files?: string[];
  brotli?: boolean;
  gzip?: boolean;
}

async function compress(directory: string, options: boolean | CompressOptions): Promise<void> {
  if (!existsSync(directory)) {
    return;
  }
  const filesExt = options && typeof options === "object" && options.files
    ? options.files
    : ["html", "js", "json", "css", "svg", "xml", "wasm"];
  const files = await glob(`**/*.{${filesExt.join()}}`, {
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
        doGz && compressFile(file, "gz"),
        doBr && compressFile(file, "br"),
      ]),
    ),
  );
}
async function compressFile(file: string, format = "gz") {
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
