import { exit } from "node:process";
import { serve } from "bun"
import type { BunFile } from "bun";
import type { AdapterConfig } from "../adapter";
import type { TLSOptions } from "../adapter";
import buildOptions from "./buildoptions"
import {
  env,
} from "./handler.js";
import createFetch from "./handler.js"

const hostname = env("HOST", "0.0.0.0");
const dev = !!Bun.env?.DEV || Bun.env?.NODE_ENV === "development" || false;
const port = dev ? 5173 : Number.parseInt(env("PORT", 80));
const maxRequestBodySize = buildOptions.maxRequestSize ?? Number.parseInt(env("BODY_SIZE_LIMIT", 14244));
const tls = buildOptions.tls ?? buildOptions.ssl

// let httpserver: Bun.Server | undefined = undefined;

// TODO : adjust the initialize function
// TODO :  make sure the port connectors proxy to the master server instance 

async function gatherWebsocketFile() {
  try {
    const fileURLToPath = await import("node:url").then(({ fileURLToPath }) => fileURLToPath);

    const handler = await import(fileURLToPath(new URL("server/websockets.js", import.meta.url).href));
    return handler.default
  }
  catch (e) {
    console.log("No websocket handler found")
    return undefined
  }
}

// type PortConnectorConfig = Omit<PortConnector, "websocket"> & Partial<{ tls: TLSOptions }>;
type PortConnector = Omit<Bun.Serve, "websocket"> & { port: number };

type SveltekitBunServerConfig = AdapterConfig & {
  ports?: Map<number, PortConnector>;
  port?: number,
  devPort?: number
}

class SveltekitBunServer {
  hostname: string = process.env.HOST ?? "0.0.0.0";
  development = false;
  ports: Map<number, PortConnector> = new Map();
  master: Bun.Server;
  tls?: TLSOptions;

  async #initialize() {
    const websocketHandler = await gatherWebsocketFile();
    this.master = Bun.serve({
      maxRequestBodySize: maxRequestBodySize,
      // TODO 
      fetch: createFetch(buildOptions.assets ?? true, https),
      hostname,
      port: port,
      development: Bun.env.MODE === 'development' || Bun.env.NODE_ENV === "development" || false,
      error(error: Error) {
        console.error(error);
        return new Response("Uh oh!!", { status: 500 });
      },
      websocket: websocketHandler,
      // tls: tls ? {
      //   cert: Bun.file(tls.cert),
      //   key: Bun.file(tls.key),
      //   ca: tls?.ca && Bun.file(tls.ca)
      // } : undefined
    })
  }

  constructor(passed: SveltekitBunServerConfig) {

    const defaultConfig = {
      ws: "src/lib/websocket/main.ts",
      devPort: 5173,
      port: 80,
      precompress: true as boolean,
      development: false as boolean,
      maxRequestSize: 360000,
      tls: undefined as TLSOptions | undefined,
    };

    const config: SveltekitBunServerConfig = this.#deepMerge(defaultConfig, passed);
    const { tls, port, ports, development } = config;

    let portsToMap: Map<number, PortConnector> = new Map();

    if (development) {
      //Accept a custom serverconfig for the dev port?
      this.#initPortConnector(5173)
    }
    else {
      this.tls = config?.tls ?? undefined;
      config.tls = undefined;

      if (config.tls) {
        const { cert, key, ca } = config.tls;
        this.#initPortConnector(443, {
          port: 443,
          tls: {
            cert: Bun.file(cert),
            key: Bun.file(key),
            ca: ca ? Bun.file(ca) : undefined
          }
        });
      }

      if (ports instanceof Map || Array.isArray(ports)) {
        if (ports instanceof Map) {
          portsToMap = ports;
        }
        else if (Array.isArray(ports)) {
          // Assumes array of [key, value] pairs
          portsToMap = new Map(
            (ports as Array<number | PortConnector>).map((passedPortEntry): [number, PortConnector] => {
              if (typeof passedPortEntry === "number" && passedPortEntry !== 443) {
                return [passedPortEntry, this.#connectorTemplate({ port: passedPortEntry }) as PortConnector];
              }
              if (typeof passedPortEntry === "object" && "port" in passedPortEntry) {
                return [Number(passedPortEntry.port), passedPortEntry as PortConnector];
              }
              throw new Error("Invalid port entry in ports array. Must be a number or a Bun serve() config object with a 'port' property.");
            })
          );
        }
        portsToMap.forEach((value: PortConnector | null, key: number) => {
          this.#initPortConnector(key, value === null ? this.#connectorTemplate() : value)
        })

      }
      else {
        this.#initPortConnector(80, { port: 80 })
        if (config.tls && "key" in config.tls) {
          this.#initPortConnector(443, { port: 80, tls: config.tls })
        }
      }

    }



    //initialize the port connectors


    // (async () => await gatherWebsocketFile())();


    // this.masterConfig = {
    //   maxRequestBodySize: maxRequestBodySize,
    //   fetch: createFetch(buildOptions.assets ?? true, https),
    //   hostname,
    //   port: port,
    //   development: Bun.env.MODE === 'development' || Bun.env.NODE_ENV === "development" || false,
    //   error(error: Error) {
    //     console.error(error);
    //     return new Response("Uh oh!!", { status: 500 });
    //   },
    //   websocket: await gatherWebsocketFile(),
    //   tls: https && tls ? {
    //     cert: Bun.file(tls.cert),
    //     key: Bun.file(tls.key),
    //     ca: tls?.ca && Bun.file(tls.ca)
    //   } : undefined
    // };

  }

  #connectorTemplate(config?: Partial<PortConnector>): PortConnector {
    this.master
    const master = this.master
    return {
      maxRequestBodySize: Number.isNaN(config?.maxRequestBodySize) ? undefined : maxRequestBodySize,
      fetch(req: Request) {
        master.fetch(req);
        return
      },
      development: config?.development ?? false,
      tls: undefined,
      ...config
    }
  }

  #initPortConnector(port: number, serverConfig?: Partial<PortConnector> & { tls?: { cert: BunFile; key: BunFile; ca?: BunFile; } }): void {
    this.ports.set(
      port,
      serverConfig && typeof serverConfig.fetch === "function"
        ? serverConfig as PortConnector
        : this.#connectorTemplate(serverConfig)
    );


  }

  #deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
    const result = { ...target };
    for (const key in source) {
      if (
        source[key] !== null &&
        typeof source[key] === "object" &&
        key in target &&
        target[key] !== null &&
        typeof target[key] === "object"
      ) {
        result[key] = this.#deepMerge(
          target[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else if (source[key] !== undefined) {
        result[key] = source[key];
      }
    }
    return result;
  }



  error(error: Error) {
    console.error(error);
    return new Response("Uh oh!!", { status: 500 });
  }




}


