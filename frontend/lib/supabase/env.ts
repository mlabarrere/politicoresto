const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const readEnv = (value: string | undefined, key: string) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

// Browser-safe module. Cannot import `@/lib/logger` here — env.ts is imported
// transitively by the browser client factory, and `lib/logger.ts` pulls Node
// APIs (`async_hooks`, Pino's Node entry) that are not available in the
// browser bundle. Diagnostic logging of the active project, if needed, can
// be added from a server-only caller (middleware / server factory).
export const supabaseEnv = {
  url: () => readEnv(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"),
  publishableKey: () =>
    readEnv(supabasePublishableKey, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
};
