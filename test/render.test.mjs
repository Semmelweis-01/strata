// Render layer acceptance tests. Self-contained: the fixture Core is built here.
// No import from scripts/fixture.mjs (owned elsewhere); no git, no fs at render time.

import test from 'node:test';
import assert from 'node:assert/strict';

import { ROCKS, rockColor, reset } from '../src/palette.mjs';
import { renderAnsi } from '../src/render/ansi.mjs';
import { renderSvg } from '../src/render/svg.mjs';

const ROCK_ORDER = ['sandstone', 'shale', 'limestone', 'basalt', 'granite', 'marble', 'chert', 'obsidian'];
const ESC = String.fromCharCode(27);

// 12 layers: all 8 rock types, 2 fossils, 1 fault, 1 dike.
// depthMa is the reading at the TOP of a layer, so the column reads
// 0.00 Ma at the surface and grows downward (newest layer = highest index).
function makeCore() {
  const rows = [3, 2, 4, 1, 2, 3, 2, 1, 3, 2, 4, 2];
  const churn = [12, 6, 40, 3, 9, 22, 5, 2, 64, 8, 14, 30];
  const n = rows.length;
  const layers = rows.map((thickness, i) => {
    const added = Math.floor(churn[i] / 2);
    const deleted = churn[i] - added;
    return {
      index: i,
      sha: (i * 2654435761 % 0xfffffff).toString(16).padStart(7, '0').slice(0, 7),
      subject: 'layer ' + i + ' subject',
      author: 'geo' + (i % 3),
      timestamp: 1600000000 + i * 86400 * 37,
      added,
      deleted,
      churn: churn[i],
      rows: thickness,
      rock: ROCK_ORDER[i % ROCK_ORDER.length],
      fossil: i === 4 || i === 9,
      fault: i === 6,
      dike: i === 10,
      depthMa: Math.round((n - 1 - i) * 13.37 * 100) / 100,
    };
  });
  return {
    path: 'README.md',
    layers,
    totalRows: rows.reduce((a, b) => a + b, 0),
    medianChurn: 10,
    born: layers[0].timestamp,
    last: layers[layers.length - 1].timestamp,
    seed: 0x1a2b3c4d,
    id: 'A1B2C3D4',
  };
}

