declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_STORAGE_MODE?: 'api' | 'local';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
