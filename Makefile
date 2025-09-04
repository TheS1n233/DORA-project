# English comments only
.RECIPEPREFIX := >
SHELL := /bin/bash
.SHELLFLAGS := -eo pipefail -c

# Image tag for compose builds
TAG ?= dev

# Compose files without legacy dev.yml
BASE_COMPOSE := -f ops/compose/docker-compose.mqtt.yml -f ops/compose/docker-compose.hm.yml -f ops/compose/docker-compose.hs.yml
TV_COMPOSE   := $(BASE_COMPOSE) -f ops/compose/docker-compose.tv.yml

DC := docker compose

.PHONY: help
help:
> @echo "Targets:"
> @echo "  up-core                - start core deps (redis, mosquitto)"
> @echo "  up-core-build-tagged   - build hs/hm images (TAG?=dev) and start core deps"
> @echo "  up-apps                - start hs/hm services"
> @echo "  up-all                 - core + apps"
> @echo "  up-tv                  - start tv-svc"
> @echo "  wait-hs / wait-hm      - wait for hs/hm readiness"
> @echo "  wait-all               - wait both hs and hm"
> @echo "  ping-hs / ping-hm / ping-tv"
> @echo "  logs-hs / logs-hm / logs-tv"
> @echo "  ps, down, smoke"

.PHONY: up-core
up-core:
> docker network create dora-net >/dev/null 2>&1 || true
> $(DC) $(BASE_COMPOSE) up -d redis mosquitto
> @echo "[core] waiting mosquitto on 127.0.0.1:1883 ..."
> bash -lc 'for i in {1..20}; do (echo >/dev/tcp/127.0.0.1/1883) >/dev/null 2>&1 && { echo ok; break; } || sleep 1; done'

.PHONY: up-core-build-tagged
up-core-build-tagged:
> docker network create dora-net >/dev/null 2>&1 || true
> TAG=$(TAG) $(DC) $(BASE_COMPOSE) build home-safety-svc health-svc
> TAG=$(TAG) $(DC) $(BASE_COMPOSE) up -d redis mosquitto
> @echo "[core] waiting mosquitto on 127.0.0.1:1883 ..."
> bash -lc 'for i in {1..20}; do (echo >/dev/tcp/127.0.0.1/1883) >/dev/null 2>&1 && { echo ok; break; } || sleep 1; done'

.PHONY: up-apps
up-apps:
> TAG=$(TAG) $(DC) $(BASE_COMPOSE) up -d home-safety-svc health-svc

.PHONY: up-all
up-all: up-core up-apps

.PHONY: up-tv
up-tv:
> TAG=$(TAG) $(DC) $(TV_COMPOSE) build tv-svc
> TAG=$(TAG) $(DC) $(TV_COMPOSE) up -d tv-svc

.PHONY: down
down:
> ( $(DC) $(TV_COMPOSE) down -v ) || ( $(DC) $(BASE_COMPOSE) down -v ) || true

.PHONY: ps
ps:
> ( $(DC) $(TV_COMPOSE) ps ) || ( $(DC) $(BASE_COMPOSE) ps )

.PHONY: logs-hs
logs-hs:
> $(DC) $(BASE_COMPOSE) logs -f home-safety-svc

.PHONY: logs-hm
logs-hm:
> $(DC) $(BASE_COMPOSE) logs -f health-svc

.PHONY: logs-tv
logs-tv:
> $(DC) $(TV_COMPOSE) logs -f tv-svc

.PHONY: ping-hs
ping-hs:
> curl -s http://127.0.0.1:8000/ping && echo

.PHONY: ping-hm
ping-hm:
> curl -s http://127.0.0.1:8100/ping && echo

.PHONY: ping-tv
ping-tv:
> curl -s http://127.0.0.1:8200/ping && echo

.PHONY: wait-hs
wait-hs:
> bash scripts/wait-hs

.PHONY: wait-hm
wait-hm:
> bash scripts/wait-hm

.PHONY: wait-all
wait-all: wait-hs wait-hm

.PHONY: smoke
smoke:
> bash scripts/regression_smoke.sh

# === tele-assist-svc ===
wait-ta:
> @bash -lc 'for i in {1..60}; do curl -sf http://127.0.0.1:8300/health/ready >/dev/null && { echo ta-ready; exit 0; } || sleep 1; done; echo ta-timeout; exit 1'

up-ta:
> docker compose -f ops/compose/docker-compose.mqtt.yml -f ops/compose/docker-compose.tv.yml -f ops/compose/docker-compose.ta.yml up -d tele-assist-svc
> $(MAKE) wait-ta

build-ta:
> docker compose -f ops/compose/docker-compose.mqtt.yml -f ops/compose/docker-compose.tv.yml -f ops/compose/docker-compose.ta.yml build tele-assist-svc

logs-ta:
> docker compose -f ops/compose/docker-compose.mqtt.yml -f ops/compose/docker-compose.tv.yml -f ops/compose/docker-compose.ta.yml logs -f tele-assist-svc

# --- TV + Tele-Assist shortcuts ---
COMPOSE_TV_TA = -f ops/compose/docker-compose.mqtt.yml \
                -f ops/compose/docker-compose.tv.yml \
                -f ops/compose/docker-compose.ta.yml

up-tv-ta:
> docker compose $(COMPOSE_TV_TA) up -d tv-svc tele-assist-svc
> @echo "[wait] tv-svc on 8200 ..."
> @bash -lc 'for i in {1..40}; do curl -sf http://127.0.0.1:8200/ping >/dev/null && break || sleep 1; done'
> @echo "[wait] tele-assist-svc on 8300 ..."
> @bash -lc 'for i in {1..40}; do curl -sf http://127.0.0.1:8300/ping >/dev/null && break || sleep 1; done'
> @echo "TV/Console READY -> open:"
> @echo " - http://127.0.0.1:8200/static/index.html?room=demo"
> @echo " - http://127.0.0.1:8300/static/index.html?room=demo"

down-tv-ta:
> docker compose $(COMPOSE_TV_TA) down -v

logs-tv-ta:
> docker compose $(COMPOSE_TV_TA) logs -f tv-svc tele-assist-svc


.PHONY: open-tv open-ta

open-tv:
> @echo "Open: http://127.0.0.1:8200/static/index.html?room=demo"
> @python -c "import webbrowser,sys; url='http://127.0.0.1:8200/static/index.html?room=demo'; webbrowser.open(url) or True; print(url)"

open-ta:
> @echo "Open: http://127.0.0.1:8300/static/index.html?room=demo"
> @python -c "import webbrowser,sys; url='http://127.0.0.1:8300/static/index.html?room=demo'; webbrowser.open(url) or True; print(url)"
