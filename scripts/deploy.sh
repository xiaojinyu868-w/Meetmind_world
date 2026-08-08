#!/usr/bin/env bash
# EchoWorld 部署脚本（CD）：main 有更新 → 拉取 → 依赖 → 构建 → 重启后端 → 同步 dist。
#
# 触发方式：服务器 cron 每分钟巡检（见 docs/DEPLOYMENT.md），也可手动执行：
#   scripts/deploy.sh            # 有更新才部署
#   scripts/deploy.sh --force    # 强制重部署当前 HEAD
#
# CI（.github/workflows/ci.yml）已在同一 commit 上跑过全量测试，这里不重复跑。
set -euo pipefail

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
  echo "[deploy] up-to-date: $(git rev-parse --short HEAD)"
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
  sleep 2
fi
cd "$BACKEND"
ECHO_DATA_DIR="$DATA_DIR" nohup .venv/bin/uvicorn app.main:app \
  --host 127.0.0.1 --port 8000 >> "$UVICORN_LOG" 2>&1 &
sleep 4
curl -fsS http://127.0.0.1:8000/api/health > /dev/null

rm -rf /var/www/echoworld
cp -a "$REPO/dist" /var/www/echoworld

git rev-parse HEAD > "$DEPLOYED_MARKER"
echo "[deploy] deployed: $(git rev-parse --short HEAD)"
