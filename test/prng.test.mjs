import test from 'node:test';
import assert from 'node:assert/strict';

import { hash32, mulberry32 } from '../src/prng.mjs';

function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i) & 0xff;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

test('hash32 returns a 32-bit unsigned integer', () => {
  for (const s of ['', 'strata', 'README.md', 'a'.repeat(1000)]) {
    const h = hash32(s);
    assert.equal(Number.isInteger(h), true);
    assert.ok(h >= 0 && h <= 0xffffffff, 'in uint32 range');
  }
});

test('hash32 is deterministic and matches FNV-1a 32', () => {
  assert.equal(hash32('strata'), fnv1a('strata'));
  assert.equal(hash32('README.md'), fnv1a('README.md'));
  assert.equal(hash32(''), 0x811c9dc5);
  assert.equal(hash32('strata'), hash32('strata'));
});

test('hash32 separates distinct inputs', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(hash32('path#' + i));
  assert.equal(seen.size, 200);
});

test('mulberry32 is reproducible for the same seed', () => {
  const a = mulberry32(123456);
  const b = mulberry32(123456);
  for (let i = 0; i < 8; i++) assert.equal(a(), b());
});

test('mulberry32 yields floats in [0,1) for many seeds', () => {
  for (const seed of [0, 1, 42, 0xffffffff, 0xdeadbeef]) {
    const rnd = mulberry32(seed);
    for (let i = 0; i < 500; i++) {
      const v = rnd();
      assert.ok(v >= 0 && v < 1, 'value in range: ' + v);
    }
  }
});

test('mulberry32 streams differ across seeds', () => {
  const a = mulberry32(7);
  const b = mulberry32(8);
  const seqA = Array.from({ length: 10 }, () => a());
  const seqB = Array.from({ length: 10 }, () => b());
  assert.notDeepEqual(seqA, seqB);
});

test('mulberry32 is roughly uniform', () => {
  const rnd = mulberry32(hash32('strata'));
  let sum = 0;
  const n = 20000;
  for (let i = 0; i < n; i++) sum += rnd();
  const mean = sum / n;
  assert.ok(Math.abs(mean - 0.5) < 0.01, 'mean ' + mean);
});
