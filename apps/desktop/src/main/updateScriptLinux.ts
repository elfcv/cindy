import path from 'node:path';
import userInstallerSource from '../../resources/linux/install-user.sh?raw';
import type { LinuxUserInstallation } from './linuxInstallation';

/**
 * updateScriptLinux — pure builder for the Linux .deb update-apply bash script.
 *
 * Linux has no cindy-updater binary. A managed user install is applied
 * without elevation after the Electron process exits. A Debian-owned package
 * asks polkit for administrator authorization while the app is still running;
 * only after the elevated shell has started and verified the staged .deb does
 * the script tell the app to exit, then it installs and relaunches the stable
 * entry. A cancelled, timed-out or impossible authorization ends the script
 * with the app untouched.
 *
 * Extracted so the generated script can be regression-tested without Electron.
 */

/**
 * Line the update script writes to its stdout (a pipe read by the app) once
 * the elevated shell is running and has verified the staged .deb. The app
 * exits only after reading it.
 */
export const LINUX_UPDATE_AUTHORIZED_MARKER = 'CINDY_UPDATE_AUTHORIZED';

/**
 * Exit codes of the .deb update script for failures that happen before the
 * app was told to exit. The app is still running in every one of them.
 */
export const LINUX_UPDATE_PREAUTH_EXIT = {
  pkexecMissing: 10,
  stagedDebMissing: 11,
  /** pkexec was dismissed, timed out, killed, or had no authentication agent. */
  authorizationNotGranted: 12,
  channelSetupFailed: 13,
  /** Authorized, but the elevated copy/size/hash check rejected the package. */
  stagedDebRejected: 14,
} as const;

export interface LinuxUpdateScriptTimings {
  /** Seconds to wait for the old PID before escalating to SIGKILL. */
  exitKillAfterSeconds: number;
  /** Seconds after which a PID that survived SIGKILL aborts the update. */
  exitAbortAfterSeconds: number;
  /** Total seconds to poll for the relaunched main process. */
  verifyTimeoutSeconds: number;
  /** Second at which relaunch is retried (only if the first launch failed). */
  verifyRetryAtSeconds: number;
  /** Consecutive seconds the launched process must stay alive to count as started. */
  verifyStableSeconds: number;
  /** Seconds between lock-file heartbeats while pkexec may be waiting. */
  lockHeartbeatSeconds: number;
}

export const DEFAULT_LINUX_UPDATE_SCRIPT_TIMINGS: LinuxUpdateScriptTimings = {
  exitKillAfterSeconds: 120,
  exitAbortAfterSeconds: 135,
  verifyTimeoutSeconds: 30,
  verifyRetryAtSeconds: 15,
  verifyStableSeconds: 5,
  lockHeartbeatSeconds: 5,
};

/**
 * Display-backend switches a user may have added to their launcher. Electron
 * cannot start on a Wayland-only session without the Ozone choice, so the
 * relaunch must keep them. URLs and task arguments are still not carried over.
 */
const LINUX_RELAUNCH_DISPLAY_SWITCHES = new Set([
  'ozone-platform',
  'ozone-platform-hint',
  'enable-features',
  'disable-features',
  'enable-wayland-ime',
  'wayland-text-input-version',
  'disable-gpu',
  'disable-gpu-compositing',
  'use-gl',
  'use-angle',
  'gtk-version',
  'force-device-scale-factor',
]);

/** Keep the original launcher's display switches, in order, from process.argv. */
export function linuxRelaunchDisplayArgs(argv: readonly string[]): string[] {
  const kept: string[] = [];
  for (const arg of argv.slice(1)) {
    if (arg === '--') break; // Chromium stops parsing switches here.
    const match = /^--([a-z0-9-]+)(?:=([\w.,:/+=-]{0,1024}))?$/.exec(arg);
    if (match && LINUX_RELAUNCH_DISPLAY_SWITCHES.has(match[1])) kept.push(arg);
  }
  return kept;
}

