import { describe, expect, it } from "vitest";

import { canTransition, transitionCommentNodeMode, type CommentNodeMode } from "@/lib/forum/fsm";

describe("comment FSM", () => {
  it("enforces replying xor editing", () => {
    expect(transitionCommentNodeMode("read", { type: "START_REPLY" })).toBe("replying");
    expect(canTransition("replying", "START_EDIT")).toBe(false);
    expect(transitionCommentNodeMode("replying", { type: "START_EDIT" })).toBe("replying");
  });

  it("returns to read after submit success", () => {
    const next = transitionCommentNodeMode("replying", { type: "SUBMIT_REPLY" });
    expect(next).toBe("submittingReply");
    expect(transitionCommentNodeMode(next, { type: "SUBMIT_SUCCESS" })).toBe("read");
  });

  it("disables competing transitions during submitting", () => {
    const blocked: CommentNodeMode = transitionCommentNodeMode("submittingEdit", { type: "START_REPLY" });
    expect(blocked).toBe("submittingEdit");
    expect(transitionCommentNodeMode("submittingEdit", { type: "SUBMIT_ERROR" })).toBe("editing");
  });
});
