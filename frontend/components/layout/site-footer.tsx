export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
        <div className="space-y-2">
          <p className="eyebrow">Politicoresto</p>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Feed public presidentielle, discussions lisibles, sondages et vault prive separe.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Une interface sobre pour lire, suivre et retrouver les sujets importants.
        </p>
      </div>
    </footer>
  );
}
