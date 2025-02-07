// // import type { Server, WebSocketHandler, ServerWebSocket } from 'bun';
// import { createLogger, type LogOptions, type Plugin, type ViteDevServer } from 'vite';

// const logger = createLogger()

// const loggerPlugin = (): Plugin => {
//   const portToUse = process.env?.PUBLIC_DEVWSPORT || 10234;
//   const listeners = {};
//   return {
//     name: 'logger',
//     configureServer(server: ViteDevServer) {



//       server.config.customLogger = createLogger();

//       server.config.logger.warn = (msg, options: LogOptions) => {

//       }
//     },
//   };
// };
// export default loggerPlugin;
