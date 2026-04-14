import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";

function safeNextPath(next?: string) {
  const fallback = "/";
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;
  if (next.includes("://")) return fallback;

  try {
    const url = new URL(next, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}

function authErrorMessage(code?: string) {
  switch (code) {
    case "oauth_missing_code":
      return "Le retour OAuth est incomplet. Recommencez la connexion Google.";
    case "oauth_exchange_failed":
      return "La session Google n'a pas pu etre finalisee. Recommencez ou rechargez la page.";
    default:
      return null;
  }
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; auth_error?: string }>;
}) {
  const { next, auth_error } = await searchParams;
  const safeNext = safeNextPath(next);
  const errorMessage = authErrorMessage(auth_error);

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl">
        <SectionCard title="Se connecter" eyebrow="Vault prive">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
            <div className="space-y-4">
              <p className="text-base leading-7 text-muted-foreground">
                Connectez-vous pour ecrire, commenter et gerer votre vault prive. Le feed public
                reste lisible sans exposition de donnees sensibles.
              </p>
              <div className="grid gap-3 text-sm text-muted-foreground">
                <div className="rounded-lg border border-border bg-background p-4">
                  Votre espace prive garde l'historique sensible hors du public.
                </div>
                <div className="rounded-lg border border-border bg-background p-4">
                  Les consentements et le profil servent a la ponderation future des sondages.
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
              <p className="eyebrow text-amber-800">Acces</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Connexion Google securisee. En cas d'indisponibilite, le message vous indique
                l'action de configuration necessaire.
              </p>
              <div className="mt-5">
                <OAuthButtons next={safeNext} initialError={errorMessage} />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
