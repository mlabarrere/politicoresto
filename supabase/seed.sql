-- ─────────────────────────────────────────────────────────────────────────────
-- Canonical local seed — auto-applied by `supabase db reset`.
--
-- Goals:
--   1. Seed one known test user usable immediately:
--        email    : test@example.com
--        password : password123
--   2. Chain in the existing topical seeds (forum + polls) when their target
--      tables exist. Defensive because the full schema partly lives in a
--      remote baseline (see README § Local development).
--
-- NEVER seed sensitive data here. Everything is synthetic.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Seed auth user -----------------------------------------------------------
-- Uses the `crypt()` bcrypt helper from pgcrypto (available in Supabase).
-- Idempotent: re-running `db reset` is always safe.

do $$
declare
  v_user_id uuid := '00000000-0000-0000-0000-000000000001';
  v_email   text := 'test@example.com';
  v_pwd     text := 'password123';
begin
  if not exists (select 1 from auth.users where id = v_user_id) then
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_pwd, gen_salt('bf')),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      timezone('utc', now()),
      timezone('utc', now()),
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    )
    values (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email',
      v_user_id::text,
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    );

    raise notice 'Seeded auth user % (id=%)', v_email, v_user_id;
  end if;
end $$;

-- 2. Topical seeds (forum_minimal_seed.sql, polls_demo.sql) are chained
--    automatically via [db.seed] in supabase/config.toml — no include here.
