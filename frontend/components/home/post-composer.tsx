"use client";

import { useEffect, useMemo, useState } from "react";

import { AppBanner } from "@/components/app/app-banner";
import { AppButton } from "@/components/app/app-button";
import { AppCard } from "@/components/app/app-card";
import { AppInput } from "@/components/app/app-input";
import { AppSelect } from "@/components/app/app-select";
import { AppTabs } from "@/components/app/app-tabs";
import { AppTextarea } from "@/components/app/app-textarea";
import { politicalBlocs } from "@/lib/data/political-taxonomy";

const DRAFT_KEY = "politicoresto.post.draft.v3";

type PostDraft = {
  title: string;
  body: string;
  source_url: string;
  category: string;
  mode: "post" | "poll" | "bet";
  poll_question: string;
  poll_deadline_hours: string;
  poll_options: string[];
  poll_context: string;
};

function buildDefaultDraft(): PostDraft {
  return {
    title: "",
    body: "",
    source_url: "",
    category: "",
    mode: "post",
    poll_question: "",
    poll_deadline_hours: "24",
    poll_options: ["", ""],
    poll_context: ""
  };
}

export function PostComposer({
  action,
  redirectPath = "/",
  initialError = null
}: {
  action: (formData: FormData) => Promise<void>;
  redirectPath?: string;
  initialError?: string | null;
}) {
  const [draft, setDraft] = useState<PostDraft>(buildDefaultDraft);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

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
        category: parsed.category ?? "",
        mode: parsed.mode === "poll" ? "poll" : parsed.mode === "bet" ? "bet" : "post",
        poll_question: parsed.poll_question ?? "",
        poll_deadline_hours: parsed.poll_deadline_hours ?? "24",
        poll_options:
          Array.isArray(parsed.poll_options) && parsed.poll_options.length >= 2
            ? parsed.poll_options.map((entry) => String(entry ?? ""))
            : ["", ""],
        poll_context: parsed.poll_context ?? ""
      });
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setLastSavedAt(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
  }, [draft]);

  const draftState = useMemo(() => {
    if (!draft.title.trim() && !draft.body.trim() && !draft.poll_question.trim()) return "Vide";
    return `Sauvegarde ${lastSavedAt ?? ""}`.trim();
  }, [draft.body, draft.poll_question, draft.title, lastSavedAt]);

  const postTab = (
    <div className="space-y-4">
      <label className="block space-y-2">
        <span className="text-xs font-medium text-muted-foreground">Corps</span>
        <AppTextarea
          name="body"
          required
          rows={9}
          value={draft.body}
          onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
          placeholder="Expliquez votre point de vue"
          className="resize-y"
        />
      </label>
    </div>
  );

  const pollTab = (
    <div className="space-y-4">
      <AppBanner
        title="Mode sondage"
        body="Deux resultats seront affiches: version brute et version redressee."
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

      <label className="block space-y-2">
        <span className="text-xs font-medium text-muted-foreground">Commentaire / contextualisation</span>
        <AppTextarea
          name="poll_context"
          rows={4}
          value={draft.poll_context}
          onChange={(event) => setDraft((prev) => ({ ...prev, poll_context: event.target.value }))}
          placeholder="Contexte politique, hypothese ou limites du sondage"
        />
      </label>
    </div>
  );

  const betTab = (
    <AppCard className="border-dashed bg-secondary/30">
      <p className="text-sm font-semibold text-foreground">Paris (bientot)</p>
      <p className="mt-1 text-sm text-muted-foreground">Onglet reserve, aucun workflow actif pour le moment.</p>
    </AppCard>
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
        <input type="hidden" name="post_mode" value={draft.mode === "bet" ? "post" : draft.mode} />

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

        <label className="block space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Categorie</span>
          <AppSelect
            name="category"
            value={draft.category}
            onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
          >
            <option value="">Selectionner</option>
            {politicalBlocs.map((bloc) => (
              <option key={bloc.slug} value={bloc.slug}>
                {bloc.label}
              </option>
            ))}
          </AppSelect>
        </label>

        <AppTabs
          value={draft.mode}
          onValueChange={(mode) => setDraft((prev) => ({ ...prev, mode: mode === "poll" ? "poll" : mode === "bet" ? "bet" : "post" }))}
          items={[
            { key: "post", label: "Post", content: postTab },
            { key: "poll", label: "Sondage", content: pollTab },
            { key: "bet", label: "Paris (bientot)", content: betTab, disabled: true }
          ]}
        />

        <footer className="flex flex-wrap items-center justify-end gap-2">
          <AppButton variant="secondary" href={redirectPath}>Annuler</AppButton>
          <AppButton type="submit">Publier le post</AppButton>
        </footer>
      </form>
    </AppCard>
  );
}
