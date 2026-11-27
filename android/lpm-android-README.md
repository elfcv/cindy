# #13318 手机群聊长按伙伴头像点名 · Android

- 构建：模拟器加载 fork 分支 verify/mobile-group-long-press-mention 的头 b6aebf0486285c1f5d84b9100dfd15e6d964abd7（工作目录 detached HEAD 已核对）。代码候选是 8555a4da3a（只在负责任务本地）。清单文件写明 a8420e19d1 作废，b6aebf0486 是它的下一个提交。
- 原生依据：b6aebf0486 相对 8862510256，在 apps/mobile/android、app.json、app.config.js、apps/mobile/package.json、apps/mobile/modules、pnpm-lock.yaml 上没有差异；8862510256 那轮已经沿用同一个 APK。所以本轮复用原 APK。Metro `--clear --mock` 提供的 bundle 里能找到 execution-qa-mention、「头像点名 · 模拟数据」、「在草稿末尾点名这位伙伴」、Ann Gold。
- 环境：redroid（Android 14，1080x2400，density 420），zh-CN，AOSP 英文键盘（LatinIME），默认浅色，字号 1.0（第 8 项用 2.0）。不登录、不运行模型。
- 入口：`cindy://group-execution-preview?width=393&groupId=execution-qa-mention`，标题「头像点名 · 模拟数据」。屏幕上的成员只有 Ann（Ann Blue / Ann Gold 都显示为 Ann）、Ann Lee、Team @Ann、Riley。第一次打开时停在「群内执行 · 模拟数据」，原因是我这边的 adb 命令没给 URL 加引号，`&` 之后被截掉了；加引号后正常，与 app 无关。
- 手势都是 adb 注入的：长按用 `input swipe x y x y 800`；取消用 `input swipe` 或 `input motionevent`。注入手势和真实手指的行为可能不同（例如滚动接管的时机），以下结论只代表注入手势的结果。
- 草稿和键盘状态取自 uiautomator 的 composer.input 节点和 `dumpsys input_method` 的 mInputShown；回执取自屏幕上的「模拟发送回执 · 收件人：…」（只是内存模拟，不是真实投递）。

| 项 | 结果 | 证据 |
| --- | --- | --- |
| 1 普通消息 / 执行行长按 | 通过：长按「普通消息 · Ann Blue」的头像和进行中的 Ann Gold 执行行头像，草稿都是「@Ann 」，focused=true，键盘打开，没有回执 | 1a-*、1b-*（含录屏） |
| 2 短按、滚动取消、移开取消 | 通过：先放草稿 hi。短按头像后草稿不变；从 Riley 头像起向上滚 800 px（400 ms 和 1200 ms 各一次，列表确实滚动了）不插入；按下 0.2 s 后移出头像 450 px、在外面再停 0.6 s 后抬起，不插入；最后静止长按作对照，草稿变成「hi @Ann 」，只插入一次 | 2-*、2b-*（录屏 + 抽帧拼图） |
| 3 草稿、选区、光标 | 通过，但输入内容有变通：这个环境输入不了中文，没有中文输入法，shell 也写不了剪贴板。所以没有用「先查这个，再核对数字」，而是在 app 里点「复制」复制模拟消息「普通消息 · Ann Lee」后粘贴。(a) 光标在「普通消息」之后时长按 Riley，得到「普通消息 · Ann Lee @Riley 」；(b) 选中「消息」后长按 Riley，原文和被选文字都保留，选区消失。两种情况再输入 OK 都接在「@Riley 」之后（没有输入「完成」：输入不了中文） | 3a-*、3b-* |
| 4 连续点名和发送 | 通过：先长按 Ann Blue 再长按 Team @Ann，草稿「@Ann @Team @Ann 」，没有自动发送；手动发送后回执「Ann Blue、Team @Ann」。另起一条：长按 Ann Gold（执行行）后输入「Lee, can you check?」，草稿「@Ann Lee, can you check?」，回执只有「Ann Gold」 | 4a-*、4b-* |
| 5 中文组字 | 没验证：系统镜像只有 AOSP LatinIME 和 TalkBack 自带的盲文输入法，没有拼音输入法；没有从别处下载 | — |
| 5 Android 另验 | 通过：草稿「keep」时按返回键收起键盘（mInputShown=false，草稿保留），再长按 Riley，键盘重新出现，草稿「keep @Riley 」 | 5x-* |
| 6 已发正文 | 通过（浅色、深色各做一轮）：「@Ann 这是只给 Ann Blue 的示例」里点 @Ann，成员卡是 Ann / Ann Blue；「@Riley 你好 @Riley」两处、「@Riley 第一段」和「第二段 @Riley，请看 demo()」两处都打开 Riley 的卡；行内代码 demo() 保持原样。「@Team @Ann @Team @Ann」是一个普通 TextView，里面没有可点的子节点，点它不弹卡，TalkBack 也不报「链接」。注：同一轮里第一次连续点时，有两处 @Riley 没有弹卡，原因是上一张卡还在关闭；单独再点一次都能打开（6c-*） | 6-*、6c-*、6-body-nodes.txt、6-all-nodes-bottom.txt |
| 7 读屏 | 见下 | 7-*、7-tb-* |
| 8 浅深色和大字号 | 通过：深色下长按 Ann Blue 得到「@Ann 」；深色下开卡和重叠正文见第 6 项。字号 2.0 时头像仍是 74x74 px（hitSlop 让可点区域扩到约 44 dp）。普通头像和执行行头像在中心、左 / 上 / 右边缘外 15 px 长按都插入「@Ann 」；边缘外 40 px 长按不插入；长按旁边的正文不插入；滚动见第 2 项。头像、正文、输入区都完整可读 | 8-*、8-f2.0-avatar-bounds.txt |

