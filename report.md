# 手机伙伴长聊天性能验证（2026-10-29）

## 结论与范围

发现并修复一个仍存在于当前 main 的开销：行内正则虽然缓存了下一次匹配，图片/链接/路径候选的校验、规范化与部分正则构造仍随每一个前置格式片段重复执行。现在按不可变段落缓存待处理候选，游标越过最早原始命中（包括被拒绝的命中）时重新计算，保留重叠语法语义。

约 18k 字符、3201 个行内片段的合成段落，Hermes 解析中位数 **287.36 → 55.80 ms（减少 80.6%）**。实际 `MessageRenderer companion=true` 挂载中的解析中位数 **291.28 → 60.79 ms（减少 79.1%）**。这不是整页 FPS 提升 80%：该极端样本首次挂载仍有约 2.4 秒的 JS 帧回调间隔，原生排版及 React 挂载成本未在本 PR 解决。600 条普通短消息没有显著收益。

生产入口已核实：在线伙伴的 `teammateResourceRoute` → `/sessions/[sessionId]` → `MessageRenderer` → `MarkdownBody`。#7137 是首页列表优化；#7313 已合并，但只处理原始正则搜索等开销。另核对了开放 PR #7723（大量表格的原生文本视图），与本次候选校验缓存不同，不重复其改动。

## 环境与方法

- base：`b0c217c98b2346bb32a34821241992ba52918a86`；head：`2b79f51aec8ad2c3c5e5698b7c144deb52cd9b5a`。
- worktree：`cindy-mobile-chat-history`；branch：`perf/mobile-chat-history`。
- Apple M1；Xcode 27.1；专用 iPhone 18 Pro / iOS 27.0 模拟器 `Cindy-Chat-History-Perf`。
- 正常签名 Debug 开发客户端 `com.xd.cindy`，`__DEV__=true`，Hermes `250829098.0.17`，Metro 8081 属于此工作树，注入源码身份 `perf/mobile-chat-history@2b79f51ae`。
- `mobile:sim:whoami` healthy=true、native-matched。开发环境 installed/expected 指纹同为 `ddb763835cdf9497f45a5995db8830ae098b362f`。`pageVerified=false` 是 doctor 未验证页面窗口的字段；页面另由运行时 identity、真实 native root 与 simctl 截图核实。
- 发布指纹计算前后均相同：iOS `bc420dee6e8cfc157ce981f0be42706bae489072`，Android `b07ef5e996cc6e353e2f653722f3ff61379dee2d`。开发环境指纹与发布环境分开比较。
- 全部为合成文本/仓库自带 mock，没有读取私人聊天、改真实账户配置或安装正式客户端。
- 原生编译/类型检查完成后才测量。纯解析每种输入预热两轮，交错 before/after 各 7 次取中位数；原生组件先预热，长回复和历史各交错 3 次，保留全部原始样本。
- baseline 的两个 TS 模块从 base 保存，经同一 RN Babel preset 编译，加载进同一 Hermes VM。原生对照只替换解析模块的可写导出，复用完全相同的当前 `MessageRenderer`、Auth/DeviceLink/Theme/SafeArea providers 和 native root。不替换 React Native、列表或文本视图。性能 harness 不包含整个任务页 chrome、网络同步或发送链路。
- 自动脚本通过 CDP 调用实际组件、列表控制器和路由；不是人工触摸，不代表真机手势/FPS。Release/Profile 未测：本轮依赖仓库 DEV mock、Metro 导出和计数器，不把 Debug 数据外推为生产帧率。

## 重现样本与结果

段落：`Array.from({length:800}, (_,i)=> '**字段'+i+'** 和 `value'+i+'` ').join('') + ' ![图](https://example.invalid/a.png)'`。18216 UTF-16 字符；图片 URL 故意不可访问，仅验证图片候选/占位语义，不测试远程图片下载。

| 同一 Hermes 内解析样本 | before 中位 ms | after 中位 ms |
|---|---:|---:|
| 18k 普通文本 | 2.76 | 2.69 |
| 18k 格式片段，无图片 | 205.57 | 53.80 |
| 4.4k 格式片段 + 图片 | 40.60 | 15.20 |
| 18k 格式片段 + 图片 | 287.36 | 55.80 |
| 18k 格式片段 + 路径链接 | 235.03 | 50.93 |
| 18k 格式片段 + HTML 图片 | 230.72 | 55.67 |

