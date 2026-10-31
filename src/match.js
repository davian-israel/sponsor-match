// Pure matching helpers: CSV parsing, name normalisation, similarity, UK location test. Unit-tested.

export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const SUFFIXES = /\b(the|ltd|limited|plc|llp|llc|inc|uk|gb|group|holdings|co|company|services|international)\b/g;
export function normaliseName(name) {
  return String(name || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ')
    .replace(SUFFIXES, ' ').replace(/\s+/g, ' ').trim();
}

/** Sørensen–Dice coefficient on character bigrams of normalised names (0..1). */
export function similarity(a, b) {
  const x = normaliseName(a).replace(/ /g, ''), y = normaliseName(b).replace(/ /g, '');
  if (!x || !y) return 0;
  if (x === y) return 1;
  const grams = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } return m; };
  const gx = grams(x), gy = grams(y);
  let overlap = 0;
  for (const [g, n] of gx) overlap += Math.min(n, gy.get(g) || 0);
  return (2 * overlap) / (x.length - 1 + y.length - 1);
}

/** Best register entry for an employer name; null if below threshold. */
export function bestSponsor(employerName, sponsors, threshold = 0.9) {
  const key = normaliseName(employerName);
  let best = null;
  for (const s of sponsors) {
    const score = s.norm === key ? 1 : similarity(employerName, s.name);
    if (score >= threshold && (!best || score > best.score)) best = { ...s, score };
  }
  return best;
}

const UK_PLACES = ['united kingdom', 'uk', 'england', 'scotland', 'wales', 'northern ireland', 'london', 'manchester', 'birmingham', 'edinburgh',
  'glasgow', 'leeds', 'bristol', 'cambridge', 'oxford', 'belfast', 'cardiff', 'liverpool', 'newcastle', 'sheffield', 'nottingham', 'reading', 'brighton', 'milton keynes'];
export function isUkLocation(loc) {
  const s = ` ${String(loc || '').toLowerCase().replace(/[^a-z ]+/g, ' ')} `;
  return UK_PLACES.some((p) => s.includes(` ${p} `));
}

export const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
