import { expect, test } from "@playwright/test";

test.describe("forum lab critical flows", () => {
  test("authenticated flow covers publish/reply/edit/vote/collapse/depth", async ({ page }) => {
    await page.route("**/api/reactions", async (route) => {
      const body = route.request().postDataJSON() as {
        targetType: "thread_post" | "comment";
        targetId: string;
        side: "left" | "right" | "gauche" | "droite";
      };

      const mappedSide = body.side === "gauche" ? "left" : body.side === "droite" ? "right" : body.side;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          leftVotes: mappedSide === "left" ? 9 : 2,
          rightVotes: mappedSide === "right" ? 8 : 1,
          currentVote: mappedSide
        })
      });
    });

    await page.route("**/api/comments", async (route) => {
      const method = route.request().method();
      const body = route.request().postDataJSON() as Record<string, unknown>;

      if (method === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            comment: {
              id: `new-${Date.now()}`,
              author: { id: "u1", username: "Alice" },
              createdAt: "2026-04-15T00:00:00.000Z",
              updatedAt: "2026-04-15T00:00:00.000Z",
              body: String(body.body ?? ""),
              depth: body.parentCommentId ? 1 : 0,
              parentCommentId: (body.parentCommentId as string | null) ?? null,
              leftCount: 0,
              rightCount: 0,
              currentUserVote: null,
              replyCount: 0,
              isEdited: false,
              children: []
            }
          })
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true })
      });
    });

    await page.goto("/forum-lab");

    await expect(page.getByRole("heading", { name: "Forum Lab" })).toBeVisible();

    await page.getByRole("button", { name: "Commenter" }).click();
    await page.getByPlaceholder("Votre reponse").fill("Nouveau commentaire racine");
    await page.getByRole("button", { name: "Publier" }).first().click();
    await expect(page.getByText("Nouveau commentaire racine")).toBeVisible();

    await page.getByRole("button", { name: "Repondre" }).first().click();
    await page.getByPlaceholder("Votre reponse").fill("Reponse test");
    await page.getByRole("button", { name: "Publier" }).first().click();
    await expect(page.getByText("Reponse test")).toBeVisible();

    await page.getByRole("button", { name: "Actions commentaire" }).first().click();
    await page.getByText("Modifier").click();
    await expect(page.locator('[data-testid="edit-composer"]')).toBeVisible();
    await expect(page.locator('[data-testid="reply-composer"]')).toHaveCount(0);

    await page.getByLabel("Classer gauche").first().click();
    await expect(page.getByLabel("Classer gauche").first()).toHaveAttribute("aria-pressed", "true");

    const deepNode = page.locator('#comment-c-deep-1');
    await expect(deepNode).toHaveAttribute("data-depth", "2");

    await page.getByRole("button", { name: "Tout replier" }).click();
    await expect(page.getByRole("button", { name: /Tout deplier/ })).toBeVisible();
  });

  test("unauthenticated flow opens auth gate", async ({ page }) => {
    await page.goto("/forum-lab?auth=0");

    await page.getByLabel("Classer gauche").first().click();
    await expect(page.getByText("Se connecter")).toBeVisible();

    await expect(page.getByText("Creer un compte")).toBeVisible();
  });
});
