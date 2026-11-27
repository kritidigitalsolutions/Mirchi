const test = require('node:test');
const assert = require('node:assert/strict');
const { getRange, buildBucketKeys } = require('./dateRange');

test('monthly reports reset on the first in IST and include every calendar day', () => {
  for (const [instant, first, next, days] of [
    ['2026-11-30T23:59:59.999+05:30', '2026-11-01', '2026-12-01', 30],
    ['2026-12-01T00:00:00+05:30', '2026-12-01', '2027-01-01', 31],
    ['2027-01-01T00:00:00+05:30', '2027-01-01', '2027-02-01', 31],
    ['2027-02-28T23:59:59.999+05:30', '2027-02-01', '2027-03-01', 28],
    ['2028-02-29T12:00:00+05:30', '2028-02-01', '2028-03-01', 29],
  ]) {
    const { start, end, bucket } = getRange('month', undefined, undefined, new Date(instant));
    assert.equal(start.getTime(), new Date(`${first}T00:00:00+05:30`).getTime());
    assert.equal(end.getTime(), new Date(`${next}T00:00:00+05:30`).getTime());
    assert.equal(bucket, 'day');
    assert.equal(buildBucketKeys(start, end, bucket).length, days);
  }
});

test('yearly reports reset on January 1 in IST and show January through December', () => {
  for (const [instant, year] of [
    ['2026-12-31T23:59:59.999+05:30', 2026],
    ['2027-01-01T00:00:00+05:30', 2027],
    ['2028-02-29T12:00:00+05:30', 2028],
  ]) {
    const { start, end, bucket } = getRange('year', undefined, undefined, new Date(instant));
    assert.equal(start.getTime(), new Date(`${year}-01-01T00:00:00+05:30`).getTime());
    assert.equal(end.getTime(), new Date(`${year + 1}-01-01T00:00:00+05:30`).getTime());
    assert.equal(bucket, 'month');
    const keys = buildBucketKeys(start, end, bucket);
    assert.equal(keys.length, 12);
    assert.equal(keys[0], `${year}-01`);
    assert.equal(keys[11], `${year}-12`);
  }
});

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
