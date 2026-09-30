// Core -> standalone SVG. Pure: same Core + opts -> byte-identical output.
// No external fonts, images or scripts: it renders in a browser and inside a
// GitHub README <img> tag. The viewBox is sized to what is actually drawn.

import { ROCKS } from '../palette.mjs';
import { mulberry32 } from '../prng.mjs';

const CELL_W = 18;
const ROW_H = 20;
const PAD = 20;
const RAIL_W = 104;
const LABEL_W = 236;
const TITLE_H = 46;
const FOOTER_H = 26;
const DK = 2;
// A fault pushes the body right by DK cells. The accumulated push is capped so
// the body keeps at least this many cells, whatever the column width.
const MIN_BODY_CELLS = 8;

const THEMES = {
  dark: {
    bg: '#0f1115',
    frame: '#2b3038',
    strata: '#191d24',
    border: '#4a5260',
    text: '#dfe3ea',
    muted: '#8b94a3',
    faint: '#5b6472',
    fossil: '#f2f4f8',
    fault: '#ff6b6b',
    dike: '#59d8a4',
  },
  light: {
    bg: '#f7f5f1',
    frame: '#d6d1c7',
    strata: '#ebe7df',
    border: '#a9a294',
    text: '#1d2129',
    muted: '#5d6472',
    faint: '#8b93a1',
    fossil: '#1d2129',
    fault: '#c1121f',
    dike: '#0f7b5f',
  },
};

