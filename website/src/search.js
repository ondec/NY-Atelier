/**
 * Search for the website and the RTW Store.
 * KEEP IN SYNC: website/src/search.js and rtw-store/src/search.js are the same file.
 *
 * Every word typed must match something (a name, type, colour, section, collection or description).
 * Words are compared after folding accents, plurals and common synonyms ("pants" finds trousers,
 * "ladies" finds women), and a small typo is forgiven on longer words ("trosers", "burgandy").
 * Names count most, then type, colour and section, then the description.
 */

const SYNONYMS = {
  pant: 'trouser', slack: 'trouser', chino: 'trouser', jogger: 'trouser',
  tee: 'top', tshirt: 'top', blouse: 'top', tunic: 'top', shirt: 'top', kaftan: 'top',
  suit: 'set', twopiece: 'set', coord: 'set', outfit: 'set',
  gown: 'dress', frock: 'dress',
  lady: 'women', woman: 'women', womens: 'women', female: 'women', her: 'women', she: 'women',
  gent: 'men', man: 'men', mens: 'men', male: 'men', him: 'men', he: 'men',
  gray: 'grey', burgundy: 'wine', maroon: 'wine', claret: 'wine', cream: 'ivory', offwhite: 'ivory',
  accessory: 'accessories', accessorie: 'accessories', bag: 'accessories', cap: 'accessories', hat: 'accessories',
  appointment: 'booking', book: 'booking', consultation: 'booking', fitting: 'booking',
  bespoke: 'custom', tailor: 'custom', tailoring: 'custom', tailored: 'custom', madetomeasure: 'custom',
  wedding: 'occasion', ceremony: 'occasion', ceremonial: 'occasion', event: 'occasion',
};

const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'for', 'in', 'with', 'to', 'my', 'me', 'i', 'edition']);

export const fold = text => String(text ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/two[\s-]+piece/g, 'twopiece').replace(/t[\s-]shirt/g, 'tshirt').replace(/off[\s-]white/g, 'offwhite').replace(/made[\s-]to[\s-]measure/g, 'madetomeasure').replace(/co[\s-]ord/g, 'coord');

/** One word in its plain form: "Trousers" → "trouser", "Pants" → "trouser", "Ladies" → "women". */
export function root(word) {
  return SYNONYMS[word] ?? SYNONYMS[stem(word)] ?? stem(word);
}

/** A word without its plural ending: "trousers" → "trouser", "accessories" → "accessory". */
function stem(word) {
  let w = word;
  if (w.length > 4 && w.endsWith('ies')) w = `${w.slice(0, -3)}y`;
  else if (w.length > 3 && w.endsWith('es') && /(ss|sh|ch|x)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  return w;
}

/** The forms a word is matched by: as written (without plural) and its plain synonym. */
const forms = word => [...new Set([stem(word), root(word)])];

export const words = text => fold(text).split(/[^a-z0-9]+/).filter(Boolean);
const terms = text => words(text).filter(word => !STOP.has(word)).flatMap(forms);

/** Edit distance of at most `max` (with swapped letters counting once); returns max + 1 when further apart. */
function near(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = [Array.from({ length: b.length + 1 }, (_, j) => j)];
  for (let i = 1; i <= a.length; i += 1) {
    rows[i] = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, rows[i - 2][j - 2] + 1);
      rows[i][j] = value;
      best = Math.min(best, value);
    }
    if (best > max) return max + 1;
  }
  return rows[a.length][b.length];
}

/** How well one typed word matches a list of words: whole word, start of a word, inside a word, or a near miss. */
function wordScore(term, list, last) {
  let score = 0;
  for (const word of list) {
    if (word === term) return 1;
    if (word.startsWith(term)) score = Math.max(score, last || term.length >= 3 ? 0.85 : 0.5);
    else if (term.length >= 4 && word.includes(term)) score = Math.max(score, 0.45);
    else if (term.length >= 4 && word.length >= 4) {
      const distance = near(term, word.slice(0, Math.max(term.length, word.length)), term.length >= 7 ? 2 : 1);
      if (distance <= (term.length >= 7 ? 2 : 1)) score = Math.max(score, distance === 1 ? 0.6 : 0.4);
      // A typo while still typing: compare against the start of the longer word.
      else if (last && term.length >= 5 && word.length > term.length && near(term, word.slice(0, term.length), 1) <= 1) score = Math.max(score, 0.4);
    }
  }
  return score;
}

/**
 * Prepare records once: each has `fields`, a list of [text, weight]. Returns an index for `searchIndex`.
 */
export function buildIndex(records) {
  return records.map(record => ({
    record,
    fields: record.fields.map(([text, weight]) => ({ weight, list: [...new Set(terms(text))], plain: fold(text) })),
    name: fold(record.fields[0]?.[0] ?? ''),
  }));
}

/** Records matching every word of the query, best first. `boost(record)` adds a small tie-breaker. */
export function searchIndex(index, query, { limit = Infinity, boost } = {}) {
  const typed = words(query).filter(word => !STOP.has(word));
  if (!typed.length) return [];
  const queryTerms = typed.map(forms);
  const phrase = fold(query).trim();
  const results = [];
  for (const entry of index) {
    let total = 0;
    let missed = false;
    queryTerms.forEach((variants, position) => {
      const last = position === queryTerms.length - 1;
      let best = 0;
      for (const field of entry.fields) {
        for (const term of variants) {
          const score = wordScore(term, field.list, last) * field.weight;
          if (score > best) best = score;
        }
      }
      if (best === 0) missed = true;
      total += best;
    });
    if (missed) continue;
    if (entry.name.startsWith(phrase)) total += 12;
    else if (phrase.length > 2 && entry.name.includes(phrase)) total += 6;
    total += boost ? boost(entry.record) : 0;
    results.push({ record: entry.record, score: total });
  }
  results.sort((a, b) => b.score - a.score || a.record.title.localeCompare(b.record.title));
  return results.slice(0, limit).map(result => result.record);
}

/** Split text into parts, marking the words that start with something typed, for <mark> highlighting. */
export function highlight(text, query) {
  const typed = words(query).filter(word => !STOP.has(word));
  if (!typed.length) return [{ text, hit: false }];
  const parts = [];
  const pattern = /[\p{L}\p{N}]+|[^\p{L}\p{N}]+/gu;
  for (const [piece] of String(text).matchAll(pattern)) {
    const folded = fold(piece);
    const hit = /[a-z0-9]/.test(folded) && typed.some(word => folded.startsWith(word) || root(folded) === root(word) || (word.length >= 4 && folded.length >= 4 && near(word, folded, word.length >= 7 ? 2 : 1) <= (word.length >= 7 ? 2 : 1)));
    const previous = parts.at(-1);
    if (previous && previous.hit === hit) previous.text += piece; else parts.push({ text: piece, hit });
  }
  return parts;
}

/** Recent searches, kept in this browser only. */
const RECENT_KEY = 'ny-recent-searches';
export function recentSearches() {
  try { const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); return Array.isArray(list) ? list.filter(item => typeof item === 'string').slice(0, 5) : []; } catch { return []; }
}
export function rememberSearch(query) {
  const text = String(query ?? '').trim().slice(0, 60);
  if (text.length < 2) return;
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([text, ...recentSearches().filter(item => fold(item) !== fold(text))].slice(0, 5))); } catch { /* private mode */ }
}
export function forgetSearches() { try { localStorage.removeItem(RECENT_KEY); } catch { /* private mode */ } }
