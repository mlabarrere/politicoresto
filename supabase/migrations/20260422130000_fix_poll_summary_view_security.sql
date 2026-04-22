-- Fix: v_post_poll_summary runs with the caller's permissions
-- (`security_invoker = true`), so the homepage query fails with
-- `permission denied for table post_poll_response` (42501) for any
-- authenticated user. Even after a GRANT, the owner-only RLS policy on
-- post_poll_response would make aggregate counts wrong.
--
-- Resolution: run the view with definer rights. Only aggregate counts
-- and the invoker's own selected option_id (via auth.uid() inside the
-- view) are exposed — no PII leak. Table-level RLS on
-- post_poll_response remains strict for direct reads.
--
-- Symptom: /, /post/[slug] returned a 500 for logged-in users after
-- the Session 3 deploy. Caught by a real preview smoke (`home.error`).

begin;

alter view public.v_post_poll_summary set (security_invoker = false);

commit;
