import { AppAccountShell } from "@/components/app/app-account-shell";
import { AppAvatarUploader } from "@/components/app/app-avatar-uploader";
import { AppBanner } from "@/components/app/app-banner";
import { AppButton } from "@/components/app/app-button";
import { AppCard } from "@/components/app/app-card";
import { AppCommentHistoryList } from "@/components/app/app-comment-history-list";
import { AppCheckbox } from "@/components/app/app-checkbox";
import { AppDangerZone } from "@/components/app/app-danger-zone";
import { AppDraftList } from "@/components/app/app-draft-list";
import { AppInput } from "@/components/app/app-input";
import { AppPostHistoryList } from "@/components/app/app-post-history-list";
import { AppPrivacyBadge } from "@/components/app/app-privacy-badge";
import { AppPrivateNotice } from "@/components/app/app-private-notice";
import { AppTextarea } from "@/components/app/app-textarea";
import { AppUsernameField } from "@/components/app/app-username-field";
import { AppVoteHistoryEditor } from "@/components/app/app-vote-history-editor";
import { AppVoteHistoryList } from "@/components/app/app-vote-history-list";
import {
  clearPrivateProfileAction,
  deactivateAccountAction,
  deleteAccountAction,
  upsertAccountIdentityAction,
  upsertPrivateProfileAction
} from "@/lib/actions/account";
import { ACCOUNT_SECTIONS, resolveAccountSection } from "@/lib/account/sections";
import { getAccountWorkspaceData } from "@/lib/data/authenticated/account-workspace";
import { getVoteHistoryEditorData } from "@/lib/data/authenticated/vote-history";

type SearchParams = Promise<{ section?: string; error?: string }>;

export default async function MePage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const section = resolveAccountSection(params.section);
  const data = await getAccountWorkspaceData();
  const voteEditor = section === "votes" ? await getVoteHistoryEditorData() : null;

  const heading = ACCOUNT_SECTIONS.find((item) => item.key === section)?.label ?? "Profil";

  return (
    <AppAccountShell
      section={section}
      navItems={ACCOUNT_SECTIONS.map((item) => ({
        key: item.key,
        label: item.label,
        description: item.description
      }))}
      heading={heading}
      subheading="Workspace personnel, prive par defaut, standardise Catalyst."
    >
      <div className="space-y-4">
        {params.error ? <AppBanner title="Action impossible" body={params.error} tone="warning" /> : null}

        {section === "profile" ? (
          <div className="space-y-4">
            <AppCard className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-foreground">Identite publique</h2>
                <AppPrivacyBadge label="Public" />
              </div>

              <form action={upsertAccountIdentityAction} className="space-y-4">
                <input type="hidden" name="redirect_path" value="/me?section=profile" />
                <AppAvatarUploader defaultValue={data.profile?.avatar_url ?? null} />

                <label className="block space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Nom public</span>
                  <AppInput name="display_name" required defaultValue={data.profile?.display_name ?? ""} />
                </label>

                <AppUsernameField defaultValue={data.profile?.username ?? ""} />

                <label className="block space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Bio publique</span>
                  <AppTextarea name="bio" rows={3} defaultValue={data.profile?.bio ?? ""} />
                </label>

                <label className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm text-foreground">
                  <AppCheckbox
                    name="is_public_profile_enabled"
                    defaultChecked={Boolean(data.profile?.is_public_profile_enabled)}
                    className="mt-0.5"
                  />
                  <span>
                    Profil public actif
                    <span className="mt-1 block text-xs text-muted-foreground">Apercu visible par les autres membres.</span>
                  </span>
                </label>

                <div className="flex justify-end">
                  <AppButton type="submit">Enregistrer le profil</AppButton>
                </div>
              </form>
            </AppCard>

            <AppCard className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-foreground">Informations privees</h2>
                <AppPrivacyBadge />
              </div>

              <AppPrivateNotice message="Visible uniquement par vous" />

              <form action={upsertPrivateProfileAction} className="space-y-4">
                <input type="hidden" name="redirect_path" value="/me?section=profile" />

                <label className="block space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Email (non public)</span>
                  <AppInput value={data.email} disabled readOnly />
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Notes personnelles</span>
                  <AppTextarea
                    name="notes_private"
                    rows={5}
                    defaultValue={data.privateProfile?.notes_private ?? ""}
                    placeholder="Visible uniquement par vous"
                  />
                </label>

                <div className="flex flex-wrap justify-end gap-2">
                  <AppButton type="submit" variant="secondary" formAction={clearPrivateProfileAction}>
                    Vider
                  </AppButton>
                  <AppButton type="submit">Enregistrer</AppButton>
                </div>
              </form>
            </AppCard>
          </div>
        ) : null}

        {section === "votes" ? (
          <div className="space-y-4">
            <AppPrivateNotice message="Historique prive. Visible uniquement par vous. Sert au redressement anonymise des sondages." />
            {voteEditor ? (
              <AppVoteHistoryEditor
                elections={voteEditor.elections}
                votesByElectionId={voteEditor.votesByElectionId}
                status={voteEditor.status}
                message={voteEditor.message}
              />
            ) : null}
            <details className="rounded-2xl border border-border bg-card p-4">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">
                Journal brut
              </summary>
              <div className="mt-3">
                <AppVoteHistoryList
                  items={data.voteHistory}
                  status={data.sectionStatus.votes.state}
                  message={data.sectionStatus.votes.message}
                />
              </div>
            </details>
          </div>
        ) : null}

        {section === "drafts" ? (
          <AppDraftList
            items={data.drafts}
            status={data.sectionStatus.drafts.state}
            message={data.sectionStatus.drafts.message}
          />
        ) : null}

        {section === "posts" ? (
          <AppPostHistoryList
            items={data.publications}
            status={data.sectionStatus.posts.state}
            message={data.sectionStatus.posts.message}
          />
        ) : null}

        {section === "comments" ? (
          <AppCommentHistoryList
            items={data.comments}
            status={data.sectionStatus.comments.state}
            message={data.sectionStatus.comments.message}
          />
        ) : null}

        {section === "security" ? (
          <div className="space-y-4">
            <AppCard className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Compte & securite</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{data.email || "Non disponible"}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Methode de connexion</p>
                  <p className="mt-1 text-sm font-medium text-foreground">OAuth (Google)</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <AppButton variant="secondary" href="/api/account/export">
                  Exporter mes donnees
                </AppButton>
                <AppButton variant="ghost" href="/me?section=profile">
                  Gerer le profil
                </AppButton>
              </div>
            </AppCard>

            <AppDangerZone onDeactivate={deactivateAccountAction} onDelete={deleteAccountAction} />
          </div>
        ) : null}

      </div>
    </AppAccountShell>
  );
}
