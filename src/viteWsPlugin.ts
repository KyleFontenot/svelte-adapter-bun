import type { Server, } from 'bun';
import type { Plugin, ViteDevServer } from 'vite';
export type BunServe = Partial<typeof Bun.serve>;
export let bunserverinst: undefined | Server;
import { determineWebSocketHandler } from './determineWebsocketHandler';
import type { VitePluginOptions } from '..';
import deepMerge from './deepMerge';

// Vite plugin for the svelte-adapter-bun for having a working websocket in dev. 
// Requires connecting to an defined arbitrary port in the front-end for Websockets to work for now. 

const bunViteWSPlugin = async (passedOptions: VitePluginOptions): Promise<Plugin> => {
  const options = deepMerge<VitePluginOptions>({
    port: 10234,
    hmrPaths: [],
    ws: undefined,
    debug: false
  }, passedOptions)

  const portToUse = process.env?.PUBLIC_DEVWSPORT || 10234;
  const listeners = {};

  const websocketHandlerDetermined = await determineWebSocketHandler(
    {
      ws: options.ws,
      debug: options.debug
    });

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
    websocket: websocketHandlerDetermined,
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
      const watchFiles = [
        'vite.config.js',
        'vite.config.ts',
        'vitehmrplugin.ts',
        'vitehmrplugin.js',
        'hooks.server.ts',
        // ...options.hmrPaths
      ];
      const isConfigChange = watchFiles.some(configFile => file.endsWith(configFile));
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
  } as Plugin;
};
export default bunViteWSPlugin;
