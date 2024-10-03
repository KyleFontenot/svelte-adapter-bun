import type { ViteDevServer, Plugin, InlineConfig } from "vite";
import type { Server, WebSocketHandler, ServerWebSocket } from "bun";
// import { WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
// import { copyFileSync, readFileSync } from "node:fs"
// import * as elysiaConnectPlugin from "elysia-connect-middleware";
// import { vite as ElysiaVitePlugin } from "elysia-vite-server"
import { createRequest, createResponse } from "node-mocks-http";
import { staticPlugin } from "@elysiajs/static";
// import { ServerResponse } from "node:http";
// import { getRequest } from "./vitebunUtils"
// import { createHash, update as cryptoUpdate, digest } from "node:crypto"
import crypto from "node:crypto"

import type { IncomingMessage } from "node:http"

export type BunServe = Partial<typeof Bun.serve>;

export let bunserverinst: undefined | Server | Elysia;

const outDir = "build";

import { Elysia } from "elysia";
import { vite as elysiaVitePlugin, vite } from "elysia-vite-server";
import { loadSvelteConfig } from "@sveltejs/vite-plugin-svelte";
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

const transformIncomingMessageToRequest = (req: IncomingMessage): Request => {
  var headers = new Headers();
  for (var key in req.headers) {
    if (req.headers[key]) headers.append(key, req.headers[key] as string);
  }
  let request = new Request(req.headers['origin'], {
    method: req.method,
    body: req.method === 'POST' ? req.body : null,
    headers,
  })
  return request
}
function createWebSocketResponse(request: Request) {
  // Check that the request is a valid WebSocket handshake
  const { headers } = request;
  console.log(headers)
  // const acceptKey = headers['sec-websocket-key'];
  const acceptKey = headers.get('sec-websocket-key');

  if (!acceptKey) {
    throw new Error('Invalid WebSocket handshake: sec-websocket-key missing');
  }
  const acceptValue = createAcceptValue(acceptKey);
  const responseHeaders = {
    // 'HTTP/1.1': '101 Switching Protocols',
    'Upgrade': 'websocket',
    'Connection': 'Upgrade',
    'Sec-WebSocket-Accept': acceptValue,
  };
  // for (let [headerkey, headerprop] of Object.entries(responseHeaders)){
  //   headers.set(headerkey, headerprop)
  // }
  // console.log(headers)

  // Join headers into a single response string
  const response = Object.entries(responseHeaders)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\r\n') + '\r\n\r\n';

  return responseHeaders;
  // return headers;
}

