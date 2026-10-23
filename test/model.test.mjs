import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCore, emptyCore } from '../src/model.mjs';

const ROCKS = new Set(['sandstone', 'shale', 'limestone', 'basalt', 'granite', 'marble', 'chert', 'obsidian']);

function raw(count, mutate) {
  return Array.from({ length: count }, (_, i) => ({
    sha: (i.toString(16) + 'a1b2c3d4').slice(0, 7),
    subject: 'commit ' + i,
    author: 'Tester',
    timestamp: 1600000000 + i * 86400,
    added: 5,
    deleted: 1,
    isMerge: false,
    ...(mutate ? mutate(i) : {}),
  }));
}

test('buildCore on no commits falls back to emptyCore', () => {
  const empty = emptyCore('docs/empty.md');
  assert.deepEqual(buildCore('docs/empty.md', []), empty);
  assert.deepEqual(buildCore('docs/empty.md', null), empty);
  assert.deepEqual(empty.layers, []);
  assert.equal(empty.totalRows, 0);
  assert.equal(empty.path, 'docs/empty.md');
  assert.equal(empty.id.length, 8);
});

test('layers are ordered oldest -> newest with contiguous indexes', () => {
  const core = buildCore('src/app.mjs', raw(7));
  assert.equal(core.layers.length, 7);
  core.layers.forEach((layer, i) => assert.equal(layer.index, i));
  assert.equal(core.born, 1600000000);
  assert.equal(core.last, 1600000000 + 6 * 86400);
  assert.equal(core.path, 'src/app.mjs');
});

test('rows sum to totalRows and every layer keeps at least one row', () => {
  const core = buildCore('src/app.mjs', raw(7));
  const sum = core.layers.reduce((acc, layer) => acc + layer.rows, 0);
  assert.equal(sum, core.totalRows);
  for (const layer of core.layers) {
    assert.ok(Number.isInteger(layer.rows) && layer.rows >= 1, 'rows ' + layer.rows);
  }
});

test('compression honours maxRows and keeps the newest layer', () => {
  const commits = raw(60, (i) => ({ added: 10 + (i % 7), deleted: i % 3 }));
  const core = buildCore('big.mjs', commits, { maxRows: 40 });
  assert.equal(core.totalRows, 40);
  assert.equal(core.layers.reduce((a, l) => a + l.rows, 0), 40);
  assert.ok(core.layers.length <= 40);
  assert.ok(core.layers.length >= 1);
  for (const layer of core.layers) assert.ok(layer.rows >= 1);
  assert.equal(core.layers[core.layers.length - 1].sha, commits[commits.length - 1].sha);
  assert.equal(core.layers[core.layers.length - 1].timestamp, commits[commits.length - 1].timestamp);
  assert.equal(core.layers[0].timestamp, commits[0].timestamp);
});

test('default maxRows is 40', () => {
  const core = buildCore('big.mjs', raw(60, (i) => ({ added: 20 + i, deleted: 3 })));
  assert.equal(core.totalRows, 40);
});

test('more layers than maxRows merges the oldest layers', () => {
  const commits = raw(100, (i) => ({ added: 4, deleted: 1, subject: 'c' + i }));
  const core = buildCore('huge.mjs', commits, { maxRows: 12 });
  assert.ok(core.layers.length <= 12, 'layer count ' + core.layers.length);
  assert.equal(core.totalRows, 12);
  assert.equal(core.layers[core.layers.length - 1].sha, commits[99].sha);
  assert.equal(core.layers[0].timestamp, commits[0].timestamp);
  core.layers.forEach((layer, i) => assert.equal(layer.index, i));
});

test('small histories are not inflated above one row per layer', () => {
  const core = buildCore('small.mjs', raw(3));
  assert.deepEqual(core.layers.map((l) => l.rows), [1, 1, 1]);
  assert.equal(core.totalRows, 3);
});

test('fault marks churn >= 4x median churn', () => {
  const commits = raw(7, (i) => {
    if (i === 4) return { added: 300, deleted: 100 };
    return { added: 5, deleted: 0 };
  });
  const core = buildCore('fault.mjs', commits);
  assert.equal(core.medianChurn, 5);
  const faults = core.layers.filter((l) => l.fault);
  assert.equal(faults.length, 1);
  assert.equal(faults[0].index, 4);
  assert.equal(faults[0].churn, 400);
});

test('fossil marks layers that lost as much as they gained', () => {
  const commits = raw(4, (i) => {
    if (i === 1) return { added: 0, deleted: 6 };
    if (i === 2) return { added: 3, deleted: 3 };
    return { added: 9, deleted: 1 };
  });
  const core = buildCore('fossil.mjs', commits);
  assert.deepEqual(core.layers.map((l) => l.fossil), [false, true, true, false]);
});

test('dike marks merge commits', () => {
  const commits = raw(5, (i) => (i === 3 ? { isMerge: true } : {}));
  const core = buildCore('dike.mjs', commits);
  assert.deepEqual(core.layers.map((l) => l.dike), [false, false, false, true, false]);
});

test('depthMa grows with age and newest layer sits near zero', () => {
  // Layers one Julian year apart: at 2-decimal Ma resolution a sub-month span ties at 0.00.
  const core = buildCore('depth.mjs', raw(6, (i) => ({ timestamp: 1600000000 + i * YEAR_SECONDS })));
  assert.equal(core.layers[core.layers.length - 1].depthMa, 0);
  for (let i = 1; i < core.layers.length; i++) {
    assert.ok(core.layers[i].depthMa < core.layers[i - 1].depthMa, 'monotonic at ' + i);
  }
  const oldest = core.layers[0].depthMa;
  assert.ok(oldest > 0);
  assert.equal(Math.round(oldest * 100) / 100, oldest);
  for (const layer of core.layers) assert.equal(layer.depthMa, Math.round(layer.depthMa * 100) / 100);
});

