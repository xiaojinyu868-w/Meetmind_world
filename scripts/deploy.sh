#!/usr/bin/env bash
# EchoWorld 部署脚本（CD）：main 有更新 → 拉取 → 依赖 → 构建 → 重启后端 → 同步 dist。
#
# 触发方式：服务器 cron 每分钟巡检（见 docs/DEPLOYMENT.md），也可手动执行：
#   scripts/deploy.sh            # 有更新才部署
#   scripts/deploy.sh --force    # 强制重部署当前 HEAD
#
# CI（.github/workflows/ci.yml）已在同一 commit 上跑过全量测试，这里不重复跑。
set -euo pipefail

# cron 默认 PATH 只有 /usr/bin:/bin，ss/kill 等网络诊断工具在 /usr/sbin；
# 补全 sbin，否则重启段检测不到 :8000 旧进程（PID 永远为空，旧进程杀不掉）。
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
BACKEND="$REPO/backend"
DATA_DIR=${ECHO_DATA_DIR:-$BACKEND/data}
UVICORN_LOG=/var/log/echoworld-uvicorn.log
DEPLOYED_MARKER=/var/lib/echoworld-deployed-commit

cd "$REPO"
git fetch origin main --quiet
REMOTE=$(git rev-parse origin/main)
# 注意：不能比较 HEAD==REMOTE——在本机 push 的场景下二者恒等，但运行中的
# 后端还是旧代码。以「上次实际部署的 commit」为准：HEAD 或 REMOTE 超前即部署。
DEPLOYED=$(cat "$DEPLOYED_MARKER" 2>/dev/null || echo "")
if [ "$DEPLOYED" = "$REMOTE" ] && [ "$DEPLOYED" = "$(git rev-parse HEAD)" ] && [ "${1:-}" != "--force" ]; then
  if ss -ltn 2>/dev/null | grep -q ':8000'; then
    echo "[deploy] up-to-date: $(git rev-parse --short HEAD)"
    exit 0
  fi
  # 进程级自愈：仓库没变但后端死了（机器重启等）也要拉起——否则 cron 每分钟
  # 报 up-to-date 而服务永远 502（2026-08-31 服务器重启后实测踩中）。
  echo "[deploy] up-to-date 但 :8000 无监听，直接拉起后端"
  cd "$BACKEND"
  ECHO_DATA_DIR="$DATA_DIR" nohup .venv/bin/uvicorn app.main:app \
    --host 127.0.0.1 --port 8000 >> "$UVICORN_LOG" 2>&1 &
  sleep 4
  curl -fsS http://127.0.0.1:8000/api/health > /dev/null
  echo "[deploy] backend revived: pid $(ss -ltnp 2>/dev/null | grep ':8000' | grep -oP 'pid=\K[0-9]+' | head -1)"
  exit 0
fi

echo "[deploy] deployed=$DEPLOYED -> $REMOTE"
git pull --ff-only origin main

"$BACKEND/.venv/bin/pip" install -q -r "$BACKEND/requirements.txt"

npm install --no-audit --no-fund --quiet
npm run build

PID=$(ss -ltnp 2>/dev/null | grep ':8000' | grep -oP 'pid=\K[0-9]+' | head -1 || true)
if [ -n "${PID:-}" ]; then
  kill "$PID" || true
  # 等旧进程真正退出（最多 10s），否则新进程 bind 失败而健康检查仍命中旧进程
  for _ in $(seq 1 10); do
    kill -0 "$PID" 2>/dev/null || break
    sleep 1
  done
  kill -9 "$PID" 2>/dev/null || true
  sleep 1
fi
cd "$BACKEND"
ECHO_DATA_DIR="$DATA_DIR" nohup .venv/bin/uvicorn app.main:app \
  --host 127.0.0.1 --port 8000 >> "$UVICORN_LOG" 2>&1 &
sleep 4
curl -fsS http://127.0.0.1:8000/api/health > /dev/null

# 重启盲区防护（2026-08-25）：健康检查可能命中尚未退出的旧进程，必须确认
# :8000 的监听者确为本次启动的新进程（pid 已更换且进程年龄在本轮部署内），
# 否则不写 marker、非零退出，让下次 cron 重试而不是永久报 up-to-date。
LISTENER_PID=$(ss -ltnp 2>/dev/null | grep ':8000' | grep -oP 'pid=\K[0-9]+' | head -1 || true)
if [ -z "${LISTENER_PID:-}" ]; then
  echo "[deploy] ERROR: :8000 无监听进程，新后端未启动（见 $UVICORN_LOG）" >&2
  exit 1
fi
if [ "$LISTENER_PID" = "${PID:-}" ]; then
  echo "[deploy] ERROR: :8000 仍被旧进程 $LISTENER_PID 占用，新进程未接管" >&2
  exit 1
fi
LISTENER_AGE=$(ps -o etimes= -p "$LISTENER_PID" 2>/dev/null | tr -d ' ' || echo "")
if [ -z "${LISTENER_AGE:-}" ] || [ "$LISTENER_AGE" -gt 300 ]; then
  echo "[deploy] ERROR: :8000 监听进程 $LISTENER_PID 已运行 ${LISTENER_AGE:-?}s，非本次部署启动" >&2
  exit 1
fi
echo "[deploy] backend restarted: pid $LISTENER_PID (age ${LISTENER_AGE}s)"

rm -rf /var/www/echoworld
cp -a "$REPO/dist" /var/www/echoworld

git rev-parse HEAD > "$DEPLOYED_MARKER"
echo "[deploy] deployed: $(git rev-parse --short HEAD)"
