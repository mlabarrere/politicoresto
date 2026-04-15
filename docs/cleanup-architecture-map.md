# Cleanup Architecture Map

## Canonical UI primitives
- `AppButton`: variants `primary|secondary|ghost`.
- `AppCard`: single border/radius/surface wrapper.
- `AppInput`, `AppTextarea`, `AppSelect`: aligned field geometry.
- `AppFilter`: single filter/toggle behavior.

## Canonical post flow
- Public list: `HomePageShell -> PostFeed -> PostCard`.
- Public detail: `/post/[slug] -> ForumPage`.
- Composer: `PostComposer` only.
- Reactions: `ReactionBar` with target types `post|comment`.
- Comments: `POST/PATCH/DELETE /api/comments` via `create_post_comment`.

## Canonical data contracts
- Feed card fields: `feed_post_id`, `feed_post_content`.
- Detail payload: `PostDetailScreenData { post, posts, comments }`.
- Read models: `v_post_detail`, `v_posts`, `v_feed_global_post`.
- Write RPC wrappers: `create_post_topic`, `create_post_item`, `create_post_comment`.

## Compatibility status
- Legacy `/thread/*` routes removed.
- Legacy `threads.ts` data module removed.
- Post-first symbols and file names now canonical in frontend/tests.
