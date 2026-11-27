# #12684 m2b · Android（主要在 1d1eae1a6d 上）

- 构建：工作目录 detached HEAD 已核对，依次为 108a4b5ceb29073e966a263dcf6d5cb39c0d0191 和 1d1eae1a6df14f99071d894fe66d7c1f2c277ea3。两者都没有原生改动，沿用原 APK；Metro `--clear` 提供对应提交的 bundle，1d1eae 的 bundle 里含 usePluginMarket.ts 新加的注释。1d1eae 相对 108a4b 只改了 usePluginMarket.ts（在 Android 上发起安装时调用 Keyboard.dismiss）。
- 环境：redroid，mock（cindy://plugins?market=normal / secondConsent），浅色，zh-CN。官方插件用 Demo Vault Bridge，自定义插件用 Demo Long Repository Tools。键盘状态取自 `dumpsys input_method` 的 mInputShown，焦点取自 uiautomator 里 focused="true" 的节点。

## 键盘（1d1eae1a6d，文件前缀 m2b-android-1d1eae-7*）
| 路径 | 打开面板时 | 允许或取消后 1 s / 3.5 s | 搜索框 | 再点搜索框 |
| --- | --- | --- | --- | --- |
| a 输入 Vault → Back 收键盘 → 安装 → 允许 | false | false / false | text=Vault，focused=false，没有节点持有焦点 | 聚焦，键盘弹出 |
| b 输入 Vault，键盘开着 → 安装 → 允许 | false | false / false | 同上 | 同上 |
| b 路径在面板上点「取消」 | false | false / false | 同上 | 同上 |
| c 不经过搜索，从列表安装 → 允许 | false | false / false | — | — |
允许后都能看到结果提示「…上的操作还没结束」和条目「正在安装…」。

对照（108a4b5ceb，m2b-android-108a4b-7*）：a、b 两条路径允许后 1 s 就是 mInputShown=true，取消后也一样。弹出时持有焦点的节点是搜索框 EditText（content-desc「搜索插件」），text=Vault。a 路径里按 Back 收起键盘后，搜索框仍是 focused=true。

## 关闭面板那一帧（1d1eae1a6d，6-close-allow-1/2）
两次录屏里都有 2 帧（约 67 ms）面板内容已清空，只剩「确认插件权限」和「取消 / 允许并继续」两个按钮，主按钮文字是「允许并继续」（1:#23–#24，2:#23–#24）。只记录，不下结论。

## 收窄范围前已做的部分（附带提供，不是本轮要求）
- 1d1eae · 第二张确认（4-*）：在自定义插件、字号 1.0、1080x1750 和 1080x1775 下，第一张是常规档，第二张（由 Agent 发起，来源行折行，更高）是紧凑档。官方插件的「由 Agent 发起 · 来自 Cindy 插件市场」仍是一行，第二张不更高，找不到这样的尺寸。允许第一张后，用像素检测在第二张开始出现后约 30 ms 点主按钮位置：两次都只进入查看（按钮变成「允许并继续」，面板没有关闭），没有放行。查看后来源和权限排在最上，标题块排在权限之后（4-second-reviewed-*），如实记录。
- 108a4b · 默认屏幕、字号 1.0：官方、自定义各直接点两次「允许并继续」，四次都作答（1-*）。边界：官方字号 2.0 下 1950 是紧凑档、2100 是常规档（5-*）。
- 108a4b · 改尺寸和转屏：
  - 2400 缩到 1600（字号 2.0）后分别延迟 0.1 / 0.3 / 0.6 s 点主按钮位置：0.1 和 0.3 s 的点按落在重建过程中，没有生效；0.6 s 的点到新的紧凑档「查看来源和权限」，只进入查看。三次都没有放行。
  - 竖屏转横屏同样三次都没有放行（横屏是紧凑档）。
  - 反向：1600 放大到 2400 时，0.1 s 的点按没有生效，0.3 / 0.6 s 时新的常规档「允许并继续」已经显示，点按后作答；横屏转回竖屏时，0.1 / 0.3 s 的点按没有生效，0.6 s 时竖屏常规档已经显示，点按后作答。作答的几次都符合常规档的行为。
- 108a4b · 面板开着时把字号从 1.0 改成 2.0（3a-*）：MainActivity 的 configChanges 里没有 fontScale，app 重建回到首页，面板消失，没有作答；dev 版还弹出 `Call to function 'ModalBottomSheetView.hide' has been rejected`。字号由 2.0 改回 1.0 那一组没有做。
