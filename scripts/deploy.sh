#!/usr/bin/env bash
# EchoWorld 部署脚本（CD）：main 有更新 → 拉取 → 依赖 → 构建 → 重启后端 → 同步 dist。
#
# 触发方式：服务器 cron 每分钟巡检（见 docs/DEPLOYMENT.md），也可手动执行：
#   scripts/deploy.sh            # 有更新才部署
#   scripts/deploy.sh --force    # 强制重部署当前 HEAD
#
# CI（.github/workflows/ci.yml）已在同一 commit 上跑过全量测试，这里不重复跑。
set -euo pipefail

REPO=/root/meetmind_wt_main
BACKEND="$REPO/backend"
DATA_DIR=${ECHO_DATA_DIR:-/root/meetmind_go/backend/data}
UVICORN_LOG=/var/log/echoworld-uvicorn.log

cd "$REPO"
git fetch origin main --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" = "$REMOTE" ] && [ "${1:-}" != "--force" ]; then
  echo "[deploy] up-to-date: $(git rev-parse --short HEAD)"
  exit 0
fi

echo "[deploy] $LOCAL -> $REMOTE"
git pull --ff-only origin main

"$BACKEND/.venv/bin/pip" install -q -r "$BACKEND/requirements.txt"

npm install --no-audit --no-fund --quiet
npm run build

PID=$(ss -ltnp 2>/dev/null | grep ':8000' | grep -oP 'pid=\K[0-9]+' | head -1 || true)
if [ -n "${PID:-}" ]; then
  kill "$PID" || true
  sleep 2
fi
cd "$BACKEND"
ECHO_DATA_DIR="$DATA_DIR" nohup .venv/bin/uvicorn app.main:app \
  --host 127.0.0.1 --port 8000 >> "$UVICORN_LOG" 2>&1 &
sleep 4
curl -fsS http://127.0.0.1:8000/api/health > /dev/null

rm -rf /var/www/echoworld
cp -a "$REPO/dist" /var/www/echoworld

echo "[deploy] deployed: $(git rev-parse --short HEAD)"
