-- Active l'extension citext avant les migrations qui l'utilisent
-- (subjects_party_tags, seed_parties_politicians, media_outlets, elections_history).
-- Idempotent : no-op sur prod (ou elle etait pre-activee via le dashboard Supabase),
-- requis sur staging/fresh DB ou aucune extension n'est activee par defaut.
create extension if not exists citext;
