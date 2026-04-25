-- Extend `topic_status` for the Pronostics moderation lifecycle.
--
-- Lives in its own migration because PostgreSQL requires a committed
-- transaction before a freshly-added enum value is usable. Splitting
-- avoids the "unsafe use of new value of enum type" error if a later
-- migration in the same apply-batch needs to compare against these
-- values eagerly (CHECK constraints, default expressions, …).

alter type public.topic_status add value if not exists 'pending_review' before 'open';
alter type public.topic_status add value if not exists 'rejected' after 'archived';
