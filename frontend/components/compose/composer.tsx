import { createThreadAction } from "@/lib/actions/threads";

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
            placeholder="Titre du thread"
            className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none"
          />
        </div>
        <textarea
          name="description"
          rows={4}
          placeholder="Contexte court. Angle. Ce qu'il faut suivre."
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none"
        />
        <div className="flex justify-end">
          <button type="submit" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
            Publier
          </button>
        </div>
      </div>
    </form>
  );
}
