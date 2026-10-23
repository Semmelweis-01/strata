<div align="center">

# strata

### 每个文件都有地层。你只是从没往下挖过。

**每个文件都是一口钻孔，每次提交都是一层沉积。**

把一个文件的 git 历史，读成一柱地质岩芯——断层、化石、岩脉，一样不少。

<a href="#安装"><img alt="install" src="https://img.shields.io/badge/npx-strata-2b2b2b?style=flat-square"></a>
<img alt="deps" src="https://img.shields.io/badge/依赖-0-2b2b2b?style=flat-square">
<img alt="tests" src="https://img.shields.io/badge/测试-67%20通过-2b2b2b?style=flat-square">
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

## 使用教程

### 1. 读第一根岩芯

进入任意仓库，把 `strata` 指向一个存在了一段时间的文件：

```
$ cd path/to/some/repo
$ npx strata src/engine.js
```

```
◆ ─ src/engine.js ─ 49883AF5
   0.00 Ma ▩▩▩▩▩▩▩▩▩▩▩▩╱▩▩▩▩▩▩▩▩▩▩▩ merge feat into main
   0.17 Ma ▚▚▚▚▚▚▚▚▚▚▚▚╱▚▚▚▚▚▚▚▚▚▚▚ main: parallel work
   0.34 Ma ▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚ feat: branch work
   0.52 Ma ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩ commit 41
   0.69 Ma ▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤▤ commit 40
╱  0.86 Ma ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ commit 39
   1.03 Ma   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
   1.20 Ma   ░░░░░░░░░░░◌░░░░░░░░░░ commit 38
   1.37 Ma   ██████████████████████ commit 37
   1.55 Ma   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ commit 36
   1.72 Ma   ▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞ commit 35
   1.89 Ma   ▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚ commit 34
╱  2.06 Ma   ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩ commit 0
   2.23 Ma     ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩
   2.40 Ma     ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩
   2.58 Ma     ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩
   2.75 Ma     ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩
   2.92 Ma     ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩
   2.92 Ma     ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ ▼ end of core
```

按这个顺序读三样东西：

1. **左边一列** —— 深度。`0.00 Ma` 是最新提交，`2.92 Ma` 是这个文件的第一次提交。
   岩芯深 `2.92` 百万年，因为这个文件活了 2.92 **年**。
   （现实中的一年 = 地质时间的一百万年。比例是固定的。）
2. **中间的主体** —— 一次提交一行，厚度正比于那次提交的改动量。
   跨了好几行的色块就是大改动。
3. **标记** —— 左边的 `╱` 是断层，层内的 `◌` 是化石，纵向切过一层的 `⌁` 是岩脉。

### 2. 缩小范围

40 行的岩芯一眼看不完。限制高度：

```
$ strata --max-rows 8 src/engine.js
```

```
◆ ─ src/engine.js ─ 49883AF5
   0.00 Ma ▒▒▒▒▒▒▒▒▒▒▒▒╱▒▒▒▒▒▒▒▒▒▒▒ merge feat into main
   0.42 Ma ░░░░░░░░░░░░╱░░░░░░░░░░░ main: parallel work
   0.83 Ma ████████████████████████ feat: branch work
   1.25 Ma ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ commit 41
   1.67 Ma ▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞ commit 40
╱  2.09 Ma ▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚ commit 39
╱  2.50 Ma   ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩ commit 0
   2.92 Ma     ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩
   2.92 Ma     ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ ▼ end of core
```

行数变少意味着相邻提交被**合并**成一层，不是被丢弃——改动量会累加，所以形状还在。
登记号不变，因为身份是"文件 + 它的首次提交"，与你怎么看无关。

### 3. 放宽一点

窄岩芯看不清断层错位。终端够宽的话：

```
$ strata --width 40 --max-rows 5 src/engine.js
```

```
◆ ─ src/engine.js ─ 49883AF5
   0.00 Ma ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓╱▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ merge feat into main
   0.73 Ma ▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞╱▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞▞ main: parallel work
   1.46 Ma ▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚ feat: branch work
╱  2.19 Ma ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩ commit 0
   2.92 Ma   ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩
   2.92 Ma   ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ ▼ end of core
```

### 4. 去掉标注

为了截图，或者贴进已经有文字说明的文档里：

```
$ strata --no-labels --max-rows 5 src/engine.js
```

```
◆ ─ src/engine.js ─ 49883AF5
▓▓▓▓▓▓▓▓▓▓▓▓╱▓▓▓▓▓▓▓▓▓▓▓
▞▞▞▞▞▞▞▞▞▞▞▞╱▞▞▞▞▞▞▞▞▞▞▞
▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚
╱▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩
  ▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩▩
  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
```

断层错位依然在——第 4 行的 `╱` 把它下面整体右移了两格。

