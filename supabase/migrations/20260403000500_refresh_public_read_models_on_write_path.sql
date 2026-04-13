begin;

create or replace function public.refresh_public_read_models()
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  delete from public.home_feed_topic_cache;
  delete from public.territory_prediction_rollup_cache;
  delete from public.topic_prediction_aggregate_cache;
  delete from public.topic_public_summary_cache;

  insert into public.topic_public_summary_cache (
    id,
    space_id,
    slug,
    title,
    description,
    topic_status,
    effective_visibility,
    primary_territory_id,
    open_at,
    close_at,
    created_at,
    visible_post_count,
    active_prediction_count
  )
  select
    t.id,
    t.space_id,
    t.slug,
    t.title,
    t.description,
    t.topic_status,
    public.effective_topic_visibility(t) as effective_visibility,
    t.primary_territory_id,
    t.open_at,
    t.close_at,
    t.created_at,
    count(distinct p.id) filter (where p.post_status = 'visible') as visible_post_count,
    count(distinct ps.id) filter (where ps.submission_status = 'active') as active_prediction_count
  from public.topic t
  left join public.post p on p.topic_id = t.id
  left join public.prediction_submission ps on ps.topic_id = t.id
  where t.topic_status in ('open', 'locked', 'resolved', 'archived')
    and public.effective_topic_visibility(t) = 'public'
  group by t.id;

  insert into public.topic_prediction_aggregate_cache (
    topic_id,
    prediction_type,
    submission_count,
    numeric_average,
    numeric_median,
    binary_yes_ratio
  )
  select
    pq.topic_id,
    pq.prediction_type,
    count(ps.id) filter (where ps.submission_status = 'active') as submission_count,
    avg(ps.answer_numeric) as numeric_average,
    percentile_cont(0.5) within group (order by ps.answer_numeric)
      filter (where ps.answer_numeric is not null and ps.submission_status = 'active') as numeric_median,
    avg(case when ps.answer_boolean then 1 else 0 end)
      filter (where ps.answer_boolean is not null and ps.submission_status = 'active') as binary_yes_ratio
  from public.prediction_question pq
  left join public.prediction_submission ps on ps.topic_id = pq.topic_id
  join public.topic t on t.id = pq.topic_id
  where t.topic_status in ('open', 'locked', 'resolved', 'archived')
    and public.effective_topic_visibility(t) = 'public'
  group by pq.topic_id, pq.prediction_type;

  insert into public.territory_prediction_rollup_cache (
    territory_id,
    prediction_count
  )
  select
    tc.ancestor_id as territory_id,
    count(distinct ps.id) as prediction_count
  from public.territory_closure tc
  join public.topic_territory_link ttl on ttl.territory_id = tc.descendant_id
  join public.prediction_submission ps on ps.topic_id = ttl.topic_id and ps.submission_status = 'active'
  join public.topic t on t.id = ttl.topic_id
  where t.topic_status in ('open', 'locked', 'resolved', 'archived')
    and public.effective_topic_visibility(t) = 'public'
  group by tc.ancestor_id;

  insert into public.home_feed_topic_cache (
    topic_id,
    topic_slug,
    topic_title,
    topic_description,
    topic_status,
    derived_lifecycle_state,
    visibility,
    is_sensitive,
    space_id,
    space_slug,
    space_name,
    primary_taxonomy_slug,
    primary_taxonomy_label,
    primary_territory_id,
    primary_territory_slug,
    primary_territory_name,
    primary_territory_level,
    prediction_type,
    prediction_question_title,
    aggregate_payload,
    metrics_payload,
    discussion_payload,
    card_payload,
    resolution_payload,
    last_activity_at,
    open_at,
    close_at,
    resolve_deadline_at,
    resolved_at,
    visible_post_count,
    active_prediction_count,
    activity_score_raw,
    freshness_score_raw,
    participation_score_raw,
    territorial_relevance_score_raw,
    resolution_proximity_score_raw,
    editorial_priority_score_raw,
    shift_score_raw,
    editorial_feed_score,
    feed_reason_code,
    feed_reason_label,
    editorial_feed_rank,
    topic_card_payload
  )
  with topic_scope as (
    select
      t.id as topic_id,
      t.slug as topic_slug,
      t.title as topic_title,
      t.description as topic_description,
      t.topic_status,
      t.visibility,
      t.is_sensitive,
      t.open_at,
      t.close_at,
      t.resolve_deadline_at,
      t.created_at,
      t.primary_territory_id,
      t.locked_reason,
      s.id as space_id,
      s.slug as space_slug,
      s.name as space_name,
      tps.visible_post_count,
      tps.active_prediction_count,
      pq.prediction_type,
      pq.title as prediction_question_title,
      pq.unit_label,
      coalesce(tpa.submission_count, 0) as aggregate_submission_count,
      tpa.numeric_average,
      tpa.numeric_median,
      tpa.binary_yes_ratio,
      trr.resolution_status,
      trr.resolved_at,
      trr.resolution_note,
      trr.resolved_boolean,
      trr.resolved_date,
      trr.resolved_numeric,
      trr.resolved_option_id,
      trr.resolved_ordinal
    from public.topic t
    join public.topic_public_summary_cache tps on tps.id = t.id
    left join public.space s on s.id = t.space_id
    left join public.prediction_question pq on pq.topic_id = t.id
    left join public.topic_prediction_aggregate_cache tpa on tpa.topic_id = t.id
    left join public.topic_resolution trr on trr.topic_id = t.id
    where t.topic_status in ('open', 'locked', 'resolved', 'archived')
      and public.effective_topic_visibility(t) = 'public'
  ),
  post_rollup as (
    select
      p.topic_id,
      max(p.created_at) filter (where p.post_status = 'visible') as last_visible_post_at,
      count(*) filter (
        where p.post_status = 'visible'
          and p.created_at >= timezone('utc', now()) - interval '72 hours'
      ) as recent_visible_post_count_72h,
      count(*) filter (
        where p.post_status = 'visible'
          and p.created_at >= timezone('utc', now()) - interval '7 days'
      ) as recent_visible_post_count_7d
    from public.post p
    where p.topic_id is not null
    group by p.topic_id
  ),
  submission_rollup as (
    select
      ps.topic_id,
      max(greatest(ps.submitted_at, ps.updated_at)) filter (where ps.submission_status = 'active') as last_prediction_submission_at,
      count(*) filter (
        where ps.submission_status = 'active'
          and greatest(ps.submitted_at, ps.updated_at) >= timezone('utc', now()) - interval '72 hours'
      ) as recent_prediction_submission_count_72h,
      count(*) filter (
        where ps.submission_status = 'active'
          and greatest(ps.submitted_at, ps.updated_at) >= timezone('utc', now()) - interval '7 days'
      ) as recent_prediction_submission_count_7d
    from public.prediction_submission ps
    group by ps.topic_id
  ),
  primary_taxonomy as (
    select distinct on (ttl.topic_id)
      ttl.topic_id,
      tt.slug as primary_taxonomy_slug,
      tt.label as primary_taxonomy_label
    from public.topic_taxonomy_link ttl
    join public.taxonomy_term tt on tt.id = ttl.taxonomy_term_id
    join public.taxonomy_axis ta on ta.id = tt.axis_id
    order by ttl.topic_id, ttl.is_primary desc, ta.sort_order asc, tt.sort_order asc, tt.label asc
  ),
  discussion_excerpt as (
    select distinct on (p.topic_id)
      p.topic_id,
      p.post_type as discussion_excerpt_type,
      p.title as discussion_excerpt_title,
      left(coalesce(nullif(p.body_plaintext, ''), p.body_markdown), 220) as discussion_excerpt_text,
      p.created_at as discussion_excerpt_created_at
    from public.post p
    where p.topic_id is not null
      and p.post_status = 'visible'
    order by p.topic_id, p.created_at desc, p.id desc
  ),
  resolution_source as (
    select distinct on (trs.topic_id)
      trs.topic_id,
      trs.source_label,
      trs.source_url,
      trs.source_published_at
    from public.topic_resolution_source trs
    order by trs.topic_id, coalesce(trs.source_published_at, trs.created_at) desc, trs.id desc
  ),
  categorical_top_option as (
    select
      ranked.topic_id,
      ranked.top_option_id,
      ranked.top_option_label,
      ranked.top_option_count
    from (
      select
        ps.topic_id,
        po.id as top_option_id,
        po.label as top_option_label,
        count(*)::integer as top_option_count,
        row_number() over (
          partition by ps.topic_id
          order by count(*) desc, min(po.sort_order) asc, min(po.label) asc
        ) as rn
      from public.prediction_submission ps
      join public.prediction_option po on po.id = ps.answer_option_id
      where ps.submission_status = 'active'
      group by ps.topic_id, po.id, po.label
    ) ranked
    where ranked.rn = 1
  ),
  date_rollup as (
    select
      ps.topic_id,
      to_timestamp(
        percentile_cont(0.5) within group (order by extract(epoch from ps.answer_date::timestamp))
      )::date as median_answer_date
    from public.prediction_submission ps
    where ps.submission_status = 'active'
      and ps.answer_date is not null
    group by ps.topic_id
  ),
  ordinal_rollup as (
    select
      ps.topic_id,
      percentile_cont(0.5) within group (order by ps.answer_ordinal::numeric) as median_answer_ordinal
    from public.prediction_submission ps
    where ps.submission_status = 'active'
      and ps.answer_ordinal is not null
    group by ps.topic_id
  ),
  base as (
    select
      ts.topic_id,
      ts.topic_slug,
      ts.topic_title,
      ts.topic_description,
      ts.topic_status,
      ts.visibility,
      ts.is_sensitive,
      ts.open_at,
      ts.close_at,
      ts.resolve_deadline_at,
      ts.created_at,
      ts.locked_reason,
      ts.space_id,
      ts.space_slug,
      ts.space_name,
      pt.primary_taxonomy_slug,
      pt.primary_taxonomy_label,
      ts.primary_territory_id,
      tr.territory_code as primary_territory_slug,
      tr.name as primary_territory_name,
      tr.territory_level as primary_territory_level,
      ts.prediction_type,
      ts.prediction_question_title,
      ts.unit_label,
      ts.visible_post_count,
      ts.active_prediction_count,
      ts.aggregate_submission_count,
      ts.numeric_average,
      ts.numeric_median,
      ts.binary_yes_ratio,
      dr.median_answer_date,
      orr.median_answer_ordinal,
      cto.top_option_id,
      cto.top_option_label,
      cto.top_option_count,
      de.discussion_excerpt_type,
      de.discussion_excerpt_title,
      de.discussion_excerpt_text,
      de.discussion_excerpt_created_at,
      ts.resolution_status,
      ts.resolved_at,
      ts.resolution_note,
      ts.resolved_boolean,
      ts.resolved_date,
      ts.resolved_numeric,
      ts.resolved_option_id,
      ro.label as resolved_option_label,
      ts.resolved_ordinal,
      rs.source_label as resolution_source_label,
      rs.source_url as resolution_source_url,
      pr.last_visible_post_at,
      coalesce(pr.recent_visible_post_count_72h, 0) as recent_visible_post_count_72h,
      coalesce(pr.recent_visible_post_count_7d, 0) as recent_visible_post_count_7d,
      sr.last_prediction_submission_at,
      coalesce(sr.recent_prediction_submission_count_72h, 0) as recent_prediction_submission_count_72h,
      coalesce(sr.recent_prediction_submission_count_7d, 0) as recent_prediction_submission_count_7d,
      greatest(
        coalesce(pr.last_visible_post_at, ts.created_at),
        coalesce(sr.last_prediction_submission_at, ts.created_at),
        ts.created_at
      ) as last_activity_at,
      case
        when ts.topic_status = 'archived' then 'archived'
        when ts.topic_status = 'resolved' or ts.resolution_status = 'resolved' then 'resolved'
        when ts.topic_status = 'locked'
          and ts.close_at < timezone('utc', now())
          and ts.resolution_status = 'pending'
          and ts.resolved_at is null
        then 'pending_resolution'
        when ts.topic_status = 'locked' then 'locked'
        else 'open'
      end as derived_lifecycle_state,
      cc.slug as primary_card_slug,
      cc.label as primary_card_label,
      cc.rarity as primary_card_rarity
    from topic_scope ts
    left join post_rollup pr on pr.topic_id = ts.topic_id
    left join submission_rollup sr on sr.topic_id = ts.topic_id
    left join primary_taxonomy pt on pt.topic_id = ts.topic_id
    left join public.territory_reference tr on tr.id = ts.primary_territory_id
    left join discussion_excerpt de on de.topic_id = ts.topic_id
    left join resolution_source rs on rs.topic_id = ts.topic_id
    left join categorical_top_option cto on cto.topic_id = ts.topic_id
    left join date_rollup dr on dr.topic_id = ts.topic_id
    left join ordinal_rollup orr on orr.topic_id = ts.topic_id
    left join public.prediction_option ro on ro.id = ts.resolved_option_id
    left join public.card_catalog cc
      on cc.slug = case
        when tr.country_code = 'FR' and tr.territory_code = '75056' then 'paris-observer'
        when tr.country_code = 'FR' and tr.territory_code = '13055' then 'marseille-watch'
        when tr.country_code = 'ZZ' and tr.territory_code = 'europe' then 'european-watcher'
        when pt.primary_taxonomy_slug = 'judicial' then 'procedure-reader'
        when pt.primary_taxonomy_slug = 'local-municipal' then 'municipal-cycle'
        else null
      end
     and cc.is_active = true
  ),
  normalized as (
    select
      b.*,
      greatest(ln(1 + coalesce(b.recent_prediction_submission_count_72h, 0)::numeric), 0) as recent_submission_log_72h,
      greatest(ln(1 + coalesce(b.recent_visible_post_count_72h, 0)::numeric), 0) as recent_post_log_72h,
      greatest(ln(1 + coalesce(b.active_prediction_count, 0)::numeric), 0) as active_prediction_log,
      extract(epoch from (timezone('utc', now()) - b.last_activity_at)) / 3600.0 as last_activity_age_hours
    from base b
  ),
  scored as (
    select
      n.*,
      case
        when max(n.recent_submission_log_72h) over () > 0
          or max(n.recent_post_log_72h) over () > 0
        then round((
          0.65 * coalesce(
            n.recent_submission_log_72h / nullif(max(n.recent_submission_log_72h) over (), 0),
            0
          ) +
          0.35 * coalesce(
            n.recent_post_log_72h / nullif(max(n.recent_post_log_72h) over (), 0),
            0
          )
        )::numeric, 6)
        else 0::numeric
      end as activity_score_raw,
      case
        when n.last_activity_at is null then 0::numeric
        when n.last_activity_age_hours <= 24 then 1.0::numeric
        when n.last_activity_age_hours <= 168 then round((1.0 - ((n.last_activity_age_hours - 24.0) / 144.0) * 0.55)::numeric, 6)
        when n.last_activity_age_hours <= 504 then round((0.45 - ((n.last_activity_age_hours - 168.0) / 336.0) * 0.40)::numeric, 6)
        else 0.05::numeric
      end as freshness_score_raw,
      case
        when max(n.active_prediction_log) over () > 0 then round(least((((n.active_prediction_log / nullif(max(n.active_prediction_log) over (), 0)) * case when n.prediction_type in ('binary', 'categorical_closed') then 0.92 when n.prediction_type in ('date_value', 'ordinal_scale', 'bounded_integer') then 1.06 else 1.0 end)), 1.0)::numeric, 6)
        else 0::numeric
      end as participation_score_raw,
      round(least(((case n.primary_territory_level when 'commune' then 1.00 when 'department' then 0.85 when 'region' then 0.72 when 'country' then 0.50 when 'macro' then 0.40 else 0.50 end + case when n.primary_taxonomy_slug in ('local-municipal', 'judicial') and n.primary_territory_level in ('commune', 'department', 'region') then 0.05 else 0.0 end)), 1.0)::numeric, 6) as territorial_relevance_score_raw,
      case
        when n.derived_lifecycle_state = 'pending_resolution' then 1.0::numeric
        when n.derived_lifecycle_state = 'resolved' and n.resolved_at >= timezone('utc', now()) - interval '72 hours' then 0.85::numeric
        when n.derived_lifecycle_state = 'open' and n.close_at >= timezone('utc', now()) and n.close_at <= timezone('utc', now()) + interval '72 hours'
        then round(least((0.65 + (1 - (extract(epoch from (n.close_at - timezone('utc', now()))) / 259200.0)) * 0.30), 0.95)::numeric, 6)
        else 0::numeric
      end as resolution_proximity_score_raw,
      0::numeric as editorial_priority_score_raw,
      0::numeric as shift_score_raw
    from normalized n
  )
  select
    scored.topic_id, scored.topic_slug, scored.topic_title, scored.topic_description, scored.topic_status, scored.derived_lifecycle_state, scored.visibility, scored.is_sensitive,
    scored.space_id, scored.space_slug, scored.space_name, scored.primary_taxonomy_slug, scored.primary_taxonomy_label,
    scored.primary_territory_id, scored.primary_territory_slug, scored.primary_territory_name, scored.primary_territory_level,
    scored.prediction_type, scored.prediction_question_title,
    jsonb_build_object(
      'primary_value', case scored.prediction_type when 'binary' then to_jsonb(round((coalesce(scored.binary_yes_ratio, 0) * 100)::numeric, 1)) when 'date_value' then to_jsonb(scored.median_answer_date) when 'categorical_closed' then to_jsonb(scored.top_option_count) when 'bounded_percentage' then to_jsonb(round(scored.numeric_median::numeric, 1)) when 'bounded_volume' then to_jsonb(round(scored.numeric_median::numeric, 0)) when 'bounded_integer' then to_jsonb(round(scored.numeric_median::numeric, 0)) when 'ordinal_scale' then to_jsonb(round(scored.median_answer_ordinal::numeric, 1)) else 'null'::jsonb end,
      'primary_label', case scored.prediction_type when 'binary' then 'Oui' when 'date_value' then 'Date mediane' when 'categorical_closed' then scored.top_option_label when 'bounded_percentage' then 'Mediane' when 'bounded_volume' then 'Volume median' when 'bounded_integer' then 'Valeur mediane' when 'ordinal_scale' then 'Niveau median' else null end,
      'secondary_value', case scored.prediction_type when 'binary' then to_jsonb(round(((1 - coalesce(scored.binary_yes_ratio, 0)) * 100)::numeric, 1)) when 'categorical_closed' then case when coalesce(scored.aggregate_submission_count, 0) > 0 and scored.top_option_count is not null then to_jsonb(round((scored.top_option_count::numeric / scored.aggregate_submission_count::numeric) * 100, 1)) else 'null'::jsonb end when 'bounded_percentage' then to_jsonb(round(scored.numeric_average::numeric, 1)) when 'bounded_volume' then to_jsonb(round(scored.numeric_average::numeric, 0)) when 'bounded_integer' then to_jsonb(round(scored.numeric_average::numeric, 1)) else 'null'::jsonb end,
      'secondary_label', case scored.prediction_type when 'binary' then 'Non' when 'categorical_closed' then 'Part dominante' when 'bounded_percentage' then 'Moyenne' when 'bounded_volume' then 'Moyenne' when 'bounded_integer' then 'Moyenne' else null end,
      'unit_label', scored.unit_label,
      'submission_count', coalesce(scored.aggregate_submission_count, scored.active_prediction_count, 0),
      'distribution_hint', case scored.prediction_type when 'binary' then 'binary_split' when 'date_value' then 'median_distribution' when 'categorical_closed' then 'option_distribution' when 'bounded_percentage' then 'numeric_summary' when 'bounded_volume' then 'numeric_summary' when 'bounded_integer' then 'numeric_summary' when 'ordinal_scale' then 'ordinal_summary' else null end
    ) as aggregate_payload,
    jsonb_build_object('active_prediction_count', coalesce(scored.active_prediction_count, 0), 'visible_post_count', coalesce(scored.visible_post_count, 0), 'time_label', case when scored.derived_lifecycle_state = 'pending_resolution' and scored.resolve_deadline_at is not null then 'Resolution attendue avant ' || to_char(scored.resolve_deadline_at at time zone 'utc', 'YYYY-MM-DD') when scored.derived_lifecycle_state = 'resolved' and scored.resolved_at is not null then 'Resolue le ' || to_char(scored.resolved_at at time zone 'utc', 'YYYY-MM-DD') when scored.close_at is not null then 'Cloture le ' || to_char(scored.close_at at time zone 'utc', 'YYYY-MM-DD') else null end) as metrics_payload,
    jsonb_build_object('excerpt_type', scored.discussion_excerpt_type, 'excerpt_title', scored.discussion_excerpt_title, 'excerpt_text', scored.discussion_excerpt_text, 'excerpt_created_at', scored.discussion_excerpt_created_at) as discussion_payload,
    case when scored.primary_card_slug is null then null else jsonb_build_object('primary_card_slug', scored.primary_card_slug, 'primary_card_label', scored.primary_card_label, 'primary_card_rarity', scored.primary_card_rarity, 'additional_count', 0) end as card_payload,
    jsonb_build_object('resolution_status', scored.resolution_status, 'resolved_label', case when scored.resolution_status = 'resolved' and scored.resolved_boolean is not null then case when scored.resolved_boolean then 'Oui' else 'Non' end when scored.resolution_status = 'resolved' and scored.resolved_option_label is not null then scored.resolved_option_label when scored.resolution_status = 'resolved' and scored.resolved_date is not null then to_char(scored.resolved_date, 'YYYY-MM-DD') when scored.resolution_status = 'resolved' and scored.resolved_numeric is not null then scored.resolved_numeric::text when scored.resolution_status = 'resolved' and scored.resolved_ordinal is not null then scored.resolved_ordinal::text else null end, 'resolved_at', scored.resolved_at, 'resolution_note', scored.resolution_note, 'source_label', scored.resolution_source_label, 'source_url', scored.resolution_source_url) as resolution_payload,
    scored.last_activity_at, scored.open_at, scored.close_at, scored.resolve_deadline_at, scored.resolved_at, scored.visible_post_count, scored.active_prediction_count,
    scored.activity_score_raw, scored.freshness_score_raw, scored.participation_score_raw, scored.territorial_relevance_score_raw, scored.resolution_proximity_score_raw, scored.editorial_priority_score_raw, scored.shift_score_raw,
    round((0.24 * scored.activity_score_raw + 0.18 * scored.freshness_score_raw + 0.12 * scored.participation_score_raw + 0.16 * scored.territorial_relevance_score_raw + 0.13 * scored.resolution_proximity_score_raw + 0.12 * scored.shift_score_raw + 0.05 * scored.editorial_priority_score_raw)::numeric, 6) as editorial_feed_score,
    case when scored.derived_lifecycle_state = 'pending_resolution' then 'pending_resolution' when scored.derived_lifecycle_state = 'resolved' and scored.resolved_at >= timezone('utc', now()) - interval '72 hours' then 'recently_resolved' when scored.derived_lifecycle_state = 'open' and scored.close_at >= timezone('utc', now()) and scored.close_at <= timezone('utc', now()) + interval '72 hours' then 'closing_soon' when scored.primary_territory_level in ('commune', 'department', 'region') and scored.territorial_relevance_score_raw >= 0.72 then 'territory_relevant' when scored.editorial_priority_score_raw > 0 then 'editorial_priority' else 'high_activity' end as feed_reason_code,
    case when scored.derived_lifecycle_state = 'pending_resolution' then 'Remonte car la resolution est attendue' when scored.derived_lifecycle_state = 'resolved' and scored.resolved_at >= timezone('utc', now()) - interval '72 hours' then 'Remonte car une issue vient d''etre publiee' when scored.derived_lifecycle_state = 'open' and scored.close_at >= timezone('utc', now()) and scored.close_at <= timezone('utc', now()) + interval '72 hours' then 'Remonte car la cloture approche' when scored.primary_territory_level in ('commune', 'department', 'region') and scored.territorial_relevance_score_raw >= 0.72 then 'Remonte car ce sujet concerne votre zone' when scored.editorial_priority_score_raw > 0 then 'Remonte car ce sujet structure la sequence' else 'Remonte car l''activite se concentre ici' end as feed_reason_label,
    row_number() over (order by round((0.24 * scored.activity_score_raw + 0.18 * scored.freshness_score_raw + 0.12 * scored.participation_score_raw + 0.16 * scored.territorial_relevance_score_raw + 0.13 * scored.resolution_proximity_score_raw + 0.12 * scored.shift_score_raw + 0.05 * scored.editorial_priority_score_raw)::numeric, 6) desc, scored.last_activity_at desc nulls last, scored.topic_id asc) as editorial_feed_rank,
    jsonb_build_object('topic_id', scored.topic_id, 'topic_slug', scored.topic_slug, 'topic_title', scored.topic_title, 'topic_description', scored.topic_description, 'derived_lifecycle_state', scored.derived_lifecycle_state, 'topic_status', scored.topic_status, 'visibility', scored.visibility, 'is_sensitive', scored.is_sensitive, 'space_id', scored.space_id, 'space_slug', scored.space_slug, 'space_name', scored.space_name, 'primary_taxonomy_slug', scored.primary_taxonomy_slug, 'primary_taxonomy_label', scored.primary_taxonomy_label, 'primary_territory_id', scored.primary_territory_id, 'primary_territory_slug', scored.primary_territory_slug, 'primary_territory_name', scored.primary_territory_name, 'primary_territory_level', scored.primary_territory_level, 'prediction_type', scored.prediction_type, 'prediction_question_title', scored.prediction_question_title, 'aggregate_payload', jsonb_build_object('primary_value', case scored.prediction_type when 'binary' then to_jsonb(round((coalesce(scored.binary_yes_ratio, 0) * 100)::numeric, 1)) when 'date_value' then to_jsonb(scored.median_answer_date) when 'categorical_closed' then to_jsonb(scored.top_option_count) when 'bounded_percentage' then to_jsonb(round(scored.numeric_median::numeric, 1)) when 'bounded_volume' then to_jsonb(round(scored.numeric_median::numeric, 0)) when 'bounded_integer' then to_jsonb(round(scored.numeric_median::numeric, 0)) when 'ordinal_scale' then to_jsonb(round(scored.median_answer_ordinal::numeric, 1)) else 'null'::jsonb end, 'primary_label', case scored.prediction_type when 'binary' then 'Oui' when 'date_value' then 'Date mediane' when 'categorical_closed' then scored.top_option_label when 'bounded_percentage' then 'Mediane' when 'bounded_volume' then 'Volume median' when 'bounded_integer' then 'Valeur mediane' when 'ordinal_scale' then 'Niveau median' else null end, 'secondary_value', case scored.prediction_type when 'binary' then to_jsonb(round(((1 - coalesce(scored.binary_yes_ratio, 0)) * 100)::numeric, 1)) when 'categorical_closed' then case when coalesce(scored.aggregate_submission_count, 0) > 0 and scored.top_option_count is not null then to_jsonb(round((scored.top_option_count::numeric / scored.aggregate_submission_count::numeric) * 100, 1)) else 'null'::jsonb end when 'bounded_percentage' then to_jsonb(round(scored.numeric_average::numeric, 1)) when 'bounded_volume' then to_jsonb(round(scored.numeric_average::numeric, 0)) when 'bounded_integer' then to_jsonb(round(scored.numeric_average::numeric, 1)) else 'null'::jsonb end, 'secondary_label', case scored.prediction_type when 'binary' then 'Non' when 'categorical_closed' then 'Part dominante' when 'bounded_percentage' then 'Moyenne' when 'bounded_volume' then 'Moyenne' when 'bounded_integer' then 'Moyenne' else null end, 'unit_label', scored.unit_label, 'submission_count', coalesce(scored.aggregate_submission_count, scored.active_prediction_count, 0), 'distribution_hint', case scored.prediction_type when 'binary' then 'binary_split' when 'date_value' then 'median_distribution' when 'categorical_closed' then 'option_distribution' when 'bounded_percentage' then 'numeric_summary' when 'bounded_volume' then 'numeric_summary' when 'bounded_integer' then 'numeric_summary' when 'ordinal_scale' then 'ordinal_summary' else null end), 'metrics_payload', jsonb_build_object('active_prediction_count', coalesce(scored.active_prediction_count, 0), 'visible_post_count', coalesce(scored.visible_post_count, 0), 'time_label', case when scored.derived_lifecycle_state = 'pending_resolution' and scored.resolve_deadline_at is not null then 'Resolution attendue avant ' || to_char(scored.resolve_deadline_at at time zone 'utc', 'YYYY-MM-DD') when scored.derived_lifecycle_state = 'resolved' and scored.resolved_at is not null then 'Resolue le ' || to_char(scored.resolved_at at time zone 'utc', 'YYYY-MM-DD') when scored.close_at is not null then 'Cloture le ' || to_char(scored.close_at at time zone 'utc', 'YYYY-MM-DD') else null end), 'discussion_payload', jsonb_build_object('excerpt_type', scored.discussion_excerpt_type, 'excerpt_title', scored.discussion_excerpt_title, 'excerpt_text', scored.discussion_excerpt_text, 'excerpt_created_at', scored.discussion_excerpt_created_at), 'card_payload', case when scored.primary_card_slug is null then null else jsonb_build_object('primary_card_slug', scored.primary_card_slug, 'primary_card_label', scored.primary_card_label, 'primary_card_rarity', scored.primary_card_rarity, 'additional_count', 0) end, 'resolution_payload', jsonb_build_object('resolution_status', scored.resolution_status, 'resolved_label', case when scored.resolution_status = 'resolved' and scored.resolved_boolean is not null then case when scored.resolved_boolean then 'Oui' else 'Non' end when scored.resolution_status = 'resolved' and scored.resolved_option_label is not null then scored.resolved_option_label when scored.resolution_status = 'resolved' and scored.resolved_date is not null then to_char(scored.resolved_date, 'YYYY-MM-DD') when scored.resolution_status = 'resolved' and scored.resolved_numeric is not null then scored.resolved_numeric::text when scored.resolution_status = 'resolved' and scored.resolved_ordinal is not null then scored.resolved_ordinal::text else null end, 'resolved_at', scored.resolved_at, 'resolution_note', scored.resolution_note, 'source_label', scored.resolution_source_label, 'source_url', scored.resolution_source_url), 'feed_reason_code', case when scored.derived_lifecycle_state = 'pending_resolution' then 'pending_resolution' when scored.derived_lifecycle_state = 'resolved' and scored.resolved_at >= timezone('utc', now()) - interval '72 hours' then 'recently_resolved' when scored.derived_lifecycle_state = 'open' and scored.close_at >= timezone('utc', now()) and scored.close_at <= timezone('utc', now()) + interval '72 hours' then 'closing_soon' when scored.primary_territory_level in ('commune', 'department', 'region') and scored.territorial_relevance_score_raw >= 0.72 then 'territory_relevant' when scored.editorial_priority_score_raw > 0 then 'editorial_priority' else 'high_activity' end, 'feed_reason_label', case when scored.derived_lifecycle_state = 'pending_resolution' then 'Remonte car la resolution est attendue' when scored.derived_lifecycle_state = 'resolved' and scored.resolved_at >= timezone('utc', now()) - interval '72 hours' then 'Remonte car une issue vient d''etre publiee' when scored.derived_lifecycle_state = 'open' and scored.close_at >= timezone('utc', now()) and scored.close_at <= timezone('utc', now()) + interval '72 hours' then 'Remonte car la cloture approche' when scored.primary_territory_level in ('commune', 'department', 'region') and scored.territorial_relevance_score_raw >= 0.72 then 'Remonte car ce sujet concerne votre zone' when scored.editorial_priority_score_raw > 0 then 'Remonte car ce sujet structure la sequence' else 'Remonte car l''activite se concentre ici' end, 'editorial_feed_score', round((0.24 * scored.activity_score_raw + 0.18 * scored.freshness_score_raw + 0.12 * scored.participation_score_raw + 0.16 * scored.territorial_relevance_score_raw + 0.13 * scored.resolution_proximity_score_raw + 0.12 * scored.shift_score_raw + 0.05 * scored.editorial_priority_score_raw)::numeric, 6)) as topic_card_payload
  from scored
  order by editorial_feed_score desc, scored.last_activity_at desc nulls last, scored.topic_id asc;
