import express from 'express';
import { mountWebhook, mountCore, mountErrors, sendHtml, wrap } from './core/core-routes.js';
import { startCheckout } from './core/billing.js';
import { track } from './core/db.js';
import { searchJobs } from './data.js';
import * as views from './views.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (s, n = 60) => String(s || '').trim().replace(/\s+/g, ' ').slice(0, n);
export const FONTS = {
  'archivo-wdth.woff2': '@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2',
  'sss-400.woff2': '@fontsource/source-sans-3/files/source-sans-3-latin-400-normal.woff2',
  'sss-600.woff2': '@fontsource/source-sans-3/files/source-sans-3-latin-600-normal.woff2',
};

export function createApp({ pool, stripe, baseUrl }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);
  mountWebhook(app, { pool, stripe });
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));
  mountCore(app, {
    pool, stripe, venture: 'sponsor-match', priceGbp: views.PRICE_GBP, fonts: FONTS, views,
    funnel: ['search', 'job_click'],
    describe: (s) => { try { const r = JSON.parse(s.ref); return `alerts for ${[r.q, r.city && `in ${r.city}`].filter(Boolean).join(' ')}`; } catch { return 'job alerts'; } },
  });

  app.get('/', wrap(async (_req, res) => {
    const latest = await searchJobs(pool, { limit: 6 });
    const { rows } = await pool.query(`SELECT count(*)::int n FROM jobs WHERE last_seen > now() - interval '3 days'`);
    sendHtml(res, views.homePage({ latest, total: rows[0].n }));
  }));

  const listing = (req, res, next, q, city) => (async () => {
    if (q || city) await track(pool, 'search', `${q}|${city}`);
    sendHtml(res, views.jobsPage({ q, city, jobs: await searchJobs(pool, { q, city }), baseUrl }));
  })().catch(next);
  app.get('/jobs', (req, res, next) => listing(req, res, next, clean(req.query.q), clean(req.query.city, 40)));
  // SEO landing pages: /roles/software-engineer-in-london, /roles/nurse
  app.get('/roles/:slug', (req, res, next) => {
    const [role, city = ''] = req.params.slug.split('-in-');
    listing(req, res, next, role === 'all' ? '' : role.replace(/-/g, ' '), city.replace(/-/g, ' '));
  });

  app.get('/jobs/:id', wrap(async (req, res) => {
    const { rows } = await pool.query('SELECT url FROM jobs WHERE id = $1', [req.params.id]);
    if (!rows[0]) return sendHtml(res, views.messagePage('This job has closed', '<p>The employer has removed this posting.</p>'), 404);
    await track(pool, 'job_click', req.params.id);
    res.redirect(302, rows[0].url);
  }));

  app.get('/alerts', (_req, res) => sendHtml(res, views.alertsPage({ stripeReady: Boolean(stripe) })));

  app.post('/subscribe', wrap(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const q = clean(req.body.q), city = clean(req.body.city, 40);
    if (!q || !EMAIL_RE.test(email)) return sendHtml(res, views.messagePage('Check your details', '<p>Enter a job title and a valid email address.</p>', { action: '<a class="btn" href="/alerts">Back to alerts</a>' }), 400);
    const { url } = await startCheckout({ pool, stripe, baseUrl }, {
      email, ref: JSON.stringify({ q, city }), productName: `Sponsor Match alerts: ${q}${city ? ` in ${city}` : ''}`,
      priceGbp: views.PRICE_GBP, cancelPath: '/alerts',
    });
    res.redirect(303, url);
  }));

  app.get('/thanks', (req, res) => sendHtml(res, req.query.pending
    ? views.messagePage('You are on the list', '<p>Alerts open soon, so you have not been charged. We will email you when they start.</p>')
    : views.messagePage('Alerts started', '<p>Your first email arrives tomorrow morning if there are new matches.</p>')));

  app.get('/sitemap.xml', wrap(async (_req, res) => {
    const roles = ['software-engineer', 'data-analyst', 'nurse', 'care-assistant', 'mechanical-engineer', 'accountant', 'chef', 'teacher'];
    const cities = ['', 'london', 'manchester', 'birmingham', 'leeds', 'bristol', 'edinburgh', 'glasgow'];
    const urls = [`${baseUrl}/`, `${baseUrl}/jobs`, `${baseUrl}/alerts`, ...roles.flatMap((r) => cities.map((c) => `${baseUrl}/roles/${r}${c ? `-in-${c}` : ''}`))];
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${u}</loc></url>`).join('\n')}\n</urlset>`);
  }));
  app.get('/robots.txt', (_req, res) => res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /manage/\nDisallow: /api/\nDisallow: /jobs/\nSitemap: ${baseUrl}/sitemap.xml\n`));
  app.get('/privacy', (_req, res) => sendHtml(res, views.messagePage('Privacy', '<p>We store your email and your saved search only to send alerts. We never ask for your CV or immigration details. Payments are handled by Stripe. Ask us to delete your data at any time.</p>')));
  app.get('/terms', (_req, res) => sendHtml(res, views.messagePage('Terms', '<p>Sponsor Match lists jobs from employers on the public register of licensed sponsors. We do not guarantee any job will be sponsored and we do not give immigration advice. Cancel alerts at any time.</p>')));

  mountErrors(app, views);
  return app;
}
