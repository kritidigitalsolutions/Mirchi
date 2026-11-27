const test = require('node:test');
const assert = require('node:assert/strict');
const { getRange, buildBucketKeys } = require('./dateRange');

test('weekly reports switch to a fresh Monday-Sunday week at midnight IST', () => {
  for (const [instant, monday, sunday] of [
    ['2026-11-29T23:59:59.999+05:30', '2026-11-23', '2026-11-29'],
    ['2026-11-30T00:00:00+05:30', '2026-11-30', '2026-12-06'],
    ['2027-01-01T12:00:00+05:30', '2026-12-28', '2027-01-03'],
    ['2027-01-04T00:00:00+05:30', '2027-01-04', '2027-01-10'],
  ]) {
    const { start, end, bucket } = getRange('week', undefined, undefined, new Date(instant));
    const keys = buildBucketKeys(start, end, bucket);
    assert.equal(start.getTime(), new Date(`${monday}T00:00:00+05:30`).getTime());
    assert.equal(end - start, 7 * 24 * 60 * 60 * 1000);
    assert.equal(keys.length, 7);
    assert.equal(keys[0], monday);
    assert.equal(keys[6], sunday);
  }
});
