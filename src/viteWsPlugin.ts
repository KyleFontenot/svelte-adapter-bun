import type { ServeOptions, Server } from 'bun';
import type { Plugin, ViteDevServer } from 'vite';
export type BunServe = Partial<typeof Bun.serve>;
import type {WebSocketHandler} from 'bun';
import type { IncomingMessage } from "connect"
import { createProxyServer } from 'http-proxy';
import { WebSocket, WebSocketServer } from 'ws';
import type { VitePluginOptions } from '..';
import deepMerge from './deepMerge';
import { determineWebSocketHandler } from './determineWebSocketHandler';

function incomingMessageToRequestSync(req: IncomingMessage, targetUrl: string) {
  // Create headers object from IncomingMessage headers
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const v of value) {
       headers.append(key, v);
      }
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  // If it's a GET or HEAD request, we can return immediately
  if (req.method === 'GET' || req.method === 'HEAD') {
    return new Request(targetUrl, {
      method: req.method,
      headers: headers
    });
  }

  // For other methods, we need to read the body
  // Return a promise that resolves to the Request
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      const body = Buffer.concat(chunks);
      resolve(new Request(targetUrl, {
        method: req.method,
        headers: headers,
        body: body
      }));
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}


function checkRequestType(obj) {
  // Check if it's null or undefined
  if (obj == null) {
    return 'unknown';
  }

  // Check for IncomingMessage
  if (
    typeof obj.on === 'function' && // Event emitter
    typeof obj.headers === 'object' && // Has headers object
    typeof obj.socket === 'object' && // Has socket
    typeof obj.method === 'string' && // Has method as string property
    typeof obj.url === 'string' // Has url as string property
  ) {
    return 'IncomingMessage';
  }

  // Check for Fetch API Request
  if (
    obj instanceof Request || // Direct instance check
    (
      typeof obj.method === 'string' && // Has method string
      typeof obj.url === 'string' && // Has url string
      typeof obj.headers === 'object' && // Has headers
      typeof obj.headers.get === 'function' && // Headers has get method
      typeof obj.clone === 'function' // Has clone method
    )
  ) {
    return 'Request';
  }

  return 'unknown';
}

// Vite plugin for the svelte-adapter-bun for having a working websocket in dev. 
// Requires connecting to an defined arbitrary port in the front-end for Websockets to work for now. 

const bunViteWSPlugin =  (passedOptions: VitePluginOptions): Plugin | undefined  => {
  if(Bun.env.NODE_ENV !== "development") {
    return 
  }
  const options = deepMerge<VitePluginOptions>({
    port: 10234,
    hmrPaths: [],
    ws: undefined,
    debug: false
  }, passedOptions)

  const portToUse = process.env?.PUBLIC_DEVWSPORT ? Number.parseInt(process.env?.PUBLIC_DEVWSPORT) : 10234;
  const listeners = {};

  let bunserverinst: undefined | Server;

  return determineWebSocketHandler(
    {
      ws: options.ws,
      debug: options.debug
    }).then(( wsconfig: WebSocketHandler ) => {
  const bunconfig: ServeOptions = {
    port: portToUse,
    fetch: (req: Request, server?: Server) => {
      console.log('Fetch method comprehensive debug:', {
        reqUrl: req.url,
        serverExists: !!server,
        bunserverinst: !!bunserverinst,
        headers: Object.fromEntries(req.headers)
      });

      // Check for WebSocket upgrade
      const connectionHeader = req.headers.get('connection');
      const upgradeHeader = req.headers.get('upgrade');
      const isWebSocketUpgrade =
        connectionHeader?.toLowerCase().includes('upgrade') &&
        upgradeHeader?.toLowerCase() === 'websocket';

      if (isWebSocketUpgrade) {
        console.log('WebSocket Upgrade Detected', {
          connectionHeader,
          upgradeHeader
        });

        // Use either passed server or global bunserverinst
        const serverToUse = server || bunserverinst;

        if (!serverToUse) {
          console.error('No server instance available for WebSocket upgrade');
          return new Response(JSON.stringify({
            error: 'No server instance',
            details: 'Unable to find a valid server for WebSocket upgrade'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (typeof serverToUse.upgrade !== 'function') {
          console.error('Upgrade method not available on server instance');
          return new Response(JSON.stringify({
            error: 'Upgrade method unavailable',
            details: 'Server instance does not have an upgrade method'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        try {
          console.log('Attempting WebSocket Upgrade');
          const upgradeResult = serverToUse.upgrade(req, {
            data: {
              url: req.url,
              client: req.headers.get('origin'),
              headers: req.headers,
              listeners,
              requester: serverToUse.requestIP?.(req),
            },
          });

          // If upgrade successful, return a dummy response to satisfy fetch requirement
          if (upgradeResult) {
            return new Response(null, { status: 101 }); // Switching Protocols
          }

          console.error('WebSocket upgrade returned false');
          return new Response(JSON.stringify({
            error: 'Upgrade failed',
            details: 'Server upgrade method returned false',
            headers: Object.fromEntries(req.headers)
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('WebSocket upgrade error:', error);
          return new Response(JSON.stringify({
            error: 'Upgrade exception',
            details: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // Handle regular HTTP requests
      return new Response('Not Found', { status: 404 });
    },
    // ... rest of the configuration remains the same
    websocket: wsconfig,
    listeners,
  };

    bunserverinst = Bun.serve(bunconfig);

    
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
          if (res.writeHead) {
            res.writeHead(500, {
              'Content-Type': 'text/plain',
            });
          }
          if (res.end) {
            res.end('Proxy error');
          }
        } catch (writeErr) {
          console.error('Error writing error response:', writeErr);
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

    });


};
export default bunViteWSPlugin;
