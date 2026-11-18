/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute public URL of the site (canonical links, sitemap, Open Graph). */
  readonly VITE_SITE_URL: string;
  /** Public thirdweb client ID for this environment. */
  readonly VITE_THIRDWEB_CLIENT_ID?: string;
  /** KEY CHAIN API base URL (sessions, advisor, x402 transfers). Empty = standalone demo mode. */
  readonly VITE_API_URL?: string;
  /** RPC for chains thirdweb doesn't know (local anvil 31337). Optional for Polygon/Amoy. */
  readonly VITE_CHAIN_RPC_URL?: string;
  /** Chain the platform operates on (80002 Amoy, 137 Polygon, 31337 local). Unset = Polygon defaults. */
  readonly VITE_CHAIN_ID?: string;
  /** "true" enables the developer-only "Entrar dev" login in a demo build (never with VITE_API_URL). */
  readonly VITE_DEV_LOGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
