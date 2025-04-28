import { exit } from "node:process";
import { serve } from "bun"
import buildOptions from "./buildoptions"
import {
  env,
} from "./handler.js";
import createFetch from "./handler.js"

const hostname = env("HOST", "0.0.0.0");
const dev = !!Bun.env?.DEV || Bun.env?.NODE_ENV === "development" || false;
const port = dev ? 5173 : Number.parseInt(env("PORT", 80));
const maxRequestBodySize = buildOptions.maxRequestSize ?? Number.parseInt(env("BODY_SIZE_LIMIT", 14244));
const tls = buildOptions.tls ?? buildOptions.ssl

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
    fetch: createFetch(buildOptions.assets ?? true, https),
    hostname,
    port: port,
    development: env("SERVERDEV", buildOptions.development ?? false),
    error(error: Error) {
      console.error(error);
      return new Response("Uh oh!!", { status: 500 });
    },
    websocket: await gatherWebSocketFile(),
    tls: https && tls ? {
      cert: Bun.file(tls.certPath),
      key: Bun.file(tls.keyPath),
      ca: tls?.caPath && Bun.file(tls.caPath)
    } : undefined
  }
}


let httpserver: Bun.Server | undefined = undefined;
let tlsserver: Bun.Server | undefined = undefined;

try {
  httpserver = serve(await createServerConfig(false));
}
catch (e) {
  console.warn(e)
  exit(1)
}

if (tls) {
  try {
    tlsserver = serve(await createServerConfig(true));
  }
  catch (e) {
    console.warn(e)
  }
  tlsserver && console.info(`Listening on ${`${hostname}:${port}${tls ? ` and :${env("HTTPS_PORT", 443)}` : ""}`} `);
}

httpserver && console.info(`Listening on ${`${hostname}:${port}${tls ? ` and :${env("HTTPS_PORT", 443)}` : ""}`} `);