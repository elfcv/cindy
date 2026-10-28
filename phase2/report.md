# Mobile companion chat: span mounting and long-paragraph streaming

2026-10-29 · PR #7726 · follow-up commit `8ba227bd1f11cebf479f9425fff242520d86726c`

Both approved follow-ups are included: remove passive span wrappers and reuse safe inline paragraph prefixes. This extends the same PR; the earlier candidate-search cache and [its separate baseline report](../report.md) remain. The tables below compare **2b79f51a (the first PR version)** against **8ba227bd1f**, not against unmodified main.

## Changes and safety boundaries

- Static text/emphasis/math and non-path code spans avoid share-tap context subscriptions and path verification hooks. Interactive links, images and actual path candidates retain the existing components. iOS text remains in the UITextView family; explicit styles and font scale caps are retained. RN plain text with no local style inherits its enclosing text style directly.
- Paragraphs of at least 1024 UTF-16 code units remember an immutable safe prefix, scoped by a WeakMap to the previous block lifetime. Reuse requires an append-only source match. The accepted atoms are deliberately narrow: words/numbers, a small punctuation set, complete simple strong/code spans, committed through whitespace. Unsupported syntax stays in the reparsed tail. Edits, comments and block-level reclassification preserve the existing full-parse/fallback behavior.
- No changes to scrolling, list virtualization, native modules, dependencies, production configuration, network throttling, cloud offline rendering or #7723 table behavior.

## Actual simulator comparison

Apple M1; dedicated `Cindy-Chat-History-Perf`, iPhone 18 Pro / iOS 27.0; Xcode 27.1; Debug/Hermes `250829098.0.17`, `__DEV__=true`. Official mock Metro at port 8081. Native fingerprint `ddb763835cdf9497f45a5995db8830ae098b362f`, native-matched. Baseline and candidate source files were compiled by Metro separately, with a fresh launch of the same dev app before each variant. Candidate runtime source was `perf/mobile-chat-history@2b79f51ae+5a13e00127`, exactly the files subsequently committed as `8ba227bd1f`.

The harness mounts the production `MessageRenderer` with `companion=true` in a real native React root and the existing providers. It uses synthetic text only. One small warm-up; three mounts per shape, identical shape order per variant; median below. These are sequential variant runs, not randomized/interleaved variants. Background OS activity is not controlled. Raw samples: [before](before-shapes.json), [after](after-shapes.json).

| First mount: longest JS RAF callback interval | Before | After |
|---|---:|---:|
| Plain 18,400-character reply | 176.71ms | 172.02ms |
| 18,180-character formatted reply (3,200 inline fragments) | 2696.44ms | 2400.24ms |
| Same formatted reply + image markup (18,216 characters) | 2199.25ms | 1146.89ms |

The formatted-only tree shrank from 17,838 to 13,038 React Fibers; with image markup, from 17,873 to 8,272. Fibers include React wrappers and are **not** native UIView counts. The image URL is an intentionally inaccessible synthetic address; no real image download is measured. RAF gaps measure JS callback delay in this Debug fixture, **not FPS, complete user-perceived latency, or production device performance**. The long formatted-only reply still has a roughly 2.4-second initial pause: this change reduces it, does not eliminate it.

### Long single-paragraph streaming in the same Hermes runtime

Same 18,180-character formatted paragraph; append slices of 64/256/1024 UTF-16 units; three complete runs each. This loop measures parser work only. No network arrival cadence or UI rendering is included. Cumulative time across all calls is not one uninterrupted user-interface freeze. Raw [before](before-stream.json) / [after](after-stream.json).

| Slice size / calls | Before cumulative median | After cumulative median |
|---|---:|---:|
| 64 / 285 | 7652.10ms | 561.41ms |
| 256 / 72 | 1876.91ms | 178.36ms |
| 1024 / 18 | 497.70ms | 82.49ms |

