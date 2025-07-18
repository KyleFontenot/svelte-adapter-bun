import {
  build_options,
  env,
} from "./handler.js";
import handler from "./handler.js"
// import "./mime.conf.js";

const { serve } = globalThis.Bun;
const hostname = env("HOST", "0.0.0.0");
const port = build_options.port ?? Number.parseInt(env("PORT", 3000));
const maxRequestBodySize = Number.parseInt(env("BODY_SIZE_LIMIT", undefined));
const { httpServer } = handler(build_options.assets ?? true);
const serverOptions = {
  baseURI: env("ORIGIN", undefined),
  maxRequestBodySize: Number.isNaN(maxRequestBodySize) ? undefined : maxRequestBodySize,
  fetch: httpServer,
  hostname,
  port,
  development: env("SERVERDEV", build_options.development ?? false),
  error(error: Error) {
    console.error(error);
    return new Response("Uh oh!!", { status: 500 });
  },
  // websockets,
  websocket: await (async () => {
    try {
      const fileURLToPath = await import("node:url").then(({ fileURLToPath }) => fileURLToPath);
      const handler = await import(fileURLToPath(new URL("server/websockets.js", import.meta.url).href));
      return handler.default
    }
    catch (e) {
      console.log("No websocket handler found")
      return undefined
    }
  })()
};
console.info(`Listening on ${`${hostname}:${port}`} `);
serve(serverOptions);