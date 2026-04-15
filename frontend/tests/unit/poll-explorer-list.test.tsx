import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PollExplorerList } from "@/components/poll/poll-explorer-list";
import { believablePollScenarios, buildPollSummary } from "../fixtures/polls";

describe("poll explorer list", () => {
  it("filters answered and unanswered rows", () => {
    render(
      <PollExplorerList
        rows={[
          buildPollSummary({ post_item_id: "a", selected_option_id: "o1" }),
          buildPollSummary({ post_item_id: "b", selected_option_id: null })
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Repondus" }));
    expect(screen.getAllByText(/Quelle priorite/i)).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Sans reponse" }));
    expect(screen.getAllByText(/Quelle priorite/i)).toHaveLength(1);
  });

  it("sorts by representativity and popularity", () => {
    render(
      <PollExplorerList
        rows={[
          believablePollScenarios.pensionsSuspension,
          believablePollScenarios.rnCredibility
        ]}
      />
    );

    expect(screen.getByText(/RN est-il credible/i)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "popularity" } });
    expect(screen.getByText(/RN est-il credible/i)).toBeInTheDocument();
  });

  it("shows empty state when no rows", () => {
    render(<PollExplorerList rows={[]} />);
    expect(screen.getByText(/Aucun sondage public/i)).toBeInTheDocument();
  });
});