export interface LinuxUpdateScriptParams {
  /** PID of the exiting app process the script must wait for. */
  pid: number;
  /** Absolute path of the downloaded .deb. */
  debPath: string;
  /** Manifest SHA-256 of the staged .deb, rechecked immediately before pkexec. */
  sha256: string;
  /** Manifest size of the staged .deb, used to bound the elevated copy. */
  sizeBytes: number;
  /** Absolute path of the installed main binary to relaunch. */
  exePath: string;
  /** Update lock file the bootstrap spins on during the swap. */
  lockFilePath: string;
  /** cindy-update.log path. */
  logPath: string;
  /** Only a validated, marked user install may bypass the package manager. */
  userInstallation?: LinuxUserInstallation & { version: string };
  relaunchArgs?: string[];
  timings?: Partial<LinuxUpdateScriptTimings>;
}

/** POSIX single-quote so paths cannot break out of the generated script. */
export function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/**
 * pgrep -f treats its pattern as an ERE — escape metacharacters so the
 * installed binary path matches literally.
 */
export function escapeEre(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 拉起验证按启动的子 PID(kill -0)而不是 pgrep:等锁的旧实例进程名
 * 也是 Cindy,按名字会把「更新前就启动的等待者」误判成新版本。
 */

export function normalizeLinuxDebSha256(value: string): string | null {
  const hex = value.trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(hex) ? hex : null;
}

export function buildLinuxUpdateScript(params: LinuxUpdateScriptParams): string {
  const { pid, debPath, exePath, lockFilePath, logPath } = params;
  const sha256 = normalizeLinuxDebSha256(params.sha256);
  if (!sha256) {
    throw new Error('Linux update script requires a 64-char sha256 of the staged .deb');
  }
  const sizeBytes = Math.max(1, Math.floor(params.sizeBytes));
  if (!Number.isFinite(sizeBytes)) {
    throw new Error('Linux update script requires a finite deb size');
  }
  const t = { ...DEFAULT_LINUX_UPDATE_SCRIPT_TIMINGS, ...params.timings };
  const qLog = shellSingleQuote(logPath);
  const qDeb = shellSingleQuote(debPath);
  const qExe = shellSingleQuote(exePath);
  const qLock = shellSingleQuote(lockFilePath);
  const qSha = shellSingleQuote(sha256);
  const userInstallation = params.userInstallation;
  const launchPath = userInstallation ? `${userInstallation.prefix}/current/Cindy` : exePath;
  const launch = [launchPath, ...(params.relaunchArgs ?? [])].map(shellSingleQuote).join(' ');
  // The relaunched app's own stdout/stderr, rewritten on every relaunch so it
  // keeps only the latest run. Chromium reports a display-backend failure only there.
  const qAppLog = shellSingleQuote(path.posix.join(path.posix.dirname(logPath), 'cindy-relaunch.log'));

  // 等旧进程退出:120 秒仍在就 SIGKILL,SIGKILL 后还在就放弃更新(此时什么都没装)。
  const waitForAppExit = [
    'WAITED=0',
    `while kill -0 ${pid} 2>/dev/null; do`,
    '    sleep 1',
    '    WAITED=$((WAITED+1))',
    `    if [ "$WAITED" -eq ${t.exitKillAfterSeconds} ]; then`,
    `        echo "[$(date)] PID ${pid} still alive after ${t.exitKillAfterSeconds}s — exit appears hung, sending SIGKILL" >> ${qLog}`,
    `        kill -9 ${pid} 2>/dev/null`,
    '    fi',
    `    if [ "$WAITED" -ge ${t.exitAbortAfterSeconds} ]; then`,
    `        echo "[$(date)] FATAL: PID ${pid} survived SIGKILL — aborting update" >> ${qLog}`,
    '        exit 1',
    '    fi',
    'done',
    `echo "[$(date)] Process ${pid} exited, waiting for filesystem to settle" >> ${qLog}`,
    'sleep 2',
  ];
  const userInstallBody = (u: LinuxUserInstallation & { version: string }): string[] => [
    `echo "[$(date)] Update script started, waiting for PID ${pid}" >> ${qLog}`,
    `printf '[%s] deb=%s exe=%s\\n' "$(date)" ${qDeb} ${qExe} >> ${qLog}`,
    '',
    ...waitForAppExit,
    '',
    // Source is embedded in the packaged application, never loaded
    // from a mutable external helper or a pinned system Node installation.
    `INSTALLER=${shellSingleQuote(userInstallerSource)}`,
    `bash -c "$INSTALLER" cindy-user-install --apply ${qDeb} ${qSha} ${sizeBytes} ${shellSingleQuote(u.prefix)} ${shellSingleQuote(u.version)} ${shellSingleQuote(u.region)} ${shellSingleQuote(u.current)} >> ${qLog} 2>&1 &`,
    'INSTALL_PID=$!',
    `echo "$INSTALL_PID" > "$INSTALL_PID_FILE"`,
  ];
  const debInstallBody = (): string[] => [
    `echo "[$(date)] Update script started, requesting authorization while PID ${pid} keeps running" >> ${qLog}`,
    `printf '[%s] deb=%s exe=%s\\n' "$(date)" ${qDeb} ${qExe} >> ${qLog}`,
    '',
    'PKEXEC=/usr/bin/pkexec',
    'if [ ! -x "$PKEXEC" ]; then',
    '    PKEXEC=$(command -v pkexec 2>/dev/null || true)',
    'fi',
    'if [ -z "$PKEXEC" ] || [ ! -x "$PKEXEC" ]; then',
    `    echo "[$(date)] FATAL: pkexec not found — cannot install .deb; Cindy keeps running" >> ${qLog}`,
    `    exit ${LINUX_UPDATE_PREAUTH_EXIT.pkexecMissing}`,
    'fi',
    '',
    `if [ ! -f ${qDeb} ]; then`,
    `    echo "[$(date)] FATAL: staged .deb missing before install; Cindy keeps running" >> ${qLog}`,
    `    exit ${LINUX_UPDATE_PREAUTH_EXIT.stagedDebMissing}`,
    'fi',
    // 提权边界校验:整个「复制 → 哈希 → 安装」都在同一个 root shell 里完成。
    // .deb 先拷进 root 自有的 0700 临时目录,哈希与安装读的是同一份 root 所有
    // 的副本,用户侧进程无法在哈希后换包;期望摘要与路径经 argv 传入。
    // 提权 shell 只写 stdout/stderr,由外层用户 shell 重定向到日志——
    // root 自己从不打开用户可替换的日志路径(符号链接攻击面)。
    'ELEVATED=\'set -eu',
    'TMP=$(mktemp -d "${TMPDIR:-/tmp}/cindy-deb.XXXXXX")',
    'chmod 700 "$TMP"',
    'cleanup_e() { rm -rf "$TMP"; }',
    'trap cleanup_e EXIT',
    // 快速失败检查;权威防线是下面的 dd nofollow 原子打开。
    'if [ -L "$2" ] || [ ! -f "$2" ]; then',
    '    echo "staged package is not a regular file" >&2',
    '    exit 1',
    'fi',
    // 原子打开:O_NOFOLLOW 拒绝符号链接(ELOOP),O_NONBLOCK 让 FIFO
    // 立即失败而不是挂起。count 按清单大小封顶,字符设备(如 /dev/zero)
    // 也只会读 预期大小+2MiB,随后的大小/哈希校验兜底。
    'CAP=$(( ($3 / 1048576) + 2 ))',
    'dd if="$2" of="$TMP/update.deb" iflag=nofollow,nonblock bs=1048576 count="$CAP" 2>/dev/null',
    'WRITTEN=$(stat -c %s "$TMP/update.deb")',
    'if [ "$WRITTEN" != "$3" ]; then',
    '    echo "size mismatch: expected $3 got $WRITTEN" >&2',
    '    exit 1',
    'fi',
    `ACTUAL=$(sha256sum "$TMP/update.deb" | awk "{print \\$1}")`,
    'if [ "$ACTUAL" != "$1" ]; then',
    '    echo "sha256 mismatch: expected $1 got $ACTUAL" >&2',
    '    exit 1',
    'fi',
    // 走到这里说明授权已拿到、副本已校验。先告诉外层 shell(再由它通知应用退出),
    // 然后阻塞读 stdin 等外层确认应用已退出。读到 EOF 或别的内容(外层被杀、应用
    // 没退出成)就不安装,直接退出——此时什么都没改。
    `echo ${LINUX_UPDATE_AUTHORIZED_MARKER}`,
    'IFS= read -r GO || exit 75',
    'if [ "$GO" != go ]; then',
    '    exit 75',
    'fi',
    'exec </dev/null',
    'if [ -x /usr/bin/apt-get ]; then',
    '    apt-get install --yes --allow-downgrades "$TMP/update.deb"',
    'elif [ -x /usr/bin/dpkg ]; then',
    '    dpkg --install "$TMP/update.deb"',
    'else',
    '    exit 127',
    'fi\'',
    '',
    // 授权通道:pkexec 会关掉 3 号以上的 fd,只能用 stdin/stdout。两条 FIFO 放在
    // 本用户 0700 私有目录里;双方打开后立即删目录,root 从不按路径打开它们。
    // 打开顺序与子进程一致(先 go 后 out),FIFO 的阻塞式 open 不会互等。
    `CHAN=$(mktemp -d "\${TMPDIR:-/tmp}/cindy-auth.XXXXXX") || { echo "[$(date)] FATAL: cannot create authorization channel; Cindy keeps running" >> ${qLog}; exit ${LINUX_UPDATE_PREAUTH_EXIT.channelSetupFailed}; }`,
    `if ! mkfifo -m 600 "$CHAN/go" "$CHAN/out"; then`,
    '    rm -rf "$CHAN"',
    `    echo "[$(date)] FATAL: cannot create authorization channel; Cindy keeps running" >> ${qLog}`,
    `    exit ${LINUX_UPDATE_PREAUTH_EXIT.channelSetupFailed}`,
    'fi',
    `echo "[$(date)] requesting administrator authorization via pkexec" >> ${qLog}`,
    `"$PKEXEC" /bin/bash -c "$ELEVATED" bash ${qSha} ${qDeb} ${sizeBytes} < "$CHAN/go" > "$CHAN/out" 2>> ${qLog} &`,
    'INSTALL_PID=$!',
    `echo "$INSTALL_PID" > "$INSTALL_PID_FILE"`,
    'exec 4> "$CHAN/go"',
    'exec 5< "$CHAN/out"',
    'rm -rf "$CHAN"',
    'AUTHORIZED=0',
    'while IFS= read -r LINE <&5; do',
    `    if [ "$LINE" = ${LINUX_UPDATE_AUTHORIZED_MARKER} ]; then`,
    '        AUTHORIZED=1',
    '        break',
    '    fi',
    `    printf '%s\\n' "$LINE" >> ${qLog}`,
    'done',
    'if [ "$AUTHORIZED" -ne 1 ]; then',
    '    exec 4>&-',
    '    wait "$INSTALL_PID"',
    '    AUTH_EXIT=$?',
    '    rm -f "$INSTALL_PID_FILE"',
    // pkexec:126 = 对话框被取消,127 = 未授权 / 没有认证代理(没有图形会话);
    // >128 = 被信号结束(例如超时)。其余非零是提权后的校验拒绝了安装包。
    '    if [ "$AUTH_EXIT" -eq 126 ] || [ "$AUTH_EXIT" -eq 127 ] || [ "$AUTH_EXIT" -gt 128 ]; then',
    `        echo "[$(date)] authorization not granted (pkexec exit $AUTH_EXIT) — Cindy keeps running, nothing installed" >> ${qLog}`,
    `        exit ${LINUX_UPDATE_PREAUTH_EXIT.authorizationNotGranted}`,
    '    fi',
    `    echo "[$(date)] elevated check rejected the staged package (exit $AUTH_EXIT) — Cindy keeps running, nothing installed" >> ${qLog}`,
    `    exit ${LINUX_UPDATE_PREAUTH_EXIT.stagedDebRejected}`,
    'fi',
    // 授权之后 root 的输出照常进日志;排水进程必须关掉 4 号 fd,否则外层意外退出时
    // root 读不到 EOF,会一直等下去、让心跳永远持锁。
    `cat <&5 4>&- >> ${qLog} 2>/dev/null &`,
    'exec 5<&-',
    `echo "[$(date)] authorization granted — asking Cindy to exit" >> ${qLog}`,
    // 应用可能已经不在(崩溃 / 用户退出):忽略 SIGPIPE,继续照常安装并拉起。
    `( trap '' PIPE; printf '%s\\n' ${LINUX_UPDATE_AUTHORIZED_MARKER} ) 2>/dev/null`,
    'exec 1>/dev/null',
    '',
    ...waitForAppExit,
    `echo "[$(date)] starting elevated install" >> ${qLog}`,
    // root 若已提前退出,写 go 会触发 SIGPIPE;忽略它,下面的 wait 拿到非零退出码,
    // 走「安装失败 → 拉起旧版本」。
    `( trap '' PIPE; printf 'go\\n' >&4 ) 2>/dev/null`,
    'exec 4>&-',
  ];

  return [
    '#!/bin/bash',
    'set -u',
    // 先接管更新锁、启动心跳,再碰任何外部路径——日志若被替换成
    // FIFO 会让 append 永久阻塞,锁和心跳必须在阻塞之前就位,否则
    // bootstrap 会在 20s 后把「持有者已死的锁」当死锁清掉。
    `echo updating $$ > ${qLock}`,
    'LOCK_PARENT=$$',
    'LOCK_PGID=$$',
    `INSTALL_PID_FILE=${qLock}.install`,
    // 进程组扫描(输出落文件再逐行读,pgrep 自排除自身,心跳辅助进程不会
    // 误计;pkexec 已死但其孤儿 apt/dpkg 后代仍在组里,会被扫到)。
    // 组文件用 mktemp 建私有随机临时文件,不用可预测的 <lock>.group 路径——
    // 该路径被占位成目录或父目录不可写时,`pgrep > file` 会失败;此时必须
    // fail closed(当作「安装链可能还在」),绝不能把锁清掉让新 Cindy 在
    // apt 还在替换文件时启动。
    'scan_group_others() {',
    `    GROUPFILE=$(mktemp "\${TMPDIR:-/tmp}/cindy-group.XXXXXX") 2>/dev/null || { OTHERS=1; return 0; }`,
    `    if ! pgrep -g "$LOCK_PGID" > "$GROUPFILE" 2>/dev/null; then`,
    '        rm -f "$GROUPFILE"',
    '        OTHERS=1',
    '        return 0',
    '    fi',
    '    OTHERS=0',
    '    while read -r GPID; do',
    '        [ -z "$GPID" ] && continue',
    '        [ "$GPID" = "$BASHPID" ] && continue',
    '        [ "$GPID" = "$LOCK_PARENT" ] && continue',
    '        [ -n "${LOCK_HEARTBEAT_PID:-}" ] && [ "$GPID" = "$LOCK_HEARTBEAT_PID" ] && continue',
    '        OTHERS=1',
    '        break',
    `    done < "$GROUPFILE"`,
    '    rm -f "$GROUPFILE"',
    '}',
    // 拉起的新进程必须脱离本进程组(setsid),否则会被 scan_group_others',
    // 当成「仍在安装」,心跳和锁永远清不掉,新 Cindy 也会卡在等锁。',
    // 先等心跳真正退出再清锁:kill 只是发信号,不保证进程已死;bash 在
    // 前台等待 sleep 时会推迟处理 SIGTERM,若此刻直接 rm 锁,心跳醒来后
    // 仍可能再写一次锁,让新拉起的 Cindy 卡在等锁。wait 收口这个窗口。
    // 每次拉起都把新进程的 stdout/stderr 写进清空后的 cindy-relaunch.log:
    // 图形后端初始化失败时 Chromium 只在 stderr 留下原因。日志不可写(或不是
    // 普通文件,例如 FIFO 会让打开阻塞)时退回 /dev/null——日志问题绝不能挡住拉起。
    'start_app() {',
    `    if [ ! -e ${qAppLog} ] || [ -f ${qAppLog} ]; then`,
    `        { : > ${qAppLog}; } 2>/dev/null`,
    '    fi',
    `    if [ -f ${qAppLog} ] && [ -w ${qAppLog} ]; then`,
    `        setsid nohup ${launch} >> ${qAppLog} 2>&1 &`,
    '    else',
    `        setsid nohup ${launch} >/dev/null 2>&1 &`,
    '    fi',
    '    LAUNCHED_PID=$!',
    '}',
    'relaunch_app() {',
    `    kill "$LOCK_HEARTBEAT_PID" 2>/dev/null`,
    `    wait "$LOCK_HEARTBEAT_PID" 2>/dev/null`,
    '    rm -f "$INSTALL_PID_FILE"',
    `    rm -f ${qLock}`,
    '    start_app',
    '}',
    '(',
    '    while true; do',
    '        if kill -0 "$LOCK_PARENT" 2>/dev/null; then',
    `            echo updating "$LOCK_PARENT" > ${qLock}`,
    `            sleep ${t.lockHeartbeatSeconds}`,
    '            continue',
    '        fi',
    '        # 父 bash 死了。安装链是否还在,看本进程组里除自己和父之外',
    '        # 还有没有活成员。',
    '        scan_group_others',
    '        if [ "$OTHERS" -eq 1 ]; then',
    '            # 用 $BASHPID 写锁:子 shell 里 $$ 仍是父 shell 的 PID,',
    '            # 写它等于宣告一个已死的持有者。',
    `            echo updating "$BASHPID" > ${qLock}`,
    `            sleep ${t.lockHeartbeatSeconds}`,
    '            continue',
    '        fi',
    '        # 父死且组内没有别的成员:确实没有人在替换文件,清锁退出。',
    '        rm -f "$INSTALL_PID_FILE"',
    `        rm -f ${qLock}`,
    '        exit 0',
    '    done',
    ') &',
    'LOCK_HEARTBEAT_PID=$!',
    'cleanup() {',
    '    # 收到可捕获信号时,先扫进程组:pkexec 已死但其提权 Bash /',
    '    # apt-get / dpkg 后代仍在覆盖安装时,锁和心跳都留下,由心跳接管。',
    '    # 心跳自己已被排除在扫描外,不会让 cleanup 误判成「还有别人」。',
    '    scan_group_others',
    '    if [ "$OTHERS" -eq 1 ]; then',
    '        return',
    '    fi',
    '    kill "$LOCK_HEARTBEAT_PID" 2>/dev/null',
    '    wait "$LOCK_HEARTBEAT_PID" 2>/dev/null',
    '    rm -f "$INSTALL_PID_FILE"',
    `    rm -f ${qLock}`,
    '}',
    'trap cleanup EXIT',
    '',
    ...(userInstallation ? userInstallBody(userInstallation) : debInstallBody()),
    'wait "$INSTALL_PID"',
    'INSTALL_EXIT=$?',
    'rm -f "$INSTALL_PID_FILE"',
    `echo "[$(date)] install exit code: $INSTALL_EXIT" >> ${qLog}`,
    '',
    'if [ "$INSTALL_EXIT" -ne 0 ]; then',
    `    echo "[$(date)] INSTALL FAILED — relaunching previous binary" >> ${qLog}`,
    '    relaunch_app',
    '    exit 1',
    'fi',
    '',
    `printf '[%s] Starting app: %s\\n' "$(date)" ${shellSingleQuote(launchPath)} >> ${qLog}`,
    // 先杀心跳、放锁,再 setsid 拉起:新进程不在本进程组里,不会
    // 被 scan_group_others 误判成安装链,也不会卡在自己的锁上。
    'relaunch_app',
    'OPEN_EXIT=$?',
    `echo "[$(date)] relaunch spawn exit code: $OPEN_EXIT" >> ${qLog}`,
    '',
    'VERIFIED=0',
    'RETRIED=0',
    // 连续存活秒数;-1 = 已确认退出并记过日志。只看一瞬间的 kill -0 会把
    // 「起来 1 秒后图形后端初始化失败 exit(1)」的进程误报成成功。
    'ALIVE_FOR=0',
    `for i in $(seq 1 ${t.verifyTimeoutSeconds}); do`,
    '    sleep 1',
    // 按启动的子 PID 验证(kill -0),不用 pgrep 按进程名找:等锁的旧实例
    // 进程名同样是 Cindy,会把它误判成更新后的进程;updater 自己的
    // bash -c 也永远匹配不上这个子 PID。
    `    if kill -0 "$LAUNCHED_PID" 2>/dev/null; then`,
    '        ALIVE_FOR=$((ALIVE_FOR+1))',
    `        if [ "$ALIVE_FOR" -ge ${t.verifyStableSeconds} ]; then`,
    '            VERIFIED=1',
    '            break',
    '        fi',
    '    elif [ "$ALIVE_FOR" -ge 0 ]; then',
    // 子进程已退出:wait 取回退出码(bash 已代收的子进程仍能取到),并把它
    // 留在 stderr 里的最后输出抄进更新日志,失败现场不再丢失。
    '        wait "$LAUNCHED_PID" 2>/dev/null',
    '        LAUNCH_EXIT=$?',
    `        echo "[$(date)] launched pid $LAUNCHED_PID exited with code $LAUNCH_EXIT (seen alive \${ALIVE_FOR}s)" >> ${qLog}`,
    `        if [ -f ${qAppLog} ]; then`,
    `            tail -c 4096 ${qAppLog} 2>/dev/null | awk '{ print "    app: " $0 }' >> ${qLog}`,
    '        fi',
    '        ALIVE_FOR=-1',
    '        if [ "$RETRIED" -eq 1 ]; then',
    '            break',
    '        fi',
    '    fi',
    `    if [ "$ALIVE_FOR" -lt 0 ] && [ "$RETRIED" -eq 0 ] && [ "$i" -ge ${t.verifyRetryAtSeconds} ]; then`,
    `        echo "[$(date)] still not up after \${i}s — retrying relaunch" >> ${qLog}`,
    '        start_app',
    '        RETRIED=1',
    '        ALIVE_FOR=0',
    '    fi',
    'done',
    'if [ "$VERIFIED" -eq 1 ]; then',
    `    echo "[$(date)] PROCESS VERIFIED: launched pid $LAUNCHED_PID stayed up for ${t.verifyStableSeconds}s" >> ${qLog}`,
    'else',
    `    echo "[$(date)] WARNING: relaunch not verified — no launched process stayed up for ${t.verifyStableSeconds}s within ${t.verifyTimeoutSeconds}s" >> ${qLog}`,
    'fi',
    '',
    `echo "[$(date)] Update script finished" >> ${qLog}`,
  ].join('\n') + '\n';
}
