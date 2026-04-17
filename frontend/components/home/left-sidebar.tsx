import { AppCard } from "@/components/app/app-card";
import { politicalBlocs } from "@/lib/data/political-taxonomy";

export function LeftSidebar() {
  return (
    <aside className="hidden xl:block">
      <AppCard className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sondages</p>
        <div className="mt-3 space-y-2 text-sm">
          <p className="rounded-xl bg-muted px-3 py-2 text-foreground">En cours</p>
          <p className="rounded-xl bg-muted px-3 py-2 text-foreground">Passes</p>
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Couleur politique</p>
        <div className="mt-3 space-y-2">
          {politicalBlocs.map((bloc) => (
            <div key={bloc.slug} className="rounded-xl border border-border px-3 py-2">
              <p className="text-sm text-foreground">{bloc.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{bloc.description}</p>
            </div>
          ))}
        </div>
      </AppCard>
    </aside>
  );
}




