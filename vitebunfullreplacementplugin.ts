import type { ViteDevServer, Plugin, InlineConfig } from "vite";
import type { Server, WebSocketServeOptions, WebSocketHandler, ServerWebSocket } from "bun";
// import { WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
// import { copyFileSync, readFileSync } from "node:fs"
// import * as elysiaConnectPlugin from "elysia-connect-middleware";
// import { vite as ElysiaVitePlugin } from "elysia-vite-server"
import { createRequest, createResponse } from "node-mocks-http";
import { staticPlugin } from "@elysiajs/static";
import { ServerResponse } from "node:http";
import { getRequest } from "./vitebunUtils"

export type BunServe = Partial<typeof Bun.serve>;

export let bunserverinst: undefined | Partial<Server>;

const outDir = "build";

import { Elysia } from "elysia";
import { vite as elysiaVitePlugin, vite } from "elysia-vite-server";
// import type { ViteOptions } from "elysia-vite-server";
// import { staticPlugin } from "@elysiajs/static";
// import type { InlineConfig } from "vite";

function transformRequestToIncomingMessage(
  request: Request,
  options?: unknown,
) {
  const parsedURL = new URL(request.url, "http://localhost");
  const query = {};
  for (const [key, value] of parsedURL.searchParams.entries()) {
    query[key] = value;
  }
  const message = createRequest({
    method: request.method.toUpperCase(),
    url: parsedURL.pathname,
    headers: request.headers.toJSON(),
    query,
    body: request.body,
    ...options,
  });
  return message;
}
function transformResponseToServerResponse(serverResponse) {
  return new Response(
    serverResponse._getData() || serverResponse._getBuffer(),
    {
      status: serverResponse.statusCode,
      statusText: serverResponse.statusMessage,
      // @ts-expect-error
      headers: serverResponse.getHeaders(),
    },
  );
}

const convertIncomingMessageToRequest = (req: IncomingMessage): Request => {
  var headers = new Headers();
  for (var key in req.headers) {
    if (req.headers[key]) headers.append(key, req.headers[key] as string);
  }
  let request = new Request(req.url, {
    method: req.method,
    body: req.method === 'POST' ? req.body : null,
    headers,
  })
  return request
}

const isProduction = process.env.NODE_ENV === "production";
const port = process.env.PORT || 5173;
const base = process.env.BASE || "/";

// let templateHtml: string;
const templateHtml = isProduction
  ? `./${outDir}/app.html`
  : "./.svelte-kit/bundevplugin/app.html";
let ssrManifest: undefined | string;

let customVite: ViteDevServer | undefined;


const bunViteWSPlugin = async (
  wsHandler?: WebSocketHandler,
): Promise<Plugin> => {
  return {
    name: "bun-adapter-websockets",
    async configureServer(viteServer: ViteDevServer) {
      // const viteServer = await createViteServer({
      //   server: { middlewareMode: true },
      //   appType: "custom",
      // });

      const app = new Elysia({
        name: "vite",
        seed: viteServer.middlewares,
      })
        .decorate("vite", viteServer)
        .use(
          staticPlugin({
            assets: "static",
          }),
        )
        .onRequest(async ({ request, set, vite, error }) => {
          const message = transformRequestToIncomingMessage(request);
          // console.log("Transformed message?? ::", message);
          message.app = vite.middlewares;
          const response = createResponse();
          const end = response.end;
          const webResponse = transformResponseToServerResponse(response);
          // Still packaging a mock response
          response.end = (...args) => {
            const call = end.call(response, ...args);
            return call;
          };
          vite.middlewares.handle(message, response, () => {
            // Ran if it didn't handle correctly
            const webResponse = transformResponseToServerResponse(response);
            webResponse.headers.forEach((value, key) => {
              set.headers[key] = value;
            });
            set.status = webResponse.status;
            console.log("Retuning void becuase the middleware stack didnt work?");
            // resolve(void 0);
          });
          const template = await Bun.file("./src/app.html").text();
          // vite.ssrTransform()
          const loadedmodule = await vite.ssrLoadModule(request.url)
          const transformed = await vite.transformIndexHtml(request.url, template);

          console.log(transformed);

          try {
            let template: string | undefined;
            let render: undefined | ((any, any2) => unknown);
            if (vite !== undefined) {
              template = await Bun.file("./app.html").text();
              template = await viteServer.transformIndexHtml(request.url, template);
              render = (
                await viteServer.ssrLoadModule("/.svelte-kit/output/index.js")
              ).render_response;
            } else {
              template = templateHtml;
              render = (await import(`./${outDir}/server/index.js`))
                .render_response;
            }
            const rendered = render && (await render(request.url, ssrManifest));

            return new Response(rendered, {
              headers: {
                "Content-Type": "text/html",
              },
            });
          } catch (e) {
            if (e instanceof Error) {
              viteServer?.ssrFixStacktrace(e);
              console.log(e.stack);
              set.status = 500;

              return e.stack;
            } else console.log(e);
          }
        }
        )
        .listen(5173, console.log);
    },
  };
};
export default bunViteWSPlugin;