function createAcceptValue(acceptKey: string) {
  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  const hash = crypto
    .createHash('sha1')
    .update(acceptKey + GUID)
    .digest('base64');
  return hash;
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
    async configureServer(defaultserver: ViteDevServer) {
      // const viteServer = await createViteServer({
      //   server: { middlewareMode: true },
      //   appType: "spa",
      // });
      // defaultserver.config.server.middlewareMode = true
      // defaultserver.config.appType = 'spa'
      // defaultserver.config.server.port = 5174
      defaultserver.config.server.port = 5174
      defaultserver.config.server.hmr = {
        // host: 'localhost:10234', 
        clientPort: 5174,
        port: 10234,
        protocol: 'ws',
        overlay: true
      }

      //@ts-expect-error
      bunserverinst = Bun.serve({
        unix: "/tmp/my-socket.sock",
        development: true, //Used for logging errors
        fetch: ((req: Request, server: Server) => {
          console.log("Received a response from the unix server")
          console.log(req)
          if (
            req.headers.get("upgrade")?.toLowerCase() === "websocket"
            && req.headers.get('sec-websocket-key')
          ) {
            console.log("Upgrade init")
            // const upgradeconnection = server.upgrade(req, {
            //
            // })
            // console.log(upgradeconnection)
            const websocketresponse = createWebSocketResponse(req)
            console.log(websocketresponse)

            Bun.fetch(req.headers.get('origin'), { headers: websocketresponse })
          }
          else { return }
        }),
        websocket: wsHandler ?? {
          open(ws) {
            console.log("opened websocket")
            // this works!
          },
          message(ws, msg) {
            console.log(msg)
          }
        }
      });
      defaultserver.httpServer.on('upgrade', (req) => {
        // console.log("got an upgrade!!")
        // console.log("incoming message is:: ", req.headers)
        const newrequest = transformIncomingMessageToRequest(req);
        // console.log("Request before sending to bunserver::", newrequest);
        Bun.fetch(req.headers['origin'], {
          unix: "/tmp/my-socket.sock",
          headers: req.headers
        })
      })

      // defaultserver.middlewares.use((req, res, next) => {
      //   // console.log(req.headers.connection)
      //   if (
      //     req.headers["connection"]?.toLowerCase().includes("upgrade") &&
      //     req.headers["upgrade"]?.toLowerCase() === "websocket"
      //   ) {
      //     console.log("Upgrade init")
      //   }
      //   else {
      //     next()
      //   }
      // })


      // bunserverinst = new Elysia({
      //   name: "vite",
      //   seed: defaultserver.middlewares,
      // })
      //   .decorate("vite", defaultserver.middlewares)
      //   // .use(
      //   //   staticPlugin({
      //   //     assets: "static",
      //   //   }),
      //   // )
      //   .ws('*', wsHandler ?? {
      //     open(ws) {
      //       console.log("opened websocket")
      //       // this works!
      //     },
      //     message(ws, msg) {
      //       console.log(msg)
      //     }
      //   })
      //   .onRequest(async (controller) => {
      //     const { request, set, vite, error } = controller
      //     console.log("Hey there")
      //     console.log("Adding another request")
      //     return await new Promise<Response | undefined>((resolve) => {
      //       const message = transformRequestToIncomingMessage(request);
      //       // @ts-expect-error
      //       message.app = vite;
      //       const response = createResponse();
      //       const end = response.end;
      //       // @ts-expect-error
      //       response.end = (...args: Parameters<typeof response.end>) => {
      //         const call = end.call(response, ...args);
      //         const webResponse = transformResponseToServerResponse(response);
      //         // if (response.writableEnded)
      //         resolve(webResponse);
      //         return call;
      //       };
      //       vite.handle(message, response, () => {
      //         const webResponse = transformResponseToServerResponse(response);
      //         webResponse.headers.forEach((value, key) => {
      //           set.headers[key] = value;
      //         });
      //         set.status = webResponse.status;
      //
      //         resolve(undefined);
      //         // resolve(webResponse);
      //       });
      //     });
      //   })
      //   .listen(5173);
      // const message = transformRequestToIncomingMessage(request);
      // // console.log("Transformed message?? ::", message);
      // message.app = vite.middlewares;
      // const response = createResponse();
      // const end = response.end;
      // const webResponse = transformResponseToServerResponse(response);
      // // Still packaging a mock response
      // response.end = (...args) => {
      //   const call = end.call(response, ...args);
      //   return call;
      // };
      // vite.middlewares.handle(message, response, () => {
      //   // Ran if it didn't handle correctly
      //   const webResponse = transformResponseToServerResponse(response);
      //   webResponse.headers.forEach((value, key) => {
      //     set.headers[key] = value;
      //   });
      //   set.status = webResponse.status;
      //   console.log("Retuning void becuase the middleware stack didnt work?");
      //   // resolve(void 0);
      // });
      // const template = await Bun.file("./src/app.html").text();
      // // vite.ssrTransform()
      // const loadedmodule = await vite.ssrLoadModule(request.url)
      // const transformed = await vite.transformIndexHtml(request.url, template);
      //
      // console.log(transformed);
      //
      // try {
      //   let template: string | undefined;
      //   let render: undefined | ((any, any2) => unknown);
      //   if (vite !== undefined) {
      //     template = await Bun.file("./app.html").text();
      //     template = await vite.transformIndexHtml(request.url, template);
      //     // render = (
      //     //   await viteServer.ssrLoadModule("/.svelte-kit/output/index.js")
      //     // ).render_response;
      //   } else {
      //     template = templateHtml;
      //     //   render = (await import(`./${outDir}/server/index.js`))
      //     //     .render_response;
      //     // }
      //     const rendered = render && (await render(request.url, ssrManifest));
      //
      //     return new Response("hello", {
      //       headers: {
      //         "Content-Type": "text/html",
      //       },
      //     });
      //   }
      // } catch (e) {
      //   if (e instanceof Error) {
      //     vite?.ssrFixStacktrace(e);
      //     console.log(e.stack);
      //     set.status = 500;
      //
      //     return e.stack;
      //   } else console.log(e);
      // }
    },
  };
};
export default bunViteWSPlugin;
