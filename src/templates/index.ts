import { serve } from "bun"
// import type { Serve, ServeOptions } from "bun";
import {
  build_options,
  env,
} from "./handler.js";
import createFetch from "./handler.js"
// import "./mime.conf.js";
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

async function createServer(https = false) {
  let port = 80;
  if (!https) {
    if (dev) {
      port = env("HTTPS_PORT", 2045)
    }
    else {
      port = env("HTTPS_PORT", 443)
    }
  }
  else {
    if (dev) {
      port = env("PORT", 5173)
    }
    else {
      port = env("PORT", 80)
    }
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
    tls: tls ?? undefined
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
  // try {
  //   const fileURLToPath = await import("node:url").then(({ fileURLToPath }) => fileURLToPath);
  //   const watch = await import(fileURLToPath(new URL("server/tls.js", import.meta.url).href));

  // }
  // catch (e) {
  //   console.log("TLS build options enabled, but no built TLS handler found. ")
  // }
  Bun.serve(await createServer(true));
}
const http = serve(await createServer());
// http && console.info(`Listening on ${`${hostname}:${port}`} `);
http && console.info(`Listening on ${`${hostname}:${port}${tls ? ` and :${env("HTTPS_PORT", 443)}` : ""}`} `);

// Bun.serve(serverOptions);