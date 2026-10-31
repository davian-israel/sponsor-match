import { esc } from './core/core-routes.js';
import { slugify } from './match.js';

export const PRICE_GBP = Number(process.env.PRICE_GBP || 9);
const price = `£${PRICE_GBP}`;

// Passport-stamp identity: cool paper, navy ink, violet stamp ink, green for verified.
const CSS = `
@font-face{font-family:'Archivo';src:url(/fonts/archivo-wdth.woff2) format('woff2');font-weight:100 900;font-stretch:62% 125%;font-display:swap}
@font-face{font-family:'Source Sans';src:url(/fonts/sss-400.woff2) format('woff2');font-weight:400;font-display:swap}
@font-face{font-family:'Source Sans';src:url(/fonts/sss-600.woff2) format('woff2');font-weight:600;font-display:swap}
:root{--paper:#F4F6F8;--card:#FFFFFF;--ink:#14213D;--ink-2:#55607A;--rule:#D5DBE3;--stamp:#5B3FA0;--ok:#1E7B4F;--focus:#5B3FA0}
*{box-sizing:border-box}
html{background:var(--paper);color:var(--ink);font:400 18px/1.55 'Source Sans',system-ui,sans-serif}
body{margin:0}a{color:inherit;text-underline-offset:3px}
:focus-visible{outline:3px solid var(--focus);outline-offset:3px;border-radius:4px}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
.top{display:flex;justify-content:space-between;align-items:center;padding:20px 0;border-bottom:1px solid var(--rule)}
.brand{font:800 24px/1 'Archivo',sans-serif;font-stretch:112%;text-decoration:none}
.nav a{margin-left:22px;font-size:16px;color:var(--ink-2)}
h1,h2,h3{font-family:'Archivo',sans-serif;margin:0;letter-spacing:-.01em}
h1{font-size:clamp(40px,6vw,70px);line-height:1;font-weight:800;font-stretch:118%;max-width:15ch}
h2{font-size:clamp(28px,3.6vw,40px);line-height:1.08;font-weight:700;font-stretch:110%}
.lede{font-size:21px;color:var(--ink-2);max-width:48ch;margin:20px 0 28px}
.hero{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr);gap:40px;align-items:center;padding:56px 0 64px}
.hero .big-stamp{justify-self:center;width:min(300px,80%);transform:rotate(-12deg)}
.btn{font:600 18px/1 'Source Sans',sans-serif;padding:16px 22px;border:0;border-radius:8px;background:var(--ink);color:#fff;cursor:pointer;text-decoration:none;display:inline-block}
.btn:hover{background:#22345E}
.search{display:grid;grid-template-columns:1.3fr 1fr auto;gap:10px;max-width:720px}
input{font:inherit;padding:15px 16px;border:2px solid var(--ink);border-radius:8px;background:var(--card);color:var(--ink);min-width:0}
label.f{display:block;font-weight:600;font-size:15px;margin-bottom:6px}
.hint{font-size:15px;color:var(--ink-2)}
.stamp{color:var(--stamp)}

.stamp text{fill:currentColor;font:700 9.5px 'Archivo',sans-serif;letter-spacing:.14em;font-stretch:115%}
.stamp .mid{font:800 30px 'Archivo',sans-serif;letter-spacing:0}
.jobs{list-style:none;padding:0;margin:24px 0}
.job{display:grid;grid-template-columns:minmax(0,1fr) 88px;gap:18px;align-items:center;background:var(--card);border:1px solid var(--rule);border-radius:10px;padding:18px 20px;margin-bottom:12px}
.job h3{font-size:21px;font-weight:700;font-stretch:104%}
.job h3 a{text-decoration:none}.job h3 a:hover{text-decoration:underline}
.job .meta{color:var(--ink-2);font-size:16px;margin-top:4px}
.job .lic{font-size:14px;color:var(--ok);font-weight:600;margin-top:6px}
.job .stamp{width:84px;transform:rotate(-10deg)}
.band{padding:56px 0;border-top:1px solid var(--rule)}
.how{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px;margin-top:28px}
.how p{color:var(--ink-2);margin:6px 0 0}
.how b{font:700 20px 'Archivo',sans-serif;font-stretch:108%}
.plan{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px;align-items:start}
.panel{background:var(--card);border:2px solid var(--ink);border-radius:12px;padding:26px}
.amount{font:800 64px/1 'Archivo',sans-serif;font-stretch:115%}.amount small{font:600 20px 'Source Sans',sans-serif;color:var(--ink-2)}
form.stack{display:flex;flex-direction:column;gap:12px}
.note{background:var(--card);border-left:5px solid var(--stamp);padding:14px 18px;border-radius:0 8px 8px 0;color:var(--ink-2);font-size:16px;max-width:70ch}
.empty{background:var(--card);border:1px dashed var(--rule);border-radius:10px;padding:28px;color:var(--ink-2)}
.msg{padding:56px 0 90px;max-width:640px}.msg .body{margin:18px 0 26px;color:var(--ink-2)}
footer{border-top:1px solid var(--rule);padding:24px 0 44px;font-size:15px;color:var(--ink-2);margin-top:40px}footer a{margin-right:18px}
@media (max-width:820px){.hero,.plan{grid-template-columns:1fr}.hero .big-stamp{width:200px;justify-self:start}.search{grid-template-columns:1fr}.how{grid-template-columns:1fr}}
@media (max-width:520px){.nav a:first-child{display:none}.job{grid-template-columns:1fr 64px}.job .stamp{width:64px}}
`;

