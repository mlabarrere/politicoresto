import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Méthodologie — PoliticoResto',
  description:
    'Comment PoliticoResto redresse les résultats de ses sondages pour approcher l’opinion de la population française, et dans quelles limites.',
};

export const dynamic = 'force-static';

export default function MethodologiePage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-10 text-sm leading-relaxed text-foreground">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Transparence méthodologique
        </p>
        <h1 className="text-3xl font-semibold">
          Méthodologie des sondages PoliticoResto
        </h1>
        <p className="text-base text-muted-foreground">
          Ce que nos chiffres disent, comment ils sont calculés, et ce
          qu&apos;ils ne disent pas.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          Ce que PoliticoResto n&apos;est pas
        </h2>
        <p>
          Les sondages publiés sur PoliticoResto ne sont pas des sondages au
          sens de la loi n° 77-808 : nous n&apos;échantillonnons pas la
          population française selon un plan de sondage probabiliste, et nous ne
          revendons pas de prestation d&apos;enquête. Il s&apos;agit d&apos;une
          consultation volontaire auprès des inscrits du site — un
          <strong> panel auto-sélectionné</strong>. Cela signifie que les
          réponses brutes ne représentent <strong>pas directement</strong>{' '}
          l&apos;opinion de la population française.
        </p>
        <p>
          Les biais typiques d&apos;un panel auto-sélectionné (documentés par
          Pew Research, AAPOR, INSEE) incluent : sur-représentation des jeunes
          urbains politisés, sous-représentation des retraités et des électorats
          Rassemblement National / abstentionnistes. Publier les chiffres bruts
          tels quels serait trompeur.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          Notre correction : calibration de Deville-Särndal
        </h2>
        <p>
          Pour rapprocher nos résultats de la distribution réelle en France,
          nous appliquons un redressement statistique standard, utilisé par
          l&apos;INSEE, Statistique Canada, Eurostat, l&apos;US Census et la
          plupart des instituts nationaux : la calibration de Deville &amp;
          Särndal (<em>JASA</em> 1992), variante linéaire tronquée avec bornes{' '}
          <code>[0,5 ; 2]</code>.
        </p>
        <p>
          Principe : on attribue à chaque répondant un poids entre 0,5 et 2 de
          sorte que, pondérés, les répondants ressemblent à la population
          française réelle sur un ensemble de variables (<em>marginales</em> et{' '}
          <em>cellules croisées</em>). Les bornes garantissent qu&apos;aucun
          avis ne compte plus de deux fois, ni moins de moitié — aucune minorité
          ne peut être mathématiquement « effacée ».
        </p>
        <p>
          Implémentation peer-reviewed : bibliothèque{' '}
          <a
            href="https://doi.org/10.21105/joss.03376"
            className="underline underline-offset-2 hover:text-foreground"
            rel="noopener"
          >
            samplics
          </a>{' '}
          (JOSS 2021), validée contre le package R <code>survey</code>{' '}
          (référence mondiale). Parité bit-close (1e-6) vérifiée en continu sur
          notre bank de 50+ scénarios.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Sur quoi on calibre</h2>
        <p>Par priorité décroissante :</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            <strong>Vote passé</strong> (présidentielles 2012 / 2017 / 2022,
            législatives 2012 / 2017 / 2022, européennes 2014 / 2019). Le vote
            passé est, statistiquement, le prédicteur le plus fort du vote
            présent.
          </li>
          <li>
            Cellules croisées démographiques INSEE RP 2021 : âge × sexe, CSP ×
            sexe, diplôme × âge, région × sexe.
          </li>
          <li>
            Marginales démographiques 1D en fallback : âge, sexe, région, CSP,
            diplôme.
          </li>
        </ol>
        <p>
          Sources : INSEE Recensement de la Population 2021 (marges
          démographiques) et Ministère de l&apos;Intérieur (résultats électoraux
          nationaux). Les chiffres sont gelés au moment du vote pour ne pas
          réécrire rétroactivement le passé.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Le score de fiabilité 0-100</h2>
        <p>
          Chaque sondage affiche un score de fiabilité sur 100, calculé comme{' '}
          <em>moyenne géométrique pondérée</em> de quatre sous-scores dans{' '}
          <code>[0, 1]</code> :
        </p>
        <dl className="space-y-2 rounded-md border border-border p-4">
          <div className="flex gap-4">
            <dt className="w-32 font-medium">Kish (35 %)</dt>
            <dd className="flex-1 text-muted-foreground">
              Taille d&apos;échantillon effective{' '}
              <code>n_eff / (n_eff + 300)</code>. Pénalise les petits
              échantillons ou ceux concentrés sur un sous-groupe.
            </dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-32 font-medium">Couverture (30 %)</dt>
            <dd className="flex-1 text-muted-foreground">
              Fraction des strates (âge × sexe × région …) représentées dans les
              répondants, pondérée par la couverture politique minimum.
            </dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-32 font-medium">Variabilité (20 %)</dt>
            <dd className="flex-1 text-muted-foreground">
              <code>1 / deff</code> — pénalise les poids extrêmes.
            </dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-32 font-medium">Concentration (15 %)</dt>
            <dd className="flex-1 text-muted-foreground">
              Pénalise la situation où les 5 % de répondants aux poids les plus
              élevés portent plus d&apos;un quart du total.
            </dd>
          </div>
        </dl>
        <p>
          La moyenne géométrique est volontairement pessimiste : si un
          sous-score s&apos;effondre, le score global s&apos;effondre aussi.
          Trois bandes :
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Indicatif</strong> (&lt;&#8239;40) — résultat redressé
            caché, brut affiché seul avec avertissement.
          </li>
          <li>
            <strong>Correctable</strong> (40-69) — redressé et intervalle de
            confiance 95 % affichés.
          </li>
          <li>
            <strong>Robuste</strong> (≥&#8239;70) — fiabilité élevée ;
            l&apos;intervalle de confiance reste évidemment celui du sondage,
            pas une garantie de vérité.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Limites honnêtes</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>
            Même redressé, notre résultat n&apos;est pas un sondage
            représentatif. Le panel auto-sélectionné peut porter des biais non
            capturés par nos variables (ex. intensité de l&apos;engagement
            politique, connaissance du dossier).
          </li>
          <li>
            L&apos;historique de vote est déclaratif. Les gens sous-déclarent
            l&apos;abstention et sur-déclarent les votes pour le vainqueur
            (effet « bandwagon »). Ce biais est partiellement corrigé quand nous
            calibrons contre les vrais résultats officiels.
          </li>
          <li>
            Les résultats à &lt;&#8239;40 sur le score de fiabilité ne doivent
            pas être interprétés comme l&apos;opinion française — ils sont une
            photographie de l&apos;opinion du sous-ensemble des voteurs du site.
          </li>
          <li>
            Nous ne faisons pas de post-stratification multi-niveaux (MRP) ni
            d&apos;estimations sub-nationales : pour ça il faut des échantillons
            dix fois plus gros que les nôtres.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Transparence technique</h2>
        <p>
          Le code du moteur de redressement est open-source et versionné dans le
          repo principal sous <code>worker/src/weighting/</code>. Les tests de
          parité contre R <code>survey</code> passent en continu dans la CI. Les
          migrations SQL seedant les marginales INSEE et électorales sont
          auditées ligne par ligne et horodatées.
        </p>
        <p>
          Chaque résultat affiché sur le site est accompagné de la date de
          référence (<em>as_of</em>) des marges INSEE utilisées. Si INSEE publie
          une nouvelle version du Recensement, les sondages passés gardent leur
          référence d&apos;origine.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Références</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            Deville, J. C. &amp; Särndal, C. E. (1992).{' '}
            <em>Calibration Estimators in Survey Sampling.</em> JASA 87(418) :
            376-382.
          </li>
          <li>
            Diallo, M. A. (2021).{' '}
            <em>
              samplics: a Python Package for Selecting, Weighting and Analyzing
              Data from Complex Sampling Designs.
            </em>{' '}
            JOSS 6(68) : 3376.
          </li>
          <li>
            AAPOR (2013). <em>Report on Non-Probability Sampling.</em>
          </li>
          <li>
            Pew Research Center (2016).{' '}
            <em>Evaluating Online Nonprobability Surveys.</em>
          </li>
          <li>
            INSEE, <em>CALMAR 2 : une nouvelle version de la macro CALMAR.</em>{' '}
            Insee Méthodes, Sautory (2002).
          </li>
        </ul>
      </section>
    </article>
  );
}
