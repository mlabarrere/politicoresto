import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { PostComposer } from "@/components/home/post-composer";

vi.mock("@/lib/data/political-taxonomy", () => ({
  politicalBlocs: []
}));

// Ensure localStorage is available in jsdom environment
beforeAll(() => {
  if (typeof window.localStorage === "undefined" || typeof window.localStorage.getItem !== "function") {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); }
    });
  }
});

describe("Post composer tabs", () => {
  it("renders 3 tabs and poll info block", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <PostComposer
        action={async () => undefined}
        redirectPath="/"
        initialError="Publication impossible pour le moment. Reessayez."
      />
    );

    expect(screen.getByRole("tab", { name: "Post" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Sondage" })).toBeTruthy();
    expect(screen.getByText("Publication impossible")).toBeTruthy();
    expect(screen.getByText("Publication impossible pour le moment. Reessayez.")).toBeTruthy();
    expect(screen.getByText("Mode sondage")).toBeTruthy();
    expect(screen.getByText(/version brute et version redressee automatiquement/)).toBeTruthy();
    expect(screen.getByText("Corps (Markdown)")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Enregistrer le brouillon" })).toBeTruthy();
    expect(consoleErrorSpy).toHaveBeenCalledWith("[PostComposer] initialError", {
      message: "Publication impossible pour le moment. Reessayez."
    });

    consoleErrorSpy.mockRestore();
  });
});