/** The circular ink stamp. Text runs around the ring like a passport entry stamp. */
export function stamp({ id = 's', rating = 'A', route = 'SKILLED WORKER', cls = '' } = {}) {
  const grade = /\bB\b/.test(rating || '') ? 'B' : 'A';
  return `<svg class="stamp ${cls}" viewBox="0 0 120 120" role="img" aria-label="Licensed sponsor, ${esc(grade)}-rated">
<defs><path id="${id}-ring" d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1 -88 0"/></defs>
<circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="60" cy="60" r="34" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text><textPath href="#${id}-ring" startOffset="0" textLength="272" lengthAdjust="spacing">LICENSED SPONSOR • ${esc(route.toUpperCase().slice(0, 18))} •</textPath></text>
<text class="mid" x="60" y="71" text-anchor="middle">${grade}</text></svg>`;
}

function layout({ title, description, body, canonical }) {
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<style>${CSS}</style></head><body><div class="wrap">
<header class="top"><a class="brand" href="/">Sponsor Match</a><nav class="nav"><a href="/jobs">All jobs</a><a href="/alerts">Job alerts</a></nav></header>
<main>${body}</main>
<footer><p>Sponsor Match lists jobs from employers that appear on the Home Office register of licensed sponsors. A licence does not guarantee a particular job will be sponsored. This is not immigration advice; check your eligibility on <a href="https://www.gov.uk/skilled-worker-visa">GOV.UK</a>. Not affiliated with the Home Office.</p>
<a href="/alerts">Job alerts</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></footer></div></body></html>`;
}

const searchForm = (q = '', city = '') => `<form class="search" action="/jobs" method="get" role="search">
<div><label class="f" for="q">Job title</label><input id="q" name="q" value="${esc(q)}" placeholder="e.g. software engineer, nurse"></div>
<div><label class="f" for="city">Town or city</label><input id="city" name="city" value="${esc(city)}" placeholder="e.g. London"></div>
<div style="align-self:end"><button class="btn">Find jobs</button></div></form>`;

function jobItem(j, i) {
  const when = j.first_seen ? new Date(j.first_seen).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
  return `<li class="job"><div><h3><a href="/jobs/${encodeURIComponent(j.id)}" rel="nofollow">${esc(j.title)}</a></h3>
<div class="meta">${esc(j.employer)}${j.location ? `, ${esc(j.location)}` : ''}${when ? `. Found ${esc(when)}` : ''}</div>
<div class="lic">On the register as ${esc(j.sponsor_name)}${j.rating ? `, ${esc(j.rating)}` : ''}</div></div>
${stamp({ id: `j${i}`, rating: j.rating, route: j.route || 'Skilled Worker' })}</li>`;
}

export function homePage({ latest, total }) {
  return layout({
    title: 'Sponsor Match: UK jobs from licensed visa sponsors',
    description: 'Search UK jobs posted by employers on the Home Office register of licensed sponsors. Daily email alerts for £9 a month.',
    body: `<section class="hero"><div><h1>UK jobs from employers who can sponsor your visa.</h1>
<p class="lede">Every job here comes from an employer we have matched to the Home Office register of licensed sponsors. Search free, or get new matches by email every morning.</p>
${searchForm()}<p class="hint">${total ? `${total.toLocaleString('en-GB')} live jobs from licensed sponsors.` : 'Jobs refresh every morning.'}</p></div>
<div class="big-stamp">${stamp({ id: 'hero' })}</div></section>
<section class="band"><h2>Just added</h2><ul class="jobs">${latest.length ? latest.map(jobItem).join('') : '<li class="empty">The first import is running. Jobs appear here within the hour.</li>'}</ul>
<a class="btn" href="/jobs">See all jobs</a></section>
<section class="band"><h2>How we check each employer</h2><div class="how">
<div><b>We read the register</b><p>Each morning we import the Home Office list of licensed sponsors, with each employer's rating and route.</p></div>
<div><b>We match the employer</b><p>Only employers whose name matches a register entry closely are shown. Near-misses are left out.</p></div>
<div><b>You apply directly</b><p>Every job links to the employer's own careers page. We never ask for your CV.</p></div></div></section>`,
  });
}