export async function createServerConfig(https = false): Promise<Bun.ServeFunctionOptions<Record<string, unknown>, never>> {
  let port = 80;

  if (https) {
    port = dev ? env("HTTPS_PORT", 2045) : env("HTTPS_PORT", 443)
  }
  else {
    port = dev ? env("PORT", 5173) : env("PORT", 80)
  }
  return {
    // base: env("ORIGIN", "0.0.0.0"),
    maxRequestBodySize: Number.isNaN(maxRequestBodySize) ? undefined : maxRequestBodySize,
    fetch: createFetch(buildOptions.assets ?? true, https),
    hostname,
    port: port,
    development: Bun.env.MODE === 'development' || Bun.env.NODE_ENV === "development" || false,
    error(error: Error) {
      console.error(error);
      return new Response("Uh oh!!", { status: 500 });
    },
    websocket: await gatherWebsocketFile(),
    tls: https && tls ? {
      cert: Bun.file(tls.cert),
      key: Bun.file(tls.key),
      ca: tls?.ca && Bun.file(tls.ca)
    } : undefined
  }
}


const server = new SveltekitBunServer()


// if (tls) {
//   try {

//     const tlsModule = await import("./tls.js");
//     const available = tlsModule.watchCertificates();

//     config = await createServerConfig(true)

//     const httpsConfig = await createServerConfig(true)
//     httpserver = serve(httpsConfig);
//   }
//   catch (e) {
//     console.warn("Problem using TLS. Loading http anyway::", e)
//     try {
//       config = await createServerConfig(false)
//       httpserver = serve(config);
//     }
//     catch (f) {
//       console.warn("Couldn't run httpServer:: ", f)
//     }
//   }
// } else {
//   try {
//     config = await createServerConfig(false)
//     httpserver = serve(config);
//   }
//   catch (e) {
//     console.warn(e)
//     exit(1)
//   }
// }

console.info(`HTTP server listening on ${`${hostname}:${port}`}`);
