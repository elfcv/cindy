#13318 Android @8f26ab29ad（redroid，mock）。长按 = adb input swipe x y x y 800（原地 800ms；RN Pressable 默认 500ms 触发长按）。
短按 = adb input tap。「按住后滚动」= (a) input swipe 从头像拖 600px/600ms；(b) input motionevent DOWN，停约 0.25s，再 MOVE 三次、UP。
光标位置用长按后再输入一个「Z」来观察。读屏：redroid 里的真 TalkBack 14.2；TAB/DPAD 键盘焦点到不了头像，TalkBack 对头像的朗读与「点名伙伴」动作没验证；uiautomator 不输出 accessibility actions。
