# Launch copy

Target: 30 stars in the first 24 hours. That is the threshold at which GitHub Trending
can pick a repository up, and Trending compounds. Everything below serves that single number.

---

## Hacker News — Show HN

Post Tuesday to Thursday, 06:00–09:00 PT. Title format matters more than the body.

```
Show HN: strata – read a file's git history as a geological core sample
```

First comment, posted by you immediately after submitting:

> Every file is a borehole. Each commit is a layer of sediment: its thickness is the churn,
> a layer that lost more lines than it gained leaves a fossil, a commit four times heavier
> than the median shears the column and everything below it shifts, and a merge cuts across
> from the side.
>
> It has zero dependencies and no network access. Rendering is a pure function of one
> intermediate object, so the same file always produces the same core, byte for byte.
>
> It does not solve a problem. I built it because `git blame` tells you who to blame but
> not what the file has been through.
>
> Limits, honestly: it needs git on PATH, it is slow on files with thousands of commits,
> and the depth axis is decorative — the unit is real, the geology is not.

---

## V2EX — 分享创造

```
[分享创造] strata —— 把一个文件的 git 历史读成一柱地质岩芯
```

> 每个文件都是一口钻孔，每次提交都是一层沉积。
>
> 层的厚度是改动量。删的比加的多，层里就留下化石。比中位数重四倍的提交会剪断岩柱，
> 其下整体错位。合并提交从侧面横切地层。
>
> 零依赖，不联网，确定性：同一个文件永远渲染出同一根岩芯，逐字节相同。
>
> `npx strata <file>`
>
> 它不解决任何问题。`git blame` 告诉你该怪谁，但它不告诉你这个文件经历过什么。

---

## Reddit — r/commandline

```
strata – a file's git history rendered as a geological core sample (zero deps, deterministic)
```

Post as a text post with the image inline, not a link post. Answer every comment in the
first two hours. r/unixporn takes the same asset if the colours are shown in truecolor.

---

## Order of operations

1. Day 1: r/commandline + r/unixporn. Small, aesthetic-first, low variance. Goal: ~20 stars of social proof.
2. Day 2–3: Show HN, Tuesday–Thursday morning PT. Highest ceiling, highest variance.
3. Day 4: V2EX 分享创造, then 即刻. The Chinese-language wave runs a day behind.
4. Never: Product Hunt (wrong audience for a CLI), X/Twitter without existing reach.

## What kills this

- Launching everywhere at once and having nowhere left when the first wave lands.
- An ugly screenshot. The image is the pitch; there is no second chance at it.
- A README that opens with an essay instead of the picture.
- Answering no comments. The first two hours decide whether it moves.
