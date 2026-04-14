import { SectionCard } from "@/components/layout/section-card";
import {
  clearPrivateProfileAction,
  upsertPrivateProfileAction
} from "@/lib/actions/vault";
import { getVaultSettingsData } from "@/lib/data/authenticated/vault";

export default async function MeSettingsPage() {
  const data = await getVaultSettingsData();

  return (
    <div className="space-y-6">
      <SectionCard title="Mon histoire politique" eyebrow="Profil prive">
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
            <span className="text-muted-foreground">Mon histoire personnelle</span>
            <textarea
              name="notes_private"
              rows={6}
              defaultValue={data.profile?.notes_private ?? ""}
              placeholder="Pourquoi vous participez aux discussions, vos convictions, votre parcours..."
              className="mt-1 w-full rounded-xl border border-border px-3 py-2"
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
              Enregistrer
            </button>
            <button type="submit" formAction={clearPrivateProfileAction} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground">
              Vider
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Confidentialite" eyebrow="Prive">
        <div className="space-y-2 text-sm leading-7 text-muted-foreground">
          <p>Vos donnees restent privees. Le MVP se concentre sur le forum public.</p>
          <p>Une couche de sondages plus avancee pourra etre ajoutee plus tard.</p>
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
