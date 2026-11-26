redroid 里的真 TalkBack 14.2.0.618048417 + Google TTS，应用语言 zh-CN。朗读文本取自 VERBOSE 日志（speak word），没有听验语音。
焦点移动方式：adb input keyevent KEYCODE_TAB（系统键盘焦点移动，TalkBack 跟随输入焦点并朗读；不激活控件）。
adb 注入的触摸会绕过 TalkBack 的触摸浏览（见 #13301 r5 的说明），所以这里不用点按/滑动。
7-regular-*：默认屏幕、字号 1.0、Demo Vault Bridge 常规档：TAB5 落到「允许并继续」，读作「允许并继续 按钮 点按两次即可激活」。
7-compact-*：1080x1600、字号 2.0、Demo Long Repository Tools 紧凑档：TAB3 落到主按钮，读作「查看来源和权限 按钮」。
「实测到达前读为不可用」那一帧：没抓到，没验证。
