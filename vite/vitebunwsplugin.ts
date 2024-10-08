import type { Server, WebSocketHandler, ServerWebSocket } from 'bun';
import type { Plugin, ViteDevServer } from 'vite';
export type BunServe = Partial<typeof Bun.serve>;
export let bunserverinst: undefined | Server;

// Vite plugin for the svelte-adapter-bun for having a working websocket in dev. 
// Requires conditional ports for Websockets to work for now. 

// @ts-ignore
const fromHooks = (await import('./src/hooks.server'))?.handleWebsocket;

const bunWSPlugin = (customWsHandler?: WebSocketHandler): Plugin => {
  const portToUse = process.env?.PUBLIC_DEVWSPORT || 10234;
  const listeners = {};

  const bunconfig = {
    port: portToUse,
    fetch: (req: Request, server: Server) => {
      if (
        req.headers.get('connection')?.toLowerCase().includes('upgrade') &&
        req.headers.get('upgrade')?.toLowerCase() === 'websocket'
      ) {
        server.upgrade(req, {
          data: {
            url: req.url,
            client: req.headers.get('origin'),
            headers: req.headers,
            listeners,
            requester: server.requestIP(req),
          },
        });
      }
    },
    websocket: fromHooks ||
      customWsHandler || {
      open(ws: ServerWebSocket) {
        console.log('Inside default websocket');
        setTimeout(() => {
          console.log('trying to send to clinet');
          ws.send(
            JSON.stringify({
              message: 'Sending from server',
            }),
          );
        }, 1500);
      },
      message(ws: ServerWebSocket, msg: string | Buffer) {
        console.log(msg.toString());
      },
      close(ws: ServerWebSocket) {
        console.log('Closed');
      },
    },
    listeners,
  };

  return {
    name: 'bun-adapter-websockets',
    async configureServer(server: ViteDevServer) {
      Object.assign(
        {
          protocol: 'ws',
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
    handleHotUpdate({ file, server }) {
      const configFiles = [
        'vite.config.js',
        'vite.config.ts',
        'vitehmrplugin.ts',
        'vitehmrplugin.js',
        'hooks.server.ts',
      ];
      const isConfigChange = configFiles.some(configFile => file.endsWith(configFile));
      if (isConfigChange) {
        bunserverinst?.stop();
        bunserverinst = undefined;
        server.ws.send({
          type: 'full-reload',
          path: '*',
        });
        return [];
      }
    },
  };
};
export default bunWSPlugin;
