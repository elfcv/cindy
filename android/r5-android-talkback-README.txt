redroid (Android 14) 里的真 TalkBack 14.2.0.618048417 + Google TTS（取自官方 SDK 系统镜像 system-images;android-34;google_apis;arm64-v8a r14）。
朗读文本取自 TalkBack VERBOSE 日志（speak word = …，逐词按朗读进度写出），没有听验实际语音。TalkBack 应用语言设为 zh-CN，系统语言 en-US。
重要限制：adb input 注入的触摸（tap / swipe）在这台 redroid 上不经过 TalkBack 的触摸浏览，直接作为普通点击送给应用：
  - D：TalkBack 开启时单击标题「4 位成员」直接打开了群设置面板（真 TalkBack 单击只会移焦点）。
  - A：右滑 / 左滑（150→930 / 930→150，200ms）各重试 3 / 2 次，无焦点事件、无朗读。
  - C1：慢速拖动（触摸浏览）从消息区到输入框，无焦点事件、无朗读。
  - B1：单击收起的输入框 = 普通点击：输入框获得输入焦点并展开、键盘弹出（mInputShown=true），TalkBack 跟随焦点朗读一次：
    「正在编辑 <完整草稿> 编辑框 <提示文字> 当前显示的是 English US 窗口」，草稿读一次。
  - 双击激活无法模拟（两次 input tap 只是两次普通点击）。
虚拟输入设备（/system/bin/uinput）会建在宿主机共享内核上、redroid 的 /dev/input 看不到，已撤销，未注入任何按键。
