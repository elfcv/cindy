# #13318 长按头像点名 · Android 复验（8862510256）

- 提交：8862510256d2116b3270dacc7538d389444ec863（工作目录 detached HEAD 已核对）。fork 分支 cindy/earnest-bohr 当前头为 0cc455571b，比本提交多一笔，本轮未验。
- 构建：相对 8f26ab29ad 只改 BotGroupMessageText.tsx、botGroupMentions.ts（mobile / maker-shared）和测试，未改原生，沿用原 APK。Metro `--clear` 提供该提交的 bundle，其中 `botGroup.avatarMention` 出现 1 次，`function memberMentionLabels` 出现 1 次，`splitBotGroupMentionSegments` 出现 4 次。
- 环境：redroid，mock 模式，浅色，zh-CN，字号 1.0。长按用 `input swipe x y x y 800`（按住 800 ms；RN 默认的长按阈值是 500 ms）。
- 输入框状态取自 uiautomator 的 `botGroup.composer.input` 节点（text/focused），键盘是否弹出取自 `dumpsys input_method mInputShown`。

| 项 | 结果 | 证据 |
| --- | --- | --- |
| 1 普通消息头像长按 | 符合：`@资料伙伴 `、focused=true、mInputShown=true | 1-longpress-message-avatar |
| 2 执行行头像长按 | 符合：`@核对伙伴 `、focused、键盘弹出 | 2-longpress-execution-row-avatar |
| 3 短按 | 符合：text 为空、未聚焦、无键盘 | 3-short-tap-no-change |
| 4 按住后滚动 | 符合：(a) 从头像起拖 1000 ms；(b) DOWN，停 250 ms，MOVE 上移 400 px，UP。两种都没有插入点名、没有弹键盘 | 4-hold-then-scroll-cancelled |
| 5 两位/同一位 | 符合：先核对伙伴后资料伙伴，得到 `@核对伙伴 @资料伙伴 `；同一位长按两次得到 `@资料伙伴 @资料伙伴 `（不去重） | 5-two-companions-in-order、9-1 |
| 6 同名/包含名 | 没验证，只有测试覆盖（mock 没有 Ann / Ann Lee 伙伴） | — |
| 7 有文字、光标在中间、有选区 | 符合：(a) 光标在 hello 后，长按后为 `hello world @资料伙伴 `，再输入 Z 得到 `…@资料伙伴 Z`，光标在末尾；(b) 选中 world 后长按，原文保留，选区消失，光标在末尾，输入 Z 同样追加在末尾 | 7a-*、7b-* |
| 8 输入法组字 | 符合（用 AOSP 英文组字代替）：带下划线的 `Hello` 处于组字状态时长按，得到 `Hello @资料伙伴 `，输入 Z 追加在末尾。中文输入法没验证 | 8-* |
| 9 Back 收起键盘后长按 | 符合：收起后草稿保留；再长按键盘重新弹出并插入点名 | 9-0、9-1 |
| 10 读屏 | 压缩 dump：头像节点 content-desc=名字，clickable=true，long-clickable=false；uiautomator 看不到「点名伙伴」动作标签。TalkBack 实际朗读没验证（头像组件与 8f26ab29ad 相同；上轮用 TAB/DPAD 无法把 TalkBack 焦点移到头像） | 10-avatar-nodes-compressed-dump.txt |
| 新增：发出后点名范围与成员卡 | 组件用例已覆盖，原生未验证。mock 群里没有 Ann / Ann Lee / Team 伙伴，而且 mock 不回显已发送的消息（11-0 是发送前草稿，11-1 是发送后的群）。对应组件用例 `sends and renders the avatar pick despite the longer name` 的 2 例在本地已通过 | 11-* |
