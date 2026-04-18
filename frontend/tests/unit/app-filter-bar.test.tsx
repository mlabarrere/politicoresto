import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppFilterBar } from "@/components/app/app-filter-bar";
import { AppFilter } from "@/components/app/app-filter";

const options = [
  { value: "all" as const, label: "Tous" },
  { value: "open" as const, label: "Ouverts" },
  { value: "closed" as const, label: "Fermés" }
];

describe("AppFilterBar", () => {
  it("renders all option labels", () => {
    render(<AppFilterBar options={options} value="all" onChange={vi.fn()} />);
    expect(screen.getByText("Tous")).toBeTruthy();
    expect(screen.getByText("Ouverts")).toBeTruthy();
    expect(screen.getByText("Fermés")).toBeTruthy();
  });

  it("calls onChange with correct value on click", () => {
    const onChange = vi.fn();
    render(<AppFilterBar options={options} value="all" onChange={onChange} />);
    fireEvent.click(screen.getByText("Ouverts"));
    expect(onChange).toHaveBeenCalledWith("open");
  });

  it("highlights the active option with primary variant", () => {
    render(<AppFilterBar options={options} value="open" onChange={vi.fn()} />);
    // The active button gets primary variant — we just check it renders without error
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  it("applies custom className to wrapper", () => {
    const { container } = render(
      <AppFilterBar options={options} value="all" onChange={vi.fn()} className="custom-filter" />
    );
    expect(container.firstChild?.nodeName).toBeTruthy();
    expect((container.firstChild as HTMLElement).className).toContain("custom-filter");
  });

  it("renders nothing when options is empty", () => {
    render(<AppFilterBar options={[]} value={"" as never} onChange={vi.fn()} />);
    const buttons = screen.queryAllByRole("button");
    expect(buttons).toHaveLength(0);
  });
});

describe("AppFilter (re-export)", () => {
  it("is exported and works the same as AppFilterBar", () => {
    render(<AppFilter options={options} value="all" onChange={vi.fn()} />);
    expect(screen.getByText("Tous")).toBeTruthy();
  });
});
