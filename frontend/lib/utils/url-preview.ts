export interface UrlPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

const META_PATTERNS = {
  title: [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<title[^>]*>([^<]+)<\/title>/i,
  ],
  description: [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  ],
  image: [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  ],
  siteName: [
    /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  ],
};

function pickMeta(html: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

export function normalizeSourceUrl(raw: string | null | undefined) {
  if (!raw) return null;

  const candidate = raw.trim();
  if (!candidate) return null;
  if (
    candidate.includes('://') &&
    !candidate.startsWith('http://') &&
    !candidate.startsWith('https://')
  ) {
    return null;
  }

  try {
    const parsed = new URL(
      candidate.startsWith('http') ? candidate : `https://${candidate}`,
    );
    if (!parsed.protocol.startsWith('http')) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function extractUrlPreviewFromHtml(
  html: string,
  url: string,
): UrlPreview {
  return {
    url,
    title: pickMeta(html, META_PATTERNS.title),
    description: pickMeta(html, META_PATTERNS.description),
    image: pickMeta(html, META_PATTERNS.image),
    siteName: pickMeta(html, META_PATTERNS.siteName),
  };
}

export async function fetchUrlPreview(url: string): Promise<UrlPreview | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => { controller.abort(); }, 3000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'PoliticoResto-PreviewBot/1.0',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    return extractUrlPreviewFromHtml(html.slice(0, 200000), url);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
