import { serve } from "bun"
import {
  build_options,
  env,
} from "./handler.js";
import createFetch from "./handler.js"

const hostname = env("HOST", "0.0.0.0");
const dev = !!Bun.env?.DEV || Bun.env?.NODE_ENV === "development" || false;
const port = dev ? 5173 : Number.parseInt(env("PORT", 80));
const maxRequestBodySize = Number.parseInt(env("BODY_SIZE_LIMIT", 10244));
const tls = build_options.tls ?? build_options.ssl

// const { httpServer } = createFetch(build_options.assets ?? true, false);

const gatherWebSocketFile = async () => {
  try {
    const fileURLToPath = await import("node:url").then(({ fileURLToPath }) => fileURLToPath);
    
    const handler = await import(fileURLToPath(new URL("server/websockets.js", import.meta.url).href));
    return handler.default
  }
  catch (e) {
    console.log("No websocket handler found")
    return undefined
  }
}

async function createServerConfig(https = false) {
  let port = 80;
  if (https) {
    port = dev ? env("HTTPS_PORT", 2045) : env("HTTPS_PORT", 443)
  }
  else {
    port = dev ? env("PORT", 5173) : env("PORT", 80)
  }

  return {
    // base: env("ORIGIN", "0.0.0.0"),
    maxRequestBodySize: Number.isNaN(maxRequestBodySize) ? undefined : maxRequestBodySize,
    fetch: createFetch(build_options.assets ?? true, https),
    hostname,
    port: dev ? 5173 : port,
    development: env("SERVERDEV", build_options.development ?? false),
    error(error: Error) {
      console.error(error);
      return new Response("Uh oh!!", { status: 500 });
    },
    websocket: await gatherWebSocketFile(),
    tls: tls ? {
      cert: Bun.file(tls.certPath),
      key: Bun.file(tls.keyPath),
      ca: tls?.caPath && Bun.file(tls.caPath)
    } : undefined
  }
}

// const serverOptions = {
//   baseURI: env("ORIGIN", "0.0.0.0"),
//   maxRequestBodySize: Number.isNaN(maxRequestBodySize) ? undefined : maxRequestBodySize,
//   fetch: httpServer,
//   hostname,
//   port,
//   development: env("SERVERDEV", build_options.development ?? false),
//   error(error) {
//     console.error(error);
//     return new Response("Uh oh!!", { status: 500 });
//   },
//   // websockets,
//   websocket: await (async () => {
//     try {
//       const fileURLToPath = await import("node:url").then(({ fileURLToPath }) => fileURLToPath);
//       const handler = await import(fileURLToPath(new URL("server/websockets.js", import.meta.url).href));
//       return handler.default
//     }
//     catch (e) {
//       console.log("No websocket handler found")
//       return undefined
//     }
//   })()
// };


if (tls) {
  Bun.serve(await createServerConfig(true));
}
const http = serve(await createServerConfig());
http && console.info(`Listening on ${`${hostname}:${port}${tls ? ` and :${env("HTTPS_PORT", 443)}` : ""}`} `);