const YEAR_SECONDS = 31557600;

/** Two commits exactly `years` Julian years apart (oldest first). */
function span(years) {
  const gap = years * YEAR_SECONDS;
  return [
    { sha: 'aaaaaaa', subject: 'oldest', author: 'Tester', timestamp: 1600000000, added: 5, deleted: 1, isMerge: false },
    { sha: 'bbbbbbb', subject: 'newest', author: 'Tester', timestamp: 1600000000 + gap, added: 5, deleted: 1, isMerge: false },
  ];
}

test('depthMa is measured in millions of years, not kiloseconds', () => {
  const oneYear = buildCore('ma.mjs', span(1));
  assert.equal(oneYear.layers[0].depthMa, 1, 'one year back reads 1.00 Ma');
  assert.equal(oneYear.layers[1].depthMa, 0, 'newest layer reads 0.00 Ma');

  const tenYears = buildCore('ma.mjs', span(10));
  assert.equal(tenYears.layers[0].depthMa, 10, 'ten years back reads 10.00 Ma');
  assert.equal(tenYears.layers[1].depthMa, 0);

  const threeYears = buildCore('ma.mjs', span(3));
  assert.equal(threeYears.layers[0].depthMa, 3, 'three years back reads 3.00 Ma');

  // Two decimals in Ma resolve to ~3.65 days; a one-day span is below that and reads 0.00.
  assert.equal(buildCore('ma.mjs', span(1 / 365.25)).layers[0].depthMa, 0);
});

test('seed is uint32 and id is 8 uppercase hex digits', () => {
  const core = buildCore('seed.mjs', raw(4));
  assert.equal(Number.isInteger(core.seed), true);
  assert.ok(core.seed >= 0 && core.seed <= 0xffffffff);
  assert.match(core.id, /^[0-9A-F]{8}$/);
});

test('subject is trimmed and truncated to 48 characters, sha to 7', () => {
  const commits = raw(2, (i) => ({
    subject: '  ' + 'x'.repeat(80) + '  ',
    sha: 'abcdef0123456789',
  }));
  const core = buildCore('subject.mjs', commits);
  assert.equal(core.layers[0].subject.length, 48);
  assert.equal(core.layers[0].subject, 'x'.repeat(48));
  assert.equal(core.layers[0].sha.length, 7);
});

test('every layer carries a known rock id', () => {
  const core = buildCore('rock.mjs', raw(24));
  for (const layer of core.layers) assert.ok(ROCKS.has(layer.rock), 'rock ' + layer.rock);
  assert.ok(new Set(core.layers.map((l) => l.rock)).size >= 2, 'rock varies');
});

test('buildCore is deterministic: deep-equal and byte-identical JSON', () => {
  const commits = raw(30, (i) => ({ added: 3 + (i % 11), deleted: i % 4, isMerge: i % 9 === 0 }));
  const a = buildCore('det.mjs', commits);
  const b = buildCore('det.mjs', commits);
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test('buildCore does not mutate its input', () => {
  const commits = raw(6);
  const snapshot = JSON.parse(JSON.stringify(commits));
  buildCore('mut.mjs', commits);
  assert.deepEqual(commits, snapshot);
});
test('core identity and rocks are path-form independent', () => {
  const commits = raw(9, (i) => ({ added: 3 + (i % 5), deleted: i % 3, isMerge: i % 4 === 0 }));
  const spellings = ['src/a.mjs', 'src\\a.mjs', './src/a.mjs', 'src//a.mjs'];
  const cores = spellings.map((spelling) => buildCore(spelling, commits));
  const canonical = cores[0];

  for (let i = 0; i < cores.length; i++) {
    assert.equal(cores[i].seed, canonical.seed, 'seed differs for ' + spellings[i]);
    assert.equal(cores[i].id, canonical.id, 'id differs for ' + spellings[i]);
    assert.deepEqual(
      cores[i].layers.map((layer) => layer.rock),
      canonical.layers.map((layer) => layer.rock),
      'rocks differ for ' + spellings[i],
    );
  }

  assert.equal(new Set(cores.map((core) => core.seed)).size, 1);
  assert.equal(new Set(cores.map((core) => core.id)).size, 1);

  const empties = spellings.map((spelling) => emptyCore(spelling));
  assert.equal(new Set(empties.map((core) => core.seed)).size, 1);
  assert.equal(new Set(empties.map((core) => core.id)).size, 1);
});

test('core identity does not depend on render options', () => {
  const commits = raw(30, (i) => ({ added: 1 + (i % 7), deleted: i % 3, isMerge: i % 5 === 0 }));
  const views = [4, 8, 16, 40, 200].map((maxRows) => buildCore('view.mjs', commits, { maxRows }));

  // the layers legitimately differ: fewer rows merge neighbouring commits
  assert.notDeepEqual(
    views[0].layers.map((layer) => layer.sha),
    views[4].layers.map((layer) => layer.sha),
  );

  // but the identity of the file must not
  for (const view of views) {
    assert.equal(view.id, views[0].id, 'id changed with maxRows');
    assert.equal(view.seed, views[0].seed, 'seed changed with maxRows');
  }
  assert.equal(new Set(views.map((view) => view.id)).size, 1);
});
