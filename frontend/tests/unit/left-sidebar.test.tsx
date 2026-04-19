import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LeftSidebar } from "@/components/home/left-sidebar";

describe("LeftSidebar", () => {
  it("renders sondages section", () => {
    render(<LeftSidebar activeFilter={null} onFilterChange={vi.fn()} />);
    expect(screen.getByText("Sondages")).toBeTruthy();
  });

  it("renders En cours and Passé filter buttons", () => {
    render(<LeftSidebar activeFilter={null} onFilterChange={vi.fn()} />);
    expect(screen.getByText("En cours")).toBeTruthy();
    expect(screen.getByText("Passé")).toBeTruthy();
  });

  it("renders political blocs section", () => {
    render(<LeftSidebar activeFilter={null} onFilterChange={vi.fn()} />);
    expect(screen.getByText("Couleur politique")).toBeTruthy();
  });

  it("renders all political bloc labels", () => {
    render(<LeftSidebar activeFilter={null} onFilterChange={vi.fn()} />);
    // At least gauche radicale and RN bloc should be there
    expect(screen.getByText("Gauche radicale a gauche")).toBeTruthy();
    expect(screen.getByText("Droite a extreme droite")).toBeTruthy();
  });

  it("calls onFilterChange with sondage filter on click", () => {
    const onChange = vi.fn();
    render(<LeftSidebar activeFilter={null} onFilterChange={onChange} />);
    fireEvent.click(screen.getByText("En cours"));
    expect(onChange).toHaveBeenCalledWith({ type: "sondage", status: "open" });
  });

  it("toggles filter off when clicking active filter", () => {
    const onChange = vi.fn();
    render(
      <LeftSidebar
        activeFilter={{ type: "sondage", status: "open" }}
        onFilterChange={onChange}
      />
    );
    fireEvent.click(screen.getByText("En cours"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("calls onFilterChange with politique filter on bloc click", () => {
    const onChange = vi.fn();
    render(<LeftSidebar activeFilter={null} onFilterChange={onChange} />);
    fireEvent.click(screen.getByText("Gauche radicale a gauche"));
    expect(onChange).toHaveBeenCalledWith({
      type: "politique",
      blocSlug: "gauche-radicale"
    });
  });

  it("highlights the active filter button", () => {
    render(
      <LeftSidebar
        activeFilter={{ type: "sondage", status: "open" }}
        onFilterChange={vi.fn()}
      />
    );
    // The active button should have bg-foreground class
    const button = screen.getByText("En cours").closest("button");
    expect(button?.className).toContain("bg-foreground");
  });
});
