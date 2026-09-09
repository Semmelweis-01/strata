# strata — 接口契约 (v1, 冻结)

零运行时依赖 · ESM · Node >= 18 · 确定性输出

## 1. 核心数据模型

```js
/** 一个沉积层 = 一次改动该文件的提交 */
Layer = {
  index: number,      // 0 = 最老(底部) .. N-1 = 最新(顶部)
  sha: string,        // 短 sha, 7 位
  subject: string,    // 提交标题, 已 trim, 最长 48 字符
  author: string,     // 作者名
  timestamp: number,  // unix 秒
  added: number,      // 增加行数
  deleted: number,    // 删除行数
  churn: number,      // added + deleted
  rows: number,       // 该层在终端占的行数, >= 1
  rock: RockId,       // 岩性
  fossil: boolean,    // deleted > 0 && deleted >= added —— 层中留有化石
  fault: boolean,     // churn >= 4 * medianChurn —— 断层
  dike: boolean,      // 该提交是 merge —— 侵入岩脉
  depthMa: number,    // 虚构地质年代深度 (百万年), 2 位小数
}

RockId = 'sandstone' | 'shale' | 'limestone' | 'basalt'
       | 'granite' | 'marble' | 'chert' | 'obsidian'

/** 一柱岩芯 */
Core = {
  path: string,        // 文件路径, 如 "README.md"
  layers: Layer[],     // 按 index 升序, layers[0] 最老
  totalRows: number,   // sum(layers.rows)
  medianChurn: number,
  born: number,        // 首次提交 unix 秒
  last: number,        // 最后一次提交 unix 秒
  seed: number,        // 32 位无符号整数; hash(path + layers[0].sha)
  id: string,          // 8 位大写十六进制登记号
}
```

## 2. 模块边界(严格按此切分, 不要越界)

| 文件 | 负责 | Owner |
|---|---|---|
| `src/gitlog.mjs` | 调用 git 取原始记录, 解析为 `{sha,subject,author,timestamp,added,deleted,isMerge}` | A |
| `src/model.mjs` | 原始记录 -> `Core`; 厚度分配、岩性判定、化石/断层/岩脉标记、年代映射、seed | A |
| `src/prng.mjs` | 确定性 PRNG (mulberry32) + `hash32(str)` | A |
| `src/palette.mjs` | 岩性 -> 颜色; 三种色深模式 | B |
| `src/render/ansi.mjs` | `Core` -> 终端字符串 | B |
| `src/render/svg.mjs` | `Core` -> 独立 SVG 字符串 | B |
| `bin/strata.mjs` | CLI 解析与调度 | C |
| `test/*.test.mjs` | node:test | 各自 |

## 3. 函数签名(必须完全一致)

```js
// src/prng.mjs
export function hash32(str) -> number            // 32 位无符号
export function mulberry32(seed) -> () => number // [0,1)

// src/gitlog.mjs
export async function readHistory(filePath, opts) -> RawCommit[]
export function isGitRepo(dir) -> boolean        // 同步
export function repoRoot(dir) -> string | null   // 同步

// src/model.mjs
export function buildCore(filePath, rawCommits, opts) -> Core
export function emptyCore(filePath) -> Core      // 无历史时的占位

// src/palette.mjs
export const ROCKS: Record<RockId, {name:string, rgb:[number,number,number], glyph:string}>
export function rockColor(rockId, mode) -> string   // mode: 'truecolor'|'256'|'none'
export function reset() -> string

// src/render/ansi.mjs
export function renderAnsi(core, opts) -> string
// opts = { width?:24, color?:'truecolor'|'256'|'none', ascii?:false,
//          labels?:true, maxRows?:40, gutter?:true }

// src/render/svg.mjs
export function renderSvg(core, opts) -> string
// opts = { width?:24, maxRows?:40, theme?:'dark'|'light', labels?:true }
```

## 4. 视觉规格

- **岩芯柱**默认 24 格宽, 默认最多 40 行高(超出则等比压缩 rows)。
- **左 gutter**: 深度读数 `0.00 Ma` 起, 越往下越老。
- **右 gutter**: 提交标题(截断到 gutter 宽度)。
- **化石**: 在该层内由 PRNG 选位置, 用 `◌` 或 `⌁` 替换该格。
- **断层**: 该行起岩芯整体右移 2 格, 并画锯齿断口 `╱`。
- **岩脉**: 2–3 行宽的斜向 `╱` 色带横切岩芯。
- **ASCII 模式**(`--ascii` 或检测到 legacy 终端): 化石 `o`, 断层 `/`, 岩脉 `/`, 边框用 `+-`。
- 非 TTY 时 `color` 自动降为 `'none'`。

## 5. 硬约束

1. **零运行时依赖**: `package.json` 无 `dependencies`。
2. **确定性**: 同一 Core 输入 -> 逐字节相同输出(渲染不得用 `Math.random()`、`Date.now()`)。
3. **禁止** 在渲染层调用 git 或读文件。
4. 所有模块 ESM, 只用 Node 内置模块。
5. 每个模块导出必须与第 3 节签名完全一致 —— 集成靠契约, 不靠互读代码。

## 6. 文件归属

A 只写: `src/gitlog.mjs`, `src/model.mjs`, `src/prng.mjs`, `test/model.test.mjs`, `test/gitlog.test.mjs`, `scripts/fixture.mjs`
B 只写: `src/palette.mjs`, `src/render/ansi.mjs`, `src/render/svg.mjs`, `test/render.test.mjs`
C 只写: `bin/strata.mjs`, `package.json`, `.gitattributes`, `LICENSE`, `README.md`, `README.zh-CN.md`, `assets/`, `.github/`