## 第 7 项 读屏（键盘焦点导航 TAB / Shift+TAB / DPAD，TalkBack 14.2 跟随焦点朗读，文本取自日志；不是触摸浏览手势，没有听验语音）
- 节点：6 个头像都是 android.widget.Button，clickable=true，focusable=true，long-clickable=false；content-desc 只有显示名，所以 Ann Blue 和 Ann Gold 的头像都是「Ann」（7-avatar-nodes.txt）。uiautomator 看不到提示文字和自定义动作。
- 焦点能不能进消息列表：列表在顶部时，TAB 只在 返回 → 输入框 → 标题 → 群设置 → 跳到底部 → 一个不可见的 WebView 之间循环，进不了列表（tb t*）。从「返回」按 Shift+TAB 可以倒序走完整个列表（tb k*、s*）。列表在底部时，TAB 也能直接进入列表。
- 朗读原文：
  - 普通头像：「Ann Lee, 按钮, 在草稿末尾点名这位伙伴。」/「点按两次即可激活, 点按两次并按住即可点名伙伴」。Riley、Team @Ann、两个 Ann 相同，Ann Blue 和 Ann Gold 都读成「Ann, 按钮, 在草稿末尾点名这位伙伴。」。成员名、按钮角色、提示都在：符合。
  - 执行行头像（Ann Gold，#1）：「Ann, 按钮, 在草稿末尾点名这位伙伴。」；执行行本身读「已展开, Ann · 正在处理, 按钮」。
  - 成员链接：带点名的正文作为一个 TextView 读出，末尾是「可以操作, 链接，做出手势“三指点按”即可查看」，例如「@Ann 这是只给 Ann Blue 的示例。」「@Riley 你好 @Riley」「@Riley 第一段」。重叠的「@Team @Ann @Team @Ann」末尾只有「可以操作，…」，没有「链接」：符合。
- TalkBack 双击默认激活：没验证。TalkBack 不接受 adb 注入的触摸手势，也没有可用的广播接口。
- 自定义动作菜单（「点名伙伴」）：没验证，原因同上。
- 附带：在 TalkBack 开着、键盘焦点在 Ann Lee 头像上时按 ENTER 或 DPAD_CENTER，日志里有 TYPE_VIEW_CLICKED，但草稿仍是空的，没有点名。这是普通的键盘点击，走的不是读屏的 activate 动作，不能用来说明读屏默认激活。
- 普通触摸短按：b6aebf0486 上短按头像草稿不变（第 2 项）：符合。
- 主干对照（origin/main 61f9e57d00，同一个 APK；主干相对候选只多一处 iOS 原生改动，Android 原生不变）：在 `cindy://group-execution-preview?width=393`（「群内执行 · 模拟数据」）上做同样的 TAB 操作。列表在顶部时同样只在 返回 / 输入框 / 标题 / 群设置 / 跳到底部 / WebView 之间循环；列表在底部时 TAB 能进入列表（等待卡、查看详情、拒绝 / 允许等）。结论：主干上焦点能进消息列表，但取决于列表位置，和候选的表现一致（log-run-main）。

## 记录（不下结论）
- 4a 发出的「@Ann @Team @Ann」在正文里整段都没有点名色。
- 回执正文「收件人：Ann Blue、Team @Ann」里的「@Ann」显示成了点名色。
- 群标题 content-desc 里成员是「Ann、Ann、Ann Lee、Team @Ann、Riley」，Ann Blue 和 Ann Gold 分不开；头像 content-desc 也一样。
