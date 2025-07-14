// import createFetch from "./handler.js"
import path from "node:path";
import { exit } from "node:process";
import type { BunFile, ServerWebSocket, TLSServeOptions } from "bun";
import type { AdapterConfig } from "../adapter";
import type { TLSOptions } from "../adapter";
import buildOptions from "./buildoptions"
import {
  env,
  serve as sirv,
  ssr,
} from "./handler.js";

type PortConnector = Bun.Serve & { port: number; tls?: TLSServeOptions };

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
  master?: Bun.Server;
  tls?: TLSOptions;
  config: SveltekitBunServerConfig;
  websocketHandler?: Bun.WebSocketHandler;

  #proxyPassToWs() {
    return {
      open: (ws: ServerWebSocket) => {
        (this.websocketHandler as Bun.WebSocketHandler).open?.(ws);
      },
      message: (ws: ServerWebSocket, message: string) => {
        (this.websocketHandler as Bun.WebSocketHandler).message(ws, message);
      },
      close: (ws: ServerWebSocket, code: number, reason: string) => {
        this.websocketHandler?.close?.(ws, code, reason);
      }
    }
  }

  #initialize(): void {
    try {
      // if (!this.websocketHandler) {
      // process.exit(1)
      // }
      this.master = Bun.serve({
        maxRequestBodySize: maxRequestBodySize,
        fetch: async (req: Request, server: Bun.Server) => {
          const outputRoot = path.dirname(Bun.fileURLToPath(new URL(import.meta.url)));
          // const protocolHeader = env("PROTOCOL_HEADER", "").toLowerCase();
          // const hostHeader = env("HOST_HEADER", "host").toLowerCase();
          // const portHeader = env("PORT_HEADER", "").toLowerCase();

          // Handle WebSocket upgrades first
          // if (req.headers.get("connection")?.toLowerCase().includes("upgrade") && req.headers.get("upgrade")?.toLowerCase() === "websocket") {
          //   const success = server.upgrade(req, {
          //     data: {
          //       url: req.url,
          //       listeners: new Set()
          //     }
          //   });
          //   if (!success) {
          //     return new Response('WebSocket upgrade failed', { status: 400 });
          //   }
          //   return; // Important: return after upgrade
          // }

          // Create the handlers array
          const handlers = [
            this.config.assets && sirv(path.join(outputRoot, "/client"), true),
            this.config.assets && sirv(path.join(outputRoot, "/prerendered")),
            ssr, // Make sure you import and use the SSR handler
          ].filter(Boolean);


          // Handler chain function
          function handle(i: number): Promise<Response> | Response {
            const handlerFn = handlers[i];
            if (typeof handlerFn === "function") {
              return handlerFn(req, () => {
                if (i + 1 < handlers.length) {
                  return handle(i + 1);
                }
                return new Response("Not Found", { status: 404 });
              });
            }
            if (i + 1 < handlers.length) {
              return handle(i + 1);
            }
            return new Response("Not Found", { status: 404 });
          }

          return handle(0);
        },
        hostname,
        port: port,
        development: Bun.env.MODE === 'development' || Bun.env.NODE_ENV === "development" || false,
        error(error: Error) {
          console.error(error);
          return new Response("Uh oh!!", { status: 500 });
        },
        // websocket: wshandler,
        websocket: this.#proxyPassToWs()
      });
      this.#initializePortConnectors();
      console.info(`Sveltekit Bun server listening on:  ${[...this.ports.keys()].map(p => `http://${this.hostname}:${p}`)} `);
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
      out: "./build", // default output directory
      envPrefix: "",      // default env prefix
      dynamicOrigin: false,      // default dynamicOrigin
      xffDepth: 1,                // default xffDepth
      assets: true
    };

    this.config = this.#deepMerge(defaultConfig, passed);

    let portsToMap: Map<number, PortConnector> = new Map();

    if (!this.config.development && Bun.env?.MODE === "development") {
      this.config.development = true
    }
    const { development, ports, tls } = this.config;

    if (development) {
      //Accept a custom serverconfig for the dev port?
      this.#setPortConnector(5173)
    }
    else {
      //initialize the port connectors
      // always serve tls on port 443.
      if (tls) {
        const { cert, key, ca } = tls;
        this.#setPortConnector(443, {
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
          this.#setPortConnector(key, value === null ? this.#connectorTemplate() : value)
        })
      }
      else {
        this.#setPortConnector(80, { port: 80 })
        if (tls && "key" in tls && !development) {
          try {
            this.#setPortConnector(443, {
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
      this.websocketHandler = websocketHandler;
      this.#initialize();
    });
  }

  #connectorTemplate(shot?: Partial<PortConnector>): PortConnector {
    return {
      port: shot?.port ?? 80,
      maxRequestBodySize: Number.isNaN(shot?.maxRequestBodySize) ? undefined : maxRequestBodySize,
      fetch: async (req: Request, server: Bun.Server) => {

        if (req.headers.get("connection")?.toLowerCase().includes("upgrade") && req.headers.get("upgrade")?.toLowerCase() === "websocket") {
          const success = server.upgrade(req, {
            data: {
              url: req.url,
              listeners: new Set()
            }
          });
          if (!success) {
            return new Response('WebSocket upgrade failed', { status: 400 });
          }
          // return;
        }

        return await (this.master as Bun.Server).fetch(req);
        // return
      },
      websocket: this.#proxyPassToWs(),
      development: shot?.development ?? false,
      tls: shot?.tls,
      ...shot
    }
  }

  #setPortConnector(port: number, serverConfig?: Partial<PortConnector> & { tls?: TLSServeOptions }): void {
    this.ports.set(
      port,
      serverConfig && typeof serverConfig.fetch === "function"
        ? serverConfig as PortConnector
        : this.#connectorTemplate(serverConfig)
    );
  }

  #initializePortConnectors() {
    this.ports.forEach((value: PortConnector, key: number) => {
      Bun.serve(value)
    });
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
