begin;

do $$
declare
  view_record record;
begin
  for view_record in
    select schemaname, viewname
    from pg_views
    where schemaname = 'public'
  loop
    execute format(
      'alter view %I.%I set (security_invoker = true)',
      view_record.schemaname,
      view_record.viewname
    );
  end loop;
end
$$;

commit;
