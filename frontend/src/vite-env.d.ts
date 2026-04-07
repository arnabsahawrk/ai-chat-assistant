/// <reference types="vite/client" />

// Types for vite-plugin-pwa virtual module
declare module "virtual:pwa-register" {
  export type RegisterSWOptions = {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (
      registration: ServiceWorkerRegistration | undefined
    ) => void;
    onRegisterError?: (error: unknown) => void;
  };

  export function registerSW(
    options?: RegisterSWOptions
  ): (reloadPage?: boolean) => Promise<void>;
}

declare module "virtual:pwa-info" {
  export interface PwaInfo {
    webManifest: {
      href: string;
      useCredentials: boolean;
    };
  }
  export const pwaInfo: PwaInfo | undefined;
}
