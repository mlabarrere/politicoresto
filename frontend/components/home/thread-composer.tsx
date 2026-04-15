"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { politicalBlocs } from "@/lib/data/political-taxonomy";
import { cn } from "@/lib/utils";

const DRAFT_KEY = "politicoresto.thread.draft.v1";
const TAGS = ["economie", "europe", "ecologie", "institutions", "societe"];

type ThreadDraft = {
  title: string;
  body: string;
  source_url: string;
  category: string;
  tags: string[];
  mediaNames: string[];
};

function buildDefaultDraft(): ThreadDraft {
  return {
    title: "",
    body: "",
    source_url: "",
    category: "",
    tags: [],
    mediaNames: []
  };
}

export function ThreadComposer({
  action,
  redirectPath = "/"
}: {
  action: (formData: FormData) => Promise<void>;
  redirectPath?: string;
}) {
  const [draft, setDraft] = useState<ThreadDraft>(buildDefaultDraft);
  const [preview, setPreview] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as ThreadDraft;
      setDraft({
        title: parsed.title ?? "",
        body: parsed.body ?? "",
        source_url: parsed.source_url ?? "",
        category: parsed.category ?? "",
        tags: Array.isArray(parsed.tags) ? parsed.tags.filter(Boolean) : [],
        mediaNames: Array.isArray(parsed.mediaNames) ? parsed.mediaNames.filter(Boolean) : []
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
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Thread Composer</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Nouveau thread</h1>
        <p className="text-sm text-muted-foreground">Brouillon: {draftState}</p>
      </header>

      <form action={action} className="space-y-4">
        <input type="hidden" name="redirect_path" value={redirectPath} />
        <input type="hidden" name="entity_id" value="" />
        <input type="hidden" name="space_id" value="" />
        <input type="hidden" name="close_at" value="" />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Titre</span>
            <Input
              name="title"
              required
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Titre du thread"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Lien source (optionnel)</span>
            <Input
              name="source_url"
              value={draft.source_url}
              onChange={(event) => setDraft((prev) => ({ ...prev, source_url: event.target.value }))}
              placeholder="https://..."
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Corps</span>
          <Textarea
            name="body"
            required
            rows={9}
            value={draft.body}
            onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
            placeholder="Expliquez votre point de vue"
            className="resize-y px-4 py-3"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Categorie</span>
            <Select
              value={draft.category}
              onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
            >
              <option value="">Selectionner</option>
              {politicalBlocs.map((bloc) => (
                <option key={bloc.slug} value={bloc.slug}>
                  {bloc.label}
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Media (placeholder)</span>
            <Input
              type="file"
              multiple
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  mediaNames: Array.from(event.target.files ?? []).map((file) => file.name)
                }))
              }
            />
          </label>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-muted-foreground">Tags / Flair</legend>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => {
              const checked = draft.tags.includes(tag);
              return (
                <label key={tag} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        tags: event.target.checked
                          ? [...prev.tags, tag]
                          : prev.tags.filter((item) => item !== tag)
                      }))
                    }
                  />
                  <span>{tag}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <section className="rounded-2xl border border-border bg-background p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Preview</p>
            <Button type="button" size="sm" variant="outline" onClick={() => setPreview((value) => !value)}>
              {preview ? "Masquer" : "Afficher"}
            </Button>
          </div>
          {preview ? (
            <div className="mt-3 space-y-2">
              <h2 className="text-lg font-semibold text-foreground">{draft.title || "Sans titre"}</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{draft.body || "Aucun contenu"}</p>
              <p className="text-xs text-muted-foreground">Categorie: {draft.category || "Aucune"} â€¢ Tags: {draft.tags.join(", ") || "Aucun"}</p>
              {draft.mediaNames.length ? (
                <p className="text-xs text-muted-foreground">Media: {draft.mediaNames.join(", ")}</p>
              ) : null}
            </div>
          ) : null}
        </section>

        <footer className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href={redirectPath as Route}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Annuler
          </Link>
          <Button type="submit">Publier le thread</Button>
        </footer>
      </form>
    </section>
  );
}


