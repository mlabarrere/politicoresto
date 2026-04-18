import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AppBadge } from "@/components/app/app-badge";
import { AppBanner } from "@/components/app/app-banner";
import { AppCard } from "@/components/app/app-card";
import { AppPrivacyBadge } from "@/components/app/app-privacy-badge";

describe("Skeleton", () => {
  it("renders a skeleton div", () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector('[data-slot="skeleton"]');
    expect(el).toBeTruthy();
  });

  it("applies custom className", () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const el = container.querySelector('[data-slot="skeleton"]') as HTMLElement;
    expect(el.className).toContain("h-4");
    expect(el.className).toContain("w-32");
  });
});

describe("Separator", () => {
  it("renders a separator element", () => {
    const { container } = render(<Separator />);
    const el = container.querySelector('[data-slot="separator"]');
    expect(el).toBeTruthy();
  });

  it("defaults to horizontal orientation", () => {
    const { container } = render(<Separator />);
    const el = container.querySelector('[data-slot="separator"]');
    expect(el).toBeTruthy();
  });
});

describe("AppBadge", () => {
  it("renders label text", () => {
    render(<AppBadge label="Ouvert" />);
    expect(screen.getByText("Ouvert")).toBeTruthy();
  });

  it("renders with default tone", () => {
    const { container } = render(<AppBadge label="Default" />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders with accent tone", () => {
    render(<AppBadge label="Accent" tone="accent" />);
    expect(screen.getByText("Accent")).toBeTruthy();
  });

  it("renders with danger tone", () => {
    render(<AppBadge label="Danger" tone="danger" />);
    expect(screen.getByText("Danger")).toBeTruthy();
  });

  it("renders with success tone", () => {
    render(<AppBadge label="Success" tone="success" />);
    expect(screen.getByText("Success")).toBeTruthy();
  });

  it("renders with warning tone", () => {
    render(<AppBadge label="Warning" tone="warning" />);
    expect(screen.getByText("Warning")).toBeTruthy();
  });

  it("renders with info tone", () => {
    render(<AppBadge label="Info" tone="info" />);
    expect(screen.getByText("Info")).toBeTruthy();
  });

  it("renders with muted tone", () => {
    render(<AppBadge label="Muted" tone="muted" />);
    expect(screen.getByText("Muted")).toBeTruthy();
  });
});

describe("AppBanner", () => {
  it("renders title and body", () => {
    render(<AppBanner title="Attention" body="Voici un avertissement." />);
    expect(screen.getByText("Attention")).toBeTruthy();
    expect(screen.getByText("Voici un avertissement.")).toBeTruthy();
  });

  it("renders children", () => {
    render(
      <AppBanner title="Info" body="Corps">
        <button>Action</button>
      </AppBanner>
    );
    expect(screen.getByText("Action")).toBeTruthy();
  });

  it("renders with warning tone", () => {
    const { container } = render(<AppBanner title="Warning" body="Attention" tone="warning" />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders with danger tone", () => {
    const { container } = render(<AppBanner title="Danger" body="Critique" tone="danger" />);
    expect(container.firstChild).toBeTruthy();
  });

  it("applies custom className", () => {
    const { container } = render(<AppBanner title="T" body="B" className="custom-banner" />);
    expect(container.innerHTML).toContain("custom-banner");
  });
});

describe("AppCard", () => {
  it("renders children content", () => {
    render(
      <AppCard>
        <p>Contenu de la carte</p>
      </AppCard>
    );
    expect(screen.getByText("Contenu de la carte")).toBeTruthy();
  });

  it("renders as section by default", () => {
    const { container } = render(<AppCard>test</AppCard>);
    expect(container.querySelector("section")).toBeTruthy();
  });

  it("renders as custom element with 'as' prop", () => {
    const { container } = render(<AppCard as="article">test</AppCard>);
    expect(container.querySelector("article")).toBeTruthy();
  });

  it("applies custom className", () => {
    const { container } = render(<AppCard className="my-card">test</AppCard>);
    const el = container.querySelector("section") as HTMLElement;
    expect(el.className).toContain("my-card");
  });
});

describe("AppPrivacyBadge", () => {
  it("renders default label 'Prive'", () => {
    render(<AppPrivacyBadge />);
    expect(screen.getByText("Prive")).toBeTruthy();
  });

  it("renders custom label", () => {
    render(<AppPrivacyBadge label="Confidentiel" />);
    expect(screen.getByText("Confidentiel")).toBeTruthy();
  });
});
