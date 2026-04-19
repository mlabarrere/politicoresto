type AuthCapableClient = {
  auth?: {
    getUser?: () => Promise<{ data?: { user?: { id: string } | null } }>;
    getSession?: () => Promise<{ data?: { session?: { user?: { id: string } | null } | null } }>;
  };
};

export async function getCurrentUser(client: AuthCapableClient): Promise<{ id: string } | null> {
  if (typeof client.auth?.getUser === "function") {
    const result = await client.auth.getUser();
    return result.data?.user ?? null;
  }

  if (typeof client.auth?.getSession === "function") {
    const result = await client.auth.getSession();
    return result.data?.session?.user ?? null;
  }

  return null;
}

export async function resolveCurrentUserId(
  client: AuthCapableClient,
  currentUserId?: string | null
): Promise<string | null> {
  if (currentUserId !== undefined) return currentUserId;
  return getCurrentUser(client).then((u) => u?.id ?? null);
}
