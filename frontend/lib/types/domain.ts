export type VoteSide = 'left' | 'right' | null;

export type ReactionSide = 'gauche' | 'droite';

export interface UserSummary {
  id: string;
  username: string;
  slug?: string | null;
  avatarUrl?: string;
}
