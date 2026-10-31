import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, normaliseName, similarity, bestSponsor, isUkLocation, slugify } from '../src/match.js';

test('CSV parser handles quotes, commas and CRLF', () => {
  const rows = parseCsv('Organisation Name,Town/City,Route\r\n"Smith, Jones & Co Ltd",London,Skilled Worker\r\n"Say ""Hi"" Ltd",Leeds,Skilled Worker\r\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[0]['Organisation Name'], 'Smith, Jones & Co Ltd');
  assert.equal(rows[1]['Organisation Name'], 'Say "Hi" Ltd');
});

test('names normalise away legal suffixes', () => {
  assert.equal(normaliseName('Monzo Bank Limited'), 'monzo bank');
  assert.equal(normaliseName('The Wise Group PLC'), 'wise');
  assert.equal(normaliseName('A&B Services Ltd'), 'a and b');
});

test('similarity: identical after normalising = 1, unrelated is low', () => {
  assert.equal(similarity('GoCardless Ltd', 'GOCARDLESS LIMITED'), 1);
  assert.ok(similarity('Monzo Bank', 'Morrisons Bank') < 0.9);
});

test('bestSponsor respects the threshold', () => {
  const sponsors = [{ id: 1, name: 'Octopus Energy Ltd', norm: normaliseName('Octopus Energy Ltd') }, { id: 2, name: 'Octopus Investments Ltd', norm: normaliseName('Octopus Investments Ltd') }];
  assert.equal(bestSponsor('Octopus Energy Limited', sponsors).id, 1);
  assert.equal(bestSponsor('Octopus Labs', sponsors), null);
});

test('UK location detection', () => {
  assert.ok(isUkLocation('London, UK'));
  assert.ok(isUkLocation('Remote - United Kingdom'));
  assert.ok(!isUkLocation('New York, NY'));
  assert.ok(!isUkLocation('Lukow, Poland'));
});

test('slugify', () => assert.equal(slugify('Software Engineer'), 'software-engineer'));
