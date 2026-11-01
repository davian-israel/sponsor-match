# Agent runbook — Sponsor Match

## Pipeline (05:00 UK daily, and at boot in production)
1. `importRegister` finds the current CSV via the GOV.UK content API and loads it. It throws if < 1000 rows. A failed run is logged in `pipeline_runs`; investigate the same day.
2. `crawlJobs` reads public job boards in `src/employers.js`, keeps UK jobs, and only stores jobs from employers matched to the register at ≥ 0.9 similarity.
## Alerts (07:00 UK) — one email per active subscriber when there are new matches.
## Growth agent (weekly)
- Add verified employers to `src/employers.js` (check the board URL returns jobs and the legal name is on the register). Target 100+.
- Spot-check 20 random jobs: employer really on register? job really in the UK? Report precision.
## Copy rules
Never say a job "offers sponsorship" or give immigration advice. Always link to GOV.UK for eligibility.
## Hard limits
No spending, no new accounts, no scraping sites that forbid it, no cold outreach, no pricing/legal changes without Davian.

## Deploys
Pushes to `main` should deploy automatically. If no new Railway deployment appears within 5 minutes, reconnect the service source (Railway `connect-service-source`, same repo and branch) to trigger it, then confirm `/healthz`.
