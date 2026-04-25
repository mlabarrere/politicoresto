/**
 * Server-side feature flag for the MCP resource server.
 *
 * The MCP route + the `.well-known/oauth-protected-resource` route both
 * short-circuit to 404 when this returns false. The default is OFF so a
 * stale staging deploy or a worktree experimenting on unrelated work
 * cannot inadvertently expose the MCP surface.
 *
 * To enable locally, add `MCP_ENABLED=true` to `frontend/.env.local`.
 */
export function isMcpEnabled(): boolean {
  return process.env.MCP_ENABLED === 'true';
}
