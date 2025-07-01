// import { exists, watch } from "node:fs/promises";
// import path from "node:path";
// import buildOptions from "./buildoptions";
// import { env } from "./handler";
// // import { createServerConfig } from "./index";

// export let isHttpsAvailable = false;
// export let tlsServer : Bun.Server | undefined = undefined;
// let tlsServerConfig : Bun.ServeFunctionOptions<Record<string, unknown>, never> | undefined = undefined;
// let healthCheckInterval: ReturnType<typeof setInterval> | null = null;
// let certificateWatchers: ReturnType<typeof watch>[] = [];
// let isCheckingHealth = false; // Prevent concurrent health checks
// let isWatchingStarted = false;
// //TODO typescript

// export async function checkHttpsAvailability(port = env("HTTPS_PORT", 443)) {
//   if (isCheckingHealth) {
//     console.log("Health check already in progress, skipping...");
//     return isHttpsAvailable;
//   }

//   isCheckingHealth = true;
//   try {
//     const fetched = await fetch(`https://${env("ORIGIN", "localhost")}:${env("HTTPS_PORT", 443)}`, {
//       method: "HEAD",
//       headers: {
//         "User-Agent": "Bun/TLS-Check"
//       },
//       signal: AbortSignal.timeout(5000), // 5 second timeout
//       tls: {
//         rejectUnauthorized: false
//       }
//     });

//     if (fetched.ok) {
//       isHttpsAvailable = true;
//       return true;
//     }
//     console.error("Health check failed with status:", fetched.status);
//     isHttpsAvailable = false;
//     return false;
//   } catch (error) {
//     console.error("Health check failed with error:", error);
//     isHttpsAvailable = false;
//     return false;
//   } finally {
//     isCheckingHealth = false;
//   }
// }

// export async function reloadTLSHTTPServer() {
//   if (!tlsServerConfig) {
//     tlsServerConfig = await createServerConfig(true);
//   }
//   try {
//     if (tlsServer) {
//       tlsServer.reload(tlsServerConfig);
//     } else {
//       tlsServer = Bun.serve(tlsServerConfig);
//     }

//     // Wait a moment for server to be ready, then check health once
//     setTimeout(() => checkHttpsAvailability(), 1000);

//   } catch (e) {
//     console.error(e);
//     disableTLSHTTPServer();
//   }
// }

// export function disableTLSHTTPServer() {
//   tlsServer?.stop();
//   tlsServer = undefined;
//   isHttpsAvailable = false;
// }

// // export function watchHTTPSStatus() {
// //   // Clear any existing interval
// //   if (healthCheckInterval) {
// //     clearInterval(healthCheckInterval);
// //   }
// //   if (isWatchingStarted) {
// //     // console.log("HTTPS watching already started, skipping...");
// //     return;
// //   }
// //   isWatchingStarted = true;

// //   // Start certificate watching
// //   watchCertificates();

// //   // Only ONE interval for regular health checks
// //   // healthCheckInterval = setInterval(async () => {
// //   //   const isAvailable = await checkHttpsAvailability();
// //   //   console.log(`HTTPS is ${isAvailable ? 'available' : 'not available'}`);
// //   // }, 30000); // Check every 30 seconds
// // }



// export async function watchCertificates() {
//   // Clean up existing watchers
//   // for (const watcher of certificateWatchers ) {
//   //   watcher?.close()
//   // }
//   certificateWatchers = [];

//   const { key: keyPath, cert: certPath, ca: caPath } = buildOptions.tls || {};

//   if (!keyPath || !certPath) {
//     console.error("No TLS key/cert paths configured");
//     return;
//   }

//   const keyfiles = [
//     ...keyPath ? [keyPath] : [],
//     ...certPath ? [certPath] : [],
//     ...caPath ? [caPath] : []
//   ];

//   try {
//     if (typeof keyPath !== "string" || typeof certPath !== "string") {
//       console.error("TLS keys need to be strings as paths to the certs");
//       isHttpsAvailable = false;
//       return;
//     }

//     for (const file of keyfiles) {
//       let resolvedPath = file;
//       if (file.startsWith("file://") || file.startsWith("http://") || file.startsWith("https://") || file.startsWith("/")) {
//         resolvedPath = path.resolve(file);
//       } else if (file.startsWith(".")) {
//         resolvedPath = path.resolve(import.meta.dirname, file);
//       } else {
//         resolvedPath = path.resolve(process.cwd(), file);
//       }

//       const fileExists = await exists(resolvedPath);
//       if (fileExists) {
//         await reloadTLSHTTPServer();
//       } else {
//         disableTLSHTTPServer();
//         continue;
//       }

//       // Watch for file changes
//       const watcher = watch(resolvedPath);
//       certificateWatchers.push(watcher);

//       // Handle file events (but don't create infinite loops)
//       (async () => {
//         try {
//           for await (const event of watcher) {
//             const { eventType, filename } = event;
//             console.log(`Certificate file event: ${eventType} on ${filename}`);

//             if (eventType === "rename") {
//               const fileExists = await exists(resolvedPath);
//               if (!fileExists) {
//                 // console.log(`File ${filename} was deleted`);
//                 disableTLSHTTPServer();
//               } else {
//                 await reloadTLSHTTPServer();
//               }
//             } else if (eventType === "change") {
//               await reloadTLSHTTPServer();
//             }

//             // Add a small delay to prevent rapid-fire reloads
//             await new Promise(resolve => setTimeout(resolve, 1000));
//           }
//         } catch (e) {
//           console.error("Error in file watcher:", e);
//         }
//       })();
//     }
//   } catch (e) {
//     console.error("Error watching TLS files:", e);
//   }
// }

// // Clean up function
// export function stopWatching() {
//   if (healthCheckInterval) {
//     clearInterval(healthCheckInterval);
//     healthCheckInterval = null;
//   }
//   for(const watcher of certificateWatchers) {
//     watcher?.close?.();
//   }
//   certificateWatchers = [];
// }