# Mac 流式输出：避免淡入结束后的重复行测量

日期：2026-10-27。基线：82d44ec3eedb923e268ae963114a09849ee62655。

## 结论

修复一个已确认的布局工作浪费：StreamFadeSpan / StreamFadeListItem 结束动画后清理 class / data 属性，只影响透明度或 marker 颜色，却被消息视口当作行几何变化。补丁仅跳过具有 word key 的已知清理，保留其它属性、正文、尺寸、结构和滚动变化的处理；observer 和同步 takeRecords 两条路径一致。

三轮完整 Electron 对照，消息行 getBoundingClientRect 次数中位数浅色 337→111、深色 497→146。几何 refresh 调用中位数浅色 234→123、深色 237→120。这里统计的是 renderer 工作量，不是 FPS 或整机性能百分比。

## 环境与方法

- Apple M1，macOS 27.0.1 (26A434)，Electron 42.11.12 / Chromium 148.0.7778.280。
- 独立 worktree、独立 userData、Global mock / remote development，CDP 9243，renderer 5176。官方 desktop:whoami 确认来源匹配及 ready。
- 启动入口：XDT_CDP_PORT=9243 pnpm restart:desktop:remote -- --region=global --mock --isolated=@worktree --passive。
- 首次与重试 wrapper 均达到 120 秒启动超时，稍后原生应用启动完成；实际验收在 whoami ready 之后进行，未更改超时门禁。
- 同一原生实例、同一数据脚本，base 先三轮、补丁后三轮，每轮 light 然后 dark。每个主题有 400 行 TypeScript 代码块及 100 段正文，每段间隔目标 25ms，最终 full text / done / Completed。
- 真 Electron renderer、store、Markdown、视口和 CSS 动画；通过既有 store 测试入口注入合成流，不调用供应商。CDP CPU Profiler、rAF 与 PerformanceObserver 开启，临时 JS 原型计数器记录工作量，收尾恢复并 reload。
- 补丁通过 HMR 加载；main/preload 不变。用 validated.patch 和三个源码 SHA256 绑定测试内容，提交不会再改变已验证源码。
- baseline-1..3、fixed-1..3 是正式对照。optimized-1..3 的几何类计数器挂在 HMR 前模块身份上，refresh 为 0，不作为该指标证据；修正为真实模块 URL 后重复 fixed 三轮。final-smoke 仅功能截图，不计入性能样本。

## 原始样本

| 主题 | 基线行测量（3轮） | 修复行测量（3轮） | 基线 refresh | 修复 refresh |
| --- | --- | --- | --- | --- |
| Light | 327 / 337 / 339 | 111 / 111 / 114 | 232 / 234 / 236 | 120 / 124 / 123 |
| Dark | 497 / 470 / 500 | 146 / 146 / 146 | 237 / 230 / 240 | 122 / 120 / 119 |

12 个对照场景均验证 100 段有序正文、最终内容一致、isStreaming=false、结束标记可见，pageErrors 均为空。另做 light / dark 最终截图并人工检查。

**仍有长任务，不能声称卡顿已全面解决。** Light 单轮最长任务基线 129/115/218ms，补丁 121/160/254ms；Dark 基线 153/156/155ms，补丁 168/166/176ms。rAF 最大间隔也无一致改善。Dev / CPU Profiler / 顺序测试及不断增加的合成会话使耗时有噪声；可确认的收益限于减少不必要几何测量，不做 Release、FPS、耗电、整应用 heap 或供应商端到端声明。其他父组件重复渲染热点留待单独分析。

## 回归

messageViewportVirtualization.test.tsx 使用真实 MessageViewport、真实 StreamFadeSpan / ListItem、真实 MutationObserver，仅 DOM 几何采用 jsdom 可控尺寸。最小失败输入是有 word key 的 span / li 动画结束；旧实现两条路径各多测量 4 次，期望 0，形成 2 红 / 33 绿；修复后 35 绿。另验证真正 height 改变及与清理同批次的其它 class 改变仍触发测量，保护失效边界。独立文件总 3.48 秒，tests 2.58 秒。

相关 10 文件 164 tests 全通过（26.13 秒），覆盖历史窗口、读取锚点、删除补偿、程序滚动、选择/无障碍及流式分块/动画。定向 ESLint 与 diff --check 通过。test-hygiene 对真实 base 的 PR event 通过 361 files。

ui:check --changed --theme all 报告两逻辑文件 UNCOVERED / nothing-to-run，不能算单页 UI 通过；已用完整 Electron 两主题补验。无视觉/文案/动效参数变化。设计依据：DESIGN.md §14.4，保留 CSS opacity / marker 颜色、word key、时间线与 reduced-motion 规则。

Desktop typecheck 通过；提交 9593abe92e3b0d02318c2d6821d8d80158e5025a，DCO 通过。完整记录见 verification.json。

## 限制与回滚

没有 Windows、Linux、Release、物理手机、模拟器、真实网络推理验收。补丁只改 Desktop renderer，不改 IPC、安全设置、用户数据或正式运行实例。若未来 stream-word / data-stream-marker CSS 加入布局效果，应同步取消或调整该过滤。回滚本提交恢复原观察策略。
