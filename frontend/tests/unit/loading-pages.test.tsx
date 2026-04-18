import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomeLoading from "@/app/loading";
import LoadingPostDetail from "@/app/(public)/post/[slug]/loading";
import { SectionCard } from "@/components/layout/section-card";

describe("HomeLoading", () => {
  it("renders without crashing", () => {
    const { container } = render(<HomeLoading />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders multiple skeleton elements", () => {
    const { container } = render(<HomeLoading />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("LoadingPostDetail", () => {
  it("renders without crashing", () => {
    const { container } = render(<LoadingPostDetail />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders skeleton elements", () => {
    const { container } = render(<LoadingPostDetail />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("SectionCard", () => {
  it("renders title and children", () => {
    const { getByText } = render(
      <SectionCard title="Mon titre">
        <p>Contenu</p>
      </SectionCard>
    );
    expect(getByText("Mon titre")).toBeTruthy();
    expect(getByText("Contenu")).toBeTruthy();
  });

  it("renders eyebrow when provided", () => {
    const { getByText } = render(
      <SectionCard title="Titre" eyebrow="Catégorie">
        <p>Corps</p>
      </SectionCard>
    );
    expect(getByText("Catégorie")).toBeTruthy();
  });

  it("does not render eyebrow when absent", () => {
    const { queryByText } = render(
      <SectionCard title="Titre">
        <p>Corps</p>
      </SectionCard>
    );
    expect(queryByText("Catégorie")).toBeNull();
  });

  it("renders aside slot", () => {
    const { getByText } = render(
      <SectionCard title="Titre" aside={<button>Modifier</button>}>
        <p>Corps</p>
      </SectionCard>
    );
    expect(getByText("Modifier")).toBeTruthy();
  });

  it("applies custom className to wrapper", () => {
    const { container } = render(
      <SectionCard title="Titre" className="custom-section">
        <p>Corps</p>
      </SectionCard>
    );
    expect(container.innerHTML).toContain("custom-section");
  });
});
