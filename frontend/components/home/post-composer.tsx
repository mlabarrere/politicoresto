"use client";

import { useEffect, useMemo, useState } from "react";

import { AppBanner } from "@/components/app/app-banner";
import { AppButton } from "@/components/app/app-button";
import { AppCard } from "@/components/app/app-card";
import { AppInput } from "@/components/app/app-input";
import { AppSelect } from "@/components/app/app-select";
import { AppTabs } from "@/components/app/app-tabs";
import { AppTextarea } from "@/components/app/app-textarea";
import { cn } from "@/lib/utils";
import type { SubjectView } from "@/lib/types/screens";

const DRAFT_KEY = "politicoresto.post.draft.v5";

const PARTY_OPTIONS = [
  { slug: "lfi", label: "🔴 LFI" },
  { slug: "ps", label: "🌹 PS" },
  { slug: "ecologistes", label: "🌿 Écologistes" },
  { slug: "renaissance", label: "🟡 Renaissance" },
  { slug: "modem", label: "🟡 MoDem" },
  { slug: "horizons", label: "🟡 Horizons" },
  { slug: "lr", label: "🔵 LR" },
  { slug: "udr", label: "🔵 UDR" },
  { slug: "rn", label: "⬛ RN" },
  { slug: "reconquete", label: "⬛ Reconquête" },
];

type PostDraft = {
  title: string;
  body: string;
  source_url: string;
  subject_ids: string[];
  party_tags: string[];
  mode: "post" | "poll";
  poll_question: string;
  poll_deadline_hours: string;
  poll_options: string[];
};

function buildDefaultDraft(): PostDraft {
  return {
    title: "",
    body: "",
    source_url: "",
    subject_ids: [],
    party_tags: [],
    mode: "post",
    poll_question: "",
    poll_deadline_hours: "24",
    poll_options: ["", ""]
  };
}