### 5. 终端画不出方块

有些终端、CI 日志和 Windows 控制台会把制表符画成乱码。`--ascii` 把八种岩性换成
ASCII 字符，但保持彼此可辨：

```
$ strata --ascii --max-rows 5 src/engine.js
```

```
# - src/engine.js - 49883AF5
   0.00 Ma ============/=========== merge feat into main
   0.73 Ma ************/*********** main: parallel work
   1.46 Ma &&&&&&&&&&&&&&&&&&&&&&&& feat: branch work
/  2.19 Ma @@@@@@@@@@@@@@@@@@@@@@@@ commit 0
   2.92 Ma   @@@@@@@@@@@@@@@@@@@@@@
   2.92 Ma   ++++++++++++++++++++++ end of core
```

八种岩石，八个 ASCII 字符：`.` `:` `=` `%` `&` `*` `~` `@`。
地质结构保留，只是换了套字母表。

### 6. 管道到别处

`--color none` 零转义序列，输出就是纯文本：

```
$ strata --color none src/engine.js | pbcopy
$ strata --color none src/engine.js > core.txt
$ strata --color none --no-labels src/engine.js | head -5
```

颜色是自动判断的：TTY 拿到 truecolor，管道拿到 none。一般用不上这个参数——
但当你想确定时，它在。

### 7. 要数据，不要图

```
$ strata --json src/engine.js
```

```json
{
  "path": "src/engine.js",
  "layers": [
    {
      "index": 0,
      "sha": "5053938",
      "subject": "commit 0",
      "author": "Dev",
      "timestamp": 1614528000,
      "added": 505,
      "deleted": 33,
      "churn": 538,
      "rows": 1,
      "rock": "obsidian",
      "fossil": false,
      "fault": true,
      "dike": false,
      "depthMa": 2.92
    },
    {
      "index": 1,
      "sha": "a9ae370",
      "subject": "feat: branch work",
      ...
    }
  ],
  "totalRows": 4,
  "medianChurn": 7,
  "born": 1614528000,
  "last": 1706630400,
  "seed": 1233664757,
  "id": "49883AF5"
}
```

渲染器用到的每个数字都在这里。`churn` 是 `added + deleted`；`fault` 是
`churn >= 4 * medianChurn`；`depthMa` 是 `(last - timestamp) / 31,557,600 / 1,000,000`。
你可以用这份数据重建整张图，或者自己画。

### 8. 导出 SVG

```
$ strata --svg core.svg src/engine.js
$ strata --svg core-light.svg --theme light src/engine.js
```

```
wrote core.svg
```

SVG 是独立的——没有外部字体、没有脚本、没有网络引用。丢进 README、博客或幻灯片都行。
`--theme light` 用于白底页面。

### 9. 当库来用

渲染器只是一个纯函数外面的薄壳：

```js
import { readHistory } from 'strata/src/gitlog.mjs';
import { buildCore } from 'strata/src/model.mjs';
import { renderAnsi } from 'strata/src/render/ansi.mjs';

const raw = await readHistory('src/engine.js', { cwd: process.cwd() });
const core = buildCore('src/engine.js', raw, { maxRows: 40 });
console.log(renderAnsi(core, { width: 24, color: 'none' }));
```

`buildCore` 接收普通对象，返回普通对象。没有 git，没有终端，没有 I/O。
这就是它可测试的原因。

### 10. 看起来是空的时候

| 你看到的 | 原因 |
|---|---|
| 一整块平的，没有层 | 这个文件只有一个提交。还没发生过什么。 |
| `not a git repository. showing an empty core.` | 在仓库外运行了，或者传入的路径不在仓库里。 |
| `no such file` | 路径不存在。路径相对你 shell 的当前目录。 |
| 文件存在但岩芯为空 | 文件未被跟踪，或者从未在那个路径下提交过。 |
| 全是 `0.00 Ma` | 历史短于约 5 个月；页脚会显示真实跨度。 |

`strata` 用 `git log --follow` 跟踪重命名，所以移动过的文件保留完整历史。
它不会跨不相关的路径追踪内容。

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
| `--no-labels` | 隐藏深度列与提交标题列，只留岩芯本体 |

`--ascii` 用 `.` `:` `=` `%` `&` `*` `~` `@` 保持八种岩性可辨——不会把地质
塌成一个字符。`--color none` 零转义序列，可以随便管道到别处。

## 确定性

同一文件、同一段历史，逐字节相同。没有 `Math.random`，没有 `Date.now`，
没有区域设置查询。渲染是一个纯函数：

```
git 历史  ──▶  Core  ──▶  终端字符串 / SVG
                (纯 JSON)
```

这就是全部架构，也是这个项目有 67 个测试、零依赖的原因：
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