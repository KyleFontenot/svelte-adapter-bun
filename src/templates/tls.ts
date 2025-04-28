import type { FSWatcher } from "node:fs";
import { watch } from "node:fs/promises";
import type { AdapterConfig } from "../adapter";
import { env } from "./handler";

const buildOptions: AdapterConfig = BUILD_OPTIONS;

export let isHttpsAvailable = false;
// checkHttpsAvailability();

export async function checkHttpsAvailability(port = env("HTTPS_PORT", 443)): Promise<boolean> {
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

    // To abort if failing to receive response.
    const timeout = setTimeout(() => {
      socket.end();
    }, 2000);

    // Wait for the connection result
    const result = socket;
    clearTimeout(timeout);
    return true;
  } catch (error) {
    return false;
  }
}

// TODO

export default async function watchCertificates() {
  const { key: keyPath, cert: certPath, ca: caPath } = buildOptions.tls ||
    { keyPath: undefined, certPath: undefined, caPath: undefined };

  const watchers: FSWatcher[] = [];

  const watcher = watch("../testfolder");
  console.log('Watching key file:');
  // Start the async watcher in a non-blocking way
  (async () => {
    try {
      for await (const event of watcher) {
        console.log(`Key file changed: ${event.filename} (${event.eventType})`);
        // Handle key file change
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error watching key file:', error);
      }
    }
  })();
  watchers.push(watcher);


  // Start watchers and collect their abort controllers
  if (keyPath) {
    const watcher = watch(keyPath);
    console.log(`Watching key file: ${keyPath}`);

    // Start the async watcher in a non-blocking way
    (async () => {
      try {
        for await (const event of watcher) {
          console.log(`Key file changed: ${event.filename} (${event.eventType})`);
          // Handle key file change
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error watching key file:', error);
        }
      }
    })();

    watchers.push(watcher);
  }

  if (certPath) {
    const watcher = watch(certPath);
    console.log(`Watching certificate file: ${certPath}`);

    (async () => {
      try {
        for await (const event of watcher) {
          console.log(`Certificate file changed: ${event.filename} (${event.eventType})`);
          // Handle certificate file change
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error watching certificate file:', error);
        }
      }
    })();

    watchers.push(watcher);
  }

  if (caPath) {
    const watcher = watch(caPath);
    console.log(`Watching CA file: ${caPath}`);

    (async () => {
      try {
        for await (const event of watcher) {
          console.log(`CA file changed: ${event.filename} (${event.eventType})`);
          // Handle CA file change
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error watching CA file:', error);
        }
      }
    })();

    watchers.push(watcher);
  }

  setTimeout(checkHttpsAvailability, 10000);

  // Return function to close all watchers
  return () => {
    for (const watcher of watchers) {
      watcher.close();
    }
  };
}