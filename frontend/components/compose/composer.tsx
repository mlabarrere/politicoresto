import { createThreadAction } from "@/lib/actions/threads";
import { Button } from "@/components/ui/button";

export function Composer({
  title = "Lancer un thread",
  entityId,
  spaceId,
  redirectPath
}: {
  title?: string;
  entityId?: string | null;
  spaceId?: string | null;
  redirectPath: string;
}) {
  return (
    <form action={createThreadAction} className="rounded-2xl border border-border bg-card p-4">
      <input type="hidden" name="entity_id" value={entityId ?? ""} />
      <input type="hidden" name="space_id" value={spaceId ?? ""} />
      <input type="hidden" name="redirect_path" value={redirectPath} />

      <div className="space-y-3">
        <div>
          <p className="eyebrow">{title}</p>
          <input
            name="title"
            required
            placeholder="Titre du thread"
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none"
          />
        </div>

        <input
          name="source_url"
          placeholder="Lien (optionnel)"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none"
        />

        <textarea
          name="body"
          rows={6}
          required
          placeholder="Expliquez votre point de vue. Les retours a la ligne seront conserves."
          className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none"
        />

        <div className="flex justify-end">
          <Button type="submit" size="sm">
            Publier le thread
          </Button>
        </div>
      </div>
    </form>
  );
}