At 64 units, the after path reused 2,580,943 inline source units across updates. Block scanning still sees 2,608,260 source units in total; do not interpret the existing `parsedSourceUtf16Length` counter as newly tokenized inline characters. Every final output equals the full document parse.

## Correctness and functional acceptance

- **302 tests passed** across the existing parser, path, reader, block memo, metrics, actual message renderer, collapse and share selection suites. Parser regression first failed on the missing reuse counter against the old implementation. The tests assert retained prefix identity, unchanged previous results, unclosed tail completion, edits and full-parser equivalence. Expanded formatted companion text stays in bounded selectable views and preserves all visible text.
- **28,147 fixed-seed differential comparisons** against the old HEAD full-document parser, including character-by-character appends, HTML, paths, links, math, Unicode, malformed syntax, block boundaries and source edits. Both the new full parser and incremental parser are checked, avoiding a shared-new-implementation oracle. [Script](compare.ts), [output](compare.log).
- Mobile typecheck, test-hygiene and DCO passed; `git diff --check` clean. Tests live in existing files and assert behavior/work reuse, not wall-clock thresholds. [Regression log](regression.log).
- Real native 600-row list: controller scroll offset **0 → 6000 → 0**, visible screenshot confirms beginning restored. Streaming updates reuse **598** historical rows, finish with the expected text and streaming=false. A→B→A remount shows the correct current reply. [Functional results](functional.json).
- Light/dark formatted text, table, inline math and cindy-ui stat/bar content display correctly in new screenshots. Actual mock task routes open Cindy and Dash through the production companion route. [Navigation results](navigation.json).
- Actions in the functional harness call real JS callbacks/controllers/routes. **They are not touch gestures.** Device Hub was opened on the dedicated simulator, but desktop capture/AX observation failed (`CUA_UNAVAILABLE`, `ax_window_unresolved`); no input was sent to an unverified window. Native drag-to-select handles were not manually verified this run. Selection structure and text correctness are covered by renderer regression tests.

Commands:

```text
pnpm --filter mobile exec vitest run src/__tests__/messageMarkdown.test.ts src/__tests__/chatPathCandidate.test.ts src/__tests__/selectableMarkdownHtml.test.ts src/__tests__/markdownBlockContent.test.tsx src/__tests__/mobileMarkdownRenderMetrics.test.ts src/__tests__/messageSourceLabelsRender.test.tsx src/__tests__/userMessageCollapse.test.ts src/__tests__/shareSelectionTap.test.ts src/__tests__/shareSelectionStore.test.ts
pnpm --filter mobile typecheck
pnpm check:test-hygiene
pnpm check:dco
git diff --check
```

## Screenshots

- Formatted reply: [before](before-formatted.png) / [after](after-formatted.png)
- Formatted reply with image markup: [before](before-formatted-image.png) / [after](after-formatted-image.png)
- [Historical list after returning to top](after-history.png)
- [Streaming completion](after-stream.png)
- [Dark rich-content sample](after-rich-dark.png)
- [Production companion route: Dash](route-visual-bot-dash.png)

## Remaining limits and CI

No real-device, Release/Profile or Android simulator performance run, real provider inference, real remote image download, or production network benchmark. Plain long paragraphs do not show a meaningful mounting win; their full parse adds a small prefix-scanning overhead. Unsupported complex syntax near the beginning of a paragraph limits reuse, by design. Large formatted trees remain expensive despite fewer wrappers. No claim that all phone chat stutter is fixed.

Original head `2b79f51a` CI: Linux shard 4 failed in `packages/maker-core/src/agents/pi/__tests__/pi-subagent-runs.test.ts` (terminal receipt / readable size bound: controls directory unexpectedly existed); mobile shard passed. Four matching terminal-receipt cases passed locally, which does not prove the Linux CI failure is fixed. The mobile PR does not modify these desktop files. New head CI and required maintainer approval must still pass before normal merge; no bypass.
