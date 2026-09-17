import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { isGitRepo, readHistory, repoRoot } from '../src/gitlog.mjs';
import { createFixtureRepo, gitRun } from '../scripts/fixture.mjs';

const fixture = createFixtureRepo();
const binaryPath = path.join(fixture.repo, 'blob.bin');

writeFileSync(binaryPath, Buffer.from([0x00, 0x01, 0x02, 0x00, 0x03]));
gitRun(fixture.repo, ['add', '-A']);
gitRun(fixture.repo, ['commit', '-m', 'add binary blob'], {
  GIT_AUTHOR_DATE: '1600007000 +0000',
  GIT_COMMITTER_DATE: '1600007000 +0000',
});

test.after(() => fixture.cleanup());

test('fixture repo is a git work tree', () => {
  assert.equal(isGitRepo(fixture.repo), true);
  assert.equal(repoRoot(fixture.repo), fixture.repo);
  assert.equal(repoRoot(fixture.file), fixture.repo);
});

test('readHistory returns commits oldest first', async () => {
  const history = await readHistory(fixture.file);
  assert.equal(history.length, 7, 'records: ' + history.length);
  const subjects = history.map((record) => record.subject);
  assert.deepEqual(subjects, [
    'add history file',
    'append tail section',
    'prune stale section',
    'rewrite history wholesale',
    'feat: extend tail',
    'main: prepend header',
    "Merge branch 'feat'",
  ]);
  const first = history[0];
  assert.equal(first.added, 10);
  assert.equal(first.deleted, 0);
  assert.equal(first.author, 'Strata Fixture');
  assert.match(first.sha, /^[0-9a-f]{7}$/);
  assert.equal(first.isMerge, false);
  assert.equal(first.timestamp, 1600000000);
  assert.equal(history[history.length - 1].timestamp, 1600006000);
});

test('numstat is parsed into added/deleted per commit', async () => {
  const history = await readHistory(fixture.file);
  const bySubject = new Map(history.map((record) => [record.subject, record]));

  assert.deepEqual(
    [bySubject.get('append tail section').added, bySubject.get('append tail section').deleted],
    [6, 0],
  );
  assert.deepEqual(
    [bySubject.get('prune stale section').added, bySubject.get('prune stale section').deleted],
    [0, 4],
  );
  const rewrite = bySubject.get('rewrite history wholesale');
  assert.equal(rewrite.added, 40);
  assert.equal(rewrite.deleted, 12);
  assert.equal(rewrite.isMerge, false);
});

test('merge commits are flagged isMerge and collapsed to one record', async () => {
  const history = await readHistory(fixture.file);
  const merges = history.filter((record) => record.isMerge);
  assert.equal(merges.length, 1, 'merge count ' + merges.length);
  assert.match(merges[0].subject, /^Merge branch 'feat'/);
  assert.equal(merges[0], history[history.length - 1], 'merge is the newest record');
  // -m reports the merge once per parent; both replays collapse into one record.
  assert.equal(Number.isInteger(merges[0].added), true);
  assert.equal(Number.isInteger(merges[0].deleted), true);
  assert.ok(merges[0].added >= 0 && merges[0].deleted >= 0);
  const shas = history.map((record) => record.sha);
  assert.equal(new Set(shas).size, shas.length, 'no duplicated sha');
});

test('readHistory accepts a relative path with cwd', async () => {
  const history = await readHistory(fixture.rel, { cwd: fixture.repo });
  const direct = await readHistory(fixture.file);
  assert.deepEqual(history, direct);
});

test('readHistory is repeatable for the same input', async () => {
  assert.deepEqual(await readHistory(fixture.file), await readHistory(fixture.file));
});

test('readHistory returns [] for a file with no commits', async () => {
  const untracked = path.join(fixture.repo, 'never-committed.txt');
  writeFileSync(untracked, 'no history here\n', 'utf8');
  assert.deepEqual(await readHistory(untracked), []);
});

test('readHistory returns [] outside a git repository without throwing', async () => {
  const outside = mkdtempSync(path.join(os.tmpdir(), 'strata-not-a-repo-'));
  try {
    assert.equal(isGitRepo(outside), false);
    assert.equal(repoRoot(outside), null);
    const target = path.join(outside, 'plain.txt');
    writeFileSync(target, 'nothing\n', 'utf8');
    assert.deepEqual(await readHistory(target), []);
    assert.deepEqual(await readHistory(target, { cwd: outside }), []);
  } finally {
    rmSync(outside, { recursive: true, force: true, maxRetries: 3 });
  }
});

test('binary changes contribute 0/0 instead of a dash', async () => {
  const history = await readHistory(binaryPath);
  assert.equal(history.length, 1);
  assert.equal(history[0].added, 0);
  assert.equal(history[0].deleted, 0);
  assert.equal(history[0].isMerge, false);
});

test('maxCount limits the number of records', async () => {
  const history = await readHistory(fixture.file, { maxCount: 3 });
  assert.equal(history.length, 3);
  assert.equal(history[2].subject, "Merge branch 'feat'");
});

test('readHistory feeds buildCore end to end', async () => {
  const history = await readHistory(fixture.file);
  const { buildCore } = await import('../src/model.mjs');
  const core = buildCore(fixture.rel, history);
  assert.equal(core.path, fixture.rel);
  assert.equal(core.layers.length, history.length);
  assert.equal(core.totalRows, core.layers.reduce((sum, layer) => sum + layer.rows, 0));
  assert.equal(core.born, history[0].timestamp);
  assert.equal(core.last, history[history.length - 1].timestamp);
  assert.equal(core.layers.filter((layer) => layer.dike).length, 1);
  assert.equal(core.layers[core.layers.length - 1].depthMa, 0);
  assert.equal(JSON.stringify(core), JSON.stringify(buildCore(fixture.rel, history)));
});
