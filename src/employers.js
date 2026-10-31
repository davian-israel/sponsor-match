// Employers with public job boards. The crawler only shows jobs from employers it can match
// to the Home Office register (score >= 0.9), so an unmatched or wrong entry is harmless.
// Board tokens are candidates: a 404 is logged and skipped. Growth agent: verify and add more
// (look for boards.greenhouse.io/<token>, jobs.lever.co/<token>, jobs.ashbyhq.com/<token>).
// `registerName` overrides the name used for register matching when the legal name differs.

export const EMPLOYERS = [
  { name: 'Monzo Bank', registerName: 'Monzo Bank Limited', platform: 'greenhouse', token: 'monzo' },
  { name: 'GoCardless', registerName: 'GoCardless Ltd', platform: 'greenhouse', token: 'gocardless' },
  { name: 'Deliveroo', registerName: 'Roofoods Ltd', platform: 'greenhouse', token: 'deliveroo' },
  { name: 'Cleo', registerName: 'Cleo AI Ltd', platform: 'greenhouse', token: 'cleoai' },
  { name: 'Octopus Energy', registerName: 'Octopus Energy Ltd', platform: 'greenhouse', token: 'octopusenergy' },
  { name: 'Wise', registerName: 'Wise Payments Limited', platform: 'greenhouse', token: 'transferwise' },
  { name: 'Synthesia', registerName: 'Synthesia Limited', platform: 'ashby', token: 'synthesia' },
  { name: 'ElevenLabs', registerName: 'Eleven Labs Ltd', platform: 'ashby', token: 'elevenlabs' },
  { name: 'Paddle', registerName: 'Paddle.com Market Limited', platform: 'lever', token: 'paddle' },
];
