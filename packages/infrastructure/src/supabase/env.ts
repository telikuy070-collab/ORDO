// Typed access to Vite-provided environment variables.
//
// Supabase credentials reach the browser bundle through the VITE_ prefix, so
// the values must be referenced with static property access: that is what Vite
// statically replaces at build time. Reading `import.meta.env[name]` or
// passing the object around leaves the values undefined in the production
// bundle.
//
// Using `process.env` would be undefined in the browser and could encourage
// shipping server-only variables, so all access is funnelled through here.

interface PublicEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

// Static access so Vite can inline the literals.
const PUBLIC_ENV: PublicEnv = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

function requireEnv(name: keyof PublicEnv): string {
  const value = PUBLIC_ENV[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        'Set it in the repository-root .env.local before building.',
    );
  }
  return value;
}

export function getSupabaseUrl(): string {
  return requireEnv('VITE_SUPABASE_URL');
}

export function getSupabaseAnonKey(): string {
  return requireEnv('VITE_SUPABASE_ANON_KEY');
}

export function hasSupabaseEnv(): boolean {
  return Boolean(PUBLIC_ENV.VITE_SUPABASE_URL && PUBLIC_ENV.VITE_SUPABASE_ANON_KEY);
}
