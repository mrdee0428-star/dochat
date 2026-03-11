/**
 * Fuzzy search for Vietnamese phone product names.
 * "16 promax" → matches "iPhone 16 Pro Max"
 * "15pro" → matches "iPhone 15 Pro"
 */

export function fuzzyMatch(query: string, target: string): boolean {
  if (!query.trim()) return true;

  const q = normalizeForSearch(query);
  const t = normalizeForSearch(target);

  // Exact substring match first
  if (t.includes(q)) return true;

  // Split query into tokens, ALL must match
  const tokens = q.split(/\s+/).filter(t => t.length > 0);
  return tokens.every(token => t.includes(token));
}

function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove Vietnamese diacritics
    // Expand common phone shorthand patterns
    .replace(/promax/g, 'pro max')
    .replace(/promax/g, 'pro max')
    .replace(/ultraa/g, 'ultra')
    // Remove special chars
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
