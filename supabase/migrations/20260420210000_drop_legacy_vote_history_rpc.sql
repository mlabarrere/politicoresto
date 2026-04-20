begin;

-- rpc_list_private_vote_history etait la RPC "journal brut" consommee par
-- AppVoteHistoryList + l'ancien bloc <details> sur /me?section=votes.
-- L'editeur grille est desormais la seule UX et consomme
-- rpc_list_vote_history_detailed. La RPC legacy devient orpheline.
drop function if exists public.rpc_list_private_vote_history();

commit;
