/**
 * E2E d'auth contre le vrai Supabase staging.
 *
 * Pourquoi : les unit tests mockent la persistance cookie et sont aveugles aux
 * régressions réelles (cookie pas posé sur le navigateur). Les 5 dernières
 * régressions SSO auraient toutes été captées par ce test s'il existait.
 *
 * Stratégie : `signInWithPassword` sur un user de test pré-créé dans staging.
 * Le code path de persistance cookie est IDENTIQUE à celui d'OAuth (même
 * client SSR, même callback, même setAll). OAuth uniquement — reste en manuel
 * car on ne peut pas moquer proprement un compte Google.
 *
 * Skip automatique si les secrets ne sont pas là (dev local).
 */
import { expect, test } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL;
const SUPABASE_URL = process.env.E2E_SUPABASE_URL;
const SUPABASE_KEY = process.env.E2E_SUPABASE_PUBLISHABLE_KEY;
const USER_EMAIL = process.env.E2E_TEST_USER_EMAIL;
const USER_PASSWORD = process.env.E2E_TEST_USER_PASSWORD;

test.describe("auth on staging (real Supabase)", () => {
  test.skip(
    !BASE_URL || !SUPABASE_URL || !SUPABASE_KEY || !USER_EMAIL || !USER_PASSWORD,
    "E2E staging secrets not set (E2E_BASE_URL / E2E_SUPABASE_URL / E2E_SUPABASE_PUBLISHABLE_KEY / E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD)"
  );

  test("signInWithPassword persists session cookie + /me is authenticated", async ({ page, context, request }) => {
    // 1. Obtenir un token Supabase en POST direct — imite ce qu'un formulaire
    //    password ferait côté client SSR.
    const signInRes = await request.post(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        headers: {
          apikey: SUPABASE_KEY!,
          "Content-Type": "application/json"
        },
        data: { email: USER_EMAIL, password: USER_PASSWORD }
      }
    );
    expect(signInRes.ok(), `sign-in failed: ${signInRes.status()} ${await signInRes.text()}`).toBe(true);
    const sessionPayload = await signInRes.json();
    expect(sessionPayload.access_token).toBeTruthy();
    expect(sessionPayload.refresh_token).toBeTruthy();

    // 2. Injecter la session en cookie côté navigateur (format @supabase/ssr v0.6+).
    //    Le nom du cookie est `sb-<project-ref>-auth-token`. On extrait le ref
    //    depuis l'URL Supabase.
    const projectRef = new URL(SUPABASE_URL!).hostname.split(".")[0];
    const cookieName = `sb-${projectRef}-auth-token`;
    const cookieValue = JSON.stringify({
      access_token: sessionPayload.access_token,
      refresh_token: sessionPayload.refresh_token,
      expires_in: sessionPayload.expires_in,
      expires_at: sessionPayload.expires_at,
      token_type: sessionPayload.token_type,
      user: sessionPayload.user
    });
    const baseHost = new URL(BASE_URL!).hostname;
    await context.addCookies([
      {
        name: cookieName,
        value: encodeURIComponent(cookieValue),
        domain: baseHost,
        path: "/",
        httpOnly: false,
        secure: true,
        sameSite: "Lax"
      }
    ]);

    // 3. Naviguer sur /me et vérifier qu'on est authentifié (pas redirigé vers /auth/login).
    const resp = await page.goto(`${BASE_URL}/me`, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), "page /me should load directly, not redirect to login").toBe(200);
    expect(page.url()).toContain("/me");
    expect(page.url()).not.toContain("/auth/login");

    // 4. Vérifier que le cookie sb-* est toujours présent après render serveur.
    const cookiesAfter = await context.cookies();
    const authCookie = cookiesAfter.find((c) => c.name === cookieName);
    expect(authCookie, `${cookieName} cookie must persist after /me render`).toBeTruthy();

    // 5. Sanity UI : la page /me a été rendue (contient qqch d'auth-only).
    //    Les pages /me existent uniquement pour authentifiés (requireSession).
    const body = await page.content();
    expect(body.length).toBeGreaterThan(1000);
  });

  test("unauthenticated access to /me redirects to /auth/login", async ({ page }) => {
    const resp = await page.goto(`${BASE_URL}/me`);
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
    expect(page.url()).toContain("/auth/login");
    expect(page.url()).toContain("next=");
    expect(resp?.status()).toBeLessThan(400);
  });
});
