# 群里的 Cindy · 身份（成员列表，Android，eb49ca1f3f = f546d75834）

- 说明：调度把提交改为 eb49ca1f3f3314b3336ad694e4958dc1826a5abd（feat/mobile-direct-group-cindy-switch 的头）。我核对过 `git diff f546d75834 eb49ca1f3f` 为空，文件内容完全相同，所以这组是在 f546d75834 上拍的，原样沿用，只把前缀改成 gci2-android-。
- 提交：f546d75834e6a8be4350951c0fd9ab0dc75369a5（工作目录 detached HEAD 已核对）。它在 7171716a9e 之上，只改了预览页和一条测试里的名字；没有原生改动，沿用原 APK。Metro `--clear` 提供这个提交的 bundle：Quinn Example、Morgan Sample、Cindy Nova、Cindy-Lab 各出现 1 次，旧名字出现 0 次。注意：fork 的 feat/mobile-direct-group-cindy-switch 头是 eb49ca1f3f，不包含 f546d75834；这里按调度给的 f546d75834 做。
- 屏幕上出现的名字：You、Avery（预览里固定的管理员和群主，f546d75834 源码第 31–32 行）、Quinn Example、张示例、Morgan Sample、Taylor Demo、Cindy Example，以及伙伴 Cindy (Quinn Example)、Cindy Nova (张示例)、Cindy (Morgan Sample)、Cindy-Lab (Taylor Demo)。没有其他人名。
- 深链：`cindy://group-settings-preview?state=members` → 成员 12 → 搜索「Cindy」。字号 1.0 / 1.3 / 2.0，浅色和深色，1080x2400，zh-CN。每个字号四组：1 搜索前、2 搜索前往下滚、3 搜「Cindy」、4 搜索后往下滚；每组都有 nodes.txt。
- 群里的 Cindy 这一行：Cindy 头像，说明「谁 @ 它，就在谁自己的电脑上做。」，没有「…」菜单。节点是 ViewGroup，content-desc「Cindy, 谁 @ 它，就在谁自己的电脑上做。」，clickable 和 focusable 都是 true，只有这一个可聚焦节点（5-row-nodes-full.txt）。
- 同名成员怎么区分：Cindy Example 是「成员」，字母头像；同名的个人伙伴名字后面带主人名，说明是「伙伴 · 仅主人可用」，有「…」菜单。其中 Cindy (Quinn Example) 用的也是 Cindy 头像，和群里的 Cindy 头像相同，靠主人名、说明和有没有「…」菜单区分。其余伙伴是字母头像。只记录。
- 字号 1.3 和 2.0 下名字和说明都完整，没有截断；面板保持半屏高度。
- 其他成员每行有两个可聚焦节点：外层 memberMenu 的 content-desc 是名字，内层 member 的是「名字, 说明」，bounds 相同；TAB 每行要按两下，第二下 TalkBack 日志里没有焦点事件。
- TalkBack（键盘焦点导航 TAB / Shift+TAB / DPAD，TalkBack 14.2 跟随焦点朗读，文本取自日志；不是触摸浏览手势，没有听验语音）：
  - 搜索前（tb a*）：关闭面板 → 邀请 → 群设置 → 成员 12 → 搜索框（「搜索成员, 编辑框」）→ Quinn Example（「已收起, Quinn Example, 按钮」/「点按两次即可激活, 可以操作，做出手势“三指点按”即可查看」）。You、Avery 和群里的 Cindy 三行都被跳过。
  - 搜索后（tb b*）：TAB 到 Cindy Example（「已收起, Cindy Example, 按钮」）、Cindy (Quinn Example)（「已收起, Cindy (Quinn Example), 按钮」）；从 Cindy Example 按 DPAD_UP 直接回到搜索框。
  - 群里的 Cindy 这一行的朗读：没验证。TAB、Shift+TAB、DPAD 都到不了这一行。
