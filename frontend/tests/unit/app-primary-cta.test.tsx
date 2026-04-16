import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppPrimaryCTA } from "@/components/app/app-primary-cta";

const pushMock = vi.fn();
const openCreateMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/polls"
}));

vi.mock("@/components/layout/create-flow-provider", () => ({
  useCreateFlow: vi.fn()
}));

import { useCreateFlow } from "@/components/layout/create-flow-provider";

const mockedUseCreateFlow = vi.mocked(useCreateFlow);

describe("AppPrimaryCTA", () => {
  beforeEach(() => {
    pushMock.mockReset();
    openCreateMock.mockReset();
  });

  it("opens create flow when authenticated", () => {
    mockedUseCreateFlow.mockReturnValue({
      isAuthenticated: true,
      isOpen: false,
      openCreate: openCreateMock,
      closeCreate: vi.fn()
    });

    render(<AppPrimaryCTA />);
    fireEvent.click(screen.getByRole("button", { name: /Cr.+er/i }));

    expect(openCreateMock).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("redirects to login with next path when unauthenticated", () => {
    mockedUseCreateFlow.mockReturnValue({
      isAuthenticated: false,
      isOpen: false,
      openCreate: openCreateMock,
      closeCreate: vi.fn()
    });

    render(<AppPrimaryCTA />);
    fireEvent.click(screen.getByRole("button", { name: /Cr.+er/i }));

    expect(pushMock).toHaveBeenCalledWith("/auth/login?next=%2Fpolls");
    expect(openCreateMock).not.toHaveBeenCalled();
  });
});
