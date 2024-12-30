import type { Server, WebSocketHandler, ServerWebSocket } from "bun";
import type { Plugin, ViteDevServer } from "vite";
export type BunServe = Partial<typeof Bun.serve>;
export let bunserverinst: undefined | Server;
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

// Vite plugin for the svelte-adapter-bun for having a working websocket in dev.
// Requires conditional ports for Websockets to work for now.

// @ts-ignore
interface VitePluginOptions {
  customWsHandler?: WebSocketHandler | true | string;
  externalLogger?: string | boolean;
  hmrPaths: string | string[];
}
const __dirname = process.cwd();
const bunWSPlugin = async (
  passedoptions: VitePluginOptions,
): Promise<Plugin> => {
  if (Bun.env.NODE_ENV !== "development") {
    return;
  }
  const defaultOptions = {
    customWsHandler: true,
    externalLogger: false,
    hmrPaths: [],
  };
  const options = { ...defaultOptions, ...passedoptions };

  const portToUse = process.env?.PUBLIC_DEVWSPORT || 10234;
  const listeners = {};

  const websocketHandler = await determineWebsocketHandler(
    options.customWsHandler,
  );

  const bunconfig = {
    port: portToUse,
    fetch: (req: Request, server: Server) => {
      if (
        req.headers.get("connection")?.toLowerCase().includes("upgrade") &&
        req.headers.get("upgrade")?.toLowerCase() === "websocket"
      ) {
        server.upgrade(req, {
          data: {
            url: req.url,
            client: req.headers.get("origin"),
            headers: req.headers,
            listeners,
            requester: server.requestIP(req),
          },
        });
      }
    },
    websocket: websocketHandler || {
      open(ws: ServerWebSocket) {
        console.log("Inside default websocket");
        setTimeout(() => {
          ws.send(
            JSON.stringify({
              message: "Sending from server",
            }),
          );
        }, 1500);
      },
      message(ws: ServerWebSocket, msg: string | Buffer) {
        console.log(msg.toString());
      },
      close(ws: ServerWebSocket) {
        console.log("Closed");
      },
    },
    listeners,
  };

  return {
    name: "bun-adapter-websockets",
    async configureServer(server: ViteDevServer) {
      Object.assign(
        {
          protocol: "ws",
          clientPort: portToUse,
        },
        server.config.server.hmr,
      );

      if (bunserverinst !== undefined) {
        bunserverinst.stop();
        bunserverinst.reload(bunconfig);
      } else {
        try {
          bunserverinst = Bun.serve(bunconfig);
        } catch (e) {
          console.log(e);
        }
      }
    },

    configResolved(config) {
      if (options.externalLogger) {
        const originalWarn = config.logger.warn;
        config.logger.warn = (msg, options) => {
          console.log("Caught a wanrinign");
          writeFileSync("warnings.log", `${msg}\n`, { flag: "a" });
          originalWarn(msg, options);
        };

        const originalErr = config.logger.warn;
        config.logger.error = (msg, options) => {
          console.log("Caught an error");
          writeFileSync("warnings.log", `${msg}\n`, { flag: "a" });
          originalErr(msg, options);
        };
      }
    },
    async handleHotUpdate({ file, modules, read, timestamp, server }) {
      // console.log("inspect::", server.config.envDir);
      const relativepath = file.replace(server.config.envDir, "");
      const configFiles = [
        "vite.config.js",
        "vite.config.ts",
        "vitehmrplugin.ts",
        "vitehmrplugin.js",
      ];
      const isConfigChange = configFiles.some((configFile) =>
        file.endsWith(configFile),
      );
      if (isConfigChange) {
        // bunserverinst.stop();
        // await server.restart();
        // bunserverinst.reload(bunconfig);
      }

      if (Array.isArray(options.hmrPaths)) {
        for (const hmrPath in options.hmrPaths) {
          if (relativepath.startsWith(hmrPath)) {
            server.ws.send({
              type: "full-reload",
              path: "*",
            });
          }
        }
      } else {
        if (relativepath.startsWith(options.hmrPaths)) {
          server.ws.send({
            type: "full-reload",
            path: "*",
          });
        }
      }
    },
  };
};
export default bunWSPlugin;

type WebSocketHandlerOptions = string | boolean | WebSocketHandler;

async function determineWebsocketHandler(
  wsargument: WebSocketHandlerOptions,
): Promise<WebSocketHandler> {
  let _websockets: WebSocketHandler;
  try {
    if (typeof wsargument !== "object") {
      if (wsargument === true) {
        try {
          const handleWebsocket = await import(
            path.join(__dirname, "/src/websockets.ts")
          );
          // console.log("tried reading the websocket.ts file::", handleWebsocket);

          _websockets = handleWebsocket.default;
        } catch (e) {
          console.warn(e);
          const readFromhooksfile = await import(
            path.join(__dirname, "/src/hooks.server.ts")
          );
          const { handleWebsocket } = readFromhooksfile;
          _websockets = handleWebsocket;
        }
      } else if (typeof wsargument === "string") {
        try {
          const handleWebsocket = await import(
            path.join(__dirname, wsargument)
          );
          _websockets = handleWebsocket.default;
        } catch (e) {
          console.warn(e);
        }
      }
    } else {
      _websockets = wsargument;
    }
    return _websockets;
  } catch (error) {
    console.error("Error in determineWebsocketHandler:", error);
    return;
  }
}
