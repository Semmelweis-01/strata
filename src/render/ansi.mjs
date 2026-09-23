// Core -> terminal string. Pure: same Core + opts -> byte-identical output.
// Terminal cells are ~1:2 (w:h), so exactly one emitted line is one layer row.
// 'none' mode emits zero escape sequences; ascii mode emits zero non-ASCII chars.

import { ROCKS, rockColor, reset } from '../palette.mjs';
import { mulberry32 } from '../prng.mjs';

// Unknown rock only: every real rock carries its own ascii glyph in the palette.
const ASCII_GLYPH = '#';
const ASCII_FOSSIL = 'o';
const ASCII_FAULT = '/';
const ASCII_DIKE = '/';
const ASCII_FLOOR = '+';
const ASCII_TITLE = '# ';

const FOSSIL_POOL = ['\u25CC', '\u2301'];
const DIKE_GLYPH = '\u2571';
const FAULT_GLYPH = '\u2571';
const FLOOR_GLYPH = '\u2594';
const TITLE_GLYPH = '\u25C6 ';
const DK = 2;
// A fault pushes the body right by DK cells. The accumulated push is capped so
// the body keeps at least this many cells, whatever the column width.
const MIN_BODY_CELLS = 8;

function flag(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function num(value) {
  return Number.isFinite(value) ? value : 0;
}

function normOpts(opts) {
  const o = opts && typeof opts === 'object' ? opts : {};
  return {
    width: Number.isFinite(o.width) ? Math.max(4, Math.floor(o.width)) : 24,
    maxRows: Number.isFinite(o.maxRows) ? Math.max(1, Math.floor(o.maxRows)) : 40,
    color: o.color === 'truecolor' || o.color === '256' ? o.color : 'none',
    ascii: flag(o.ascii, false),
    labels: flag(o.labels, true),
    gutter: flag(o.gutter, true),
  };
}

function layerGlyph(rockId, ascii) {
  const rock = ROCKS[rockId];
  if (ascii) return rock ? rock.ascii : ASCII_GLYPH;
  return rock ? rock.glyph : ASCII_GLYPH;
}

function chars(text) {
  return Array.from(String(text == null ? '' : text));
}

function pad(text, width) {
  const body = chars(text);
  if (body.length >= width) return body.slice(0, width).join('');
  return body.join('') + ' '.repeat(width - body.length);
}

function formatDepth(value) {
  const rounded = Math.round(num(value) * 100) / 100;
  return (rounded === 0 ? 0 : rounded).toFixed(2) + ' Ma';
}

// A repository whose whole history is younger than 0.01 Ma rounds every row to
// 0.00, so the rail alone reads as broken. Below that threshold the footer
// states the same span in the largest unit that still resolves to >= 1.
// 1 year = 365.25 d, 1 month = 30.4375 d, 1 day = 24 h, 1 h = 60 min.
const SPAN_UNITS = [
  ['year', 31557600],
  ['month', 2629800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
];

// One decimal place, trailing '.0' dropped, singular/plural agreeing.
function spanText(seconds) {
  const total = Math.max(0, num(seconds));
  let unit = SPAN_UNITS[SPAN_UNITS.length - 1];
  for (const candidate of SPAN_UNITS) {
    if (total >= candidate[1]) {
      unit = candidate;
      break;
    }
  }
  const value = Math.round((total / unit[1]) * 10) / 10;
  const text = value % 1 === 0 ? String(value) : value.toFixed(1);
  return text + ' ' + unit[0] + (value === 1 ? '' : 's');
}

// '' unless the core's total depth span rounds to 0.00 Ma; the seconds come from
// the layers' own timestamps, never from a clock.
function youngSpan(layers) {
  // a single layer has no span at all: there is nothing to report
  if (layers.length < 2) return '';
  const oldest = layers[0];
  const newest = layers[layers.length - 1];
  const spanMa = Math.round((num(oldest.depthMa) - num(newest.depthMa)) * 100) / 100;
  if (!(spanMa < 0.01)) return '';
  return 'span ' + spanText(Math.abs(num(oldest.timestamp) - num(newest.timestamp)));
}

// The rail is a single scale over the emitted column, not a sum of local steps.
// model.mjs can hand two neighbouring layers the same depthMa after compression,
// and any per-layer step then has to invent a slope that overshoots the next
// layer -- the reading would jump back up. Instead every emitted row gets one
// global position t in [0,1] across the whole column and the reading is
// interpolated once, from the newest layer's depthMa (top) to the oldest
// layer's depthMa (bottom). t never decreases down the column and the two ends
// are ordered, so the readings never decrease either.
//
// Position in [0,1] of the r-th row of a strip that starts at row 'base' of the
// emitted column. The first emitted row is exactly 0 and the last exactly 1, so
// the top reads the newest layer's depthMa and the bottom the oldest one.
// Strictly increasing in (base, r) for any column of two or more rows.
function columnPosition(base, r, span) {
  if (!(span > 1)) return 0;
  return (base + r) / (span - 1);
}

// Linear map of a column position onto the depth range of the column.
function scaleDepth(position, newestDepth, oldestDepth) {
  const from = num(newestDepth);
  const to = num(oldestDepth);
  if (!(to > from)) return from; // degenerate: one reading for the whole column
  return from + position * (to - from);
}

// Spread maxRows over the layers: proportional to each layer's natural rows,
// newest layers win rounding ties, and the oldest layers drop out whole when
// even one row per layer would not fit.
function planRows(wanted, maxRows) {
  const total = wanted.reduce((a, b) => a + b, 0);
  const budget = Math.min(total, Math.max(1, maxRows));
  const start = wanted.length > budget ? wanted.length - budget : 0;
  const count = wanted.length - start;
  if (count <= 0) return { start: wanted.length, rows: [] };
  const rows = new Array(count).fill(1);
  let left = budget - count;
  let weight = 0;
  for (let k = 0; k < count; k++) weight += wanted[start + k];
  while (left > 0) {
    let best = -1;
    let bestScore = -Infinity;
    for (let k = count - 1; k >= 0; k--) {
      if (rows[k] >= wanted[start + k]) continue;
      const score = (wanted[start + k] * budget) / weight - rows[k];
      if (score > bestScore + 1e-9) {
        bestScore = score;
        best = k;
      }
    }
    if (best < 0) break;
    rows[best] += 1;
    left -= 1;
  }
  return { start, rows };
}

// Newest first, so the top of the column is the newest layer.
function strips(core, o) {
  const layers = Array.isArray(core && core.layers) ? core.layers : [];
  const wanted = layers.map((layer) => Math.max(1, Math.floor(layer.rows) || 1));
  const plan = planRows(wanted, o.maxRows);
  const out = [];
  let base = 0;
  for (let i = layers.length - 1; i >= plan.start; i--) {
    const n = plan.rows[i - plan.start];
    out.push({ layer: layers[i], layerIndex: i, rows: n, base });
    base += n;
  }
  // The scale runs from the depth of the newest emitted layer to the depth of
  // the oldest one; the two equal readings collapse to a single value.
  const span = base;
  const newestDepth = out.length ? num(out[0].layer.depthMa) : 0;
  const oldestDepth = out.length ? num(out[out.length - 1].layer.depthMa) : 0;
  for (const strip of out) {
    const depths = [];
    for (let r = 0; r < strip.rows; r++) {
      depths.push(scaleDepth(columnPosition(strip.base, r, span), newestDepth, oldestDepth));
    }
    strip.depths = depths;
  }
  return out;
}

function dikeSet(layers) {
  const band = new Set();
  const span = layers.length > 2 ? 3 : 1;
  for (let i = 0; i < layers.length; i++) {
    if (!layers[i].dike) continue;
    const from = Math.max(0, i - 1);
    for (let j = from; j < Math.min(layers.length, from + span); j++) band.add(j);
  }
  return band;
}

function build(core, opts) {
  const o = normOpts(opts);
  const source = core && typeof core === 'object' ? core : {};
  const layers = Array.isArray(source.layers) ? source.layers : [];
  const given = Array.isArray(source.labels) ? source.labels : [];
  const seed = Number.isFinite(source.seed) ? source.seed >>> 0 : 0;
  const list = strips(source, o);
  const dikes = dikeSet(layers);

  let gutterW = 0;
  if (o.gutter) {
    let widest = 0;
    for (const strip of list) {
      for (const depth of strip.depths) {
        const len = formatDepth(depth).length;
        if (len > widest) widest = len;
      }
    }
    gutterW = (widest || formatDepth(0).length) + 1;
  }

  const layerLabel = (index) => (given[index] != null ? given[index] : layers[index].subject);
  // The label column is sized from the footer, so the span suffix is part of it.
  const young = youngSpan(layers);
  const footerText = (o.ascii ? 'end of core' : '\u25BC end of core') + (young ? '  /  ' + young : '');

  let labelW = 0;
  if (o.labels) {
    let widest = chars(footerText).length;
    for (const strip of list) {
      const len = chars(layerLabel(strip.layerIndex)).length;
      if (len > widest) widest = len;
    }
    labelW = Math.max(6, Math.min(48, widest));
  }

  const paint = (rockId) => (o.color === 'none' ? '' : rockColor(rockId, o.color));
  const unpaint = () => (o.color === 'none' ? '' : reset());
  const gutterCell = (value) => (o.gutter ? pad(formatDepth(value), gutterW) : '');
  const labelCell = (text) => (o.labels ? ' ' + pad(text, labelW) : '');
  // fixed-width lead: a jag marks the break, the offset lives in the body
  const lead = (jagged) => {
    if (!o.gutter) return jagged ? (o.ascii ? ASCII_FAULT : FAULT_GLYPH) : '';
    return (jagged ? (o.ascii ? ASCII_FAULT : FAULT_GLYPH) : ' ') + ' '.repeat(DK);
  };

  const out = [];
  const rule = o.ascii ? '-' : '\u2500';
  const pathText = pad(source.path == null ? '?' : source.path, o.width).trimEnd();
  const idText = String(source.id == null ? '--------' : source.id);
  out.push(paint('basalt') + (o.ascii ? ASCII_TITLE : TITLE_GLYPH) + rule + ' ' + pathText + ' ' + rule + ' ' + idText + unpaint());

  // A fault displaces the core from that row downward, so the offset
  // accumulates: every break adds DK once, for every row below it, and the
  // fault row itself is still drawn with the offset that was in force before
  // it. The total is capped at width - 8 so the body never goes below the
  // MIN_BODY_CELLS readable minimum.
  const cap = Math.max(0, o.width - MIN_BODY_CELLS);
  let offset = 0;
  for (const strip of list) {
    const layer = strip.layer;
    const n = strip.rows;
    const prng = mulberry32((seed ^ Math.imul(layer.index >>> 0, 0x9e3779b1) ^ Math.imul(strip.layerIndex + 1, 0x85ebca6b)) >>> 0);
    const fossilRow = layer.fossil ? Math.floor(prng() * n) : -1;
    const fossilGlyph = o.ascii ? ASCII_FOSSIL : FOSSIL_POOL[Math.floor(prng() * FOSSIL_POOL.length)];
    const banded = dikes.has(strip.layerIndex);
    if (layer.fault) offset = DK;
    for (let r = 0; r < n; r++) {
      const rowOffset = offset;
      const span = o.width - rowOffset;
      const dikeCol = banded ? Math.floor(((r + 1) * span) / (n + 1)) : -1;
      const fossilCol = Math.floor(span / 2);
      let body = ' '.repeat(rowOffset);
      for (let col = 0; col < span; col++) {
        if (col === dikeCol) body += o.ascii ? ASCII_DIKE : DIKE_GLYPH;
        else if (r === fossilRow && col === fossilCol) body += fossilGlyph;
        else body += layerGlyph(layer.rock, o.ascii);
      }
      const text = r === 0 ? layerLabel(strip.layerIndex) : '';
      out.push((paint(layer.rock) + lead(layer.fault && r === 0) + gutterCell(strip.depths[r]) + body + unpaint() + labelCell(text)).replace(/ +$/, ''));
    }
  }

  const last = list.length ? list[list.length - 1] : null;
  const bottom = last ? last.depths[last.rows - 1] : 0;
  const floor = o.ascii ? ASCII_FLOOR : FLOOR_GLYPH;
  out.push(
    (paint('obsidian') + lead(false) + gutterCell(bottom) + ' '.repeat(offset) + floor.repeat(o.width - offset) + unpaint() + labelCell(footerText)).replace(/ +$/, ''),
  );

  return out;
}

/**
 * Render a Core as terminal text.
 * @param {object} core
 * @param {object} [opts] { width, color, ascii, labels, maxRows, gutter }
 * @returns {string}
 */
export function renderAnsi(core, opts) {
  return build(core, opts).join('\n');
}
