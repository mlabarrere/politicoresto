import Image from "next/image";

import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { safeNextPath } from "@/lib/utils/safe-path";
import { siteConfig } from "@/lib/config/site";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = safeNextPath(next);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Image
              src="/logo-politicoresto.svg"
              alt="Logo PoliticoResto"
              width={48}
              height={48}
              className="size-12"
              priority
            />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            {siteConfig.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Se connecter ou créer un compte
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <OAuthButtons next={safeNext} />
        </div>

        <p className="text-center text-xs text-muted-foreground">
          En continuant, vous acceptez nos conditions d&apos;utilisation.
        </p>
      </div>
    </div>
  );
}
