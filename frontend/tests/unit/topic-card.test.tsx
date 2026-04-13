import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TopicCard } from "@/components/topics/topic-card";

import { buildHomeFeedTopic } from "../fixtures/home-feed-topic";

describe("TopicCard", () => {
  it("renders a home feed topic payload without frontend reconstruction", () => {
    render(<TopicCard topic={buildHomeFeedTopic()} />);

    expect(screen.getByText("Quel taux d'adhesion au pacte metropolitain ?")).toBeInTheDocument();
    expect(screen.getByText("Remonte car ce sujet concerne votre zone")).toBeInTheDocument();
    expect(screen.getByText("Part de responsables locaux favorables")).toBeInTheDocument();
    expect(screen.getByText("57")).toBeInTheDocument();
    expect(screen.getByText("12 participations")).toBeInTheDocument();
  });

  it("uses derived_lifecycle_state instead of topic_status for CTA selection", () => {
    render(
      <TopicCard
        topic={buildHomeFeedTopic({
          topic_status: "locked",
          derived_lifecycle_state: "resolved",
          resolution_payload: {
            resolution_status: "resolved",
            resolved_label: "Oui",
            resolved_at: "2026-04-01T08:00:00Z",
            resolution_note: "Resolution publiee",
            source_label: "Source officielle",
            source_url: "https://example.test/source"
          },
          topic_card_payload: {
            derived_lifecycle_state: "resolved",
            topic_status: "locked",
            resolution_payload: {
              resolution_status: "resolved",
              resolved_label: "Oui",
              resolved_at: "2026-04-01T08:00:00Z",
              resolution_note: "Resolution publiee",
              source_label: "Source officielle",
              source_url: "https://example.test/source"
            }
          }
        })}
      />
    );

    expect(screen.getByRole("link", { name: "Voir le resultat" })).toBeInTheDocument();
  });

  it("renders safely with partial payloads", () => {
    render(
      <TopicCard
        topic={buildHomeFeedTopic({
          card_payload: null,
          discussion_payload: {
            excerpt_type: null,
            excerpt_title: null,
            excerpt_text: null,
            excerpt_created_at: null
          },
          resolution_payload: {
            resolution_status: null,
            resolved_label: null,
            resolved_at: null,
            resolution_note: null,
            source_label: null,
            source_url: null
          },
          topic_card_payload: {
            card_payload: null,
            discussion_payload: {
              excerpt_type: null,
              excerpt_title: null,
              excerpt_text: null,
              excerpt_created_at: null
            },
            resolution_payload: {
              resolution_status: null,
              resolved_label: null,
              resolved_at: null,
              resolution_note: null,
              source_label: null,
              source_url: null
            }
          }
        })}
      />
    );

    expect(screen.queryByText("Carte visible")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Participer" })).toBeInTheDocument();
  });
});
