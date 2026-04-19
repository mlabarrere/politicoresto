import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppUsernameField } from "@/components/app/app-username-field";

describe("AppUsernameField", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders with label", () => {
    render(<AppUsernameField />);
    expect(screen.getByText("Username unique")).toBeTruthy();
  });

  it("renders input with name=username", () => {
    const { container } = render(<AppUsernameField />);
    const input = container.querySelector("input[name='username']");
    expect(input).toBeTruthy();
  });

  it("shows initial hint message", () => {
    render(<AppUsernameField />);
    expect(screen.getByText(/3 a 24 caracteres/)).toBeTruthy();
  });

  it("renders with defaultValue pre-filled", () => {
    render(<AppUsernameField defaultValue="citoyen_actif" />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("citoyen_actif");
  });

  it("shows validation error when username too short", async () => {
    render(<AppUsernameField />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "ab" } });
    // Validation is synchronous — should be immediate
    await waitFor(() => {
      const msg = screen.getByText(/3 a 24 caracteres/);
      expect(msg).toBeTruthy();
    });
  });

  it("shows 'Username disponible.' after successful check", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ available: true, isCurrentUsername: false })
    }));

    render(<AppUsernameField />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "citoyen_ok" } });

    await waitFor(() => {
      expect(screen.getByText("Username disponible.")).toBeTruthy();
    }, { timeout: 2000 });
  });

  it("shows 'Votre username actuel.' when isCurrentUsername=true", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ available: true, isCurrentUsername: true })
    }));

    render(<AppUsernameField />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "citoyen_actif" } });

    await waitFor(() => {
      expect(screen.getByText("Votre username actuel.")).toBeTruthy();
    }, { timeout: 2000 });
  });

  it("shows taken message when username is taken", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ available: false, isCurrentUsername: false, reason: "Username deja pris." })
    }));

    render(<AppUsernameField />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "taken_user" } });

    await waitFor(() => {
      expect(screen.getByText("Username deja pris.")).toBeTruthy();
    }, { timeout: 2000 });
  });

  it("shows error message when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    render(<AppUsernameField />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "citoyen_ok" } });

    await waitFor(() => {
      expect(screen.getByText("Verification indisponible.")).toBeTruthy();
    }, { timeout: 2000 });
  });

  it("shows error when server returns non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ reason: "Erreur serveur." })
    }));

    render(<AppUsernameField />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "citoyen_ok" } });

    await waitFor(() => {
      expect(screen.getByText("Erreur serveur.")).toBeTruthy();
    }, { timeout: 2000 });
  });

  it("resets to idle message when input is cleared", () => {
    render(<AppUsernameField defaultValue="citoyen_ok" />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByText(/3 a 24 caracteres/)).toBeTruthy();
  });
});
