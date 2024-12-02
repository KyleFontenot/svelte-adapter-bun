// // import type { Server, WebSocketHandler, ServerWebSocket } from 'bun';
// import { createLogger, type LogOptions, type Plugin, type ViteDevServer } from 'vite';

// const logger = createLogger()

// const loggerPlugin = (): Plugin => {
//   const portToUse = process.env?.PUBLIC_DEVWSPORT || 10234;
//   const listeners = {};
//   return {
//     name: 'logger',
//     configureServer(server: ViteDevServer) {
//       // console.log(server.config.customLogger)



//       server.config.customLogger = createLogger();
//       console.log(server.config.customLogger);

//       server.config.logger.warn = (msg, options: LogOptions) => {
//         console.log("BLAHAHAH", msg);
//         console.log(options);

//       }
//     },
//   };
// };
// export default loggerPlugin;
