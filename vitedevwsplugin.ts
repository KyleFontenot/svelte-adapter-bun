import type { ViteDevServer, Plugin } from "vite";
import type { Server, WebSocketServeOptions, WebSocketHandler } from "bun";
// import { WebSocketServer } from "ws";
import { createServer as createViteServer } from 'vite'
import { readFileSync } from "node:fs"
// import { Elysia, t } from 'elysia';

export type BunServe = Partial<typeof Bun.serve>

export let bunserverinst: undefined | Partial<Server>;

const sym = "websocket.server";




import { Elysia } from "elysia";
import { vite } from "elysia-vite-server";

const isProduction = process.env.NODE_ENV === "production";
// Cached production assets
const templateHtml = isProduction ? await Bun.file("./index.html").text() : "";
const ssrManifest = isProduction
  ? await Bun.file("./index.html").text()
  : undefined;

new Elysia()
  .use(
    vite({
      static: {
        assets: "./dist/client",
        alwaysStatic: false,
        noCache: true,
      },
    })
  )
  .all("*", async ({ vite, request, set }) => {
    try {
      let template: string | undefined;
      let render: any;
      if (vite) {
        // Always read fresh template in development
        template = await Bun.file("./index.html").text();

        template = await vite.transformIndexHtml(request.url, template);
        render = (await vite.ssrLoadModule("/src/entry-server.js"))
          .render;
      } else {
        template = templateHtml;
        render = (await import("./dist/server/entry-server.js")).render;
      }

      const rendered = await render(request.url, ssrManifest);

      const html = template
        .replace("<!--app-head-->", rendered.head ?? "")
        .replace("<!--app-html-->", rendered.html ?? "");

      return new Response(html, {
        headers: {
          "Content-Type": "text/html",
        },
      });
    } catch (e) {
      if (e instanceof Error) {
        vite?.ssrFixStacktrace(e);
        console.log(e.stack);
        set.status = 500;

        return e.stack;
      } else console.log(e);
    }
  })
  .listen(5173, console.log);







// async function createServer() {
//   const app = new Elysia();

//   // Create Vite server in middleware mode
//   const vite = await createViteServer({
//     server: { middlewareMode: true },
//     appType: 'custom', // don't include Vite's default HTML handling middlewares
//   })

//   // Use vite's connect instance as middleware
//   app.use(vite.middlewares)
//   // app.get('*', (controller) => {

//   //   console.log("Got a elysia mesasge")
//   // })
//   // app.get('/', () => {
//   //   console.log("Got a elysia mesasge")
//   // })
//   app.listen(5173)
// }
// createServer()

















// const bunWSPlugin = (websocketconfig: WebSocketHandler): Plugin => {

//   let command: "build" | 'dev' = 'dev';
//   let root: string;
//   return {
//     name: "bun-adapter-websockets",

//     async configureServer(server: ViteDevServer) {

//       console.log("ANyone home???");
//       const app = new Elysia();

//       // Create Vite server in middleware mode
//       const vite = await createViteServer({
//         server: { middlewareMode: true },
//         appType: 'custom', // don't include Vite's default HTML handling middlewares
//       })

//       // Use vite's connect instance as middleware
//       app.use(vite.middlewares)
//       app.get('/', () => {
//         console.log("Got a elysia mesasge")
//       })
//       app.listen(5173)
//       // console.log("ANyone home???");



//       // app.use('*', async (req, res) => {
//       // })


//       // ------------------------------


//       // configResolved(config) {
//       //   command = config.command;
//       //   root = config.root;
//       // },
//       // configureServer(srv) {
//       //   const { httpServer } = srv
//       //   globalThis[Symbol.for(sym)] = new WebSocketServer({ server: httpServer });
//       // },
//       // configurePreviewServer({ httpServer }) {
//       //   globalThis[Symbol.for(sym)] = new WebSocketServer({ server: httpServer });
//       // },
//       // load(file) {
//       //   if (command !== "build" && file === `${root}/src/hooks.server.ts`) {
//       //     const lines = readFileSync(file, "utf-8").split("\n");
//       //     lines.push(`handleWs(globalThis[Symbol.for('${sym}')]);`);

//       //     return { code: lines.join("\n") };
//       //   }

//       // ------------------------------

//       // configureServer(server: ViteDevServer) {
//       //   const portToUse = process.env?.WSPORT || 10234;

//       //   server.config.server = {
//       //     // host: process.env.ORIGIN,
//       //     // port: 0,
//       //     // strictPort: true,
//       //     hmr: {
//       //       host: process.env.ORIGIN,
//       //       port: 10234,
//       //       server: () => {

//       //       }
//       //     },
//       //   }
//       //   console.log(server.config.server);

//       //   try {
//       //     if (!bunserverinst) {
//       //       bunserverinst = Bun.serve({
//       //         port: process.env.PORT,
//       //         fetch: ((req: Request, server: Server) => {
//       //           if (
//       //             req.headers
//       //               .get("connection")
//       //               ?.toLowerCase()
//       //               .includes("upgrade") &&
//       //             req.headers.get("upgrade")?.toLowerCase() === "websocket"
//       //           ) {
//       //             server.upgrade(req, {
//       //               data: {
//       //                 url: req.url,
//       //                 headers: req.headers,
//       //               },
//       //             });
//       //           }
//       //         }),
//       //         websocket: websocketconfig
//       //       });
//       //     }
//       //   } catch (e) {
//       //     console.warn(e);
//       //   }
//       // },

//       // handleHotUpdate(ctx) {
//       //   console.log(ctx.file)
//       //   console.log(ctx.modules)
//       // },
//     }
//   }
// };
// export default bunWSPlugin;
