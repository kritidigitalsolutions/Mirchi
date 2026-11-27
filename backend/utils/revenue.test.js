const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createRequire } = require('node:module');

test('dashboard and subscription revenue use identical ranges and sums', async () => {
  const filename = require.resolve('../controllers/admin/subscription.controller');
  const realRequire = createRequire(filename);
  for (const instant of ['2026-11-27T12:00:00+05:30', '2027-01-01T00:00:00+05:30']) {
    const pipelines = [];
    const model = {
      updateMany: async () => ({}),
      aggregate: async pipeline => { pipelines.push(pipeline); return []; },
      countDocuments: async () => 0,
      find: () => {
        const query = { populate: () => query, sort: () => query, skip: () => query, limit: () => query, lean: async () => [] };
        return query;
      },
    };
    class FixedDate extends Date {
      constructor(...args) { super(...(args.length ? args : [instant])); }
      static now() { return new Date(instant).getTime(); }
    }
    const context = { exports: {}, console, Date: FixedDate, require: name => name.endsWith('/subscription.model') ? model : realRequire(name) };
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context);
    const res = { status(code) { assert.equal(code, 200); return this; }, json() {} };
    await context.exports.getIncomeStats({ query: {} }, res);
    const facets = pipelines.shift()[0].$facet;
    await context.exports.getAllSubscriptions({ query: {} }, res);
    const normalize = value => JSON.parse(JSON.stringify(value));
    for (const [index, field] of ['todayIncome', 'yesterdayIncome', 'totalIncome'].entries()) {
      assert.deepEqual(normalize(pipelines[index][0]), normalize(facets[field][0]));
      assert.deepEqual(normalize(pipelines[index][1].$group.revenue), normalize(facets[field][1].$group.total));
    }
    for (const [range, field] of [['month', 'monthlyIncome'], ['year', 'yearlyIncome']]) {
      pipelines.length = 0;
      await context.exports.getSubscriberGrowthChart({ query: { range } }, res);
      assert.deepEqual(normalize(pipelines[0][0]), normalize(facets[field][0]));
      assert.deepEqual(normalize(pipelines[0][1].$group.revenue), normalize(facets[field][1].$group.total));
    }
    pipelines.length = 0;
    let weeklyResponse;
    await context.exports.getSubscriberGrowthChart({ query: { range: 'week' } }, {
      status(code) { assert.equal(code, 200); return this; },
      json(body) { weeklyResponse = body; },
    });
    assert.equal(weeklyResponse.bucket, 'day');
    assert.equal(weeklyResponse.chartData.length, 7);
    assert.equal(weeklyResponse.chartData[0].label, instant.startsWith('2026') ? '2026-11-23' : '2026-12-28');
    assert.equal(weeklyResponse.chartData[6].label, instant.startsWith('2026') ? '2026-11-29' : '2027-01-03');
    assert.deepEqual(normalize(pipelines[0][0]), normalize(facets.weeklyIncome[0]));
    assert.deepEqual(normalize(pipelines[0][1].$group.revenue), normalize(facets.weeklyIncome[1].$group.total));
    assert.equal(weeklyResponse.summary.totalRevenue, 0);
    assert.equal(pipelines[0][0].$match.createdAt.$lt.toISOString(), new Date(instant).toISOString());
    assert.equal(facets.todayIncome[0].$match.createdAt.$lt.toISOString(), new Date(instant).toISOString());
  }
});