function flag(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function num(value) {
  return Number.isFinite(value) ? value : 0;
}

function normOpts(opts) {
  const o = opts && typeof opts === 'object' ? opts : {};
  return {
    width: Number.isFinite(o.width) ? Math.min(96, Math.max(4, Math.floor(o.width))) : 24,
    maxRows: Number.isFinite(o.maxRows) ? Math.max(1, Math.floor(o.maxRows)) : 40,
    theme: o.theme === 'light' ? 'light' : 'dark',
    labels: flag(o.labels, true),
  };
}

function esc(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fixed(value) {
  const r = Math.round(num(value) * 100) / 100;
  return (r === 0 ? 0 : r).toFixed(2);
}

// Same young-history rule as the ansi renderer: when the whole core spans less
// than 0.01 Ma every reading rounds to 0.00, so the footer states the span in
// the largest unit that still resolves to >= 1. Seconds come from the layers'
// own timestamps, never from a clock.
const SPAN_UNITS = [
  ['year', 31557600],
  ['month', 2629800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
];

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

function youngSpan(layers) {
  // a single layer has no span at all: there is nothing to report
  if (layers.length < 2) return '';
  const oldest = layers[0];
  const newest = layers[layers.length - 1];
  const spanMa = Math.round((num(oldest.depthMa) - num(newest.depthMa)) * 100) / 100;
  if (!(spanMa < 0.01)) return '';
  return 'span ' + spanText(Math.abs(num(oldest.timestamp) - num(newest.timestamp)));
}

function rgbOf(rockId) {
  const rock = ROCKS[rockId];
  return rock ? rock.rgb : [128, 128, 128];
}

// Same single column scale as the ansi renderer: one global position in [0,1]
// per emitted row, mapped once onto newest depth -> oldest depth. Per-layer
// steps are not usable -- equal neighbouring depthMa values force an invented
// slope that makes the rail jump back up.
// The first emitted row is exactly 0 and the last exactly 1.
function columnPosition(base, r, span) {
  if (!(span > 1)) return 0;
  return (base + r) / (span - 1);
}

function scaleDepth(position, newestDepth, oldestDepth) {
  const from = num(newestDepth);
  const to = num(oldestDepth);
  if (!(to > from)) return from;
  return from + position * (to - from);
}

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

function truncate(text, max) {
  const body = Array.from(String(text == null ? '' : text));
  return body.length <= max ? body.join('') : body.slice(0, Math.max(0, max - 1)).join('') + '\u2026';
}

/**
 * Render a Core as a standalone SVG document.
 * @param {object} core
 * @param {object} [opts] { width, maxRows, theme, labels }
 * @returns {string}
 */
export function renderSvg(core, opts) {
  const o = normOpts(opts);
  const t = THEMES[o.theme];
  const source = core && typeof core === 'object' ? core : {};
  const layers = Array.isArray(source.layers) ? source.layers : [];
  const given = Array.isArray(source.labels) ? source.labels : [];
  const seed = Number.isFinite(source.seed) ? source.seed >>> 0 : 0;
  const wanted = layers.map((layer) => Math.max(1, Math.floor(layer.rows) || 1));
  const plan = planRows(wanted, o.maxRows);
  const dikes = dikeSet(layers);

  // newest first, so index 0 of the visual column is the newest layer
  const strips = [];
  let cursorBase = 0;
  for (let i = layers.length - 1; i >= plan.start; i--) {
    const n = plan.rows[i - plan.start];
    strips.push({ layer: layers[i], layerIndex: i, rows: n, cursorBase });
    cursorBase += n;
  }
  const span = cursorBase;
  const newestDepth = strips.length ? num(strips[0].layer.depthMa) : 0;
  const oldestDepth = strips.length ? num(strips[strips.length - 1].layer.depthMa) : 0;
  for (const strip of strips) {
    const depths = [];
    for (let r = 0; r < strip.rows; r++) {
      depths.push(scaleDepth(columnPosition(strip.cursorBase, r, span), newestDepth, oldestDepth));
    }
    strip.depths = depths;
  }

  const totalRows = strips.reduce((a, s) => a + s.rows, 0);
  const strataX = PAD + RAIL_W;
  const strataW = o.width * CELL_W;
  const strataH = Math.max(ROW_H, totalRows * ROW_H);
  const labelX = strataX + strataW + 16;
  const totalW = Math.round(labelX + (o.labels ? LABEL_W : 0) + PAD);
  const top = PAD + TITLE_H;
  const totalH = Math.round(top + strataH + FOOTER_H + PAD);

  const parts = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + totalW + '" height="' + totalH +
      '" viewBox="0 0 ' + totalW + ' ' + totalH +
      '" role="img" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, &quot;DejaVu Sans Mono&quot;, monospace">',
  );
  parts.push('<title>' + esc('strata core ' + (source.id || source.path || '?')) + '</title>');
  parts.push('<desc>' + esc(String(layers.length) + ' layers of ' + (source.path || '?') + ', newest at the top') + '</desc>');
  parts.push('<rect x="0" y="0" width="' + totalW + '" height="' + totalH + '" fill="' + t.bg + '"/>');

  // title block
  const titleY = PAD + 20;
  parts.push('<text x="' + PAD + '" y="' + titleY + '" fill="' + t.text + '" font-size="15" font-weight="600">' + esc(source.path || '?') + '</text>');
  parts.push('<text x="' + PAD + '" y="' + (titleY + 20) + '" fill="' + t.muted + '" font-size="12">' + esc('core ' + (source.id || '--------') + ' \u00b7 ' + layers.length + ' layers') + '</text>');

  // the core column
  parts.push('<rect x="' + strataX + '" y="' + top + '" width="' + strataW + '" height="' + strataH + '" fill="' + t.strata + '" stroke="' + t.frame + '" stroke-width="1"/>');

  // A fault displaces the core from that row downward, so the offset
  // accumulates: every break adds DK once, for every row below it, and the
  // fault row itself is still drawn with the offset that was in force before
  // it. The total is capped at width - 8 so the body never goes below the
  // MIN_BODY_CELLS readable minimum.
  const cap = Math.max(0, o.width - MIN_BODY_CELLS);
  let cursor = 0;
  let offset = 0;
  for (const strip of strips) {
    const layer = strip.layer;
    const rgb = rgbOf(layer.rock);
    const y = top + cursor * ROW_H;
    const h = strip.rows * ROW_H;
    const before = offset;
    if (layer.fault) offset = Math.min(cap, before + DK);
    strip.beforeOffset = before;
    strip.afterOffset = offset;
    const bx = strataX + offset * CELL_W;
    const bw = strataW - offset * CELL_W;
    // the break row keeps the pre-break offset; the shift starts one row later
    const segs = layer.fault && strip.rows > 1
      ? [{ y: y, h: ROW_H, off: before }, { y: y + ROW_H, h: h - ROW_H, off: offset }]
      : [{ y: y, h: h, off: layer.fault ? before : offset }];
    for (const seg of segs) {
      const sx = strataX + seg.off * CELL_W;
      const sw = strataW - seg.off * CELL_W;
      parts.push('<rect x="' + sx + '" y="' + seg.y + '" width="' + sw + '" height="' + seg.h + '" fill="rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')"/>');
      parts.push('<rect x="' + sx + '" y="' + seg.y + '" width="' + sw + '" height="' + seg.h + '" fill="url(#grain)"/>');
    }
    if (layer.fossil) {
      const prng = mulberry32((seed ^ Math.imul(layer.index >>> 0, 0x9e3779b1) ^ Math.imul(strip.layerIndex + 1, 0x85ebca6b)) >>> 0);
      const row = Math.floor(prng() * strip.rows);
      const col = Math.floor(prng() * o.width);
      // a fossil on the break row sits inside the pre-break segment
      const fossilX = strataX + (layer.fault && row === 0 ? before : offset) * CELL_W;
      const cx = fossilX + col * CELL_W + CELL_W / 2;
      const cy = y + row * ROW_H + ROW_H / 2;
      const r = Math.min(CELL_W, ROW_H) / 2 - 3;
      parts.push('<g class="fossil"><circle cx="' + fixed(cx) + '" cy="' + fixed(cy) + '" r="' + fixed(r) + '" fill="none" stroke="' + t.fossil + '" stroke-width="1.6"/>' +
        '<circle cx="' + fixed(cx) + '" cy="' + fixed(cy) + '" r="' + fixed(r / 3) + '" fill="' + t.fossil + '"/></g>');
    }
    if (dikes.has(strip.layerIndex)) {
      const slope = Math.min(strataW * 0.5, 4 * CELL_W);
      const band = Math.max(5, CELL_W * 0.45);
      const x0 = bx + bw * 0.25;
      parts.push('<g class="dike"><path d="M' + fixed(x0) + ' ' + fixed(y) +
        ' L' + fixed(x0 + band) + ' ' + fixed(y) +
        ' L' + fixed(x0 + slope + band) + ' ' + fixed(y + h) +
        ' L' + fixed(x0 + slope) + ' ' + fixed(y + h) +
        ' Z" fill="' + t.dike + '" fill-opacity="0.6" stroke="' + t.dike + '" stroke-width="1"/></g>');
    }
    cursor += strip.rows;
  }

  // faults: the core shifts right and a jagged break marks the boundary
  let faultCursor = 0;
  for (const strip of strips) {
    if (strip.layer.fault) {
      const y = top + faultCursor * ROW_H;
      const teeth = 6;
      const step = strataW / teeth;
      let d = 'M' + fixed(strataX) + ' ' + fixed(y);
      for (let k = 0; k < teeth; k++) {
        d += ' L' + fixed(strataX + step * (k + 0.5)) + ' ' + fixed(y + ROW_H / 2);
        d += ' L' + fixed(strataX + step * (k + 1)) + ' ' + fixed(y + ROW_H);
      }
      parts.push('<path class="fault" d="' + d + '" fill="none" stroke="' + t.fault + '" stroke-width="1.8" stroke-linejoin="round"/>');
      parts.push('<rect x="' + fixed(strataX + strip.beforeOffset * CELL_W) + '" y="' + fixed(y) + '" width="' + fixed(strataW - strip.beforeOffset * CELL_W) +
        '" height="' + ROW_H + '" fill="' + t.fault + '" fill-opacity="0.14"/>');
    }
    faultCursor += strip.rows;
  }

  parts.push('<defs><pattern id="grain" width="6" height="6" patternUnits="userSpaceOnUse">' +
    '<path d="M0 6L6 0" stroke="' + t.frame + '" stroke-opacity="0.25" stroke-width="1"/></pattern></defs>');

  // rail: depth scale on the left, sha and label on the right
  cursor = 0;
  for (const strip of strips) {
    const y = top + cursor * ROW_H;
    const h = strip.rows * ROW_H;
    const mid = y + h / 2;
    parts.push('<line x1="' + fixed(strataX - 30) + '" y1="' + fixed(y) + '" x2="' + fixed(strataX - 30) + '" y2="' + fixed(y + h) + '" stroke="' + t.frame + '" stroke-width="1"/>');
    parts.push('<line x1="' + fixed(strataX - 34) + '" y1="' + fixed(mid) + '" x2="' + fixed(strataX - 6) + '" y2="' + fixed(mid) + '" stroke="' + t.frame + '" stroke-width="1"/>');
    parts.push('<text x="' + PAD + '" y="' + fixed(mid + 4) + '" fill="' + t.faint + '" font-size="10">' + esc(fixed(strip.depths[strip.rows - 1]) + ' Ma') + '</text>');
    parts.push('<text x="' + fixed(strataX - 6) + '" y="' + fixed(y + Math.min(h, 12)) + '" fill="' + t.border + '" font-size="9" text-anchor="end">' + esc(strip.layer.sha || '') + '</text>');
    if (o.labels) {
      const label = given[strip.layerIndex] != null ? given[strip.layerIndex] : strip.layer.subject;
      parts.push('<text x="' + fixed(labelX) + '" y="' + fixed(mid + 4) + '" fill="' + (strip.layer.fossil ? t.text : t.muted) + '" font-size="11">' + esc(truncate(label, 30)) + '</text>');
    }
    cursor += strip.rows;
  }

  const base = strips.length ? strips[strips.length - 1].depths[strips[strips.length - 1].rows - 1] : 0;
  const footY = top + strataH + 18;
  const young = youngSpan(layers);
  const footer = '0.00 Ma top \u00b7 ' + fixed(base) + ' Ma base \u00b7 ' + totalRows + ' rows' + (young ? '  /  ' + young : '');
  parts.push('<text x="' + PAD + '" y="' + fixed(footY) + '" fill="' + t.faint + '" font-size="10">' + esc(footer) + '</text>');

  parts.push('</svg>');
  return parts.join('\n');
}