end;
$$;

revoke all on function public.refresh_public_read_models() from public;
revoke all on function public.refresh_public_read_models() from anon, authenticated;

create or replace function private.trigger_refresh_public_read_models()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  perform public.refresh_public_read_models();
  return null;
end;
$$;

revoke all on function private.trigger_refresh_public_read_models() from public;
revoke all on function private.trigger_refresh_public_read_models() from anon, authenticated;

drop trigger if exists refresh_public_read_models_after_topic_write on public.topic;
create trigger refresh_public_read_models_after_topic_write after insert or update or delete on public.topic for each statement execute function private.trigger_refresh_public_read_models();
drop trigger if exists refresh_public_read_models_after_post_write on public.post;
create trigger refresh_public_read_models_after_post_write after insert or update or delete on public.post for each statement execute function private.trigger_refresh_public_read_models();
drop trigger if exists refresh_public_read_models_after_prediction_submission_write on public.prediction_submission;
create trigger refresh_public_read_models_after_prediction_submission_write after insert or update or delete on public.prediction_submission for each statement execute function private.trigger_refresh_public_read_models();
drop trigger if exists refresh_public_read_models_after_prediction_question_write on public.prediction_question;
create trigger refresh_public_read_models_after_prediction_question_write after insert or update or delete on public.prediction_question for each statement execute function private.trigger_refresh_public_read_models();
drop trigger if exists refresh_public_read_models_after_prediction_option_write on public.prediction_option;
create trigger refresh_public_read_models_after_prediction_option_write after insert or update or delete on public.prediction_option for each statement execute function private.trigger_refresh_public_read_models();
drop trigger if exists refresh_public_read_models_after_topic_resolution_write on public.topic_resolution;
create trigger refresh_public_read_models_after_topic_resolution_write after insert or update or delete on public.topic_resolution for each statement execute function private.trigger_refresh_public_read_models();
drop trigger if exists refresh_public_read_models_after_topic_resolution_source_write on public.topic_resolution_source;
create trigger refresh_public_read_models_after_topic_resolution_source_write after insert or update or delete on public.topic_resolution_source for each statement execute function private.trigger_refresh_public_read_models();
drop trigger if exists refresh_public_read_models_after_topic_taxonomy_link_write on public.topic_taxonomy_link;
create trigger refresh_public_read_models_after_topic_taxonomy_link_write after insert or update or delete on public.topic_taxonomy_link for each statement execute function private.trigger_refresh_public_read_models();
drop trigger if exists refresh_public_read_models_after_topic_territory_link_write on public.topic_territory_link;
create trigger refresh_public_read_models_after_topic_territory_link_write after insert or update or delete on public.topic_territory_link for each statement execute function private.trigger_refresh_public_read_models();
drop trigger if exists refresh_public_read_models_after_space_write on public.space;
create trigger refresh_public_read_models_after_space_write after insert or update or delete on public.space for each statement execute function private.trigger_refresh_public_read_models();
drop trigger if exists refresh_public_read_models_after_territory_reference_write on public.territory_reference;
create trigger refresh_public_read_models_after_territory_reference_write after insert or update or delete on public.territory_reference for each statement execute function private.trigger_refresh_public_read_models();
drop trigger if exists refresh_public_read_models_after_card_catalog_write on public.card_catalog;
create trigger refresh_public_read_models_after_card_catalog_write after insert or update or delete on public.card_catalog for each statement execute function private.trigger_refresh_public_read_models();

select public.refresh_public_read_models();

commit;
