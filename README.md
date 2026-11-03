# Sponsor Match
UK jobs from employers on the Home Office register of licensed sponsors. Free search; £9/month daily email alerts.
Pipeline: GOV.UK register CSV + Greenhouse/Lever/Ashby public boards → name matching → Postgres. Shared core in `src/core`.
Run `DATABASE_URL=... npm start` (dev seeds sample data; production never does) · `npm test` · `GET /api/metrics`.
Env: DATABASE_URL, NODE_ENV=production, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, EMAIL_FROM, APP_SECRET, METRICS_TOKEN, SPONSOR_REGISTER_URL (optional override), PRICE_GBP=9.

## Connect Stripe
1. In Railway → this project → web → Variables, add `STRIPE_SECRET_KEY` (start with `sk_test_…`).
2. From this repo folder: `railway link` (pick this project), then `railway run npm run stripe:setup`.
   It checks the key, creates the webhook at `<site>/webhooks/stripe` for
   `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`,
   and prints `STRIPE_WEBHOOK_SECRET=whsec_…` — add that variable too. Railway redeploys.
3. Stripe dashboard → Settings → Billing → Customer portal → Activate (once per Stripe account).
4. Test with card 4242 4242 4242 4242, then swap both keys for live ones and run step 2 again.
