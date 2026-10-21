<div align="center">

# strata

**Read a file's git history as a geological core sample.**

Zero dependencies · Deterministic · One command

<img src="assets/core.svg" width="720" alt="a core sample rendered from a file's git history">

</div>

---

Every file is a borehole. Every commit is a layer of sediment.

```
$ strata engine.js
```

```
◆ ─ engine.js ─ E3C0EC75
   0.00 Ma ▩▩▩▩▩▩▩▩▩▩▩▩╱▩▩▩▩▩▩▩▩▩▩▩ merge feat into main
   0.00 Ma ▚▚▚▚▚▚▚▚▚▚▚▚╱▚▚▚▚▚▚▚▚▚▚▚ main: parallel work
   0.00 Ma ▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚ feat: branch work
╱  0.01 Ma ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩ commit 39
   0.01 Ma   ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩
   0.01 Ma   ▤▤▤▤▤▤▤▤▤▤▤◌▤▤▤▤▤▤▤▤▤▤ commit 38
   0.01 Ma   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ commit 37
   0.01 Ma   ░░░░░░░░░░░░░░░░░░░░░░ commit 36
   0.01 Ma   ██████████████████████ commit 35
   0.02 Ma   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ commit 34
╱  0.02 Ma   ▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞ commit 33
   0.02 Ma     ▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚ commit 32
╱  0.02 Ma     ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩ commit 0
   0.03 Ma       ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩
   0.03 Ma       ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ ▼ end of core
```

Layer thickness is churn. A layer that lost more lines than it gained leaves a fossil.
A commit four times heavier than the median shears the column: a fault, and everything
below it shifts. A merge cuts across the strata from the side: a dike.

## Install

```
npx strata <file>
```

Requires Node 18+ and `git` on PATH. Nothing else.

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

## What it maps

| Entropy | Becomes |
|---|---|
| commit churn (lines added + deleted) | layer thickness |
| deletions outweighing additions | a fossil inside the layer |
| churn >= 4x median | a fault; the column shifts below it |
| merge commit | a dike cutting across the strata |
| time between commits | depth in Ma |
| the file's identity | a registry id, stable across path spellings |

## Determinism

Same file, same history, same bytes. No `Math.random`, no `Date.now`.
Rendering is a pure function of one intermediate object:

```
git history -> Core -> terminal string / SVG
```

That is the whole design. It is testable, and it is tested: 64 tests, zero dependencies.

## Why

`git blame` tells you who to blame. It does not tell you what the file has been through.

This does not solve a problem. It reads the record.

## License

MIT