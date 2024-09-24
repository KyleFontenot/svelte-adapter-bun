/*! MIT © Volodymyr Palamar https://github.com/gornostay25/svelte-adapter-bun */
import { serve } from 'bun';
import { buildOptions, env } from './env.js';
import handlerDefault from './handler.js';

const hostname = env('HOST', '0.0.0.0');
const port = Number.parseInt(env('PORT', 3000));
const { httpServer } = await handlerDefault(buildOptions.assets ?? true);
let maybeWebsocket: unknown;
try {
  // @ts-ignore
  maybeWebsocket = await import("./server/websocket.js");
}
catch (e) {

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
console.info(`Listening on ${`${hostname}:${port}`}`);
serve(serverOptions);
