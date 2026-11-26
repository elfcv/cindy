redroid 里的真 TalkBack 14.2.0.618048417 + Google TTS，应用语言 zh-CN。焦点用 adb input keyevent KEYCODE_TAB 移动（TalkBack 跟随输入焦点朗读，不激活）。
朗读文字取自 VERBOSE 日志（speak word），等读完再记；没有听验语音；没有 TalkBack 手势。adb 注入的单击会作为普通点击送给应用（会切换开关），不是 TalkBack 的单击。
steps.tsv 每行：场景、步骤、焦点事件、绿色焦点框坐标、读出的文字（、开关状态）。
