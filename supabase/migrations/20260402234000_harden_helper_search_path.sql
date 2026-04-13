begin;

alter function public.current_user_id() set search_path = public, pg_temp;
alter function public.current_app_role() set search_path = public, pg_temp;
alter function public.is_admin() set search_path = public, pg_temp;
alter function public.is_moderator() set search_path = public, pg_temp;
alter function public.visibility_rank(public.visibility_level) set search_path = public, pg_temp;
alter function public.touch_updated_at() set search_path = public, pg_temp;
alter function public.effective_space_visibility(public.space) set search_path = public, pg_temp;
alter function public.effective_topic_visibility(public.topic) set search_path = public, pg_temp;
alter function public.can_read_space(public.space) set search_path = public, pg_temp;
alter function public.can_read_topic(public.topic) set search_path = public, pg_temp;
alter function public.can_read_post(public.post) set search_path = public, pg_temp;
alter function public.effective_poll_visibility(public.poll) set search_path = public, pg_temp;
alter function public.can_read_poll(public.poll) set search_path = public, pg_temp;
alter function public.validate_topic_visibility() set search_path = public, pg_temp;
alter function public.validate_poll_visibility() set search_path = public, pg_temp;
alter function public.validate_prediction_submission() set search_path = public, pg_temp;
alter function public.snapshot_prediction_submission() set search_path = public, pg_temp;
alter function public.capture_post_revision() set search_path = public, pg_temp;

commit;
