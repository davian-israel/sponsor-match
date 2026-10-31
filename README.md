# Sponsor Match
UK jobs from employers on the Home Office register of licensed sponsors. Free search; £9/month daily email alerts.
Pipeline: GOV.UK register CSV + Greenhouse/Lever/Ashby public boards → name matching → Postgres. Shared core in `src/core`.
Run `DATABASE_URL=... npm start` (dev seeds sample data; production never does) · `npm test` · `GET /api/metrics`.
Env: DATABASE_URL, NODE_ENV=production, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, EMAIL_FROM, APP_SECRET, METRICS_TOKEN, SPONSOR_REGISTER_URL (optional override), PRICE_GBP=9.
