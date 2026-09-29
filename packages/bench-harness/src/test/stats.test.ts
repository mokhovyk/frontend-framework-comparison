import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats, findOutliers, mannWhitneyU } from '../stats.js';
import { computeTtiTbt } from '../metrics/loading.js';
import { frameworkOrder, perRound, defaultConfig } from '../config.js';
import { compareFrameworks } from '../compare.js';
import { addRound, type PooledSamples } from '../samples.js';

test('computeStats reports CV over all samples (no trimming)', () => {
  const s = computeStats([10, 10, 10, 10, 50]);
  assert.equal(s.median, 10);
  assert.equal(s.mean, 18);
  assert.ok(Math.abs(s.cv - s.stddev / s.mean) < 1e-12);
  assert.equal(s.outliers, 0); // MAD = 0 → no modified Z-score outliers
  assert.equal(s.runs.length, 5);
});

test('computeStats handles a single sample', () => {
  const s = computeStats([7]);
  assert.equal(s.stddev, 0);
  assert.equal(s.cv, 0);
});

test('findOutliers uses the 3.5 modified Z-score threshold', () => {
  assert.deepEqual(findOutliers([10, 11, 10, 12, 11, 10, 50]), [6]);
  assert.deepEqual(findOutliers([10, 11, 10, 12, 11, 10, 13]), []);
});

test('mannWhitneyU: separated samples are significant, identical are not', () => {
  // scipy.stats.mannwhitneyu(..., method='asymptotic') ≈ 0.0122
  const { u, pValue } = mannWhitneyU([1, 2, 3, 4, 5], [6, 7, 8, 9, 10]);
  assert.equal(u, 0);
  assert.ok(Math.abs(pValue - 0.0122) < 0.001, `p=${pValue}`);
  assert.equal(mannWhitneyU([5, 5, 5], [5, 5, 5]).pValue, 1);
  assert.ok(mannWhitneyU([1, 3, 5, 7], [2, 4, 6, 8]).pValue > 0.5);
});

test('computeTtiTbt follows the Lighthouse definitions', () => {
  // Long tasks 150–300 and 400–460 after FCP=100; the one at 7000 is after a 5 s quiet window.
  const r = computeTtiTbt(100, 90, [
    { start: 150, end: 300 },
    { start: 400, end: 460 },
    { start: 7000, end: 7100 },
  ]);
  assert.equal(r.tti, 460);
  assert.equal(r.tbt, 100 + 10);
  assert.equal(r.bootBlocking, 110);
});

test('computeTtiTbt: work before FCP counts only toward boot blocking', () => {
  const r = computeTtiTbt(168, 42, [
    { start: 45, end: 97 },
    { start: 98, end: 152 },
  ]);
  assert.equal(r.tti, 168);
  assert.equal(r.tbt, 0);
  assert.equal(r.bootBlocking, 2 + 4);
});

test('frameworkOrder rotates so each framework takes each position once', () => {
  const fws = ['react', 'angular', 'vue'];
  const rounds = [0, 1, 2].map((r) => frameworkOrder(fws, r));
  assert.deepEqual(rounds, [
    ['react', 'angular', 'vue'],
    ['angular', 'vue', 'react'],
    ['vue', 'react', 'angular'],
  ]);
  for (let pos = 0; pos < 3; pos++) {
    assert.deepEqual(new Set(rounds.map((r) => r[pos])), new Set(fws));
  }
});

test('perRound splits the total across rounds, rounding up', () => {
  assert.equal(perRound(25, { ...defaultConfig, rounds: 3 }), 9);
  assert.equal(perRound(10, { ...defaultConfig, rounds: 1 }), 10);
});

test('addRound pools samples round by round', () => {
  const pool: PooledSamples = {};
  addRound(pool, 'vue', { R1: { unit: 'ms', runs: [1, 2] } });
  addRound(pool, 'vue', { R1: { unit: 'ms', runs: [3] }, R2: { unit: 'ms', runs: [] } });
  assert.deepEqual(pool['vue']['R1'].rounds, [[1, 2], [3]]);
  assert.equal(pool['vue']['R2'], undefined);
});

test('compareFrameworks requires both significance and a ≥2% difference', () => {
  const fast = Array.from({ length: 20 }, (_, i) => 100 + (i % 5));
  const slow = fast.map((v) => v * 1.5);
  const nearlySame = fast.map((v) => v * 1.01);
  const c = compareFrameworks({
    a: { m: { unit: 'ms', median: 102, runs: fast } },
    b: { m: { unit: 'ms', median: 153, runs: slow } },
    c: { m: { unit: 'ms', median: 103, runs: nearlySame } },
  })['m'];
  assert.equal(c.find((x) => x.a === 'a' && x.b === 'b')?.better, 'a');
  assert.equal(c.find((x) => x.a === 'a' && x.b === 'c')?.better, null);
});
