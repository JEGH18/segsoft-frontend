/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Where ZIP uploads go, bypassing the Vercel proxy and its ~4.5 MB body limit. */
  readonly VITE_UPLOAD_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
