import type { Server, WebSocketServeOptions } from 'bun';
import type { Plugin, ViteDevServer } from 'vite';
export type BunServe = Partial<typeof Bun.serve>;
export let bunserverinst: undefined | Partial<Server>;

const bunWSPlugin = (websocketconfig: WebSocketServeOptions): Plugin => ({
  name: 'bun-adapter-websockets',
  configureServer(server: ViteDevServer) {
    const portToUse = process.env?.WSPORT || 10234;

    const mergedHMRsettings = Object.assign(
      {
        protocol: 'ws',
        clientPort: portToUse,
      },
      server.config.server.hmr,
    );

    server.config.server.hmr = mergedHMRsettings;

    const mergedwebsocketconfig = Object.assign(
      {
        port: portToUse,
        fetch:
          websocketconfig?.fetch ??
          ((req: Request, server: Server) => {
            if (
              req.headers.get('connection')?.toLowerCase().includes('upgrade') &&
              req.headers.get('upgrade')?.toLowerCase() === 'websocket'
            ) {
              server.upgrade(req, {
                data: {
                  url: req.url,
                  headers: req.headers,
                },
              });
              return;
            }
          }),
        websocket: websocketconfig?.websocket ?? {
          open(ws: WebSocket) {
            console.log('Inside default websocket');
          },
          message(ws: WebSocket, msg: string | Buffer) {
            console.log(msg.toString());
          },
          close(ws: WebSocket) {
            console.log('Closed');
          },
        },
      },
      websocketconfig,
    );
    try {
      if (!bunserverinst) {
        bunserverinst = Bun.serve({ ...mergedwebsocketconfig });
      }
    } catch (e) {
      console.warn(e);
    }
  },
});
export default bunWSPlugin;
