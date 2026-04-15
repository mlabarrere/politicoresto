# Post Migration Checklist

## Pre-flight
- Run `npm test` in `frontend`.
- Ensure Supabase migration queue includes `20260415235900_post_first_interface_bridge.sql`.
- Confirm no pending manual DB hotfix outside migrations.

## Apply
- Apply new migration in target environment.
- Verify views exist: `v_post_detail`, `v_posts`, `v_feed_global_post`.
- Verify RPC wrappers exist: `create_post_topic`, `create_post_item`, `create_post_comment`.
- Deploy frontend using post-first contracts.

## Verify
- Open `/` feed and `/post/[slug]`.
- Create post from `/post/new`.
- Add root comment and reply.
- Vote on post and comment.
- Confirm auth gate still opens for anonymous actions.

## Rollback
- Revert frontend deploy to previous commit.
- Keep migration in place (wrapper migration is additive and safe).
- If urgent: switch frontend data queries back to `v_thread_*` + legacy RPC names.