所有样本前后 JSON 输出完全一致。数据见 `hermes-benchmark.json`。

真实原生聊天组件（每项 3 次，全部样本见 `native-results.json`）：

| 场景 | before 解析总耗时中位 ms | after 解析总耗时中位 ms | before/after 最大 JS RAF 间隔的中位 ms |
|---|---:|---:|---:|
| 1 条 18k 复杂回复 | 291.28 | 60.79 | 2806.54 / 2385.85 |
| 300 轮、600 条短消息，初次进入顶部 | 3.53 | 3.33 | 222.47 / 247.56 |

长回复 after 三次解析为 209.10、60.68、60.79 ms；保留首轮抖动，不删除异常值。前后内容高度均 10555.33，初始 offset=0。600 条短消息仅虚拟化渲染 15 行，历史不是本次解析热点；after RAF 样本波动 225.96–407.71 ms，不宣称历史滚动变快。

## 功能回归

- 输出：20,000 组固定种子差分输入，包含不完整流式语法、递归强调、图片/链接/路径、HTML 注释、转义及重叠匹配，前后完全一致。
- 600 条历史：实际列表控制器滚动，native offset 从 16 → 6000 → 0；能回到顶部。
- 流式：600 条消息中最后一条分阶段追加，第二、三次更新复用 598 条稳定历史行；结束后 streaming=false，尾文含「流式收尾完成」。长单段的追加仍会完整解析该段，这是原有策略。
- 切换：真实 `MessageRenderer` 的 A → B → A 重挂载，原生文本输出对应新伙伴内容，没有旧回复残留。
- 深色模式：强调、行内代码、数学、表格，以及 cindy-ui stat/bar chart 正常渲染；已目视检查截图。
- 实际页面：重新启动未注入 harness 的 mock App，以正式路由打开 Cindy，再打开 Dash，均观察到 `MessageRenderer companion=true`、`session.messageList` 和实际页面截图。使用仓库支持的 `visual-teammate-session`；首页带 `:botId` 的 mock 会话缺少匹配元数据（测试夹具限制），不将其修到本 PR。
- 未验证：真实供应商推理、实际发送/跨设备网络、远程图片下载、复杂图表极限负载、Android 模拟器、真机、Release/Profile FPS。

## 自动验证与回归价值

- `pnpm --filter mobile test src/__tests__/messageMarkdown.test.ts src/__tests__/chatPathCandidate.test.ts src/__tests__/selectableMarkdownHtml.test.ts`：237 passed。
- `pnpm --filter mobile test src/__tests__/markdownBlockContent.test.tsx src/__tests__/mobileMarkdownRenderMetrics.test.ts src/__tests__/messageSourceLabelsRender.test.tsx src/__tests__/userMessageCollapse.test.ts`：58 passed。
- `pnpm --filter mobile typecheck`：通过。
- `pnpm check:test-hygiene`：PASS（359 files within baseline）。
- `git diff --check`：通过；DCO commit 已签名。
- 新增测试位于现有 `messageMarkdown.test.ts`，真实入口 `parseMobileMarkdownInlines`，最小失败输入为 30 组加粗/代码 + 两张图片；验证 30 个强调和代码节点、两张图片保留，并计数实际 URL 规范化工作。旧实现 122 次失败，修复后 2 次通过。无计时阈值、无生产桩。单文件135例测试执行173ms（含变更回归），unit tier。
- 未跑整仓 test:all：按仓库规则用等效相关定向测试及 mobile 类型检查；远端 CI 负责完整门禁。

## 截图

- [优化前长回复](before-long.png) / [优化后长回复](after-long.png)：相同内容、相同排版高度。
- [600 条历史](after-history.png) / [流式收尾](after-stream.png)。
- [深色富内容回归](after-rich-dark.png)。
- [真实 Cindy 页面](route-cindy-default.png) / [真实 Dash 页面](route-visual-bot-dash.png)。

只修复本轮已证明的重复候选工作；不宣称所有手机长聊天卡顿均已消除。后续若继续优化极端长回复，应单独测量行内节点挂载与原生排版，而不是再次重复优化首页列表。
