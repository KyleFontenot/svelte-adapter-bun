import { exit } from "node:process";
import type { BunFile } from "bun";
import type { AdapterConfig } from "../adapter";
import type { TLSOptions } from "../adapter";
import buildOptions from "./buildoptions"
import {
  env,
  serve as sirv,
} from "./handler.js";
import createFetch from "./handler.js"

type PortConnector = Omit<Bun.Serve, "websocket"> & { port: number };

type SveltekitBunServerConfig = AdapterConfig & {
  ports?: Map<number, PortConnector>;
  port?: number,
  devPort?: number
}

const hostname = env("HOST", "0.0.0.0");
const dev = !!Bun.env?.DEV || Bun.env?.NODE_ENV === "development" || false;
const port = dev ? 5173 : Number.parseInt(env("PORT", 80));
const maxRequestBodySize = buildOptions.maxRequestSize ?? Number.parseInt(env("BODY_SIZE_LIMIT", 14244));
const tls = buildOptions.tls ?? buildOptions.ssl

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

class SveltekitBunServer {
  hostname: string = process.env.HOST ?? "0.0.0.0";
  development = false;
  ports: Map<number, PortConnector> = new Map();
  master?: Bun.Server = undefined;
  tls?: TLSOptions;
  config: SveltekitBunServerConfig;

  #initialize(wshandler: Bun.WebSocketHandler): void {
    try {
      this.master = Bun.serve({
        maxRequestBodySize: maxRequestBodySize,
        fetch: createFetch(this.config.assets ?? true),
        hostname,
        port: port,
        development: Bun.env.MODE === 'development' || Bun.env.NODE_ENV === "development" || false,
        error(error: Error) {
          console.error(error);
          return new Response("Uh oh!!", { status: 500 });
        },
        websocket: wshandler,
        // tls: tls ? {
        //   cert: Bun.file(tls.cert),
        //   key: Bun.file(tls.key),
        //   ca: tls?.ca && Bun.file(tls.ca)
        // } : undefined
      });
      console.info(`Sveltekit Bun server listening on:  ${[this.ports.keys()].map(p => `http://${this.hostname}:${p}`)} `);
    }
    catch (e) {
      console.error("Error initializing the Bun server:", e);
      exit(1);
    }
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

    this.config = this.#deepMerge(defaultConfig, passed);

    let portsToMap: Map<number, PortConnector> = new Map();
    const { development, ports, tls } = this.config;

    if (development) {
      //Accept a custom serverconfig for the dev port?
      this.#initPortConnector(5173)
    }
    else {
      //initialize the port connectors
      // always serve tls on port 443.
      if (tls) {
        const { cert, key, ca } = tls;
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
        if (tls && "key" in tls) {
          try {
            this.#initPortConnector(443, {
              port: 443, tls: {
                cert: Bun.file(tls.cert),
                key: Bun.file(tls.key),
                ca: tls?.ca ? Bun.file(tls.ca) : undefined
              }
            })
          }
          catch (e) {
            console.warn("Problem initializing port 443 with TLS", e)
          }
        }
      }
    }

    // Obtain the required websocket handler before initializing the server
    gatherWebsocketFile().then((websocketHandler) => {
      this.#initialize(websocketHandler);
    });
  }

  #connectorTemplate(shot?: Partial<PortConnector>): PortConnector {
    return {
      maxRequestBodySize: Number.isNaN(shot?.maxRequestBodySize) ? undefined : maxRequestBodySize,
      fetch(req: Request) {
        this.master.fetch(req);
        return
      },
      development: shot?.development ?? false,
      tls: shot?.tls,
      ...shot
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
}

const server = new SveltekitBunServer(buildOptions)

// ? Could export and open up the instance for methods like "reload" or "close"
