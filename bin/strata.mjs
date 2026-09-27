#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, basename, dirname, relative, isAbsolute } from 'node:path';
import { readHistory, isGitRepo } from '../src/gitlog.mjs';
import { buildCore, emptyCore } from '../src/model.mjs';
import { renderAnsi } from '../src/render/ansi.mjs';
import { renderSvg } from '../src/render/svg.mjs';

const HELP = [
  "strata - read a file's git history as a geological core sample",
  '',
  'Usage',
  '  strata <file>              render the core sample',
  '  strata --svg out.svg <f>   write a standalone SVG',
  '  strata --json <f>          print the Core as JSON',
  '',
  'Options',
  '  --width <n>     core width in cells (default 24)',
  '  --max-rows <n>  max rows tall (default 40)',
  '  --ascii         ASCII-only glyphs',
  '  --color <m>     truecolor | 256 | none',
  '  --theme <t>     dark | light (svg only)',
  '  --no-labels     hide depth and subject gutters',
  '  -h, --help      show this help',
].join("\n");

function parseArgs(argv) {
  const opts = { width: 24, maxRows: 40, ascii: false, color: null, theme: 'dark', labels: true, svg: null, json: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { opts.help = true; continue; }
    if (a === '--ascii') { opts.ascii = true; continue; }
    if (a === '--json') { opts.json = true; continue; }
    if (a === '--no-labels') { opts.labels = false; continue; }
    if (a === '--width') { opts.width = Number(argv[++i]); continue; }
    if (a === '--max-rows') { opts.maxRows = Number(argv[++i]); continue; }
    if (a === '--color') { opts.color = argv[++i]; continue; }
    if (a === '--theme') { opts.theme = argv[++i]; continue; }
    if (a === '--svg') { opts.svg = argv[++i]; continue; }
    if (a.startsWith('-')) throw new Error('unknown option: ' + a);
    rest.push(a);
  }
  if (!Number.isInteger(opts.width) || opts.width < 8) throw new Error('--width must be an integer >= 8');
  if (!Number.isInteger(opts.maxRows) || opts.maxRows < 4) throw new Error('--max-rows must be an integer >= 4');
  if (opts.color && !['truecolor', '256', 'none'].includes(opts.color)) throw new Error('--color must be truecolor, 256 or none');
  if (opts.theme && !['dark', 'light'].includes(opts.theme)) throw new Error('--theme must be dark or light');
  return { opts, target: rest[0] };
}

function writeOut(dest, content) {
  const abs = resolve(dest);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  console.log('wrote ' + dest);
}
function detectColor(explicit) {
  if (explicit) return explicit;
  if (!process.stdout.isTTY) return 'none';
  if (process.env.NO_COLOR) return 'none';
  if (process.env.TERM === 'dumb') return 'none';
  return 'truecolor';
}

function detectAscii(explicit) {
  if (explicit) return true;
  if (process.env.STRATA_ASCII) return true;
  if (process.platform === 'win32' && !process.env.WT_SESSION && process.env.TERM_PROGRAM !== 'vscode') return true;
  return false;
}

async function main() {
  const { opts, target } = parseArgs(process.argv.slice(2));
  if (opts.help || !target) { console.log(HELP); process.exit(target ? 0 : 1); }
  const color = detectColor(opts.color);
  const ascii = detectAscii(opts.ascii);
  const common = { width: opts.width, maxRows: opts.maxRows, labels: opts.labels, ascii, color };
  const cwd = process.cwd();
  const shown = (isAbsolute(target) ? relative(cwd, target) || basename(target) : target).replace(/\\/g, '/').replace(/^(\.\/)+/, '');
  if (!isGitRepo(cwd)) {
    const core = emptyCore(shown);
    if (opts.json) { console.log(JSON.stringify(core, null, 2)); return; }
    if (opts.svg) { writeOut(opts.svg, renderSvg(core, { ...common, theme: opts.theme })); return; }
    process.stderr.write(renderAnsi(core, common) + '\n');
    process.stderr.write('\nnot a git repository. showing an empty core.\n');
    process.exitCode = 2;
    return;
  }
  const raw = await readHistory(shown, { cwd });
  const core = raw.length ? buildCore(shown, raw, { maxRows: opts.maxRows }) : emptyCore(shown);
  if (opts.json) { console.log(JSON.stringify(core, null, 2)); return; }
  if (opts.svg) { writeOut(opts.svg, renderSvg(core, { ...common, theme: opts.theme })); return; }
  process.stdout.write(renderAnsi(core, common) + '\n');
}

main().catch((err) => {
  process.stderr.write('strata: ' + err.message + '\n');
  process.exit(1);
});