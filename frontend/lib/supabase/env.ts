const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const readEnv = (value: string | undefined, key: string) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
};

let hasLoggedActiveProject = false;

const logActiveProjectOnce = (url: string) => {
  if (hasLoggedActiveProject) return;
  hasLoggedActiveProject = true;

  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    // keep raw value if URL parsing fails
  }

  const environment = process.env.VERCEL_ENV ?? "local";
  console.info("[supabase/env] active project", { host, environment });
};

export const supabaseEnv = {
  url: () => {
    const value = readEnv(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL");
    logActiveProjectOnce(value);
    return value;
  },
  publishableKey: () =>
    readEnv(supabasePublishableKey, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
};
