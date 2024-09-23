/*! MIT © Volodymyr Palamar https://github.com/gornostay25/svelte-adapter-bun */
import { serve } from 'bun';
import { buildOptions, env } from './env.js';
import handler from './handler.js';

const hostname = env('HOST', '0.0.0.0');
const port = Number.parseInt(env('PORT', 3000));

const { fetch, websocket } = await handler(buildOptions.assets ?? true);

const serverOptions = {
  baseURI: env('ORIGIN', undefined),
  fetch,
  hostname,
  port,
  development: env('SERVERDEV', buildOptions.development ?? false),
  websocket,
  error(error) {
    console.error(error);
    return new Response('Uh oh!!', { status: 500 });
  },
};

// websocket && Object.defineProperty(serverOptions, 'websocket', websocket);

console.info(`Listening on ${`${hostname}:${port}`}`);
serve(serverOptions);
