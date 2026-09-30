// Minimal Vite environment typings for the app build.
//
// `vite` is available as a dev dependency here, but referencing vite/client
// pulls in the whole client type surface. Declaring only what the app reads
// keeps the compile step fast and explicit.

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
