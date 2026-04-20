const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const readEnv = (value: string | undefined, key: string) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

let logged = false;

export const supabaseEnv = {
  url: () => {
    const value = readEnv(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL");
    if (!logged) {
      logged = true;
      console.info("[supabase/env] active project", {
        host: new URL(value).host,
        environment: process.env.VERCEL_ENV ?? "local"
      });
    }
    return value;
  },
  publishableKey: () =>
    readEnv(supabasePublishableKey, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
};
