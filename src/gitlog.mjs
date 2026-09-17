// git history -> raw commit records. Zero deps, no shell strings.
//
// git is spawned with an argv array (never a shell string) and its stdout is
// captured through a temp file descriptor rather than an anonymous pipe, which
// yields identical bytes and also works in sandboxes that deny pipe handles.

import { spawn } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SEP_FIELD = '\u001f';
const SEP_RECORD = '\u001e';
// The record separator leads each header, so one split part is exactly
// "header\n<numstat lines>" for a single commit.
const FORMAT = SEP_RECORD + ['%h', '%s', '%an', '%at', '%p'].join(SEP_FIELD);
const GIT_TIMEOUT_MS = 30000;

function removeDir(dir) {
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
  } catch {
    /* temp dir left behind */
  }
}

function runGit(args, cwd) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'strata-git-'));
  const outPath = path.join(dir, 'stdout.txt');
  let fd;
  try {
    fd = openSync(outPath, 'w');
  } catch {
    removeDir(dir);
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      try {
        closeSync(fd);
      } catch {
        /* already closed */
      }
      removeDir(dir);
      resolve(value);
    };

    let child;
    try {
      child = spawn('git', args, { cwd, stdio: ['ignore', fd, 'ignore'], windowsHide: true });
    } catch {
      settle(null);
      return;
    }

    timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        /* already gone */
      }
      settle(null);
    }, GIT_TIMEOUT_MS);
    if (typeof timer.unref === 'function') timer.unref();

    child.on('error', () => settle(null));
    child.on('close', (code) => {
      if (code !== 0) {
        settle(null);
        return;
      }
      let text = null;
      try {
        text = readFileSync(outPath, 'utf8');
      } catch {
        /* unreadable capture */
      }
      settle(text);
    });
  });
}

function statOf(target) {
  try {
    return statSync(target);
  } catch {
    return null;
  }
}

/**
 * Synchronous work-tree root of dir, or null when dir is not inside a repo.
 * @param {string} dir
 * @returns {string | null}
 */
export function repoRoot(dir) {
  const start = path.resolve(typeof dir === 'string' && dir ? dir : '.');
  const info = statOf(start);
  if (!info) return null;
  let probe = info.isDirectory() ? start : path.dirname(start);
  for (;;) {
    if (statOf(path.join(probe, '.git'))) return probe;
    const parent = path.dirname(probe);
    if (parent === probe) return null;
    probe = parent;
  }
}

/**
 * Is dir inside a git work tree?
 * @param {string} dir
 * @returns {boolean}
 */
export function isGitRepo(dir) {
  return repoRoot(dir) !== null;
}

function splitRecords(stdout) {
  return stdout
    .split(SEP_RECORD)
    .map((chunk) => chunk.replace(/^[\r\n]+/, ''))
    .filter((chunk) => chunk.length > 0);
}

function parseHeader(text) {
  const fields = text.split(SEP_FIELD);
  const sha = (fields[0] || '').trim().slice(0, 7);
  if (!sha) return null;
  return {
    sha,
    subject: (fields[1] || '').trim().slice(0, 48),
    author: (fields[2] || '').trim(),
    timestamp: Number.parseInt(fields[3] || '0', 10) || 0,
    isMerge: (fields[4] || '').trim().split(/\s+/).filter(Boolean).length > 1,
  };
}

function parseNumstat(body) {
  let added = 0;
  let deleted = 0;
  for (const line of body.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    // A dash marks a binary file: contributes 0/0.
    added += parts[0] === '-' ? 0 : Number.parseInt(parts[0], 10) || 0;
    deleted += parts[1] === '-' ? 0 : Number.parseInt(parts[1], 10) || 0;
  }
  return { added, deleted };
}

function parseHistory(stdout) {
  const commits = [];
  for (const chunk of splitRecords(stdout)) {
    const nl = chunk.indexOf('\n');
    const commit = parseHeader(nl === -1 ? chunk : chunk.slice(0, nl));
    if (!commit) continue;
    const churn = parseNumstat(nl === -1 ? '' : chunk.slice(nl + 1));
    // -m replays a merge once per parent; collapse the repeats into one record.
    const previous = commits.length ? commits[commits.length - 1] : null;
    if (previous && previous.sha === commit.sha) {
      previous.added += churn.added;
      previous.deleted += churn.deleted;
      previous.isMerge = previous.isMerge || commit.isMerge;
      continue;
    }
    commits.push({ ...commit, added: churn.added, deleted: churn.deleted });
  }
  return commits;
}

/**
 * Read the commit history touching filePath.
 * Returns [] (never throws) when git is unavailable, the directory is not a
 * repo, or the file has no commits. Records are OLDEST first.
 * @param {string} filePath
 * @param {{ cwd?: string, maxCount?: number }} [opts]
 * @returns {Promise<Array<{sha:string,subject:string,author:string,timestamp:number,added:number,deleted:number,isMerge:boolean}>>}
 */
export async function readHistory(filePath, opts) {
  const options = opts || {};
  const cwd = path.resolve(options.cwd || process.cwd());
  const abs = path.resolve(cwd, String(filePath || ''));
  const root = repoRoot(path.dirname(abs));
  if (root === null) return [];

  const rel = path.relative(root, abs).split(path.sep).join('/');
  if (!rel || rel.startsWith('../')) return [];

  // -m reports merge commits too (once per parent, collapsed above) so dikes survive.
  const args = ['log', '--follow', '--numstat', '-M', '-m', `--format=${FORMAT}`];
  const maxCount = Number.isInteger(options.maxCount) && options.maxCount > 0 ? options.maxCount : 0;
  if (maxCount) args.push(`--max-count=${maxCount}`);
  args.push('--', rel);

  const stdout = await runGit(args, root);
  if (stdout === null) return [];
  return parseHistory(stdout).reverse();
}
