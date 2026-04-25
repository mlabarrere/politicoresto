import { AppCard } from '@/components/app/app-card';
import { PageContainer } from '@/components/layout/page-container';

export const metadata = {
  title: 'Comment ça marche — Pronostics',
};

export default function PronosComoCaMarchePage() {
  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pronostics
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Comment ça marche
          </h1>
        </header>

        <AppCard className="space-y-3 text-sm leading-relaxed text-foreground">
          <h2 className="text-base font-semibold">
            Un jeu social, sans argent
          </h2>
          <p>
            Les pronostics PoliticoResto sont un classement public. Personne ne
            mise d&apos;argent, personne ne perd de points : vous gagnez plus ou
            moins selon la justesse de votre prédiction et le moment où vous
            l&apos;avez faite.
          </p>
        </AppCard>

        <AppCard className="space-y-3 text-sm leading-relaxed text-foreground">
          <h2 className="text-base font-semibold">
            Le multiplicateur sentinelle
          </h2>
          <p>
            À la résolution, votre multiplicateur est calculé à partir de la{' '}
            <strong>part lissée</strong> de l&apos;option choisie au moment
            exact où vous avez parié.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
            {`part_lissée = (part_brute × n_paris + (1 / N_options) × 10)
             / (n_paris + 10)
multiplicateur = min(5 ; 1 / max(0.05 ; part_lissée))
points = 10 × multiplicateur (si vous gagnez)`}
          </pre>
          <p>
            Concrètement : plus vous pariez tôt sur une option minoritaire, plus
            le multiplicateur grimpe (jusqu&apos;à ×5). Le lissage (poids = 10
            paris fictifs uniformément répartis) protège contre les
            multiplicateurs aberrants en début de pronostic.
          </p>
        </AppCard>

        <AppCard className="space-y-3 text-sm leading-relaxed text-foreground">
          <h2 className="text-base font-semibold">Cas particuliers</h2>
          <ul className="list-disc space-y-2 pl-4">
            <li>
              <strong>Modifier son pari</strong> : autorisé tant que le
              pronostic est ouvert. C&apos;est l&apos;horodatage de la dernière
              action qui compte au scoring.
            </li>
            <li>
              <strong>Fermeture des paris</strong> : à la résolution, le
              modérateur fixe un horodatage. Les paris postérieurs sont ignorés
              (pas supprimés — visibles sur votre profil).
            </li>
            <li>
              <strong>Ajout d&apos;une option en cours</strong> : possible. Les
              parieurs précédents reçoivent une notification ; leur pari
              conserve son multiplicateur calculé sur la distribution du moment.
            </li>
            <li>
              <strong>Annulation</strong> : le modérateur peut annuler un
              pronostic (raison affichée). Les paris restent visibles mais ne
              comptent pas au classement.
            </li>
          </ul>
        </AppCard>

        <AppCard className="space-y-2 text-sm leading-relaxed text-foreground">
          <h2 className="text-base font-semibold">Classement</h2>
          <p>
            Précision moyenne ={' '}
            <code className="rounded bg-muted px-1">
              somme_points / (n_paris × 50)
            </code>
            . Le dénominateur correspond au maximum théorique : 10 points de
            base × ×5 plafond.
          </p>
        </AppCard>
      </div>
    </PageContainer>
  );
}
