/**
 * RFC 9728 — Protected Resource Metadata for the MCP feature.
 *
 * MCP clients (Claude Desktop, Claude web, Inspector) fetch this
 * document to discover which Authorization Server issues tokens
 * accepted by our MCP route. We point them at Supabase.
 */
import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from 'mcp-handler';
import { resourceUrlFor, supabaseAuthIssuer } from '@/lib/mcp/oauth-metadata';

export async function GET(req: Request) {
  const handler = protectedResourceHandler({
    authServerUrls: [supabaseAuthIssuer()],
    resourceUrl: resourceUrlFor(req),
  });
  return handler(req);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
