# PR #6048 current-head UI evidence

Source commit: f40107d41eabb9b22a25b4166341cd0f9e152fa9. Captured 2026-10-24 Asia/Shanghai.

Official CN/macOS arm64 isolated Dev returned DESKTOP_DEV_VERDICT=ready; PID 90698 and source commit verified. Images show real production renderer components, Electron preload and Main IPC. Dedicated fixture has no key and loopback address, no inference or connection probe was sent. No production user configuration was edited.

Codex: model Responses override versus Chat connection default, restore menu, and restored Chat shown in light/dark. Pi: Messages override then restored Chat. Connection dialog shows the default-protocol label and priority explanation.

Actual UI restore actions were followed by production listProviders IPC readback. Codex: api/piApi/entire route absent, 32768-token context retained, other model/Pi runtime/connection preserved. Pi: api/piApi/entire route absent, context retained, Codex and both connection descriptors unchanged. Dedicated fixture config and SHA-256 manifest are included.

This is current-head visual and local configuration evidence. It is not supplier-inference, Windows UI or five-language native-speaker acceptance; it does not replace maintainer product approval in #6060.
