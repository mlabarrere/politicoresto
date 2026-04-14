-- Forum MVP minimal seed.
-- Keep content neutral here; runtime migration already resets forum tables.

insert into public.political_entity(type, slug, name, metadata)
values
  ('party', 'lfi', 'La France insoumise', '{}'::jsonb),
  ('party', 'ps', 'Parti socialiste', '{}'::jsonb),
  ('party', 'epr', 'Ensemble pour la Republique', '{}'::jsonb),
  ('party', 'lr', 'Les Republicains', '{}'::jsonb),
  ('party', 'rn', 'Rassemblement national', '{}'::jsonb)
on conflict (slug) do nothing;
