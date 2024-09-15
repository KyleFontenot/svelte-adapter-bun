  import type { ViteDevServer, Plugin } from "vite"
import type { Server, WebSocketHandler, WebSocketServeOptions } from "bun";

export let bunserverinst: undefined | Partial<Server>;

const bunWSPlugin = (websocketconfig: Server): Plugin => (
  {
    name: 'bun-adapter-websockets',
    configureServer: ((process.env.NODE_ENV === 'development') ? (server: ViteDevServer) => {

      const portToUse = process.env?.WSPORT || 10234;
      try {

        if (!bunserverinst) {
            bunserverinst = Bun.serve({
              port: portToUse,
              fetch: (websocketconfig?.fetch ?? ((req, server) => {
                console.log("GOt a Request in bun server!!")
                const pathname = new URL(req.url).pathname
                if (pathname.startsWith('/ws')) {
                  server.upgrade(req)
                  return
                }
              })),
              ...websocketconfig,
            })
        }
      }
      catch (e) {
        console.warn("Couldn't find Bun in global. ")
        console.warn(e)
      }

      server.config.server.proxy = {
        ...server.config.server.proxy,
        '^/ws/.*': {
          target: `ws://${bunserverinst?.hostname}:${portToUse}`,
          ws: true,
          rewriteWsOrigin: true,
        },
      }
    }
      : undefined)
  }
)
export default bunWSPlugin
