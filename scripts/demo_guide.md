# ONLY FOR YUJIE MU USING
# DORA Home Safety — Demo Guide (Sprint 2)

本指南帮助你一键演示 Home Safety（HS1～HS5 + 电力占位）的最小闭环：事件 → 通知 → Redis 入库。默认本地运行，不要求 CI/HA。

---

## 1. 前置要求

- 已安装 Docker（可运行 `docker ps`）
- Python 3.11、已安装 `fastapi uvicorn redis paho-mqtt`
- 仓库根目录存在 `server/home-safety-svc/` 代码

---

## 2. 一键演示

```bash
bash scripts/demo_all.sh
