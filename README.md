<div align="center">

# strata

### Your files have stratigraphy. You just never dug.

**Every file is a borehole. Every commit is a layer of sediment.**

Read a file's git history as a geological core sample — faults, fossils, dikes and all.

<a href="#install"><img alt="install" src="https://img.shields.io/badge/npx-strata-2b2b2b?style=flat-square"></a>
<img alt="deps" src="https://img.shields.io/badge/dependencies-0-2b2b2b?style=flat-square">
<img alt="tests" src="https://img.shields.io/badge/tests-64%20passing-2b2b2b?style=flat-square">
<img alt="node" src="https://img.shields.io/badge/node-%E2%89%A518-2b2b2b?style=flat-square">

<img src="assets/core.svg" width="760" alt="a core sample rendered from a file's git history">

</div>

---

```
$ strata engine.js
```

```
◆ ─ engine.js ─ 54E49B1E                      ← the file, and its registry id
   0.00 Ma ▩▩▩▩▩▩▩▩▩▩▩▩╱▩▩▩▩▩▩▩▩▩▩▩ merge feat into main
   0.17 Ma ▚▚▚▚▚▚▚▚▚▚▚▚╱▚▚▚▚▚▚▚▚▚▚▚ main: parallel work
   0.34 Ma ▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚ feat: branch work
   0.52 Ma ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩ commit 41
   0.69 Ma ▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤ commit 40
╱  0.86 Ma ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ commit 39      ← a fault shears the column
   1.03 Ma   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒               everything below shifts
   1.20 Ma   ░░░░░░░░░░░◌░░░░░░░░░░ commit 38      ← ◌ a fossil: more deleted than added
   1.37 Ma   ██████████████████████ commit 37
   1.55 Ma   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ commit 36
   1.72 Ma   ▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞ commit 35
   1.89 Ma   ▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚ commit 34
╱  2.06 Ma   ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩ commit 0       ← another break
   2.23 Ma     ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩
   2.40 Ma     ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩
   2.58 Ma     ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩
   2.75 Ma     ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩
   2.92 Ma     ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩ ▼ end of core
```

The depth axis runs from the surface (newest commit, 0.00 Ma) down to bedrock
(the file's first commit). Deeper means older. That is the whole reading.

## Install

```
npx strata <file>
```

Node 18+ and `git` on your PATH. That is the entire dependency list — because there
is no dependency list.

## What the geology means

Nothing here is decorative. Every visual feature is a fact about the file, mapped
one-to-one onto rock:

| You see | Because |
|---|---|
| **Layer thickness** | That commit's churn — lines added plus lines deleted |
| **A fossil** `◌` | Deletions outweighed additions. Something was removed and not replaced |
| **A fault** `╱` | Churn ≥ 4× the median commit. The break shears the column and everything below it shifts |
| **A dike** `⌁` | A merge commit. Strata cut from the side |
| **Depth in Ma** | Real time between commits, in millions of years (1 year = 31,557,600 s) |
| **Rock type** | A stable hash of the file's identity and the layer index — same file, same rock, forever |
| **The registry id** | `hash(path + first commit)`, normalised so `src/a.mjs`, `./src/a.mjs` and `src\\a.mjs` are the same core |

Eight rock types: sandstone, shale, limestone, basalt, granite, marble, chert, obsidian.

## Usage

```
strata <file>              render the core sample
strata --svg out.svg <f>   write a standalone SVG
strata --json <f>          print the Core as JSON
```

| Option | Meaning |
|---|---|
| `--width <n>` | core width in cells (default 24) |
| `--max-rows <n>` | max rows tall (default 40) |
| `--ascii` | ASCII-only glyphs, for terminals without Unicode |
| `--color <m>` | `truecolor` / `256` / `none` |
| `--theme <t>` | `dark` / `light` (SVG only) |
| `--no-labels` | hide the depth and subject gutters |

`--ascii` keeps all eight rock types distinct using `.` `:` `=` `%` `&` `*` `~` `@` —
it does not collapse the geology into a single character. `--color none` emits
zero escape sequences, so you can pipe it anywhere.

## Determinism

Same file, same history, same bytes. No `Math.random`, no `Date.now`, no locale
lookups. Rendering is a pure function of one intermediate object:

```
git history  ──▶  Core  ──▶  terminal string / SVG
                  (plain JSON)
```

That is the entire architecture, and it is why the project has 64 tests and zero
dependencies: the interesting part is a pure function you can call directly.

```js
import { buildCore } from 'strata/src/model.mjs';
```

## Why

`git blame` tells you who to blame. It does not tell you what the file has been through.

A file that has survived three rewrites and a revert carries that history in its shape.
This is a way to see the shape.

It does not solve a problem. It reads the record.

## License

MIT
