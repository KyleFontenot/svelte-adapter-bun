import type { Server, WebSocketHandler, ServerWebSocket } from 'bun';
import type { Plugin, ViteDevServer } from 'vite';
import fs from "node:fs"
import path from "node:path"
export type BunServe = Partial<typeof Bun.serve>;
export let bunserverinst: undefined | Server;


interface VitePluginOptions {
  port?: number;
  hmrPaths?: string[];
  ws?: WebSocketHandler;
  wsPath?: string;
  debug: boolean
}

// Vite plugin for the svelte-adapter-bun for having a working websocket in dev. 
// Requires conditional ports for Websockets to work for now. 

const bunWSPlugin = async (options: VitePluginOptions = {
  port: 10234,
  hmrPaths: undefined,
  ws: undefined,
  debug: false
}): Promise<Plugin> => {
  const portToUse = process.env?.PUBLIC_DEVWSPORT || 10234;
  const listeners = {};

  const fallbackWebSocketHandler = {
    open(ws: ServerWebSocket) {
      console.log('Using default websocket');
      setTimeout(() => {
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
  }

  // type JSorTSFilePath = `${string}.js` | `${string}.ts`;

  async function determineWebSocketHandler(): Promise<WebSocketHandler> {
    // If options.ws is provided, use it directly
    if (options.ws) {
      return options.ws;
    }

    // Store the root directory of the user's project
    // In a Vite plugin, you should get this from Vite's config
    const projectRoot = process.cwd();

    // Check for hooks.server file in the user's project
    const hooksServerPath = path.resolve(projectRoot, 'src/hooks.server.ts');
    const hooksServerJsPath = path.resolve(projectRoot, 'src/hooks.server.js');

    // Try TypeScript file first
    if (fs.existsSync(hooksServerPath)) {
      try {
        // For Node.js ESM, we need to use the file:// protocol with absolute paths
        const hooksPathImport = await import(`file://${hooksServerPath}`);

        if (typeof hooksPathImport === 'object' && "handleWebsocket" in hooksPathImport) {
          options.debug && console.log('Using handleWebsocket from src/hooks.server.ts');
          return hooksPathImport.handleWebsocket;
        }
      } catch (e) {
        options.debug && console.warn('Error importing hooks.server.ts:', e);
      }
    }
    // Then try JavaScript file
    else if (fs.existsSync(hooksServerJsPath)) {
      try {
        const hooksPathImport = await import(`file://${hooksServerJsPath}`);

        if (typeof hooksPathImport === 'object' && "handleWebsocket" in hooksPathImport) {
          options.debug && console.log('Using handleWebsocket from src/hooks.server.js');
          return hooksPathImport.handleWebsocket;
        }
      } catch (e) {
        options.debug && console.warn('Error importing hooks.server.js:', e);
      }
    }

    // Check for websocket file
    const websocketTsPath = path.resolve(projectRoot, 'src/websocket.ts');
    const websocketJsPath = path.resolve(projectRoot, 'src/websocket.js');

    // Try TypeScript file first
    if (fs.existsSync(websocketTsPath)) {
      try {
        const srcWebSocketImport = await import(`file://${websocketTsPath}`);

        if (typeof srcWebSocketImport === 'object' && "default" in srcWebSocketImport) {
          options.debug && console.log('Using default export from src/websocket.ts');
          return srcWebSocketImport.default;
        }
      } catch (e) {
        options.debug && console.warn('Error importing src/websocket.ts:', e);
      }
    }
    // Then try JavaScript file
    else if (fs.existsSync(websocketJsPath)) {
      try {
        const srcWebSocketImport = await import(`file://${websocketJsPath}`);

        if (typeof srcWebSocketImport === 'object' && "default" in srcWebSocketImport) {
          options.debug && console.log('Using default export from src/websocket.js');
          return srcWebSocketImport.default;
        }
      } catch (e) {
        options.debug && console.warn('Error importing src/websocket.js:', e);
      }
    }

    // If we reach here, use fallback
    options.debug && console.log('Using fallback WebSocket handler');
    return fallbackWebSocketHandler;
  }

  const websocketHandlerDetermined = await determineWebSocketHandler();

  console.log('After full determination::', websocketHandlerDetermined.open.toString())

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
        ...options.hmrPaths
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
export default bunWSPlugin;
