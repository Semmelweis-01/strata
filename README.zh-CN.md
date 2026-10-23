<div align="center">

# strata

### 每个文件都有地层。你只是从没往下挖过。

**每个文件都是一口钻孔，每次提交都是一层沉积。**

把一个文件的 git 历史，读成一柱地质岩芯——断层、化石、岩脉，一样不少。

<a href="#安装"><img alt="install" src="https://img.shields.io/badge/npx-strata-2b2b2b?style=flat-square"></a>
<img alt="deps" src="https://img.shields.io/badge/依赖-0-2b2b2b?style=flat-square">
<img alt="tests" src="https://img.shields.io/badge/测试-64%20通过-2b2b2b?style=flat-square">
<img alt="node" src="https://img.shields.io/badge/node-%E2%89%A518-2b2b2b?style=flat-square">

<img src="assets/core.svg" width="760" alt="从 git 历史渲染出的岩芯">

</div>

---

[English](README.md)

```
$ strata engine.js
```

```
◆ ─ engine.js ─ 54E49B1E                      ← 文件，以及它的登记号
   0.00 Ma ▩▩▩▩▩▩▩▩▩▩▩▩╱▩▩▩▩▩▩▩▩▩▩▩ merge feat into main
   0.17 Ma ▚▚▚▚▚▚▚▚▚▚▚▚╱▚▚▚▚▚▚▚▚▚▚▚ main: parallel work
   0.34 Ma ▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚ feat: branch work
   0.52 Ma ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩ commit 41
   0.69 Ma ▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤ commit 40
╱  0.86 Ma ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ commit 39      ← 断层剪断岩柱
   1.03 Ma   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒               其下整体错位
   1.20 Ma   ░░░░░░░░░░░◌░░░░░░░░░░ commit 38      ← ◌ 化石：删的比加的多
   1.37 Ma   ██████████████████████ commit 37
   1.55 Ma   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ commit 36
   1.72 Ma   ▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞ commit 35
   1.89 Ma   ▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚ commit 34
╱  2.06 Ma   ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩ commit 0       ← 又一处断裂
   2.23 Ma     ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩
   2.40 Ma     ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩
   2.58 Ma     ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩
   2.75 Ma     ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩
   2.92 Ma     ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩ ▼ end of core
```

深度轴从地表（最新提交，0.00 Ma）一路到基岩（这个文件的第一次提交）。
越深越老。整个读法就这一句。

## 安装

```
npx strata <file>
```

需要 Node 18+ 和 PATH 里的 `git`。这就是全部依赖清单——因为没有依赖清单。

## 这些地质特征是什么意思

没有一样是装饰。画面上每个特征都是关于这个文件的事实，一一映射到岩石：

| 你看到的 | 因为 |
|---|---|
| **层的厚度** | 那次提交的改动量——新增行数加删除行数 |
| **化石** `◌` | 删的比加的多。有东西被拿走了，没有补上 |
| **断层** `╱` | 改动量 ≥ 中位数的 4 倍。断裂剪断岩柱，其下整体错位 |
| **岩脉** `⌁` | 合并提交。从侧面横切地层 |
| **以 Ma 计的深度** | 提交之间的真实时间，单位百万年（1 年 = 31,557,600 秒） |
| **岩性** | 文件身份与层序号的稳定哈希——同一个文件，永远同一种岩石 |
| **登记号** | `hash(路径 + 首次提交)`，路径已规范化，所以 `src/a.mjs`、`./src/a.mjs`、`src\\a.mjs` 是同一根岩芯 |

八种岩性：砂岩、页岩、石灰岩、玄武岩、花岗岩、大理石、燧石、黑曜岩。

## 用法

```
strata <file>              渲染岩芯
strata --svg out.svg <f>   输出独立 SVG
strata --json <f>          输出 Core 的 JSON
```

| 参数 | 含义 |
|---|---|
| `--width <n>` | 岩芯宽度（格），默认 24 |
| `--max-rows <n>` | 最大行数，默认 40 |
| `--ascii` | 仅用 ASCII 字符，适配无 Unicode 的终端 |
| `--color <m>` | `truecolor` / `256` / `none` |
| `--theme <t>` | `dark` / `light`（仅 SVG） |
| `--no-labels` | 隐藏深度与提交标题栏 |

`--ascii` 用 `.` `:` `=` `%` `&` `*` `~` `@` 保持八种岩性可辨——不会把地质
塌成一个字符。`--color none` 零转义序列，可以随便管道到别处。

## 确定性

同一文件、同一段历史，逐字节相同。没有 `Math.random`，没有 `Date.now`，
没有区域设置查询。渲染是一个纯函数：

```
git 历史  ──▶  Core  ──▶  终端字符串 / SVG
                (纯 JSON)
```

这就是全部架构，也是这个项目有 64 个测试、零依赖的原因：
有意思的那部分是一个可以直接调用的纯函数。

```js
import { buildCore } from 'strata/src/model.mjs';
```

## 为什么做这个

`git blame` 告诉你该怪谁，但它不告诉你这个文件经历过什么。

一个熬过三次重写和一次回滚的文件，把这段历史写在了它的形状里。
这是看见那个形状的方式。

它不解决任何问题。它只是把记录读出来。

## 许可

MIT
