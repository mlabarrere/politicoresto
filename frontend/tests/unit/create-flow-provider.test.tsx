import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppPrimaryCTA } from "@/components/app/app-primary-cta";
import { CreateFlowProvider } from "@/components/layout/create-flow-provider";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/category/europe"
}));

vi.mock("@/lib/data/political-taxonomy", () => ({
  politicalBlocs: []
}));

describe("CreateFlowProvider", () => {
  it("opens one shared drawer with required tabs from global CTA", () => {
    render(
      <CreateFlowProvider isAuthenticated action={async () => undefined}>
        <AppPrimaryCTA />
      </CreateFlowProvider>
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Cr.+er/i })[0]);

    expect(screen.getByRole("tab", { name: "Post" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sondage" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Paris (bientot)" })).toBeInTheDocument();
  });

  it("renders mobile FAB entrypoint", () => {
    render(
      <CreateFlowProvider isAuthenticated action={async () => undefined}>
        <div>page</div>
      </CreateFlowProvider>
    );

    expect(screen.getByRole("button", { name: /Cr.+er/i })).toBeInTheDocument();
  });
});
