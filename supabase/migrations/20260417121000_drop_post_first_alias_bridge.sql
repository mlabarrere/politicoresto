-- Batch 1 cleanup: remove post-first bridge aliases and keep thread-first canonical contract.

drop view if exists public.v_feed_global_post;
drop view if exists public.v_post_detail;
drop view if exists public.v_posts;

drop function if exists public.create_post_topic(text, text, uuid, uuid, timestamp with time zone);
drop function if exists public.create_post_item(uuid, text, text, text, jsonb);
drop function if exists public.create_post_item(uuid, public.thread_post_type, text, text, jsonb);
drop function if exists public.create_post_comment(uuid, uuid, text);