export function jobsPage({ q, city, jobs, baseUrl }) {
  const what = [q, city && `in ${city}`].filter(Boolean).join(' ');
  const title = what ? `${what[0].toUpperCase()}${what.slice(1)} jobs with visa sponsorship` : 'UK jobs with visa sponsorship';
  const canonical = q || city ? `${baseUrl}/roles/${slugify(q || 'all')}${city ? `-in-${slugify(city)}` : ''}` : `${baseUrl}/jobs`;
  return layout({
    title: `${title} | Sponsor Match`, canonical,
    description: `${title}, from employers on the Home Office register of licensed sponsors. Updated daily.`,
    body: `<section style="padding:40px 0 8px"><h1 style="font-size:clamp(34px,5vw,54px);max-width:22ch">${esc(title)}</h1>
<div style="margin-top:24px">${searchForm(q, city)}</div></section>
<ul class="jobs">${jobs.length ? jobs.map(jobItem).join('') : '<li class="empty">No live jobs match that yet. Try a broader title, or set up an alert and we will email you when one appears.</li>'}</ul>
<section class="band plan"><div><h2>Get these by email every morning</h2><p style="color:var(--ink-2)">${price} a month. New matches for this search, from licensed sponsors only. Cancel from any email.</p></div>
<div class="panel">${alertForm(q, city)}</div></section>`,
  });
}

export function alertForm(q = '', city = '', stripeReady = false) {
  return `<form class="stack" method="post" action="/subscribe">
<div><label class="f" for="aq">Job title</label><input id="aq" name="q" value="${esc(q)}" placeholder="e.g. data analyst" required></div>
<div><label class="f" for="ac">Town or city (optional)</label><input id="ac" name="city" value="${esc(city)}" placeholder="Anywhere in the UK"></div>
<div><label class="f" for="ae">Email</label><input id="ae" type="email" name="email" placeholder="you@example.com" required autocomplete="email"></div>
<button class="btn">Start alerts for ${price} a month</button><span class="hint">${stripeReady ? 'You pay on the next page with Stripe.' : 'Payments open soon. Sign up now and you will not be charged yet.'}</span></form>`;
}

export function alertsPage({ stripeReady }) {
  return layout({
    title: `Visa sponsorship job alerts, ${price} a month | Sponsor Match`,
    description: 'A morning email of new UK jobs from licensed visa sponsors that match your search.',
    body: `<section class="plan" style="padding:48px 0 64px"><div><h1 style="font-size:clamp(38px,5vw,60px)">New sponsor jobs in your inbox each morning.</h1>
<p class="lede">${price} a month. One search, one email a day, only when there is something new.</p>
<div class="note">We show employers that hold a sponsor licence. Whether a role qualifies for a Skilled Worker visa depends on its salary and occupation code, which the employer confirms.</div></div>
<div class="panel"><div class="amount">${price}<small> a month</small></div><div style="margin-top:18px">${alertForm('', '', stripeReady)}</div></div></section>`,
  });
}

export function messagePage(title, html, { action } = {}) {
  return layout({ title: `${title} | Sponsor Match`, description: title,
    body: `<section class="msg"><h2>${esc(title)}</h2><div class="body">${html}</div>${action ?? '<a class="btn" href="/jobs">Browse jobs</a>'}</section>` });
}

export function alertEmail({ jobs, q, city, manageUrl, baseUrl }) {
  const what = [q, city && `in ${city}`].filter(Boolean).join(' ');
  return {
    subject: `${jobs.length} new ${what} job${jobs.length === 1 ? '' : 's'} from licensed sponsors`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:580px"><h2>${jobs.length} new match${jobs.length === 1 ? '' : 'es'} for ${esc(what)}</h2>
${jobs.map((j) => `<p><a href="${esc(baseUrl)}/jobs/${encodeURIComponent(j.id)}"><b>${esc(j.title)}</b></a><br>${esc(j.employer)}, ${esc(j.location || '')}<br><small>Register: ${esc(j.sponsor_name)}</small></p>`).join('')}
<hr><p style="font-size:13px;color:#666">Sponsor Match · <a href="${esc(manageUrl)}">Manage or cancel</a></p></div>`,
    text: jobs.map((j) => `${j.title} — ${j.employer}, ${j.location}`).join('\n') + `\nManage: ${manageUrl}`,
  };
}
