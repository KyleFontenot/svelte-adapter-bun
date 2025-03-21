import type { WebSocketHandler, ServerWebSocket } from 'bun';
import fs from "node:fs"
import path from "node:path"
import deepMerge from './deepMerge';

export const fallbackWebSocketHandler = {
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
    // console.log(msg.toString());
    console.log(msg);
  },
  close(ws: ServerWebSocket) {
    console.log('Closed');
  },
}

interface PassedOptions {
  ws: WebSocketHandler | undefined,
  debug?: boolean
}

export async function determineWebSocketHandler(passedOptions: PassedOptions): Promise<WebSocketHandler> {
  const options = deepMerge<PassedOptions>({ ws: undefined, debug: false }, passedOptions);

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
  console.log('FInal websocket handler equated', fallbackWebSocketHandler);
  return fallbackWebSocketHandler;
}