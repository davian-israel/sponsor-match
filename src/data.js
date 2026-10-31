// Data pipeline: sponsor register import + ATS job crawl + matching. Runs daily and at boot.
import { parseCsv, normaliseName, bestSponsor, isUkLocation } from './match.js';
import { EMPLOYERS } from './employers.js';
import { track } from './core/db.js';

export const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS sponsors (
     id SERIAL PRIMARY KEY, name TEXT NOT NULL, norm TEXT NOT NULL, town TEXT, county TEXT, rating TEXT, route TEXT,
     imported_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (name, route))`,
  `CREATE INDEX IF NOT EXISTS sponsors_norm_idx ON sponsors(norm)`,
  `CREATE TABLE IF NOT EXISTS jobs (
     id TEXT PRIMARY KEY,                       -- platform:token:jobId
     employer TEXT NOT NULL, title TEXT NOT NULL, location TEXT, url TEXT NOT NULL,
     sponsor_id INT REFERENCES sponsors(id), match_score REAL, posted_at TIMESTAMPTZ,
     first_seen TIMESTAMPTZ NOT NULL DEFAULT now(), last_seen TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS jobs_seen_idx ON jobs(last_seen)`,
  `CREATE TABLE IF NOT EXISTS pipeline_runs (id SERIAL PRIMARY KEY, kind TEXT, ok BOOLEAN, detail TEXT, ran_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
];

const REGISTER_PAGE = 'https://www.gov.uk/api/content/government/publications/register-of-licensed-sponsors-workers';

/** Find the current CSV link via the GOV.UK content API (the file URL changes with every update). */
export async function registerCsvUrl(fetchImpl = fetch) {
  if (process.env.SPONSOR_REGISTER_URL) return process.env.SPONSOR_REGISTER_URL;
  const res = await fetchImpl(REGISTER_PAGE, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`GOV.UK content API ${res.status}`);
  const j = await res.json();
  const html = JSON.stringify(j.details || {});
  const m = html.match(/https:\/\/assets\.publishing\.service\.gov\.uk\/[^"\\]+\.csv/);
  if (!m) throw new Error('register CSV link not found');
  return m[0];
}

export async function importRegister(pool, fetchImpl = fetch) {
  const url = await registerCsvUrl(fetchImpl);
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`register CSV ${res.status}`);
  const rows = parseCsv(await res.text());
  const pick = (r, ...keys) => keys.map((k) => r[k]).find(Boolean) || null;
  let n = 0;
  for (const r of rows) {
    const name = pick(r, 'Organisation Name', 'Organisation name');
    if (!name) continue;
    await pool.query(
      `INSERT INTO sponsors(name, norm, town, county, rating, route) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (name, route) DO UPDATE SET town=EXCLUDED.town, county=EXCLUDED.county, rating=EXCLUDED.rating, imported_at=now()`,
      [name, normaliseName(name), pick(r, 'Town/City', 'Town'), pick(r, 'County'), pick(r, 'Type & Rating', 'Type and Rating'), pick(r, 'Route')],
    );
    n++;
  }
  if (n < 1000) throw new Error(`register looks truncated (${n} rows)`); // fail loudly rather than serve a partial register
  await pool.query(`INSERT INTO pipeline_runs(kind, ok, detail) VALUES ('register', true, $1)`, [`${n} rows from ${url}`]);
  return n;
}

// Public job-board APIs. Each returns [{ id, title, location, url, postedAt }].
const ATS = {
  greenhouse: async (token, f) => {
    const r = await f(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs`, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`greenhouse ${token} ${r.status}`);
    return (await r.json()).jobs.map((j) => ({ id: String(j.id), title: j.title, location: j.location?.name, url: j.absolute_url, postedAt: j.updated_at }));
  },
  lever: async (token, f) => {
    const r = await f(`https://api.lever.co/v0/postings/${token}?mode=json`, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`lever ${token} ${r.status}`);
    return (await r.json()).map((j) => ({ id: j.id, title: j.text, location: j.categories?.location, url: j.hostedUrl, postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null }));
  },
  ashby: async (token, f) => {
    const r = await f(`https://api.ashbyhq.com/posting-api/job-board/${token}`, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`ashby ${token} ${r.status}`);
    return (await r.json()).jobs.map((j) => ({ id: j.id, title: j.title, location: j.location, url: j.jobUrl, postedAt: j.publishedAt }));
  },
};

export async function crawlJobs(pool, fetchImpl = fetch) {
  const { rows: sponsors } = await pool.query('SELECT id, name, norm, town, rating, route FROM sponsors');
  const stats = { employers: 0, matched: 0, jobs: 0, errors: 0 };
  for (const e of EMPLOYERS) {
    try {
      const sponsor = bestSponsor(e.registerName || e.name, sponsors);
      if (!sponsor) continue; // only employers that hold a licence are shown
      stats.matched++;
      const list = (await ATS[e.platform](e.token, fetchImpl)).filter((j) => isUkLocation(j.location));
      for (const j of list) {
        await pool.query(
          `INSERT INTO jobs(id, employer, title, location, url, sponsor_id, match_score, posted_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, location=EXCLUDED.location, url=EXCLUDED.url, sponsor_id=EXCLUDED.sponsor_id,
             match_score=EXCLUDED.match_score, last_seen=now()`,
          [`${e.platform}:${e.token}:${j.id}`, e.name, j.title, j.location, j.url, sponsor.id, sponsor.score, j.postedAt],
        );
        stats.jobs++;
      }
      stats.employers++;
    } catch (err) {
      stats.errors++;
      console.error('[crawl]', err.message);
    }
  }
  await pool.query(`INSERT INTO pipeline_runs(kind, ok, detail) VALUES ('crawl', $1, $2)`, [stats.errors === 0, JSON.stringify(stats)]);
  await track(pool, 'crawl', JSON.stringify(stats));
  return stats;
}

/** Jobs seen in the last 3 days, filtered by free-text role and city. */
export async function searchJobs(pool, { q = '', city = '', limit = 50, since = null } = {}) {
  const params = [];
  let where = `j.last_seen > now() - interval '3 days'`;
  if (q) { params.push(`%${q}%`); where += ` AND j.title ILIKE $${params.length}`; }
  if (city) { params.push(`%${city}%`); where += ` AND j.location ILIKE $${params.length}`; }
  if (since) { params.push(since); where += ` AND j.first_seen > $${params.length}`; }
  params.push(limit);
  const { rows } = await pool.query(
    `SELECT j.*, s.name AS sponsor_name, s.rating, s.route, s.town AS sponsor_town FROM jobs j JOIN sponsors s ON s.id = j.sponsor_id
     WHERE ${where} ORDER BY j.first_seen DESC LIMIT $${params.length}`, params);
  return rows;
}

/** Development only: sample data so the UI can be built without network access. Never runs in production. */
export async function seedSample(pool) {
  if (process.env.NODE_ENV === 'production') return;
  const { rows } = await pool.query('SELECT count(*)::int n FROM jobs');
  if (rows[0].n) return;
  const sample = [
    ['Example Fintech Ltd', 'London', 'Senior Backend Engineer', 'London, UK'],
    ['Example Fintech Ltd', 'London', 'Data Scientist', 'London, UK'],
    ['Sample Health Group', 'Manchester', 'Clinical Data Analyst', 'Manchester, United Kingdom'],
    ['Sample Health Group', 'Manchester', 'Staff Nurse, Cardiology', 'Manchester, United Kingdom'],
    ['Demo Engineering plc', 'Bristol', 'Mechanical Design Engineer', 'Bristol, UK'],
    ['Demo Engineering plc', 'Bristol', 'Graduate Software Engineer', 'Bristol, UK'],
  ];
  for (const [i, [emp, town, title, loc]] of sample.entries()) {
    const s = await pool.query(
      `INSERT INTO sponsors(name, norm, town, rating, route) VALUES ($1,$2,$3,'Worker (A rating)','Skilled Worker')
       ON CONFLICT (name, route) DO UPDATE SET town=EXCLUDED.town RETURNING id`, [emp, normaliseName(emp), town]);
    await pool.query(`INSERT INTO jobs(id, employer, title, location, url, sponsor_id, match_score, posted_at) VALUES ($1,$2,$3,$4,$5,$6,1,now()) ON CONFLICT DO NOTHING`,
      [`sample:${i}`, emp, title, loc, 'https://example.com/job', s.rows[0].id]);
  }
}
