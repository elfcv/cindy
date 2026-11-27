# #13301 r6 · 收起输入框的读屏顺序导航（Android，97efc4ffc5）

- 提交：97efc4ffc572995d824e5637295b4130a29a8d29（工作目录 detached HEAD 已核对）。没有原生改动，沿用原 APK；Metro `--clear` 提供这个提交的 bundle（含 `collapsedPreview`）。
- 证据性质：键盘焦点导航（TAB／Shift+TAB 用 `input keyevent KEYCODE_TAB`、`input keycombination 59 61`），TalkBack 14.2 跟随焦点朗读，朗读文本取自 TalkBack VERBOSE 日志（`Speaking fragment text`）；不是触摸浏览手势，没有听实际语音。
- 环境：redroid，mock，mention-qa 群，浅色，zh-CN，字号 1.0。TalkBack 关闭时输入长草稿并拖动把手收起（0-*），然后开启 TalkBack。开启期间不跑 uiautomator：它会让 TalkBack 重新绑定并播报「TalkBack 已开启」。焦点节点取自 TalkBack 日志里的 TYPE_VIEW_FOCUSED／TYPE_VIEW_ACCESSIBILITY_FOCUSED 事件（currentItemIndex 是同一窗口内的序号），绿框取自截图。

## 顺序（2-* 这一轮）
| 步 | 键 | 键盘焦点 | 朗读 |
| --- | --- | --- | --- |
| g03 | Shift+TAB（从 返回） | 更多消息操作（#16，最后一条消息） | 更多消息操作, 按钮 / 点按两次即可激活 |
| g04 | TAB | 返回（#17） | 返回, 按钮 / 点按两次即可激活 |
| g05 | TAB | EditText 群聊消息（#18） | 群聊消息 / 〈草稿全文〉, 编辑框, 在群里说点什么，@ 某位伙伴就只让它回答… / 点按两次并按住即可长按 |
| g06 | Shift+TAB | 返回（#17） | 同上 |
| g07 | TAB | EditText（#18） | 同 g05 |

- 输入区只停一次，停在 EditText（#18）。TAB 序列里没有出现预览层 `collapsedPreview` 或点按层 `collapsedOpen`：这两个节点 focusable=false、clickable=false，见 0-*-nodes。草稿每次只读一次，读完后还会读提示文字（placeholder）。
- 焦点一到 EditText，输入框就展开成多行（出现把手，草稿滚到末尾），但不弹软键盘。所以没有出现「焦点停在收起状态的输入框上」的情况。

## 激活
- 1-4 DPAD_CENTER：输入框收到 TYPE_VIEW_CLICKED，软键盘弹出（mInputShown=true，朗读「当前显示的是“English (US)”窗口」）。1-5 输入 Z，接在草稿末尾（`…words hereZ`）。
- 2-7 ENTER：插入换行（TYPE_VIEW_TEXT_CHANGED），软键盘不弹出。2-8 输入 Z，落在新的一行。

## 从输入区往后（后一项）
- 1-6 和 3-1：在 EditText 上按 TAB，键盘焦点先到「发送」（#19，朗读「发送」），随即被一个不可见的 android.webkit.WebView 拿走。输入框收起，TalkBack 的无障碍焦点框仍留在收起后的输入框上。
- 3-2：在另一轮里，焦点进入这个 WebView 后，TAB、Shift+TAB、DPAD_UP 都不再移动焦点（TalkBack 日志里没有焦点事件）。轻点屏幕、退出再进入群页都没有恢复，强制停止 app 并重启后才恢复。从冷启动按第一下 TAB 时，焦点也先到系统导航栏 Back，同时 WebView 拿到 app 内的输入焦点（1-1）。这个 WebView 不属于本 PR 的输入框，只记录。
