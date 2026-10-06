// Builds a throwaway git repo under os.tmpdir() with a scripted commit sequence.
// Never writes inside the project directory.
//
// git stdout is captured through a temp file descriptor (not a pipe) so the
// fixture also works in sandboxes that deny anonymous pipe handles.

import { execFileSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE_TIME = 1600000000;
const STEP = 1000;
const FILE_NAME = 'history.txt';

const GIT_CONFIG = [
  '-c', 'core.autocrlf=false',
  '-c', 'core.safecrlf=false',
  '-c', 'commit.gpgsign=false',
  '-c', 'init.defaultBranch=main',
  '-c', 'user.name=Strata Fixture',
  '-c', 'user.email=fixture@strata.test',
];

const IDENTITY = {
  GIT_AUTHOR_NAME: 'Strata Fixture',
  GIT_AUTHOR_EMAIL: 'fixture@strata.test',
  GIT_COMMITTER_NAME: 'Strata Fixture',
  GIT_COMMITTER_EMAIL: 'fixture@strata.test',
};

/**
 * Run git inside repo with pinned identity; returns captured stdout.
 * @param {string} repo
 * @param {string[]} args
 * @param {Record<string,string>} [env]
 * @returns {string}
 */
export function gitRun(repo, args, env) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'strata-gitout-'));
  const outPath = path.join(dir, 'stdout.txt');
  const fd = openSync(outPath, 'w');
  try {
    execFileSync('git', [...GIT_CONFIG, ...args], {
      cwd: repo,
      stdio: ['ignore', fd, 'ignore'],
      env: { ...process.env, ...IDENTITY, GIT_CONFIG_NOSYSTEM: '1', ...(env || {}) },
    });
    return readFileSync(outPath, 'utf8');
  } finally {
    closeSync(fd);
    rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
  }
}

function stamp(tick) {
  return `${BASE_TIME + tick * STEP} +0000`;
}

function commitAll(repo, message, tick) {
  const date = stamp(tick);
  gitRun(repo, ['add', '-A']);
  gitRun(repo, ['commit', '-m', message], { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date });
}

function writeLines(repo, lines) {
  writeFileSync(path.join(repo, FILE_NAME), lines.join('\n') + '\n', 'utf8');
}

function readLines(repo) {
  return readFileSync(path.join(repo, FILE_NAME), 'utf8')
    .split('\n')
    .filter((line, i, all) => !(i === all.length - 1 && line === ''));
}

/**
 * Create a fresh throwaway repo.
 * Script: add -> append -> delete -> large rewrite -> branch append -> main prepend -> merge.
 * @returns {{ repo: string, file: string, rel: string, commitCount: number, cleanup: () => void }}
 */
export function createFixtureRepo() {
  const repo = mkdtempSync(path.join(os.tmpdir(), 'strata-fixture-'));
  gitRun(repo, ['init', '--quiet']);

  // 1) add: 10 lines
  let lines = Array.from({ length: 10 }, (_, i) => `line ${String(i + 1).padStart(2, '0')}`);
  writeLines(repo, lines);
  commitAll(repo, 'add history file', 0);

  // 2) append 6 lines
  lines = lines.concat(Array.from({ length: 6 }, (_, i) => `appended ${String(i + 1).padStart(2, '0')}`));
  writeLines(repo, lines);
  commitAll(repo, 'append tail section', 1);

  // 3) delete 4 lines (fossil layer: deleted >= added > 0)
  lines = lines.filter((_, i) => i < 2 || i > 5);
  writeLines(repo, lines);
  commitAll(repo, 'prune stale section', 2);

  // 4) one large rewrite (fault layer)
  lines = Array.from({ length: 40 }, (_, i) => `rewritten ${String(i + 1).padStart(2, '0')}`);
  writeLines(repo, lines);
  commitAll(repo, 'rewrite history wholesale', 3);

  // 5) feature branch: append at the tail
  gitRun(repo, ['checkout', '--quiet', '-b', 'feat']);
  lines = readLines(repo).concat(['feat one', 'feat two', 'feat three']);
  writeLines(repo, lines);
  commitAll(repo, 'feat: extend tail', 4);

  // 6) main: prepend a header (clean merge, no conflict)
  gitRun(repo, ['checkout', '--quiet', 'main']);
  lines = ['header alpha', 'header beta'].concat(readLines(repo));
  writeLines(repo, lines);
  commitAll(repo, 'main: prepend header', 5);

  // 7) merge commit (dike layer)
  gitRun(repo, ['merge', '--no-ff', 'feat', '-m', "Merge branch 'feat'"], {
    GIT_AUTHOR_DATE: stamp(6),
    GIT_COMMITTER_DATE: stamp(6),
  });

  return {
    repo,
    file: path.join(repo, FILE_NAME),
    rel: FILE_NAME,
    commitCount: 7,
    cleanup() {
      rmSync(repo, { recursive: true, force: true, maxRetries: 3 });
    },
  };
}
