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
    console.log(msg);
  },
  close(ws: ServerWebSocket) {
    console.log('Closed');
  },
}

interface PassedOptions {
  ws: WebSocketHandler | undefined,
  debug: boolean
}

export async function determineWebSocketHandler(passedOptions: PassedOptions): Promise<WebSocketHandler> {
  try {
    const options = deepMerge({ ws: undefined, debug: false }, passedOptions);
    if (options.ws) {
      return options.ws;
    }

    const projectRoot = process.cwd();

    // Check for hooks.server file in the user's project
    try {
      const hooksServerPath = path.resolve(projectRoot, 'src/hooks.server.ts');
      const exists = fs.existsSync(hooksServerPath);
      if (exists) {
        try {
          // For Node.js ESM, we need to use the file:// protocol with absolute paths
          const hooksPathImport = await import(`file://${hooksServerPath}`);
          if (typeof hooksPathImport === 'object' && "handleWebsocket" in hooksPathImport) {
            return hooksPathImport.handleWebsocket;
          }
        } catch (e) {
          console.error('Error importing hooks.server.ts:', e);
        }
      }
    } catch (e) {
      console.error("Error checking hooks.server.ts:", e);
    }

    // Then try JavaScript file
    try {
      const hooksServerJsPath = path.resolve(projectRoot, 'src/hooks.server.js');
      const exists = fs.existsSync(hooksServerJsPath);
      if (exists) {
        try {
          const hooksPathImport = await import(`file://${hooksServerJsPath}`);
          if (typeof hooksPathImport === 'object' && "handleWebsocket" in hooksPathImport) {
            return hooksPathImport.handleWebsocket;
          }
        } catch (e) {
          console.error('Error importing hooks.server.js:', e);
        }
      }
    } catch (e) {
      console.error("Error checking hooks.server.js:", e);
    }

    // Websocket.ts file check
    try {
      const websocketTsPath = path.resolve(projectRoot, 'src/websockets.ts');
      const exists = fs.existsSync(websocketTsPath);
      if (exists) {
        try {
          const srcWebSocketImport = await import(`file://${websocketTsPath}`);
          if (typeof srcWebSocketImport === 'object' && "default" in srcWebSocketImport) {
            return srcWebSocketImport.default;
          }
        } catch (e) {
          console.error('Error importing websockets.ts:', e);
        }
      }
    } catch (e) {
      console.error("Error checking websockets.ts:", e);
    }

    // Final fallback
    console.log("No custom handlers found, using fallback WebSocket handler");
    return fallbackWebSocketHandler;
  } catch (mainError) {
    console.error("Critical error in determineWebSocketHandler:", mainError);
    return fallbackWebSocketHandler;
  }
}