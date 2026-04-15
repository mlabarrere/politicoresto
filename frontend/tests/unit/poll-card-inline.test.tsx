import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PollCardInline } from "@/components/poll/poll-card-inline";
import { buildPollSummary } from "../fixtures/polls";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

describe("poll card inline", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("shows voting options before answer", () => {
    render(<PollCardInline poll={buildPollSummary()} isAuthenticated={true} />);
    expect(screen.getByText("Sondage")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sante" })).toBeInTheDocument();
    expect(screen.queryByText(/Estimation corrigee/i)).not.toBeInTheDocument();
  });

  it("switches to results after vote", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        poll: buildPollSummary({
          selected_option_id: "o1",
          sample_size: 43
        })
      })
    });

    render(<PollCardInline poll={buildPollSummary()} isAuthenticated={true} />);
    fireEvent.click(screen.getByRole("button", { name: "Sante" }));

    await waitFor(() =>
      expect(screen.getByText(/Estimation corrigee/i)).toBeInTheDocument()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/polls/vote",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows login hint for guests", () => {
    render(<PollCardInline poll={buildPollSummary()} isAuthenticated={false} />);
    expect(screen.getByText(/Connectez-vous/i)).toBeInTheDocument();
  });
});
