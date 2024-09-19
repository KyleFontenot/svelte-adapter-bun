// @bun
import {
  handler_default
} from "./handler.js";

// src/index.js
var {serve } = globalThis.Bun;

// src/env.js
function env(name, fallback) {
  const prefixed = ENV_PREFIX + name;
  return prefixed in Bun.env ? Bun.env[prefixed] : fallback;
}
var expected = new Set([
  "HOST",
  "PORT",
  "ORIGIN",
  "XFF_DEPTH",
  "ADDRESS_HEADER",
  "PROTOCOL_HEADER",
  "HOST_HEADER",
  "SERVERDEV"
]);
var build_options = BUILD_OPTIONS;
if (ENV_PREFIX) {
  for (const name in Bun.env) {
    if (name.startsWith(ENV_PREFIX)) {
      const unprefixed = name.slice(ENV_PREFIX.length);
      if (!expected.has(unprefixed)) {
        throw new Error(`You should change envPrefix (${ENV_PREFIX}) to avoid conflicts with existing environment variables \u2014 unexpectedly saw ${name}`);
      }
    }
  }
}

// src/index.js
/*! MIT © Volodymyr Palamar https://github.com/gornostay25/svelte-adapter-bun */
var hostname = env("HOST", "0.0.0.0");
var port = Number.parseInt(env("PORT", 3000));
var { httpserver, websocket } = handler_default(build_options.assets ?? true);
var serverOptions = {
  baseURI: env("ORIGIN", undefined),
  fetch: httpserver,
  hostname,
  port,
  development: env("SERVERDEV", build_options.development ?? false),
  error(error) {
    console.error(error);
    return new Response("Uh oh!!", { status: 500 });
  }
};
console.info(`Listening on ${`${hostname}:${port}`}`);
serve(serverOptions);
