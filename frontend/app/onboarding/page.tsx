import { redirect } from "next/navigation";

import { AppCard } from "@/components/app/app-card";
import { AppButton } from "@/components/app/app-button";
import { AppInput } from "@/components/app/app-input";
import { PageContainer } from "@/components/layout/page-container";
import { setUsernameAction } from "@/lib/actions/account";
import { getAuthUserId } from "@/lib/supabase/auth-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils/safe-path";

export default async function OnboardingPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const userId = await getAuthUserId(supabase);
  if (!userId) redirect("/auth/login");

  const { next } = await searchParams;
  const nextPath = safeNextPath(next ?? "/");

  return (
    <PageContainer>
      <div className="mx-auto max-w-md py-12">
        <AppCard className="space-y-6 p-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Choisissez votre pseudo</h1>
            <p className="text-sm text-muted-foreground">Votre identifiant unique sur PoliticoResto. Vous pourrez le modifier plus tard.</p>
          </header>

          <form action={setUsernameAction} className="space-y-4">
            <input type="hidden" name="next" value={nextPath} />
            <label className="block space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Pseudo</span>
              <AppInput
                name="username"
                required
                placeholder="ex: jean_dupont"
                autoComplete="username"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">3 à 30 caractères, lettres, chiffres et tirets bas uniquement.</p>
            </label>

            <AppButton type="submit" className="w-full">Continuer</AppButton>
          </form>
        </AppCard>
      </div>
    </PageContainer>
  );
}
