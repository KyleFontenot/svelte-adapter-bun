import fs from "node:fs"
import type Module from "node:module";
import path from "node:path"
import { fileURLToPath } from 'node:url';
import type { ServerWebSocket, WebSocketHandler } from 'bun';
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
  outDir?: string;
  ws?: WebSocketHandler | string,
  debug: boolean
}

export function relativeFilePath(filepath: string) {
  return fileURLToPath(new URL(filepath, import.meta.url))
}

export function getSvelteProjectRoot() {
  const stack = new Error().stack;
  const stackLines = stack?.split('\n') || [];

  // Look through more of the stack to find project files
  for (let i = 2; i < stackLines.length; i++) {
    const line = stackLines[i];
    // Skip any lines that are part of the adapter package
    if (line.includes('svelte-adapter-bun')) {
      continue;
    }
    // Extract file path from this stack line
    const filePathMatch = line.match(/\((.+?):\d+:\d+\)/) ||
      line.match(/at\s+(.+?):\d+:\d+/);

    if (filePathMatch?.[1]) {
      const filePath = filePathMatch[1];

      // If this path includes typical project files, use it
      if (filePath.includes('svelte.config') ||
        !filePath.includes('node_modules')) {
        return path.dirname(filePath);
      }
    }
  }
  // Fallback: try to find svelte.config.js by traversing up from cwd
  let dir = process.cwd();
  while (dir !== '/') {
    if (fs.existsSync(path.join(dir, 'svelte.config.js')) ||
      fs.existsSync(path.join(dir, 'svelte.config.ts'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}


export async function determineWebSocketHandler(passedOptions: PassedOptions): Promise<WebSocketHandler> {
  try {
    const options = deepMerge<{ ws?: WebSocketHandler | string, debug: boolean, outDir?: string }>({ ws: undefined, debug: false }, passedOptions);

    if (options.ws instanceof Object && "open" in options.ws) {
      return options.ws;
    }
    const projectRoot = process.cwd();

    if (typeof options.ws === 'string') {
      let handler: Module;
      if (options.ws.startsWith('file://') || options.ws.startsWith('http://') && options.ws.startsWith('https://')) {
        handler = await import(options.ws);
      }
      else if (options.ws.startsWith('.')) {
        handler = await import(path.resolve(getSvelteProjectRoot(), options.ws));
      }
      else if (options.ws.startsWith('/')) {
        handler = await import(options.ws);
      }
      else {
        handler = await import(path.resolve(projectRoot, options.ws));
      }
      return (handler as unknown as { default: WebSocketHandler }).default;
    }

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

    console.log("No custom handlers found, using fallback WebSocket handler");
    return fallbackWebSocketHandler;
  } catch (mainError) {
    console.error("Critical error in determineWebSocketHandler:", mainError);
    return fallbackWebSocketHandler;
  }
}