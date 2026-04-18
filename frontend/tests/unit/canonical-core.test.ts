import { describe, expect, it } from "vitest";
import {
  toHomeFeedTopic,
  toTopicSummary,
  toTopicRow,
  toSpaceRow,
  toThreadPost,
  toLegacyPost,
  inferTopicTimeLabel
} from "@/lib/data/public/canonical";

const baseThreadDetail = {
  id: "t1",
  slug: "le-sujet",
  title: "Le sujet",
  topic_status: "open",
  effective_visibility: "public",
  open_at: "2026-04-01T00:00:00Z",
  close_at: "2026-04-21T00:00:00Z",
  created_at: "2026-04-01T00:00:00Z"
};

describe("inferTopicTimeLabel", () => {
  it("returns null for falsy input", () => {
    expect(inferTopicTimeLabel(null)).toBeNull();
    expect(inferTopicTimeLabel(undefined)).toBeNull();
    expect(inferTopicTimeLabel("")).toBeNull();
  });

  it("formats the close date correctly", () => {
    expect(inferTopicTimeLabel("2026-04-21T18:00:00Z")).toBe("Cloture le 2026-04-21");
  });
});

describe("toTopicRow", () => {
  it("maps the fields correctly", () => {
    const row = toTopicRow(baseThreadDetail);
    expect(row.id).toBe("t1");
    expect(row.slug).toBe("le-sujet");
    expect(row.visibility).toBe("public");
    expect(row.space_id).toBeNull();
  });

  it("maps description to null when absent", () => {
    const row = toTopicRow({ ...baseThreadDetail, description: undefined });
    expect(row.description).toBeNull();
  });
});

describe("toTopicSummary", () => {
  it("maps visible_post_count", () => {
    const row = toTopicSummary({ ...baseThreadDetail, visible_post_count: 5 });
    expect(row.visible_post_count).toBe(5);
  });

  it("falls back to thread_post_count", () => {
    const row = toTopicSummary({ ...baseThreadDetail, thread_post_count: 3 });
    expect(row.visible_post_count).toBe(3);
  });

  it("uses 0 when no count available", () => {
    const row = toTopicSummary(baseThreadDetail);
    expect(row.visible_post_count).toBe(0);
  });
});

describe("toSpaceRow", () => {
  it("maps basic fields", () => {
    const row = toSpaceRow({
      id: "s1",
      slug: "global",
      name: "Global",
      space_status: "active",
      visibility: "public",
      created_at: "2026-01-01T00:00:00Z"
    });
    expect(row.id).toBe("s1");
    expect(row.name).toBe("Global");
    expect(row.visibility).toBe("public");
    expect(row.description).toBeNull();
  });

  it("falls back to space_role for space_type", () => {
    const row = toSpaceRow({ id: "s1", slug: "x", name: "X", space_role: "global" });
    expect(row.space_type).toBe("global");
  });
});

describe("toThreadPost", () => {
  it("maps thread post to PostRow", () => {
    const row = toThreadPost({
      id: "tp1",
      thread_id: "t1",
      type: "article",
      title: "Titre",
      content: "Contenu",
      created_at: "2026-04-01T00:00:00Z"
    });
    expect(row.id).toBe("tp1");
    expect(row.topic_id).toBe("t1");
    expect(row.post_type).toBe("article");
    expect(row.body_markdown).toBe("Contenu");
    expect(row.post_status).toBe("visible");
    expect(row.space_id).toBeNull();
  });

  it("uses empty string for null content", () => {
    const row = toThreadPost({ id: "tp1", thread_id: "t1", type: "article", content: null, created_at: "" });
    expect(row.body_markdown).toBe("");
  });
});

describe("toLegacyPost", () => {
  it("preserves all post fields", () => {
    const row = toLegacyPost({
      id: "p1",
      topic_id: "t1",
      space_id: null,
      post_type: "discussion",
      post_status: "visible",
      body_markdown: "corps",
      created_at: "2026-04-01T00:00:00Z"
    });
    expect(row.post_type).toBe("discussion");
    expect(row.body_markdown).toBe("corps");
  });
});

describe("toHomeFeedTopic", () => {
  const feedRow = {
    topic_id: "t1",
    topic_slug: "le-sujet",
    topic_title: "Le sujet",
    topic_status: "open",
    visibility: "public",
    is_sensitive: false,
    close_at: "2026-04-21T18:00:00Z",
    open_at: "2026-04-01T00:00:00Z",
    created_at: "2026-04-01T00:00:00Z",
    feed_reason_code: "recent",
    feed_reason_label: "Récent",
    thread_score: 0.5
  };

  it("builds a complete HomeFeedTopicView", () => {
    const result = toHomeFeedTopic(feedRow, 1);
    expect(result.topic_id).toBe("t1");
    expect(result.topic_slug).toBe("le-sujet");
    expect(result.editorial_feed_rank).toBe(1);
    expect(result.feed_reason_code).toBe("recent");
    expect(result.editorial_feed_score).toBe(0.5);
  });

  it("infers lifecycle state from derived_lifecycle_state field", () => {
    const result = toHomeFeedTopic({ ...feedRow, derived_lifecycle_state: "locked" }, 1);
    expect(result.derived_lifecycle_state).toBe("locked");
  });

  it("infers lifecycle state from topic_status when no derived field", () => {
    const result = toHomeFeedTopic({ ...feedRow, topic_status: "resolved" }, 1);
    expect(result.derived_lifecycle_state).toBe("resolved");
  });

  it("falls back to rank when editorial_feed_rank not in row", () => {
    const result = toHomeFeedTopic(feedRow, 7);
    expect(result.editorial_feed_rank).toBe(7);
  });

  it("uses explicit editorial_feed_rank from row", () => {
    const result = toHomeFeedTopic({ ...feedRow, editorial_feed_rank: 3 }, 99);
    expect(result.editorial_feed_rank).toBe(3);
  });

  it("uses activity_score_raw from row when provided", () => {
    const result = toHomeFeedTopic({ ...feedRow, activity_score_raw: 0.8 }, 1);
    expect(result.activity_score_raw).toBe(0.8);
  });

  it("uses discussion_payload from row when provided", () => {
    const result = toHomeFeedTopic({
      ...feedRow,
      discussion_payload: { excerpt_text: "Texte", excerpt_type: "thread", excerpt_title: "T", excerpt_created_at: null }
    }, 1);
    expect(result.discussion_payload.excerpt_text).toBe("Texte");
  });

  it("falls back to topic_description for discussion excerpt", () => {
    const result = toHomeFeedTopic({
      ...feedRow,
      topic_description: "Description du sujet"
    }, 1);
    expect(result.discussion_payload.excerpt_text).toBe("Description du sujet");
  });

  it("topic_card_payload mirrors the payload", () => {
    const result = toHomeFeedTopic(feedRow, 1);
    expect(result.topic_card_payload.topic_id).toBe("t1");
    expect(result.topic_card_payload.editorial_feed_score).toBe(0.5);
  });
});
