import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl">
        <SectionCard title="Se connecter" eyebrow="Mon espace">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
            <div className="space-y-4">
              <p className="text-base leading-7 text-muted-foreground">
                Connectez-vous pour suivre des sujets, participer, retrouver vos cartes et lire votre progression.
              </p>
              <div className="grid gap-3 text-sm text-muted-foreground">
                <div className="rounded-lg border border-border bg-background p-4">
                  Votre espace vous aide a revenir sur les bons sujets au bon moment.
                </div>
                <div className="rounded-lg border border-border bg-background p-4">
                  Les cartes et la reputation restent visibles sans prendre la place des sujets.
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
              <p className="eyebrow text-amber-800">Acces</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Connexion Google securisee pour retrouver votre espace personnel.
              </p>
              <div className="mt-5">
                <OAuthButtons next={next ?? "/me"} />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
