import type { ViteDevServer, Plugin, InlineConfig } from "vite";
import type { Server, WebSocketServeOptions, WebSocketHandler } from "bun";
// import { WebSocketServer } from "ws";
import { createServer as createViteServer } from 'vite'
import { copyFileSync, readFileSync } from "node:fs"
import * as  elysiaConnectPlugin from "elysia-connect-middleware"

// TODO add in websocket

export type BunServe = Partial<typeof Bun.serve>

export let bunserverinst: undefined | Partial<Server>;

const outDir = "build"

import { Elysia } from "elysia";
import { vite as elysiaVitePlugin } from "elysia-vite-server";
import type { ViteOptions } from "elysia-vite-server";
import { staticPlugin } from "@elysiajs/static";
// import type { InlineConfig } from "vite";

const isProduction = process.env.NODE_ENV === 'production'
const port = process.env.PORT || 5173
const base = process.env.BASE || '/'

let templateHtml: string;
let templateHtmlDest = isProduction ? `./${outDir}/app.html` : "./.svelte-kit/bundevplugin/app.html";
let ssrManifest;

console.log('Running the custom vite dev server: ')

if (isProduction) {
  // Prod
  try {
    // copyFileSync("./src/app.html", "./.svelte-kit/bundevplugin/app.html");
    const file = Bun.file("./src/app.html");
    await Bun.write(templateHtmlDest, file);
    templateHtml = await Bun.file(templateHtmlDest).text()
    ssrManifest = await Bun.file(`./${outDir}/manifest.json`).text()
  }
  catch (e) {
    console.log(e)
  }
}
else {
  // Dev
  try {
    // Copying file for app.html using Bun
    const file = Bun.file("./src/app.html");
    await Bun.write(templateHtmlDest, file);
    templateHtml = await Bun.file(templateHtmlDest).text()
    ssrManifest = await Bun.file("./.svelte-kit/output/client/.vite/manifest.json").text()
  }
  catch (e) {
    console.log(e)
  }
}


let customVite: ViteDevServer | undefined;

const bunWSPlugin = (wsHandler: WebSocketHandler): Plugin => ({
  name: 'bun-adapter-websockets',
  async configureServer(server: ViteDevServer) {

    // const options: ViteOptions = {
    //   mode: server.config.mode,
    //   vite: server.config.inlineConfig,
    //   static: {
    //     assets:  isProduction ? `./${outDir}/client` : "./.svelte-kit/output/client",
    //     alwaysStatic: false,
    //     noCache: true,
    //   },
    // }
    // const mode = server.config.mode ?? process.env.NODE_ENV ?? "development";

    // let vite: ViteDevServer = server;
//
// async function instCustomServer() {
//
//   return await createViteServer({
//     server: { middlewareMode: true },
//     appType: 'custom',
//   })
// }

    const app = new Elysia({
      name: "elysia-vite",
      seed: server.config,
    }).decorate("vite", server)
      .get('/hello', () => {
        console.log('inspect: ', "here in a route!")
        return "testing"
      })
      .ws('', {
        open(ws) {
          console.log('Opened the Elysia websocket!! : ')
        }
      }).onStart(() => {
        console.log('inspect: ')
      })

    if (server) {
      app.use(
        elysiaConnectPlugin.connect(server.middlewares),
      );
    } else {
      // if (server.config?.static !== false) app.use(staticPlugin(server.config?.static));
    }

  }
})





// const app = new Elysia()
//   .use(
//     elysiaVitePlugin({
//       static: {
//         assets: isProduction ? `./${outDir}/client/_app` : "./.svelte-kit/output/client",
//         alwaysStatic: false,
//         noCache: true,
//       },
//     })
//   )
//
// app.all("*", async ({ vite, request, set }) => {
//   try {
//     let template: string | undefined;
//     let render: any;
//     if (vite) {
//       template = await Bun.file("./app.html").text();
//
//       template = await vite.transformIndexHtml(request.url, template);
//       // render = (await vite.ssrLoadModule("/src/entry-server.js")).render;
//       render = (await vite.ssrLoadModule("/.svelte-kit/output/index.js")).render_response;
//     } else {
//       template = templateHtml;
//       render = (await import(`./${outDir}/server/index.js`)).render_response;
//     }
//     // const rendered = await render(request.url, ssrManifest);
//     const rendered = await render(request.url, ssrManifest);
//
//     return new Response(rendered, {
//       headers: {
//         "Content-Type": "text/html",
//       },
//     });
//   } catch (e) {
//     if (e instanceof Error) {
//       vite?.ssrFixStacktrace(e);
//       console.log(e.stack);
//       set.status = 500;
//
//       return e.stack;
//     } else console.log(e);
//   }
// })
//   .listen(5173, console.log);


export default bunWSPlugin


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
