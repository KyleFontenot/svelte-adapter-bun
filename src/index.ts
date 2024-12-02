import { serve } from 'bun';
import type { WebSocketHandler } from 'bun';
import { buildOptions, env } from './env.js';
import handlerDefault from './handler.js';
import { resolve } from 'node:path';

const hostname = env('HOST', '0.0.0.0');
const port = Number.parseInt(env('PORT', 3000));
const { httpServer } = await handlerDefault(buildOptions.assets ?? true);
let maybeWebsocket: unknown | WebSocketHandler;
try {
  // @ts-ignore
  const wsfileimport = await import(resolve("./build/server/websockets.js"));
  maybeWebsocket = wsfileimport.default
}
catch (e) {
  console.log("Problem reading the websocket file");
  console.log(e)
}

const serverOptions = {
  baseURI: env('ORIGIN', undefined),
  fetch: httpServer,
  hostname,
  port,
  development: env('SERVERDEV', buildOptions.development ?? false),
  websocket: maybeWebsocket ?? {
    open(ws) {
      console.log("Hey there")
    }
  },
  error(error) {
    console.error(error);
    return new Response('Uh oh!!', { status: 500 });
  },
};
console.info(`Listening on http://${`${hostname}:${port}`}`);
serve(serverOptions);
