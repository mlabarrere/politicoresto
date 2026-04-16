import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PostComposer } from "@/components/home/post-composer";

vi.mock("@/lib/data/political-taxonomy", () => ({
  politicalBlocs: []
}));

describe("Post composer tabs", () => {
  it("renders 3 tabs and poll info block", () => {
    render(<PostComposer action={async () => undefined} redirectPath="/" />);

    expect(screen.getByRole("tab", { name: "Post" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Sondage" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Paris (bientot)" })).toBeTruthy();
    expect(screen.getByText("Mode sondage")).toBeTruthy();
    expect(screen.getByText(/version brute et version redressee/)).toBeTruthy();
  });
});
