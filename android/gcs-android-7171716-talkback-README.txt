redroid 里的真 TalkBack 14.2.0.618048417 + Google TTS，应用语言 zh-CN。焦点用 adb input keyevent KEYCODE_TAB 移动（控件获得焦点时 TalkBack 的朗读），朗读文字取自 VERBOSE 日志，等读完再记；没有听验语音；没有 TalkBack 手势（触摸浏览、双击、滑动）。
offline 的禁用开关不接受键盘焦点，TAB 到不了，「读出禁用」没验证；旁证见 *-offline-switch-nodes-compressed.txt（Switch content-desc=群里的 Cindy、enabled=false）。
