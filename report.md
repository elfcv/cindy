# #7425 MCP iframe 滚动回跳验证

代码：`4fbca9bdde9e49090ae05c9bf72c55e9a48bd2ee`，基线 `6e5065489dbebf172565ecfefe9f9d5f2d848acb`。2026-10-27，macOS / Apple M1，独立 Electron Dev / mock 数据，未使用真实账户或模型推理。

## 结论

根因已在真实 Electron 中复现：恢复非底部阅读位置后，跨源 iframe 的滚轮事件不向父文档冒泡，但 Chromium 会把滚动传给聊天区；恢复逻辑把它拉回旧位置。

修复仅在恢复落定、非程序化滚动且布局测量未改变时让用户接管。比较包括总内容高度、视口宽高、锚点在内容内的位置和高度；待加载、程序化校正、脱离 DOM 的锚点继续保留原处理。未改 MCP 协议、沙箱、CSP 或权限。

## 实际 Electron 结果

真实 MessageStream + 20 条合成消息，在实际消息行插入 1136px 的 opaque-origin sandbox iframe；原生 CDP wheel 输入，不派发伪造 scroll 事件。

| 场景 | 实测 |
|---|---|
| 基线代码，iframe 内 wheel +400 | scrollTop 228 → 228，复现回跳 |
| 修复 Light，3 次 | 每次 228 → 628，反向 -150 后 478 |
| 修复 Dark，3 次（确认 cindy-dark / .dark） | 每次 228 → 628 |
| 父级 wheel 事件 | 0；iframe contentDocument 为 null |
| 卡片异步增加 200px 高度 | 锚点相对位置保持 -200；随后 wheel +300 得到 228 → 528 |
| keyed MessageStream 卸载重挂 | 离开 628 → 返回 628；frame wheel -100 后 528 |
| 表单末尾输入 | 定位并填写 Synthetic input OK，读回一致 |

测试边界：使用真实 Electron、生产 MessageStream、真实跨源文档与滚动链；iframe 是合成内容，未接真实 MCP 服务或走 McpAppCard 创建协议，也未验证远程表单提交、Windows/Linux、触摸或物理触控板。CDP wheel 不是物理设备滚轮。

早期诊断把可变高度 iframe 放在列表 header，直接修改 header 高度后出现额外 +200px，栈在 useMessageViewport.connectViewport；不将此项记为通过。最终验收将 iframe 放入实际消息行，覆盖实际列表测量范围。早期请求 dark 的 run 受首启亮色门影响仍为 light；已单独结束隔离测试的亮色门，重新跑实际 dark 三轮，原始数据保存实际 theme/class。

## 自动检查

- Desktop typecheck 通过：`pnpm --filter desktop run typecheck`。
- 11 文件：193 通过，1 项既有 skip，12.79s。覆盖 autoFollowIntent、messageViewportCompensation、messageViewportRestoreDom、historyViewportCompensation、messageViewportVirtualization、messageViewportDeletionIntegration、messageDisclosureAnchorIntegration、messageItemHeightCacheIntegration、messageStreamRenderWindowIntegration、messageViewportGeometry、McpAppCard。
- 改动 4 文件定向 ESLint、git diff --check 均通过。
- test-hygiene 按真实 base 事件检查：359 文件通过，无基线修改。
- DCO：1 个新提交通过。
- `pnpm ui:check --changed --theme all`：UNCOVERED，不是通过；此入口的 iframe 场景由完整 Electron 探针补充。

## 测试价值与耗时

- messageViewportCompensation.test.ts：新增 9 个场景，调用生产测量/判定入口，验证 #7425 的无父级 wheel 滚动接管，以及相同总高度但锚点位移、视口尺寸改变、anchor 分离等不能接管的情况。最小输入为已完成恢复的一次 -100/+400 滚动；既有测试只测补偿 delta，不区分链式滚动与重排。unit tier，15 项全文件独立运行 0.349s。
- messageViewportRestoreDom.test.ts：给已有真实 applyRestore 回调执行环境补测量绑定，未新增源码扫描或扩大断言方式。已有 5 项通过，独立 9.55s，其中 collect 8.66s（导入完整 MessageStream），测试执行 24ms。没有新建慢测试文件。
- 回归失败证据来自真实 Electron 基线 228→228；没有声称新增 unit 测试在旧版完整运行过。

## 产物

verification.json 为汇总；baseline-row.json、electron-regression.json、fixed-dark-row.json 为实测数据；baseline-row.png、verified-light.png、fixed-dark-row.png 为前后截图；scroll-repro.tsx / scroll-final.cjs / scroll-compare.cjs 为临时探针备份。源码提交中无诊断代码。
