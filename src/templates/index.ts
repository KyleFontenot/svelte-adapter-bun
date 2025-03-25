import {
  build_options,
  env,
} from "./handler.js";
import handler from "./handler.js"
// import "./mime.conf.js";

const { serve } = globalThis.Bun;
const hostname = env("HOST", "0.0.0.0");
const port = Number.parseInt(env("PORT", 3000));
const maxRequestBodySize = Number.parseInt(env("BODY_SIZE_LIMIT", undefined));
const { httpServer, websocket } = handler(build_options.assets ?? true);
const serverOptions = {
  baseURI: env("ORIGIN", undefined),
  maxRequestBodySize: Number.isNaN(maxRequestBodySize) ? undefined : maxRequestBodySize,
  fetch: httpServer,
  hostname,
  port,
  development: env("SERVERDEV", build_options.development ?? false),
  error(error) {
    console.error(error);
    return new Response("Uh oh!!", { status: 500 });
  }
};
if (websocket) {
  serverOptions.websocket = websocket;
}
console.info(`Listening on ${`${hostname}:${port}`} ${websocket ? ' (Websocket)' : ""}`);
serve(serverOptions);