import type { Adapter } from '@sveltejs/kit';
import type { Server, WebSocketHandler } from 'bun';
import type { BuildOptions } from 'vite';

declare global {
  const ENV_PREFIX: string;
  const BUILD_OPTIONS: AdapterConfig;
}

export interface VitePluginOptions {
  port?: number;
  hmrPaths: string[];
  ws?: WebSocketHandler;
  wsPath?: string;
  debug: boolean
}


declare module 'SERVER' {
  export { Server } from '@sveltejs/kit';
}

declare module 'MANIFEST' {
  import type { SSRManifest } from '@sveltejs/kit';
  export const manifest: SSRManifest;
}