import cron from 'node-cron';
import { createPool, migrate } from './core/db.js';
import { createStripe } from './core/billing.js';
import { baseUrlFromEnv } from './core/core-routes.js';
import { signId } from './core/tokens.js';
import { sendEmail } from './core/email.js';
import { createApp } from './app.js';
import { MIGRATIONS, importRegister, crawlJobs, searchJobs, seedSample } from './data.js';
import { alertEmail } from './views.js';

const port = Number(process.env.PORT || 3000);
const baseUrl = baseUrlFromEnv(port);
const pool = createPool();
await migrate(pool, [...MIGRATIONS, `CREATE TABLE IF NOT EXISTS alerts_sent (subscriber_id INT PRIMARY KEY REFERENCES subscribers(id) ON DELETE CASCADE, last_sent TIMESTAMPTZ NOT NULL)`]);
await seedSample(pool);
const stripe = createStripe();

createApp({ pool, stripe, baseUrl }).listen(port, () => console.log(`sponsor-match on ${port} base=${baseUrl} stripe=${Boolean(stripe)}`));

async function pipeline() {
  try { console.log('[register]', await importRegister(pool), 'rows'); } catch (e) {
    console.error('[register] FAILED', e.message);
    await pool.query(`INSERT INTO pipeline_runs(kind, ok, detail) VALUES ('register', false, $1)`, [e.message]);
  }
  try { console.log('[crawl]', await crawlJobs(pool)); } catch (e) { console.error('[crawl] FAILED', e.message); }
}

export async function sendAlerts() {
  const { rows: subs } = await pool.query(`SELECT s.id, s.email, s.ref, a.last_sent FROM subscribers s LEFT JOIN alerts_sent a ON a.subscriber_id = s.id WHERE s.status IN ('active','trialing')`);
  for (const s of subs) {
    try {
      const { q, city } = JSON.parse(s.ref);
      const since = s.last_sent || new Date(Date.now() - 864e5);
      const jobs = await searchJobs(pool, { q, city, since, limit: 25 });
      if (!jobs.length) continue;
      await sendEmail({ to: s.email, ...alertEmail({ jobs, q, city, manageUrl: `${baseUrl}/manage/${signId(s.id)}`, baseUrl }) });
      await pool.query(`INSERT INTO alerts_sent(subscriber_id, last_sent) VALUES ($1, now()) ON CONFLICT (subscriber_id) DO UPDATE SET last_sent = now()`, [s.id]);
    } catch (e) { console.error('[alerts]', s.id, e.message); }
  }
}

cron.schedule('0 5 * * *', pipeline, { timezone: 'Europe/London' });
cron.schedule('0 7 * * *', () => sendAlerts().catch((e) => console.error(e)), { timezone: 'Europe/London' });
if (process.env.NODE_ENV === 'production') setTimeout(pipeline, 20000);
