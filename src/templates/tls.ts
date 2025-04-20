// import chokidar from "chokidar";
import type { AdapterConfig } from "../adapter";
import { env } from "../env";

const buildOptions: AdapterConfig = BUILD_OPTIONS;

let isHttpsAvailable = false;
// checkHttpsAvailability();

async function checkHttpsAvailability(domain: string, port = env("HTTPS_PORT", 443)) {
  try {
    const socket = await Bun.connect({
      hostname: env("HOST", "0.0.0.0"),
      port: port,
      socket: {
        open(sock) {
          // Connection successful - immediately close it
          this.end?.(sock);
        },
        error(sock, err) {
          // Handle error (optional logging can be added here)
        }
      }
    });

    // Set a timeout to abort the connection attempt
    const timeout = setTimeout(() => {
      socket.end();
    }, 2000);

    // Wait for the connection result
    const result = socket;
    clearTimeout(timeout);
    return result;
  } catch (error) {
    return false;
  }
}

// TODO
// export default function watch() {
//   const { key, cert, ca } = buildOptions.tls
//   const keywatcher = chokidar.watch(key)
//   keywatcher.add(cert)
//   const certwatcher = chokidar.watch(cert)
//   if (ca) {
//     const certwatcher = chokidar.watch(ca)
//   }
//   setTimeout(checkHttpsAvailability, 10000);
// }


// Start the health check immediately
// watch();