export function PostComposer({
  action,
  redirectPath = "/",
  initialError = null,
  subjects = []
}: {
  action: (formData: FormData) => Promise<void>;
  redirectPath?: string;
  initialError?: string | null;
  subjects?: SubjectView[];
}) {
  const [draft, setDraft] = useState<PostDraft>(buildDefaultDraft);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [draftSaveMode, setDraftSaveMode] = useState<"auto" | "manual">("auto");

  function persistDraft(nextDraft: PostDraft, mode: "auto" | "manual") {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(nextDraft));
    setLastSavedAt(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    setDraftSaveMode(mode);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<PostDraft>;
      setDraft({
        ...buildDefaultDraft(),
        title: parsed.title ?? "",
        body: parsed.body ?? "",
        source_url: parsed.source_url ?? "",
        subject_ids: Array.isArray(parsed.subject_ids) ? parsed.subject_ids.map(String) : [],
        party_tags: Array.isArray(parsed.party_tags) ? parsed.party_tags.map(String) : [],
        mode: parsed.mode === "poll" ? "poll" : "post",
        poll_question: parsed.poll_question ?? "",
        poll_deadline_hours: parsed.poll_deadline_hours ?? "24",
        poll_options:
          Array.isArray(parsed.poll_options) && parsed.poll_options.length >= 2
            ? parsed.poll_options.map((entry) => String(entry ?? ""))
            : ["", ""]
      });
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    persistDraft(draft, "auto");
  }, [draft]);

  useEffect(() => {
    if (!initialError) return;
    console.error("[PostComposer] initialError", { message: initialError });
  }, [initialError]);

  const draftState = useMemo(() => {
    if (!draft.title.trim() && !draft.body.trim() && !draft.poll_question.trim()) return "Vide";
    const prefix = draftSaveMode === "manual" ? "Sauvegarde manuelle" : "Sauvegarde auto";
    return `${prefix} ${lastSavedAt ?? ""}`.trim();
  }, [draft.body, draft.poll_question, draft.title, draftSaveMode, lastSavedAt]);

  function toggleSubject(id: string) {
    setDraft((prev) => ({
      ...prev,
      subject_ids: prev.subject_ids.includes(id)
        ? prev.subject_ids.filter((s) => s !== id)
        : [...prev.subject_ids, id]
    }));
  }

  function toggleParty(slug: string) {
    setDraft((prev) => {
      if (prev.party_tags.includes(slug)) {
        return { ...prev, party_tags: prev.party_tags.filter((p) => p !== slug) };
      }
      if (prev.party_tags.length >= 3) return prev;
      return { ...prev, party_tags: [...prev.party_tags, slug] };
    });
  }

  const postTab = (
    <div className="space-y-4">
      <label className="block space-y-2">
        <span className="text-xs font-medium text-muted-foreground">Corps (Markdown)</span>
        <AppTextarea
          name="body"
          required
          rows={9}
          value={draft.body}
          onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
          placeholder={"# Votre position\n\nExpliquez votre point de vue avec du **Markdown**."}
          className="resize-y"
        />
        <p className="text-xs text-muted-foreground">Format accepte: Markdown (titres, listes, liens, gras, italique).</p>
      </label>
    </div>
  );

  const pollTab = (
    <div className="space-y-4">
      <AppBanner
        title="Mode sondage"
        body="Deux resultats seront affiches: version brute et version redressee automatiquement selon l'historique de vote des repondants."
      />

      <section className="space-y-3 rounded-xl border border-dashed border-border p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Configuration du sondage</p>

        <label className="block space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Question</span>
          <AppInput
            name="poll_question"
            required={draft.mode === "poll"}
            value={draft.poll_question}
            onChange={(event) => setDraft((prev) => ({ ...prev, poll_question: event.target.value }))}
            placeholder="Question unique"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Deadline</span>
          <AppSelect
            name="poll_deadline_hours"
            value={draft.poll_deadline_hours}
            onChange={(event) => setDraft((prev) => ({ ...prev, poll_deadline_hours: event.target.value }))}
          >
            <option value="6">6h</option>
            <option value="12">12h</option>
            <option value="24">24h</option>
            <option value="36">36h</option>
            <option value="48">48h</option>
          </AppSelect>
        </label>

        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Options</span>
          {draft.poll_options.map((option, index) => (
            <div key={`poll-option-${index}`} className="flex items-center gap-2">
              <AppInput
                required={draft.mode === "poll" && index < 2}
                name="poll_options"
                value={option}
                onChange={(event) => {
                  const next = [...draft.poll_options];
                  next[index] = event.target.value;
                  setDraft((prev) => ({ ...prev, poll_options: next }));
                }}
                placeholder={`Option ${index + 1}`}
              />
              {draft.poll_options.length > 2 ? (
                <AppButton
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setDraft((prev) => ({
                      ...prev,
                      poll_options: prev.poll_options.filter((_, idx) => idx !== index)
                    }));
                  }}
                >
                  Retirer
                </AppButton>
              ) : null}
            </div>
          ))}
        </div>

        <AppButton
          type="button"
          variant="secondary"
          onClick={() =>
            setDraft((prev) => ({
              ...prev,
              poll_options: [...prev.poll_options, ""]
            }))
          }
        >
          Ajouter option
        </AppButton>
      </section>
    </div>
  );

  return (
    <AppCard className="mx-auto w-full max-w-4xl space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Post Composer</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Nouveau post</h1>
        <p className="text-sm text-muted-foreground">Brouillon: {draftState}</p>
      </header>
      {initialError ? (
        <AppBanner
          title="Publication impossible"
          body={initialError}
          tone="warning"
        />
      ) : null}

      <form action={action} className="space-y-4">
        <input type="hidden" name="redirect_path" value={redirectPath} />
        <input type="hidden" name="post_mode" value={draft.mode} />
        <input type="hidden" name="body_format" value="markdown" />
        {draft.subject_ids.map((id) => (
          <input key={id} type="hidden" name="subject_ids" value={id} />
        ))}
        {draft.party_tags.map((slug) => (
          <input key={slug} type="hidden" name="party_tags" value={slug} />
        ))}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Titre</span>
            <AppInput
              name="title"
              required
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Titre du post"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Lien source (optionnel)</span>
            <AppInput
              name="source_url"
              value={draft.source_url}
              onChange={(event) => setDraft((prev) => ({ ...prev, source_url: event.target.value }))}
              placeholder="https://..."
            />
          </label>
        </div>

        {subjects.length > 0 ? (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Sujets</span>
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => {
                const active = draft.subject_ids.includes(subject.id);
                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => toggleSubject(subject.id)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "bg-foreground text-background"
                        : "bg-muted text-foreground hover:bg-muted/70"
                    )}
                  >
                    {subject.emoji} {subject.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            Partis mentionnés{" "}
            <span className="text-muted-foreground/60">(max 3)</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {PARTY_OPTIONS.map((party) => {
              const active = draft.party_tags.includes(party.slug);
              const disabled = !active && draft.party_tags.length >= 3;
              return (
                <button
                  key={party.slug}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleParty(party.slug)}
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground hover:bg-muted/70",
                    disabled && "cursor-not-allowed opacity-40"
                  )}
                >
                  {party.label}
                </button>
              );
            })}
          </div>
        </div>

        <AppTabs
          value={draft.mode}
          onValueChange={(mode) => setDraft((prev) => ({ ...prev, mode: mode === "poll" ? "poll" : "post" }))}
          items={[
            { key: "post", label: "Post", content: postTab },
            { key: "poll", label: "Sondage", content: pollTab }
          ]}
        />

        <footer className="flex flex-wrap items-center justify-end gap-2">
          <AppButton
            type="button"
            variant="ghost"
            onClick={() => persistDraft(draft, "manual")}
          >
            Enregistrer le brouillon
          </AppButton>
          <AppButton variant="secondary" href={redirectPath}>Annuler</AppButton>
          <AppButton type="submit">Publier le post</AppButton>
        </footer>
      </form>
    </AppCard>
  );
}
