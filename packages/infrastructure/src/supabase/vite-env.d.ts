// Minimal Vite environment typings.
//
// The standard approach is `/// <reference types="vite/client" />`, but that
// requires `vite` to be resolvable from this package, and it is only a dev
// dependency of the apps. Declaring the narrow surface actually used here
// keeps the package buildable on its own.

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
