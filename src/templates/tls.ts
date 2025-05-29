import type { FSWatcher } from "node:fs";
import { exists, watch } from "node:fs/promises";
import path from "node:path";
import type { AdapterConfig } from "../adapter";
import buildOptions from "./buildoptions";
import { env } from "./handler";
// import { disableTLSHTTPServer, reloadTLSHTTPServer } from "./index";
import { createServerConfig } from "./index";

export let isHttpsAvailable = false;

let tlsServer: Bun.Server | undefined = undefined;
let tlsServerConfig: Bun.ServeFunctionOptions<Record<string, unknown>, never> | undefined = undefined;


export async function checkHttpsAvailability(port = env("HTTPS_PORT", 443)): Promise<boolean> {
  try {
    const fetched = await fetch(`https://localhost:${env("HTTPS_PORT", 443)}`, {
      method: "HEAD",
      headers: {
        "User-Agent": "Bun/TLS-Check"
      },
      signal: new AbortController().signal
    });
    console.log("tried to do a health check fetch::: ", fetched);
    if (fetched.ok) {
      return true;
    }
    return false

  } catch (error) {
    return false;
  }
}

export async function reloadTLSHTTPServer() {
  if (!tlsServerConfig) {
    tlsServerConfig = await createServerConfig(true)
  }
  console.log("config server", tlsServerConfig)
  console.log("the actual server server", tlsServer)
  try {
    if (tlsServer) {
      tlsServer.reload(tlsServerConfig);
    } else {
      tlsServer = Bun.serve(tlsServerConfig);
    }
    console.log("TLS config reloaded")
  }
  catch (e) {
    console.error()
    disableTLSHTTPServer()
  }
}
export function disableTLSHTTPServer() {
  tlsServer?.stop()
  tlsServer = undefined;
}

export function watchHTTPSStatus() {
  watchCertificates()
  setInterval(async () => {
    const isAvailable = await checkHttpsAvailability();
    if (isAvailable) {
      console.log("HTTPS is available", isAvailable);
      isHttpsAvailable = true;
    } else {
      console.log("HTTPS is not available", isAvailable);
      isHttpsAvailable = false;
    }
  }, 10000);
}

export async function watchCertificates() {
  const { key: keyPath, cert: certPath, ca: caPath } = buildOptions.tls ||
    { keyPath: undefined, certPath: undefined, caPath: undefined };


  const keyfiles = [
    ...(keyPath ? [keyPath] : []),
    ...(certPath ? [certPath] : []),
    ...(caPath ? [caPath] : []),
  ];

  const watchers: FSWatcher[] = [];

  setInterval(checkHttpsAvailability, 10000);

  try {
    if (keyPath && certPath) {

      if (typeof keyPath !== 'string' || typeof certPath !== 'string') {
        console.error("TLS keys need to be strings as paths to the certs");
        isHttpsAvailable = false
      }

      for (const file of keyfiles) {
        let resolvedPath = file;
        if (file.startsWith('file://') || file.startsWith('http://') && file.startsWith('https://') || file.startsWith('/')) {
          resolvedPath = path.resolve(file);
        }
        else if (file.startsWith('.')) {
          resolvedPath = path.resolve(import.meta.dirname, file);
        }
        else {
          resolvedPath = path.resolve(process.cwd(), file);
        }

        const fileExists = await exists(resolvedPath);
        fileExists && reloadTLSHTTPServer() || disableTLSHTTPServer()

        const watcher = watch(resolvedPath);
        let initial = true

        for await (const event of watcher) {
          const { eventType, filename } = event;

          initial = true
          if (eventType === 'rename') {
            // Check if file exists to determine if it was created or deleted
            const fileExists = await exists(filename as string);

            if (!fileExists) {
              console.log(`File ${filename} was deleted`);
              disableTLSHTTPServer();
            } else {
              console.log(`File ${filename} was created`);
              reloadTLSHTTPServer();
            }
          } else if (eventType === 'change') {
            console.log(`File ${filename} was modified`);
            reloadTLSHTTPServer();
          }
        }
      }
    }
  }
  catch (e) {
    console.error("Error watching TLS files:", e);
  }
}

