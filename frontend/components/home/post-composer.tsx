"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";

import { AppButton } from "@/components/app/app-button";
import { AppInput } from "@/components/app/app-input";
import { AppSelect } from "@/components/app/app-select";
import { AppTextarea } from "@/components/app/app-textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { politicalBlocs } from "@/lib/data/political-taxonomy";

const DRAFT_KEY = "politicoresto.post.draft.v1";

type PostDraft = {
  title: string;
  body: string;
  source_url: string;
  category: string;
};

function buildDefaultDraft(): PostDraft {
  return {
    title: "",
    body: "",
    source_url: "",
    category: ""
  };
}

export function PostComposer({
  action,
  redirectPath = "/"
}: {
  action: (formData: FormData) => Promise<void>;
  redirectPath?: string;
}) {
  const [draft, setDraft] = useState<PostDraft>(buildDefaultDraft);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as PostDraft;
      setDraft({
        title: parsed.title ?? "",
        body: parsed.body ?? "",
        source_url: parsed.source_url ?? "",
        category: parsed.category ?? ""
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
    if (!draft.title.trim() && !draft.body.trim()) return "Vide";
    return `Sauvegarde ${lastSavedAt ?? ""}`.trim();
  }, [draft.body, draft.title, lastSavedAt]);

  return (
    <section className="app-card mx-auto w-full max-w-4xl space-y-4 p-4">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Post Composer</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Nouveau post</h1>
        <p className="text-sm text-muted-foreground">Brouillon: {draftState}</p>
      </header>

      <Tabs defaultValue="post" className="space-y-3">
        <TabsList>
          <TabsTrigger value="post">Post</TabsTrigger>
          <TabsTrigger value="poll" disabled>Sondages (bientot)</TabsTrigger>
          <TabsTrigger value="bet" disabled>Paris (bientot)</TabsTrigger>
        </TabsList>
      </Tabs>

      <form action={action} className="space-y-4">
        <input type="hidden" name="redirect_path" value={redirectPath} />

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
          <span className="text-xs font-medium text-muted-foreground">Corps</span>
          <AppTextarea
            name="body"
            required
            rows={9}
            value={draft.body}
            onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
            placeholder="Expliquez votre point de vue"
            className="resize-y px-4 py-3"
          />
        </label>

        <label className="space-y-2 block">
          <span className="text-xs font-medium text-muted-foreground">Categorie</span>
          <AppSelect
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

        <footer className="flex flex-wrap items-center justify-end gap-2">
          <AppButton variant="secondary" render={<Link href={redirectPath as Route} />}>
            Annuler
          </AppButton>
          <AppButton type="submit">Publier le post</AppButton>
        </footer>
      </form>
    </section>
  );
}

