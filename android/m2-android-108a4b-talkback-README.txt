redroid 里的真 TalkBack 14.2.0.618048417 + Google TTS，应用语言 zh-CN。焦点用 adb input keyevent KEYCODE_TAB 移动（系统键盘焦点，TalkBack 跟随并朗读，不激活控件）。
朗读文字取自 TalkBack VERBOSE 日志（speak word），等读完再记；没有听验实际语音；没有 TalkBack 手势（触摸浏览/双击/滑动）——adb 注入的触摸在这台 redroid 上绕过 TalkBack。
没有用「单击按钮」：注入的单击会直接按下按钮（作答），不是 TalkBack 的聚焦。
