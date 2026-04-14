import { SectionCard } from "@/components/layout/section-card";
import {
  clearPrivateProfileAction,
  deleteVoteHistoryAction,
  upsertSensitiveConsentAction,
  upsertPrivateProfileAction,
  upsertVoteHistoryAction
} from "@/lib/actions/vault";
import { getVaultSettingsData } from "@/lib/data/authenticated/vault";
import { formatDate } from "@/lib/utils/format";

export default async function MeSettingsPage() {
  const data = await getVaultSettingsData();
  const profilePayload = (data.profile?.profile_payload ?? {}) as Record<string, unknown>;
  const socioProfessionalCategory =
    typeof profilePayload.socio_professional_category === "string"
      ? profilePayload.socio_professional_category
      : "";
  const employmentStatus =
    typeof profilePayload.employment_status === "string" ? profilePayload.employment_status : "";
  const educationLevel =
    typeof profilePayload.education_level === "string" ? profilePayload.education_level : "";

  return (
    <div className="space-y-6">
      <SectionCard title="Vault prive" eyebrow="Mon profil">
        <div className="space-y-3 text-sm leading-7 text-muted-foreground">
          <p>
            Ces donnees restent privees. Elles ne sont pas visibles sur votre profil public ni dans le feed.
          </p>
          <p>
            Elles servent uniquement a ameliorer la qualite statistique des sondages et les redressements futurs.
          </p>
        </div>
      </SectionCard>

      <div id="confidentialite" />
      <SectionCard title="Confidentialite et consentement" eyebrow="Mon profil">
        <div className="space-y-4">
          <p className="text-sm leading-7 text-muted-foreground">
            Je consens a l'usage de mes donnees politiques sensibles dans un vault prive, pour produire
            des resultats de sondage agreges et anonymises.
          </p>
          <form action={upsertSensitiveConsentAction}>
            <input type="hidden" name="redirect_path" value="/me/settings" />
            <button type="submit" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
              Enregistrer mon consentement
            </button>
          </form>
          {data.consents.length ? (
            <p className="text-xs text-muted-foreground">
              Dernier consentement: {formatDate(data.consents[0].captured_at)} ({data.consents[0].policy_version})
            </p>
          ) : null}
        </div>
      </SectionCard>

      <div id="socio" />
      <SectionCard title="Informations socio-professionnelles" eyebrow="Mon profil">
        <form action={upsertPrivateProfileAction} className="space-y-3">
          <input type="hidden" name="redirect_path" value="/me/settings" />
          <label className="block text-sm">
            <span className="text-muted-foreground">Interet politique (1-5)</span>
            <input
              name="political_interest_level"
              type="number"
              min={1}
              max={5}
              defaultValue={data.profile?.political_interest_level ?? ""}
              className="mt-1 w-full rounded-xl border border-border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Categorie socio-professionnelle</span>
            <input
              name="socio_professional_category"
              defaultValue={socioProfessionalCategory}
              placeholder="Ex: cadre, etudiant, independant..."
              className="mt-1 w-full rounded-xl border border-border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Situation professionnelle</span>
            <input
              name="employment_status"
              defaultValue={employmentStatus}
              placeholder="Ex: salarie, retraite, sans activite..."
              className="mt-1 w-full rounded-xl border border-border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Niveau d'etudes</span>
            <input
              name="education_level"
              defaultValue={educationLevel}
              placeholder="Ex: bac, licence, master..."
              className="mt-1 w-full rounded-xl border border-border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Notes privees</span>
            <textarea
              name="notes_private"
              rows={4}
              defaultValue={data.profile?.notes_private ?? ""}
              className="mt-1 w-full rounded-xl border border-border px-3 py-2"
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
              Enregistrer
            </button>
          </div>
        </form>
        <form action={clearPrivateProfileAction} className="mt-3">
          <input type="hidden" name="redirect_path" value="/me/settings" />
          <button type="submit" className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground">
            Vider le profil prive
          </button>
        </form>
      </SectionCard>

      <div id="historique" />
      <SectionCard title="Historique electoral" eyebrow="Mon profil">
        <div className="space-y-3 text-sm leading-7 text-muted-foreground">
          <p>
            Ces entrees restent privees. Elles servent a mieux lire le contexte electoral, sans exposition publique.
          </p>
          <p>
            Choisissez le scrutin, puis enregistrez votre option declaree et les elements utiles au redressement.
          </p>
        </div>

        <form action={upsertVoteHistoryAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="redirect_path" value="/me/settings" />
          <label className="block text-sm md:col-span-2">
            <span className="text-muted-foreground">Scrutin national</span>
            <select
              name="vote_history_scope"
              defaultValue=""
              required
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
            >
              <option value="" disabled>
                Selectionner un cadre
              </option>
              {data.voteHistoryScopes.map((group) => (
                <optgroup key={group.kind} label={group.label}>
                  {group.years.map((year) => (
                    <option key={`${group.kind}:${year}`} value={`${group.kind}:${year}`}>
                      {group.label} {year}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Participation</span>
            <select
              name="participation_status"
              defaultValue="voted"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
            >
              <option value="voted">J'ai vote</option>
              <option value="abstained">Abstention</option>
              <option value="blank_null">Vote blanc ou nul</option>
              <option value="prefer_not_to_say">Je prefere ne pas le dire</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Tour</span>
            <input name="vote_round" type="number" min={1} className="mt-1 w-full rounded-xl border border-border px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Option votee</span>
            <input name="declared_option_label" required className="mt-1 w-full rounded-xl border border-border px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Candidat</span>
            <input name="declared_candidate_name" className="mt-1 w-full rounded-xl border border-border px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Ville / lieu</span>
            <input name="location_label" className="mt-1 w-full rounded-xl border border-border px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Bureau de vote</span>
            <input name="polling_station_label" className="mt-1 w-full rounded-xl border border-border px-3 py-2" />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="text-muted-foreground">Contexte</span>
            <textarea name="vote_context" rows={2} className="mt-1 w-full rounded-xl border border-border px-3 py-2" />
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
              Ajouter une entree
            </button>
          </div>
        </form>

        <div className="mt-4 space-y-3">
          {data.voteHistory.length ? (
            data.voteHistory.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-border bg-background p-4">
                <p className="text-sm font-semibold text-foreground">{entry.declared_option_label}</p>
                {entry.election_scope_label ? (
                  <p className="mt-1 text-xs text-muted-foreground">{entry.election_scope_label}</p>
                ) : null}
                {entry.participation_status_label ? (
                  <p className="mt-1 text-xs text-muted-foreground">{entry.participation_status_label}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  Tour {entry.vote_round ?? "?"} | {entry.declared_candidate_name ?? "Candidat non renseigne"} | {formatDate(entry.declared_at)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {entry.location_label ? <span>{entry.location_label}</span> : null}
                  {entry.polling_station_label ? <span>{entry.polling_station_label}</span> : null}
                </div>
                <form action={deleteVoteHistoryAction} className="mt-3">
                  <input type="hidden" name="id" value={entry.id} />
                  <input type="hidden" name="redirect_path" value="/me/settings" />
                  <button type="submit" className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground">
                    Supprimer
                  </button>
                </form>
              </article>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Aucun vote prive enregistre.</p>
          )}
        </div>
      </SectionCard>

      {data.error ? (
        <SectionCard title="Lecture partielle" eyebrow="Erreur">
          <p className="text-sm text-muted-foreground">{data.error}</p>
        </SectionCard>
      ) : null}
    </div>
  );
}
