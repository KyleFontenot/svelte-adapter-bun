import type { Server, WebSocketHandler, ServerWebSocket } from "bun";
import type { Plugin, ViteDevServer } from "vite";
export type BunServe = Partial<typeof Bun.serve>;
export let bunserverinst: undefined | Server;
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

// Vite plugin for the svelte-adapter-bun for having a working websocket in dev.
// Requires conditional ports for Websockets to work for now.

// @ts-ignore
// EDITED FOR TWOPORTAL
const fromHooks = undefined;

const bunWSPlugin = async (
  customWsHandler: WebSocketHandler | true | string = true,
): Promise<Plugin> => {
  // console.log("!OPTIONS VITE:: ", Bun.env.NODE_ENV)
  if (Bun.env.NODE_ENV !== "development") {
    return
  }

  const portToUse = process.env?.PUBLIC_DEVWSPORT || 10234;
  const listeners = {};
  // console.log("Bun.env.NODE_ENV ", Bun.env.NODE_ENV)

  const websocketHandler = await determineWebsocketHandler(customWsHandler);

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
          console.log("trying to send to clinet");
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
    },
    handleHotUpdate({ file, server }) {
      const configFiles = [
        "vite.config.js",
        "vite.config.ts",
        "vitehmrplugin.ts",
        "vitehmrplugin.js",
        "hooks.server.ts",
      ];
      const isConfigChange = configFiles.some((configFile) =>
        file.endsWith(configFile),
      );
      if (isConfigChange) {
        bunserverinst?.stop();
        bunserverinst = undefined;
        server.ws.send({
          type: "full-reload",
          path: "*",
        });
        return [];
      }
    },
  };
};
export default bunWSPlugin;

type WebSocketHandlerOptions = string | true | WebSocketHandler;

async function determineWebsocketHandler(
  wsargument: WebSocketHandlerOptions,
): Promise<WebSocketHandler> {
  let _websockets: WebSocketHandler;
  try {
    if (typeof wsargument !== "object") {
      if (wsargument === true) {
        try {
          const handleWebsocket = await import(
            path.join(__dirname, "../../src/websockets.ts")
          );
          _websockets = handleWebsocket.default;
        } catch (e) {
          console.warn(e);
          const { handleWebsocket } = await import(
            path.join(__dirname, "../../src/hooks.server.ts")
          );
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
        // _websockets = handleWebsocket.default;
      }
    } else {
      // await Bun.write(`${out}/server/websockets.js`, wsargument.toString());
      _websockets = wsargument;
    }
    return _websockets;
  } catch (error) {
    console.error("Error in determineWebsocketHandler:", error);
    return;
  }
}
