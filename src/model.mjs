// Raw git records -> Core (geological core sample). Deterministic, pure.

import { hash32 } from './prng.mjs';

export const DEFAULT_MAX_ROWS = 40;
export const MAX_SUBJECT = 48;

const ROCKS = ['sandstone', 'shale', 'limestone', 'basalt', 'granite', 'marble', 'chert', 'obsidian'];

/** One Julian year in seconds (365.25 days): the unit behind depthMa. */
const SECONDS_PER_YEAR = 31557600;

function clampInt(value, min) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return min;
  return n < min ? min : n;
}

/** Canonical spelling for hashing: no fs, no cwd, no resolution. */
function normalizePath(value) {
  let out = String(value == null ? '' : value).replace(/\\/g, '/');
  while (out.indexOf('//') !== -1) out = out.split('//').join('/');
  while (out.slice(0, 2) === './') out = out.slice(2);
  return out;
}

/** Age in seconds -> millions of years (Ma), two decimals. */
function toMa(ageSeconds) {
  return Math.round((ageSeconds / SECONDS_PER_YEAR) * 100) / 100;
}

function churnOf(commit) {
  const added = clampInt(commit.added, 0);
  const deleted = clampInt(commit.deleted, 0);
  return { added, deleted, churn: added + deleted };
}

function median(values) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function normalizeMaxRows(opts) {
  const raw = opts && opts.maxRows;
  if (raw === undefined || raw === null) return DEFAULT_MAX_ROWS;
  return clampInt(raw, 1);
}

/** Scale total thickness down to maxRows with a floor of 1 row per layer. */
function fitRows(churns, maxRows) {
  const rows = churns.map(() => 1);
  const total = churns.reduce((sum, churn) => sum + churn, 0);
  if (churns.length >= maxRows || total <= maxRows) return rows;

  const budget = maxRows - churns.length;
  const scaled = churns.map((churn) => (churn * budget) / total);
  const floors = scaled.map((value) => Math.floor(value));
  let used = floors.reduce((sum, value) => sum + value, 0);

  const order = scaled
    .map((value, i) => ({ i, rest: value - floors[i] }))
    .sort((a, b) => (b.rest - a.rest) || (a.i - b.i));

  let cursor = 0;
  while (used < budget && cursor < order.length) {
    floors[order[cursor].i] += 1;
    used += 1;
    cursor += 1;
  }
  for (let i = 0; i < floors.length; i++) rows[i] += floors[i];
  return rows;
}

/** Merge adjacent layers from the oldest end until at most maxRows remain. */
function collapseLayers(layers, maxRows) {
  let out = layers;
  while (out.length > maxRows) {
    const keep = Math.max(1, Math.floor(out.length / 2));
    const oldCount = out.length - keep;
    const merged = mergeGroup(out.slice(0, oldCount));
    out = [merged, ...out.slice(oldCount)];
  }
  return out;
}

function mergeGroup(group) {
  const oldest = group[0];
  const newest = group[group.length - 1];
  const added = group.reduce((sum, layer) => sum + layer.added, 0);
  const deleted = group.reduce((sum, layer) => sum + layer.deleted, 0);
  return {
    index: oldest.index,
    sha: newest.sha,
    subject: oldest.subject,
    author: oldest.author,
    timestamp: oldest.timestamp,
    added,
    deleted,
    churn: added + deleted,
    rows: 1,
    isMerge: group.some((layer) => layer.isMerge),
  };
}

/**
 * Build a Core from raw git records (oldest first).
 * @param {string} filePath
 * @param {Array<object>} rawCommits
 * @param {{ maxRows?: number }} [opts]
 */
export function buildCore(filePath, rawCommits, opts) {
  const records = Array.isArray(rawCommits) ? rawCommits.filter((c) => c && typeof c === 'object') : [];
  if (records.length === 0) return emptyCore(filePath);

  const normPath = normalizePath(filePath);

  const maxRows = normalizeMaxRows(opts);
  const churns = records.map((commit) => churnOf(commit).churn);
  const medianChurn = median(churns.filter((churn) => churn > 0));
  const faultCut = 4 * medianChurn;

  let layers = records.map((commit, i) => {
    const { added, deleted, churn } = churnOf(commit);
    return {
      index: i,
      sha: String(commit.sha || '').slice(0, 7),
      subject: String(commit.subject || '').trim().slice(0, MAX_SUBJECT),
      author: String(commit.author || '').trim(),
      timestamp: clampInt(commit.timestamp, 0),
      added,
      deleted,
      churn,
      rows: 1,
      isMerge: Boolean(commit.isMerge),
    };
  });

  layers = collapseLayers(layers, maxRows);

  const rows = fitRows(layers.map((layer) => layer.churn), maxRows);
  const oldest = layers[0].timestamp;
  const newest = layers[layers.length - 1].timestamp;

  const finalLayers = layers.map((layer, i) => {
    const age = newest - layer.timestamp;
    return {
      index: i,
      sha: layer.sha,
      subject: layer.subject,
      author: layer.author,
      timestamp: layer.timestamp,
      added: layer.added,
      deleted: layer.deleted,
      churn: layer.churn,
      rows: rows[i],
      rock: pickRock(normPath, i),
      fossil: layer.deleted > 0 && layer.deleted >= layer.added,
      fault: layer.churn > 0 && layer.churn >= faultCut,
      dike: layer.isMerge,
      depthMa: toMa(age),
    };
  });

  const totalRows = finalLayers.reduce((sum, layer) => sum + layer.rows, 0);
  const seed = hash32(`${normPath}${finalLayers[0].sha}`);
  const id = (`${seed.toString(16).toUpperCase()}` + '00000000').slice(0, 8);

  return {
    path: String(filePath || ''),
    layers: finalLayers,
    totalRows,
    medianChurn,
    born: oldest,
    last: newest,
    seed,
    id,
  };
}

function pickRock(filePath, index) {
  const h = hash32(`${normalizePath(filePath)}#${index}`);
  return ROCKS[h % ROCKS.length];
}

/**
 * Placeholder Core for files with no history.
 * @param {string} filePath
 */
export function emptyCore(filePath) {
  const path0 = String(filePath || '');
  const seed = hash32(normalizePath(path0));
  const id = (`${seed.toString(16).toUpperCase()}` + '00000000').slice(0, 8);
  return {
    path: path0,
    layers: [],
    totalRows: 0,
    medianChurn: 0,
    born: 0,
    last: 0,
    seed,
    id,
  };
}
