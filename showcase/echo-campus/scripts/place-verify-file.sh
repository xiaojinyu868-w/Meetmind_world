#!/usr/bin/env bash
# 呆猫小程序 web-view 的业务域名校验文件：放到 https://capture.meetmind.online/<文件名>。
# 只加一条精确匹配这个文件名的 location，不动别的路径；改之前备份，nginx -t 不过就原样恢复。
#
#   sudo bash scripts/place-verify-file.sh /path/to/AbCd1234.txt           # 上线
#   sudo bash scripts/place-verify-file.sh --check /path/to/AbCd1234.txt   # 只验证配置能过，不留任何改动
#   sudo bash scripts/place-verify-file.sh --remove AbCd1234.txt           # 撤掉
set -euo pipefail

MODE=place
case "${1:-}" in --check) MODE=check; shift ;; --remove) MODE=remove; shift ;; esac
ARG="${1:?用法: place-verify-file.sh [--check|--remove] <校验文件.txt>}"
NAME=$(basename "$ARG")
[[ "$NAME" =~ ^[A-Za-z0-9_-]{1,64}\.txt$ ]] || { echo "文件名不对：$NAME（校验文件应是 字母数字.txt）" >&2; exit 1; }

CONF=${ECHO_NGINX_CONF:-/etc/nginx/conf.d/capture.meetmind.online.conf}
DIR=${ECHO_VERIFY_DIR:-/var/www/echo-campus-verify}
HOST=${ECHO_VERIFY_HOST:-capture.meetmind.online}
ANCHOR='    location = /echo-campus { return 302 /echo-campus/; }'
BAK="$CONF.bak-$(date +%Y%m%d-%H%M%S)-verify"

fetch() { curl -sk --max-time 10 --resolve "$HOST:443:127.0.0.1" "https://$HOST/$NAME" -o "$1" -w '%{http_code}'; }
reload_or_restore() {
  if ! nginx -t 2>/tmp/place-verify-nginx-t.txt; then
    cat /tmp/place-verify-nginx-t.txt >&2
    command cp -f "$BAK" "$CONF"
    echo "nginx -t 没通过，配置已恢复，未重载" >&2
    exit 1
  fi
  systemctl reload nginx
}

if [[ $MODE == remove ]]; then
  grep -qF "location = /$NAME " "$CONF" || { echo "没有找到 /$NAME 的配置，什么都没改"; exit 0; }
  command cp -f "$CONF" "$BAK"
  NAME="$NAME" CONF="$CONF" python3 -c '
import os
p, name = os.environ["CONF"], os.environ["NAME"]
with open(p, encoding="utf-8", newline="") as f:
    lines = f.readlines()
with open(p, "w", encoding="utf-8", newline="") as f:
    f.writelines(l for l in lines if not l.lstrip().startswith("location = /%s " % name))
'
  reload_or_restore
  rm -f "$DIR/$NAME"
  echo "已撤掉 /$NAME（配置备份：$BAK），现在访问返回 $(fetch /dev/null)"
  exit 0
fi

[[ -f "$ARG" ]] || { echo "找不到文件：$ARG" >&2; exit 1; }
[[ $(stat -c %s "$ARG") -le 4096 ]] || { echo "文件超过 4KB，不像校验文件" >&2; exit 1; }
if [[ $MODE == check ]]; then DIR=$(mktemp -d); fi
mkdir -p "$DIR"
install -m 0644 "$ARG" "$DIR/$NAME"
command cp -f "$CONF" "$BAK"

if grep -qF "location = /$NAME " "$CONF"; then
  echo "/$NAME 已经配置过，只更新文件内容"
else
  grep -qxF "$ANCHOR" "$CONF" || { echo "配置里找不到 /echo-campus 的位置，未改动" >&2; rm -f "$BAK"; exit 1; }
  LINE="    location = /$NAME { root $DIR; default_type text/plain; access_log off; }" ANCHOR="$ANCHOR" CONF="$CONF" python3 -c '
import os
p, anchor, line = os.environ["CONF"], os.environ["ANCHOR"] + "\n", os.environ["LINE"] + "\n"
with open(p, encoding="utf-8", newline="") as f:
    s = f.read()
assert s.count(anchor) == 1
with open(p, "w", encoding="utf-8", newline="") as f:
    f.write(s.replace(anchor, line + anchor))
'
fi

if [[ $MODE == check ]]; then
  if nginx -t 2>/tmp/place-verify-nginx-t.txt; then RESULT="配置检查通过"; else cat /tmp/place-verify-nginx-t.txt >&2; RESULT="配置检查没通过"; fi
  command cp -f "$BAK" "$CONF"; rm -f "$BAK"; rm -rf "$DIR"
  echo "$RESULT；这是演练，配置已还原，nginx 没有重载"
  [[ $RESULT == 配置检查通过 ]]
  exit
fi

reload_or_restore
sleep 1
GOT=$(mktemp)
STATUS=$(fetch "$GOT")
if [[ $STATUS == 200 ]] && cmp -s "$GOT" "$DIR/$NAME"; then
  echo "已上线：https://$HOST/$NAME（200，内容与原文件一致；配置备份：$BAK）"
  rm -f "$GOT"
else
  echo "上线后核对失败：HTTP $STATUS，内容$(cmp -s "$GOT" "$DIR/$NAME" && echo 一致 || echo 不一致)（配置备份：$BAK）" >&2
  rm -f "$GOT"
  exit 1
fi
