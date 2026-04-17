import { politicalBlocs } from "@/lib/data/political-taxonomy";

export function PoliticalBlocSidebar() {
  return (
    <section className="rounded-3xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Couleur politique</p>
      <div className="mt-3 space-y-2">
        {politicalBlocs.map((bloc) => {
          return (
            <div key={bloc.slug} className="rounded-2xl border border-border px-3 py-2">
              <span className="block">{bloc.label}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {bloc.description}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
