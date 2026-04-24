/**
 * Enum values mirrored from the baseline migration (see
 * `supabase/migrations/20260402193700_remote_baseline.sql`). They are
 * duplicated as Zod enums so the MCP tool schemas advertise the exact
 * accepted values to the client: invalid strings are rejected before
 * ever reaching the DB.
 */
import { z } from 'zod';

export const TopicStatus = z.enum([
  'draft',
  'open',
  'locked',
  'resolved',
  'archived',
  'removed',
]);

export const VisibilityLevel = z.enum([
  'public',
  'authenticated',
  'private',
  'moderators_only',
]);

export const ReactionType = z.enum(['upvote', 'downvote']);

export const ReactionTargetType = z.enum(['thread_post', 'comment']);
