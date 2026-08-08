# 部署与 CI/CD（2026-08-08 起）

## 事实源

- 代码唯一事实源：GitHub `main`（xiaojinyu868-w/Meetmind_world）；服务器上的权威 checkout 是 `/root/meetmind_go`
- 线上 = `main`：所有改动合并进 `main` 后自动上线，不允许"线上跑旧代码"

## CI：GitHub Actions（`.github/workflows/ci.yml`）

每次 push / PR 到 `main` 自动执行：

- `backend`：Python 3.11 + `pip install -r backend/requirements.txt` +
  `PHYSICAL_AI_PACKAGE_SCHEMA="" python -m pytest tests/ -q`（全量后端测试）
- `frontend`：Node 22 + `npm ci` + `npm run build`（生产构建必须过）

红灯 = 不要合并；合并即视为可上线。

## CD：服务器自动巡检（`scripts/deploy.sh` + cron）

生产服务器上 cron 每分钟执行一次：

```
* * * * * flock -n /tmp/echoworld-deploy.lock /root/meetmind_go/scripts/deploy.sh >> /var/log/echoworld-deploy.log 2>&1
```

`scripts/deploy.sh` 的行为（幂等）：

1. `git fetch`，HEAD 与 `origin/main` 一致则退出（日志 `up-to-date`）
2. `git pull --ff-only`（非 fast-forward 会失败并留日志，需人工处理）
3. `pip install -r backend/requirements.txt`（新依赖自动补）
4. `npm install && npm run build`
5. 重启后端 uvicorn（`ECHO_DATA_DIR=<repo>/backend/data（部署脚本自动取自身所在 checkout）`，:8000）
6. 健康检查通过后 `dist/` 同步到 `/var/www/echoworld`

日志：`/var/log/echoworld-deploy.log`（每次巡检）、`/var/log/echoworld-uvicorn.log`（后端运行）。

手动操作：

```bash
scripts/deploy.sh            # 有更新才部署
scripts/deploy.sh --force    # 强制重部署当前 HEAD（如配置变更后）
```

## 注意

- `.env` 不进仓库、不受 CD 影响；改 `.env` 后用 `--force` 触发重启生效
- CD 不做 git 写操作；工作区必须保持干净（有未提交改动时 `pull` 会失败，日志可见）
- 后端重启有约 2–4 秒世界状态真空（内存房间状态重建），属预期