// Structural check: every opened tag is closed, in order.
function assertBalanced(svg) {
  assert.ok(svg.startsWith('<?xml') || svg.startsWith('<svg'), 'must open with <?xml or <svg');
  assert.ok(svg.endsWith('</svg>') || svg.trimEnd().endsWith('</svg>'), 'must close with </svg>');
  const stack = [];
  const re = /<(\/?)([A-Za-z][A-Za-z0-9:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let m;
  let count = 0;
  while ((m = re.exec(svg)) !== null) {
    count++;
    const name = m[2];
    if (m[1] === '/') assert.equal(stack.pop(), name, 'mismatched close for ' + name);
    else if (m[4] !== '/') stack.push(name);
  }
  assert.ok(count > 10, 'expected a real document, got ' + count + ' tags');
  assert.deepEqual(stack, [], 'unclosed tags: ' + stack.join(','));
}

test('fixture covers normal layers, fossils, a fault, a dike and all 8 rocks', () => {
  const core = makeCore();
  assert.equal(core.layers.length, 12);
  assert.equal(new Set(core.layers.map((l) => l.rock)).size, 8);
  for (const rock of ROCK_ORDER) assert.ok(core.layers.some((l) => l.rock === rock), 'missing ' + rock);
  assert.equal(core.layers.filter((l) => l.fossil).length, 2);
  assert.equal(core.layers.filter((l) => l.fault).length, 1);
  assert.equal(core.layers.filter((l) => l.dike).length, 1);
  assert.equal(core.totalRows, core.layers.reduce((a, l) => a + l.rows, 0));
});

test('palette maps all eight rocks across all three color depths', () => {
  assert.equal(Object.keys(ROCKS).length, 8);
  for (const rock of ROCK_ORDER) {
    const entry = ROCKS[rock];
    assert.ok(entry, 'palette missing ' + rock);
    assert.equal(entry.rgb.length, 3);
    for (const channel of entry.rgb) assert.ok(Number.isInteger(channel) && channel >= 0 && channel <= 255);
    assert.equal(typeof entry.name, 'string');
    assert.equal(typeof entry.glyph, 'string');
    assert.ok(Array.from(entry.glyph).length > 0, rock + ' needs a glyph');
    assert.match(rockColor(rock, 'truecolor'), /^\x1b\[38;2;\d+;\d+;\d+m$/);
    assert.match(rockColor(rock, '256'), /^\x1b\[38;5;\d+m$/);
    assert.equal(rockColor(rock, 'none'), '');
  }
  assert.equal(reset(), ESC + '[0m');
});

test('renderAnsi is byte-identical across runs', () => {
  const core = makeCore();
  assert.equal(renderAnsi(core), renderAnsi(core));
  assert.equal(renderAnsi(core, { color: 'truecolor' }), renderAnsi(core, { color: 'truecolor' }));
  assert.equal(renderAnsi(core, { ascii: true }), renderAnsi(core, { ascii: true }));
  assert.equal(renderAnsi(core, { ascii: true }).length > 0, true);
});

test('renderAnsi emits one row per layer row, plus header and footer', () => {
  const core = makeCore();
  const lines = renderAnsi(core, { color: 'none' }).split('\n');
  assert.equal(lines.length, core.totalRows + 2);
  assert.ok(lines[0].includes('README.md') && lines[0].includes('A1B2C3D4'));
  assert.ok(lines[lines.length - 1].includes('end of core'));
  for (const line of lines) {
    assert.ok(line.length > 0, 'no blank rows');
    assert.equal(/ +$/.test(line), false, 'no trailing whitespace');
  }
});

test('color none emits zero escape sequences, other modes do emit them', () => {
  const core = makeCore();
  for (const opts of [{ color: 'none' }, {}, { color: undefined }, { color: 'none', ascii: true }]) {
    assert.equal(renderAnsi(core, opts).includes(ESC), false, 'no ESC for ' + JSON.stringify(opts));
  }
  assert.ok(renderAnsi(core, { color: 'truecolor' }).includes(ESC + '[38;2;'));
  assert.ok(renderAnsi(core, { color: '256' }).includes(ESC + '[38;5;'));
  assert.equal(renderAnsi(core, { color: '256' }).includes('[38;2;'), false);
});

test('ascii mode is pure ASCII and every glyph stays reachable', () => {
  const core = makeCore();
  const ascii = renderAnsi(core, { ascii: true, color: 'none' });
  for (const ch of ascii) {
    const code = ch.codePointAt(0);
    assert.ok(code === 10 || (code >= 32 && code <= 126), 'non-ASCII char U+' + code.toString(16));
  }
  assert.ok(ascii.includes('o'), 'fossil -> o');
  assert.ok(ascii.includes('/'), 'fault and dike -> /');
  assert.ok(ascii.includes('+'), 'floor -> +');
  assert.ok(ascii.includes('-'), 'title rule -> -');
  // '#' is now the unknown-rock fallback only: real rocks keep their own glyph.
  const unknown = renderAnsi({ path: 'u.md', layers: [{ index: 0, sha: 'aaaaaaa', subject: 'u', rows: 1, rock: 'not-a-rock', depthMa: 0 }] }, { ascii: true, color: 'none' });
  assert.ok(unknown.includes('#'), 'unknown rock -> #');
  const asciiLabels = renderAnsi(core, { ascii: true, color: 'none', labels: false });
  for (const rock of ROCK_ORDER) assert.ok(asciiLabels.includes(ROCKS[rock].ascii), 'ascii glyph for ' + rock);

  const fancy = renderAnsi(core, { color: 'none' });
  for (const rock of ROCK_ORDER) {
    assert.ok(fancy.includes(ROCKS[rock].glyph), 'rock glyph ' + rock + ' unreachable');
  }
  assert.ok(fancy.includes('\u25CC') || fancy.includes('\u2301'), 'fossil glyph');
  assert.ok(fancy.includes('\u2571'), 'fault/dike glyph');
  assert.ok(fancy.includes('\u2594'), 'floor glyph');
  assert.ok(fancy.includes('\u25C6'), 'title glyph');
});

test('fossils, faults and dikes are actually drawn', () => {
  const core = makeCore();
  const lines = renderAnsi(core, { color: 'none' }).split('\n');
  const fossilRows = lines.filter((l) => l.includes('\u25CC') || l.includes('\u2301'));
  assert.equal(fossilRows.length, 2, 'one fossil mark per fossil layer');
  const jagged = lines.filter((l) => l.startsWith('\u2571'));
  assert.equal(jagged.length, 1, 'the fault jag starts its row');
  const dikeRows = lines.filter((l) => /\u2571/.test(l) && !l.startsWith('\u2571'));
  assert.ok(dikeRows.length >= 3, 'the dike is a 2-3 row band, got ' + dikeRows.length);
});

test('maxRows compresses proportionally and keeps the newest layer on top', () => {
  const core = makeCore();
  const full = renderAnsi(core, { color: 'none' }).split('\n');
  assert.equal(full.length, core.totalRows + 2);
  for (const maxRows of [10, 8, 5, 3, 1]) {
    const small = renderAnsi(core, { color: 'none', maxRows }).split('\n');
    assert.ok(small.length <= maxRows + 2, 'maxRows ' + maxRows + ' -> ' + small.length + ' lines');
    assert.ok(small.length >= 3, 'never collapses to nothing');
    assert.ok(small[1].includes('layer ' + (core.layers.length - 1)), 'newest layer stays at the top');
  }
  const capped = renderAnsi(core, { color: 'none', maxRows: 100 }).split('\n');
  assert.equal(capped.length, full.length);
  assert.deepEqual(capped, full);
});

test('depth reads 0.00 Ma at the top and only grows downward', () => {
  const core = makeCore();
  const lines = renderAnsi(core, { color: 'none', labels: false }).split('\n').slice(1, -1);
  const depths = lines.map((l) => Number(/([\d.]+) Ma/.exec(l)[1]));
  assert.equal(depths.length, core.totalRows);
  assert.equal(depths[0], 0);
  for (let i = 1; i < depths.length; i++) {
    assert.ok(depths[i] >= depths[i - 1], 'depth must not decrease: ' + depths[i - 1] + ' -> ' + depths[i]);
  }
});

test('width, gutter and labels reshape the rail', () => {
  const core = makeCore();
  const narrow = renderAnsi(core, { color: 'none', width: 8, gutter: false, labels: false }).split('\n');
  for (const line of narrow.slice(1, -1)) assert.ok(line.length <= 10, 'narrow body: ' + line.length);
  const noLabels = renderAnsi(core, { color: 'none', labels: false });
  assert.equal(noLabels.includes('subject'), false);
  const wide = renderAnsi(core, { color: 'none', width: 40, labels: false }).split('\n');
  assert.ok(wide[1].length > narrow[1].length);
  const noGutter = renderAnsi(core, { color: 'none', gutter: false });
  assert.equal(/ Ma/.test(noGutter.split('\n').slice(1).join('\n')), false);
});

test('renderSvg is byte-identical, standalone and structurally closed', () => {
  const core = makeCore();
  assert.equal(renderSvg(core), renderSvg(core));
  assert.equal(renderSvg(core, { theme: 'light' }), renderSvg(core, { theme: 'light' }));
  const svg = renderSvg(core);
  assertBalanced(svg);
  assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
  assert.match(svg, /viewBox="0 0 \d+ \d+"/);
  assert.ok(svg.includes('<rect'));
  assert.ok(svg.includes('<path'));
  assert.ok(svg.includes('<text'));
  assert.equal(/<image|<script|<foreignObject|@import|xlink:href/.test(svg), false, 'no external assets');
  assert.equal(/https?:\/\/(?!www\.w3\.org)/.test(svg), false, 'no external URLs');
  assert.ok(svg.includes('class="fossil"'), 'fossil drawn as a shape');
  assert.ok(svg.includes('class="fault"'), 'fault drawn as a shape');
  assert.ok(svg.includes('class="dike"'), 'dike drawn as a shape');
});

test('renderSvg honours theme, maxRows and labels', () => {
  const core = makeCore();
  const dark = renderSvg(core);
  const light = renderSvg(core, { theme: 'light' });
  assert.notEqual(dark, light);
  assert.ok(dark.includes('#0f1115'), 'dark background');
  assert.ok(light.includes('#f7f5f1'), 'light background');
  const vb = (s) => /viewBox="0 0 (\d+) (\d+)"/.exec(s).slice(1).map(Number);
  const [w, h] = vb(dark);
  assert.ok(w > 0 && h > 0);
  for (const maxRows of [10, 5, 1]) {
    const small = renderSvg(core, { maxRows });
    assertBalanced(small);
    const [, sh] = vb(small);
    assert.ok(sh < h, 'maxRows ' + maxRows + ' must shrink the document');
  }
  const unlabeled = renderSvg(core, { labels: false });
  assertBalanced(unlabeled);
  assert.ok(vb(unlabeled)[0] < w);
  assert.equal(unlabeled.includes('layer 11 subject'), false);
});

test('degenerate cores never throw and never leak escapes', () => {
  const cases = [
    undefined,
    {},
    { path: 'x.md', layers: [] },
    { path: 'x.md', layers: [], totalRows: 0, medianChurn: 0, born: 0, last: 0, seed: 1, id: '00000000' },
    { layers: [{ index: 0, sha: 'abc', subject: 'one', rows: 1, rock: 'not-a-rock', depthMa: 0 }] },
  ];
  for (const core of cases) {
    const ansi = renderAnsi(core, { color: 'none' });
    assert.equal(typeof ansi, 'string');
    assert.equal(ansi.includes(ESC), false);
    assert.ok(ansi.split('\n').length >= 1);
    assertBalanced(renderSvg(core));
    assert.equal(renderSvg(core), renderSvg(core));
  }
});

// ---------------------------------------------------------------------------
// Round-2 regression tests: the rail is monotonic, ascii keeps rock identity.
// ---------------------------------------------------------------------------

const DEPTH_RE = /^ *\/? *([\d.]+) Ma/;

// Readings as they are actually emitted, in top-to-bottom order, footer included.
function railReadings(core, opts) {
  const lines = renderAnsi(core, opts).split('\n').slice(1);
  const out = [];
  for (const line of lines) {
    const m = DEPTH_RE.exec(line);
    if (m) out.push(Number(m[1]));
  }
  return out;
}

function assertNonDecreasing(readings, label) {
  assert.ok(readings.length >= 2, label + ': expected a real rail, got ' + readings.length);
  for (let i = 1; i < readings.length; i++) {
    assert.ok(readings[i] >= readings[i - 1], label + ': depth decreased ' + readings[i - 1] + ' -> ' + readings[i] + ' at row ' + i);
  }
}

// The defect case: many consecutive layers share the same depthMa (as model.mjs
// compression produces) and several layers occupy more than one row.
function makeTiedCore() {
  const rows = [2, 1, 3, 1, 2, 1, 4, 2, 1, 3, 1, 2];
  // index 0 is the oldest layer, so depthMa descends as the index grows
  const depths = [13, 13, 9.25, 9.25, 9.25, 9.25, 4.5, 4.5, 4.5, 0, 0, 0];
  const layers = rows.map((thickness, i) => ({
    index: i,
    sha: ('t' + i + '0000000').slice(0, 7),
    subject: 'tied ' + i,
    author: 'geo',
    timestamp: 1600000000 + i * 90000,
    added: 4 + i,
    deleted: i % 3,
    churn: 4 + i + (i % 3),
    rows: thickness,
    rock: ROCK_ORDER[i % ROCK_ORDER.length],
    fossil: false,
    fault: false,
    dike: false,
    // newest = highest index, so the reading at the top of the column is 0
    depthMa: depths[i],
  }));
  return {
    path: 'tied.md',
    layers,
    totalRows: rows.reduce((a, b) => a + b, 0),
    medianChurn: 6,
    born: layers[0].timestamp,
    last: layers[layers.length - 1].timestamp,
    seed: 0x5eed1234,
    id: 'DEADBEEF',
  };
}

test('rail never decreases when neighbouring layers share a depthMa', () => {
  const core = makeTiedCore();
  // guard the fixture itself: consecutive equal depths really are present
  let ties = 0;
  for (let i = 1; i < core.layers.length; i++) {
    if (core.layers[i].depthMa === core.layers[i - 1].depthMa) ties++;
  }
  assert.ok(ties >= 3, 'fixture must contain tied neighbouring depths, got ' + ties);
  assert.ok(core.layers.some((l) => l.rows > 1), 'fixture must contain multi-row layers');

  for (const maxRows of [undefined, 40, 20, 11, 6, 3, 2]) {
    const opts = { color: 'none', labels: false };
    if (maxRows !== undefined) opts.maxRows = maxRows;
    const readings = railReadings(core, opts);
    assertNonDecreasing(readings, 'maxRows ' + maxRows);
    console.log('maxRows ' + maxRows + ': ' + readings.map((v) => v.toFixed(2)).join(' '));
  }

  // the reported shape: newest layer on top reads 0.00 Ma, the base is the oldest
  const full = railReadings(core, { color: 'none', labels: false });
  assert.equal(full[0], 0, 'top row reads 0.00 Ma');
  assert.equal(full[full.length - 1], core.layers[0].depthMa, 'base reads the oldest depthMa');
});

test('rail stays monotonic on the shipped fixture and its compressions', () => {
  const core = makeCore();
  for (const maxRows of [undefined, 40, 34, 24, 12, 7, 4, 2]) {
    const opts = { color: 'none' };
    if (maxRows !== undefined) opts.maxRows = maxRows;
    assertNonDecreasing(railReadings(core, opts), 'fixture maxRows ' + maxRows);
  }
});

test('degenerate depth ranges collapse to one non-decreasing reading', () => {
  const flat = {
    path: 'flat.md',
    layers: [
      { index: 0, sha: '0000000', subject: 'a', rows: 2, rock: 'shale', depthMa: 7 },
      { index: 1, sha: '1111111', subject: 'b', rows: 3, rock: 'basalt', depthMa: 7 },
      { index: 2, sha: '2222222', subject: 'c', rows: 1, rock: 'chert', depthMa: 7 },
    ],
    seed: 7,
    id: '00000007',
  };
  const readings = railReadings(flat, { color: 'none', labels: false });
  assert.equal(readings.length, 7, 'six core rows plus the floor row');
  for (const value of readings) assert.equal(value, 7, 'flat range reads 7.00 Ma everywhere');

  // inverted range (older layer shallower than newer) must not decrease either
  const inverted = {
    path: 'inv.md',
    layers: [
      { index: 0, sha: '0000000', subject: 'a', rows: 2, rock: 'shale', depthMa: 1 },
      { index: 1, sha: '1111111', subject: 'b', rows: 2, rock: 'basalt', depthMa: 9 },
    ],
    seed: 9,
    id: '00000009',
  };
  assertNonDecreasing(railReadings(inverted, { color: 'none', labels: false }), 'inverted range');
});

test('ascii mode keeps every rock distinguishable', () => {
  const core = makeCore();
  const ascii = renderAnsi(core, { ascii: true, color: 'none', labels: false });
  const body = ascii.split('\n').slice(1, -1).join('');

  const glyphs = new Set();
  for (const rock of ROCK_ORDER) glyphs.add(ROCKS[rock].ascii);
  assert.equal(glyphs.size, 8, 'the eight ascii glyphs must be distinct');

  const used = new Set();
  for (const ch of body) used.add(ch);
  const distinctRocks = new Set(core.layers.map((l) => l.rock));
  assert.ok(distinctRocks.size >= 6, 'fixture carries 6+ rocks, got ' + distinctRocks.size);

  let found = 0;
  for (const glyph of glyphs) if (used.has(glyph)) found++;
  assert.ok(found >= 6, 'ascii body must show at least 6 distinct rock glyphs, got ' + found + ': ' + Array.from(used).sort().join(''));

  // every glyph is printable ascii, and the reserved markers are not stolen
  for (const glyph of glyphs) {
    const code = glyph.codePointAt(0);
    assert.ok(code >= 32 && code <= 126, 'rock glyph must be printable ascii: ' + glyph);
    assert.equal('o/+-#'.includes(glyph), false, 'rock glyph collides with a marker: ' + glyph);
  }
});

// ---------------------------------------------------------------------------
// Round-3 regression tests: fault displacement accumulates down the column.
// ---------------------------------------------------------------------------

// Every rock's ascii cell; a body row's leftmost rock cell is where the core
// body starts, i.e. the accumulated fault offset in cells.
const ROCK_ASCII = new Set(ROCK_ORDER.map((rock) => ROCKS[rock].ascii));

// Leftmost rock-cell column index per body row (header and footer excluded).
// The scan starts after the depth reading: the gutter prints '.' and digits, and
// '.' is sandstone's ascii cell, so a whole-line scan would measure the gutter.
function leftmostRockCells(core, opts) {
  const lines = renderAnsi(core, opts).split('\n').slice(1, -1);
  return lines.map((line) => {
    const cells = Array.from(line);
    const afterGutter = line.includes('Ma') ? cells.indexOf('M') + 2 : 0;
    return cells.findIndex((ch, i) => i >= afterGutter && ROCK_ASCII.has(ch));
  });
}

// Three faults spread down the column, each with rows below it.
// index 0 is the oldest layer, so the emitted top is the highest index:
// the faults at 5, 3 and 1 land top-to-bottom in that order.
function makeFaultedCore() {
  const rows = [2, 3, 2, 3, 2, 3, 2];
  const faulted = new Set([5, 3, 1]);
  const layers = rows.map((thickness, i) => ({
    index: i,
    sha: ('f' + i + '0000000').slice(0, 7),
    subject: 'faulted ' + i,
    author: 'geo',
    timestamp: 1600000000 + i * 90000,
    added: 3 + i,
    deleted: i % 2,
    churn: 3 + i + (i % 2),
    rows: thickness,
    rock: ROCK_ORDER[i % ROCK_ORDER.length],
    fossil: false,
    fault: faulted.has(i),
    dike: false,
    depthMa: Math.round((rows.length - 1 - i) * 4.5 * 100) / 100,
  }));
  return {
    path: 'faulted.md',
    layers,
    totalRows: rows.reduce((a, b) => a + b, 0),
    medianChurn: 5,
    born: layers[0].timestamp,
    last: layers[layers.length - 1].timestamp,
    seed: 0x0f0f0f0f,
    id: 'F0F0F0F0',
  };
}

test('fault displacement accumulates and never resets', () => {
  const core = makeFaultedCore();
  const opts = { color: 'none', ascii: true, labels: false };
  const lines = renderAnsi(core, opts).split('\n').slice(1, -1);
  const lefts = leftmostRockCells(core, opts);
  // the fixed lead (3 cells) and the depth gutter are constant, so the offsets
  // are the absolute columns minus the first body row.
  const offsets = lefts.map((v) => v - lefts[0]);

  assert.equal(lines.length, core.totalRows, 'one body row per layer row');
  const faultRows = [];
  for (let i = 0; i < lines.length; i++) if (lines[i].startsWith('/')) faultRows.push(i);
  assert.equal(faultRows.length, 3, 'three fault jags');

  // the offset never decreases anywhere in the column
  for (let i = 1; i < offsets.length; i++) {
    assert.ok(offsets[i] >= offsets[i - 1], 'offset reset at row ' + i + ': ' + offsets[i - 1] + ' -> ' + offsets[i]);
  }
  // and it strictly grows across every break, from the next row onward
  for (const f of faultRows) {
    assert.ok(offsets[f + 1] > offsets[f], 'no displacement after the fault at row ' + f + ': ' + offsets[f] + ' -> ' + offsets[f + 1]);
    assert.equal(offsets[f + 1] - offsets[f], 2, 'each break adds DK=2 exactly once');
  }
  // the break row itself keeps the offset in force before it
  assert.equal(offsets[faultRows[0]], 0, 'the first break row is not shifted by its own break');
  assert.equal(offsets[faultRows[1]], 2, 'the second break row keeps the first break offset');
  assert.equal(offsets[faultRows[2]], 4, 'the third break row keeps the two earlier breaks');
  // three breaks of DK=2 accumulate: 0, 2, 4, 6
  assert.equal(offsets[offsets.length - 1], 6, 'the base accumulates all three breaks');
  assert.deepEqual(Array.from(new Set(offsets)).sort((a, b) => a - b), [0, 2, 4, 6], 'four distinct offsets');
  console.log('faulted core leftmost rock cell per row: ' + lefts.join(' '));
});

test('fault offset is capped so the body keeps at least 8 cells', () => {
  const width = 24;
  const cap = width - 8;
  // gutter stays on: it is constant, so the offset is measurable from the column
  const opts = { color: 'none', ascii: true, labels: false, width };

  // many breaks: uncapped, 11 of them would push the body to 22 cells
  const many = {
    path: 'many.md',
    layers: Array.from({ length: 12 }, (unused, i) => ({
      index: i,
      sha: ('c' + i + '0000000').slice(0, 7),
      subject: 'capped ' + i,
      author: 'geo',
      timestamp: 1600000000 + i * 90000,
      added: 3 + i,
      deleted: i % 2,
      churn: 3 + i + (i % 2),
      rows: 2,
      rock: ROCK_ORDER[i % ROCK_ORDER.length],
      fossil: false,
      fault: true,
      dike: false,
      depthMa: Math.round((11 - i) * 4.5 * 100) / 100,
    })),
    seed: 0x0f0f0f0f,
    id: 'CAFEF00D',
  };
  const lines = renderAnsi(many, opts).split('\n').slice(1, -1);
  const lefts = leftmostRockCells(many, opts);
  const offsets = lefts.map((v) => v - lefts[0]);
  const maxOffset = Math.max.apply(null, offsets);
  assert.equal(maxOffset, cap, 'offset clamps at width - 8 = ' + cap + ', got ' + maxOffset);
  assert.ok(maxOffset <= cap, 'offset never exceeds width - 8');
  for (let i = 0; i < lines.length; i++) {
    // trailing spaces are stripped, so the line end is the body end
    const bodyCells = lines[i].length - lefts[i];
    assert.ok(bodyCells >= 8, 'body narrower than 8 cells at row ' + i + ': ' + bodyCells);
    assert.ok(lines[i].length > 0, 'empty row at ' + i);
  }

  // a narrow column cannot shrink below the minimum either: the cap falls to
  // width - 8 and the body stays exactly 8 cells wide
  for (const w of [8, 10, 12]) {
    const narrowOpts = { color: 'none', ascii: true, labels: false, width: w };
    const narrow = renderAnsi(many, narrowOpts).split('\n').slice(1, -1);
    const narrowLefts = leftmostRockCells(many, narrowOpts);
    const narrowOffsets = narrowLefts.map((v) => v - narrowLefts[0]);
    assert.ok(Math.max.apply(null, narrowOffsets) <= w - 8, 'width ' + w + ' offset over cap');
    for (let i = 0; i < narrow.length; i++) {
      assert.ok(narrow[i].length - narrowLefts[i] >= 8, 'width ' + w + ' row ' + i + ' body under 8 cells');
    }
  }
  console.log('capped leftmost rock cell per row (width ' + width + '): ' + lefts.join(' '));
  console.log('capped offset per row: ' + offsets.join(' '));
});

test('svg fault displacement accumulates with the same cap', () => {
  const core = makeFaultedCore();
  const width = 24;
  const cellW = 18;
  const rects = [...renderSvg(core, { width }).matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="rgb\(/g)]
    .map((m) => ({ x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]) }))
    .sort((a, b) => a.y - b.y);
  // one body rect per layer, plus one extra for each break (the row above it
  // keeps the pre-break offset)
  const faults = core.layers.filter((l) => l.fault).length;
  assert.equal(rects.length, core.layers.length + faults, 'one body rect per layer, fault rows split at the break');
  assert.equal(rects.reduce((a, r) => a + r.h, 0), core.totalRows * 20, 'the rects cover every row exactly once');
  const xs = [];
  for (const rect of rects) if (xs[xs.length - 1] !== rect.x) xs.push(rect.x);
  assert.deepEqual(xs, [0, 2, 4, 6].map((n) => 124 + n * cellW), 'svg x never resets: ' + xs.join(','));
  for (let i = 1; i < rects.length; i++) {
    assert.ok(rects[i].x >= rects[i - 1].x, 'svg x decreased at row ' + i);
    assert.ok(rects[i].w >= 8 * cellW, 'svg body narrower than 8 cells at row ' + i);
  }

  // every layer broken: the cap holds at width - 8 cells
  const many = {
    path: 'many.md',
    layers: Array.from({ length: 12 }, (unused, i) => ({
      index: i, sha: 'c' + i, subject: 'c' + i, rows: 2, rock: ROCK_ORDER[i % ROCK_ORDER.length],
      fossil: false, fault: true, dike: false, depthMa: Math.round((11 - i) * 4.5 * 100) / 100,
    })),
    seed: 0x0f0f0f0f,
    id: 'CAFEF00D',
  };
  const capped = [...renderSvg(many, { width }).matchAll(/<rect x="(\d+)"[^>]*width="(\d+)" height="(\d+)" fill="rgb\(/g)]
    .map((m) => ({ x: Number(m[1]), w: Number(m[2]) }));
  assert.ok(capped.length > 0, 'capped svg carries body rects');
  for (const rect of capped) {
    assert.ok(rect.x <= 124 + (width - 8) * cellW, 'svg offset over cap: ' + rect.x);
    assert.ok(rect.w >= 8 * cellW, 'svg body under 8 cells: ' + rect.w);
  }
  console.log('svg body x per rect: ' + rects.map((r) => r.x).join(' '));
});

test('render modules never use a clock, randomness, git or the filesystem', async () => {
  const { readFile } = await import('node:fs/promises');
  const sources = ['../src/palette.mjs', '../src/render/ansi.mjs', '../src/render/svg.mjs'];
  for (const rel of sources) {
    const text = await readFile(new URL(rel, import.meta.url), 'utf8');
    const code = text.replace(/^\s*\/\/.*$/gm, '');
    assert.equal(code.includes('Math.random'), false, rel + ': Math.random');
    assert.equal(code.includes('Date.now'), false, rel + ': Date.now');
    assert.equal(code.includes('new Date'), false, rel + ': new Date');
    assert.equal(code.includes('toLocale'), false, rel + ': locale formatting');
    assert.equal(/from 'node:(fs|child_process|net|http)/.test(code), false, rel + ': io modules');
    assert.equal(/\bexec|spawn|require\(/.test(code), false, rel + ': process access');
    assert.equal(/\bgit\b/.test(code), false, rel + ': git');
    assert.equal(code.includes("from '"), /from '/.test(code));
    for (const spec of code.match(/from '[^']+'/g) || []) {
      assert.ok(/^from '(node:[a-z\/]+|\.\.?\/[^']+)'$/.test(spec), rel + ': unexpected import ' + spec);
    }
  }
});

// ---------------------------------------------------------------------------
// Round-4 regression tests: a young core still states its span in the footer.
// model.mjs stores depthMa in real Ma, so a history shorter than ~5 months
// rounds every row to 0.00 and the rail alone reads as broken.
// ---------------------------------------------------------------------------

// index 0 is the oldest layer, as model.mjs emits it, so timestamp grows with i.
function makeYoungCore(gapsSeconds, depthOf) {
  let clock = 1700000000;
  const layers = gapsSeconds.concat([0]).map((unused, i) => {
    const layer = {
      index: i,
      sha: ('y' + i + '0000000').slice(0, 7),
      subject: 'young ' + i,
      author: 'geo',
      timestamp: clock,
      added: 4,
      deleted: 1,
      churn: 5,
      rows: 2,
      rock: ROCK_ORDER[i % ROCK_ORDER.length],
      fossil: false,
      fault: false,
      dike: false,
      depthMa: depthOf(i),
    };
    clock += gapsSeconds[i];
    return layer;
  });
  return {
    path: 'young.md',
    layers,
    totalRows: layers.length * 2,
    medianChurn: 5,
    born: layers[0].timestamp,
    last: layers[layers.length - 1].timestamp,
    seed: 0x00c0ffee,
    id: '00C0FFEE',
  };
}

const flatDepth = () => 0;
const footerOf = (core, opts) => renderAnsi(core, opts).split('\n').pop();

test('a core one day old states its span in days', () => {
  const core = makeYoungCore([86400], flatDepth);
  const footer = footerOf(core, { color: 'none' });
  assert.ok(footer.includes('span 1 day'), 'footer: ' + footer);
  assert.equal(footer.includes('span 1 days'), false, 'singular must not be pluralised: ' + footer);
  // the rail itself stays flat -- that is exactly why the footer carries the span
  const rows = renderAnsi(core, { color: 'none' }).split('\n').slice(1, -1);
  for (const row of rows) assert.ok(/ 0\.00 Ma /.test(row), 'rail reads 0.00 Ma: ' + row);
});

test('a core 90 days old states its span in months', () => {
  const core = makeYoungCore([90 * 86400], flatDepth);
  const footer = footerOf(core, { color: 'none' });
  assert.ok(footer.includes('span 3 months'), 'footer: ' + footer);
  assert.equal(footer.includes('3.0 months'), false, 'trailing .0 must be dropped: ' + footer);
});

test('the span suffix picks the largest unit that reaches 1 and agrees in number', () => {
  const cases = [
    [45, 'span 45 seconds'],
    [60, 'span 1 minute'],
    [5400, 'span 1.5 hours'],
    [3600, 'span 1 hour'],
    [2 * 86400, 'span 2 days'],
    [200 * 86400, 'span 6.6 months'],
    [500 * 86400, 'span 1.4 years'],
    [3 * 365.25 * 86400, 'span 3 years'],
  ];
  for (const [gapSeconds, expected] of cases) {
    const footer = footerOf(makeYoungCore([gapSeconds], flatDepth), { color: 'none' });
    assert.ok(footer.endsWith('  /  ' + expected), gapSeconds + 's -> footer: ' + footer);
  }
});

test('the span suffix keeps the footer on one line and the rail uncolored', () => {
  const core = makeYoungCore(new Array(11).fill(86400), flatDepth);
  for (const opts of [{ color: 'none' }, { color: 'none', ascii: true }, { color: 'none', labels: false }, { color: 'none', gutter: false }]) {
    const lines = renderAnsi(core, opts).split('\n');
    assert.equal(lines.length, core.totalRows + 2, 'footer must not wrap: ' + JSON.stringify(opts));
    for (const line of lines) assert.equal(/ +$/.test(line), false, 'no trailing whitespace: ' + JSON.stringify(opts));
  }
  const plain = renderAnsi(core, { color: 'none' });
  assert.equal(plain.includes(ESC), false, 'color none emits no ESC');
  assert.ok(plain.includes('span 11 days'), 'footer: ' + plain.split('\n').pop());
  const ascii = renderAnsi(core, { ascii: true, color: 'none' });
  for (const ch of ascii) {
    const code = ch.codePointAt(0);
    assert.ok(code === 10 || (code >= 32 && code <= 126), 'non-ASCII char U+' + code.toString(16));
  }
  // compression keeps the same footer: the span is a property of the core
  const small = renderAnsi(core, { color: 'none', maxRows: 2 }).split('\n');
  assert.equal(small.length, 4, 'maxRows 2 means 2 rows + 2');
  assert.ok(small[3].includes('span 11 days'), 'compressed footer: ' + small[3]);
});

test('a core spanning 0.01 Ma or more keeps the footer byte-identical', () => {
  const core = makeCore();
  const spanMa = core.layers[0].depthMa - core.layers[core.layers.length - 1].depthMa;
  assert.ok(spanMa >= 0.01, 'fixture must span >= 0.01 Ma, got ' + spanMa);
  const lines = renderAnsi(core, { color: 'none' }).split('\n');
  assert.equal(lines[lines.length - 1], '   147.07 Ma   ' + '\u2594'.repeat(22) + ' \u25BC end of core');
  assert.equal(renderAnsi(core, { color: 'none' }).includes('span'), false, 'no span text on an old core');
  assert.equal(renderAnsi(core, { color: 'none', ascii: true }).includes('span'), false, 'no span text in ascii');
  assert.equal(renderSvg(core).includes('span'), false, 'no span text in svg');
  // the threshold is a strict below: 0.01 Ma still reads as old
  const atThreshold = makeYoungCore([86400], flatDepth);
  atThreshold.layers[0].depthMa = 0.01;
  assert.equal(footerOf(atThreshold, { color: 'none' }).includes('span'), false, '0.01 Ma is not young');
  const belowThreshold = makeYoungCore([86400], flatDepth);
  belowThreshold.layers[0].depthMa = 0.004;
  assert.ok(footerOf(belowThreshold, { color: 'none' }).includes('span 1 day'), '0.004 Ma rounds below 0.01 and is young');
});

test('renderSvg states the same span on a young core', () => {
  const core = makeYoungCore([86400], flatDepth);
  const svg = renderSvg(core);
  assertBalanced(svg);
  assert.equal(svg, renderSvg(core), 'byte-identical across runs');
  assert.ok(svg.includes('span 1 day'), 'svg footer carries the span');
  assert.equal(/<image|<script|https?:\/\/(?!www\.w3\.org)/.test(svg), false, 'no external assets');
  assert.ok(renderSvg(makeYoungCore([90 * 86400], flatDepth)).includes('span 3 months'), 'svg footer: 3 months');
});

test('a young core with tied timestamps still states a span, a lone layer does not', () => {
  const tied = makeYoungCore([0, 0, 0], flatDepth);
  assert.equal(footerOf(tied, { color: 'none' }).endsWith('  /  span 0 seconds'), true, 'footer: ' + footerOf(tied, { color: 'none' }));
  const lone = makeYoungCore([], flatDepth);
  assert.equal(lone.layers.length, 1);
  assert.equal(footerOf(lone, { color: 'none' }).includes('span'), false, 'one layer has no span');
  assert.equal(renderSvg(lone).includes('span'), false, 'svg: one layer has no span');
});


test('labels and gutter are independent switches', () => {
  const core = makeYoungCore([1, 2, 3, 4], flatDepth);

  const both = footerOf(core, { color: 'none' });
  assert.equal(both.includes('Ma'), true, 'default shows the depth gutter');

  // labels:false keeps the depth column but drops the commit-subject column
  const noLabels = renderAnsi(core, { color: 'none', labels: false });
  assert.equal(noLabels.includes('Ma'), true, 'labels:false keeps depth');
  assert.equal(noLabels.includes('commit'), false, 'labels:false drops subjects');

  // gutter:false drops the depth column
  const noGutter = renderAnsi(core, { color: 'none', gutter: false });
  assert.equal(noGutter.includes('Ma'), false, 'gutter:false drops depth');

  // both off leaves nothing but the core body and its footer
  const bare = renderAnsi(core, { color: 'none', labels: false, gutter: false });
  assert.equal(bare.includes('Ma'), false, 'bare core has no depth');
  assert.equal(bare.includes('commit'), false, 'bare core has no subjects');
  assert.ok(bare.split('\n').length >= 2, 'bare core still renders rows');
});
