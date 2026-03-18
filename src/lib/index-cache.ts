/**
 * Fetches and caches the structured search index from CF Pages.
 *
 * The index is generated at docs build time and served as a static JSON file.
 * Cached in CF KV for 24 hours.
 */

const CACHE_KEY = 'search-index';
const CACHE_TTL_SECONDS = 86_400; // 24 h

export interface IndexEntry {
  title: string;
  description: string;
  url: string;
  category: string;
  platform: string;
  content: string;
}

export interface DocsCache {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export async function getSearchIndex(indexUrl: string, cache: DocsCache): Promise<IndexEntry[]> {
  const cached = await cache.get(CACHE_KEY);
  if (cached) return JSON.parse(cached) as IndexEntry[];

  const response = await fetch(indexUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch search-index.json: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  await cache.put(CACHE_KEY, text, { expirationTtl: CACHE_TTL_SECONDS });
  return JSON.parse(text) as IndexEntry[];
}
