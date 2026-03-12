# Stellarium Web - Copyright (c) 2019 - Noctua Software Ltd
#
# This program is licensed under the terms of the GNU AGPL v3, or
# alternatively under a commercial licence.
#
# The terms of the AGPL v3 license can be found in the main directory of this
# repository.

.PHONY: setup build dev start start-https i18n lint gen-cert gen-es6 gen-es6-debug gen-es6-prof update-engine update-engine-debug build-with-tiles e2e-test001-sequential

# ---- Force bash (needed for "source" and nvm) ----
SHELL := /bin/bash
HOST_HOME := $(shell if [ "$$(id -u)" -eq 0 ] && [ -n "$$SUDO_USER" ]; then getent passwd "$$SUDO_USER" | cut -d: -f6; else printf '%s\n' "$$HOME"; fi)

# ---- Host Node pinning (for any host-side yarn/npm execution) ----
# If build is executed on host (not in docker), we must avoid /usr/bin/node (v12).
NVM_DIR ?= $(HOST_HOME)/.nvm
NODE_VER ?= 20

define WITH_NVM
export HOME="$(HOST_HOME)"; \
export NVM_DIR="$(NVM_DIR)"; \
source "$(NVM_DIR)/nvm.sh" >/dev/null 2>&1 || { \
	echo "ERROR: nvm not found at $(NVM_DIR)."; \
	echo "       Please install nvm or set NVM_DIR correctly."; \
	exit 2; \
}; \
nvm use $(NODE_VER) >/dev/null || { \
	echo "ERROR: Node $(NODE_VER) is not installed in nvm."; \
	echo "       Run: nvm install $(NODE_VER)"; \
	exit 2; \
}; \
export NODE_OPTIONS="--openssl-legacy-provider $${NODE_OPTIONS:-}"; \
node -v >/dev/null
endef

gen-es6:
	cd ../.. && docker run -it -p 8000:8000 -v "$(PWD)/../..:/app" swe-dev /bin/bash -c "source /emsdk/emsdk_env.sh && make js-es6"

gen-es6-debug:
	cd ../.. && docker run -it -p 8000:8000 -v "$(PWD)/../..:/app" swe-dev /bin/bash -c "source /emsdk/emsdk_env.sh && make js-es6-debug"

gen-es6-prof:
	cd ../.. && docker run -it -p 8000:8000 -v "$(PWD)/../..:/app"  swe-dev /bin/bash -c "source /emsdk/emsdk_env.sh && make js-es6-prof"

update-engine:
	make gen-es6
	cp ../../build/stellarium-web-engine.js src/assets/js/
	cp ../../build/stellarium-web-engine.wasm src/assets/js/

update-engine-debug:
	make gen-es6-debug
	cp ../../build/stellarium-web-engine.js src/assets/js/
	cp ../../build/stellarium-web-engine.wasm src/assets/js/

USER_UID := $(shell id -u)
USER_GID := $(shell id -g)

DOCKER_MOUNTS := -v "$(PWD):/app" -v "$(PWD)/../test-skydata:/skydata" $(EXTRA_DOCKER_MOUNTS)

setup: Dockerfile Dockerfile.jsbuild
	make gen-cert
	# Build docker image for compilation with emscripten
	docker build -f Dockerfile.jsbuild -t swe-dev . # --no-cache
	make update-engine
	# Build docker image for webpack/node development
	docker build -t stellarium-web-dev --build-arg USER_UID=${USER_UID} --build-arg USER_GID=${USER_GID} .
	docker run -it $(DOCKER_MOUNTS) stellarium-web-dev npm install
	pip3 install flask

dev:
	docker run -it -p 8080:8080 -p 8888:8888 $(DOCKER_MOUNTS) \
		-e NODE_OPTIONS=--openssl-legacy-provider \
		-e HTTPS=true \
		-e SSL_CRT_FILE=/app/certs/server.crt \
		-e SSL_KEY_FILE=/app/certs/server.key \
		stellarium-web-dev npm run dev

lint:
	docker run -it -p 8080:8080 -p 8888:8888 $(DOCKER_MOUNTS) stellarium-web-dev npm run lint

# test001 依次测试：每项先跑 1 次，通过再跑 2 次（共 3 次）；失败记录到 test-results/*.report.txt
e2e-test001-sequential:
	$(WITH_NVM) && npm run e2e:test001:sequential

build:
	docker run -it $(DOCKER_MOUNTS) -e NODE_OPTIONS=--openssl-legacy-provider stellarium-web-dev npm run build

build-with-tiles:
	@echo "检查离线地图瓦片数据..."
	@echo "开始构建包含离线地图的版本..."
	@echo "提示：瓦片数据约 8.7 万文件，全量复制会非常慢。"
	@echo "可通过设置 TILES_MODE=copy 复制到 dist/tiles；设置 TILES_MODE=symlink 用软链接加速。"
	@set -e; \
	TILES_SRC="$${TILES_SRC_DIR:-}"; \
	SKYDATA_SRC="$${SKYDATA_SRC_DIR:-}"; \
	if [ -z "$$TILES_SRC" ]; then \
		for candidate in "$$(readlink -f "$(CURDIR)/tile-server/tiles" 2>/dev/null || true)" "$$(readlink -f "$(CURDIR)/../../tile-server/tiles" 2>/dev/null || true)" "$$(readlink -f "$(CURDIR)/../tile-server/tiles" 2>/dev/null || true)" "$$(readlink -f tile-server/tiles 2>/dev/null || true)" "$$(readlink -f ../../tile-server/tiles 2>/dev/null || true)" "$$(readlink -f ../tile-server/tiles 2>/dev/null || true)"; do \
			if [ -n "$$candidate" ] && [ -d "$$candidate" ]; then \
				TILES_SRC="$$candidate"; \
				break; \
			fi; \
		done; \
	fi; \
	if [ -z "$$SKYDATA_SRC" ]; then \
		for candidate in "$$(readlink -f "$(CURDIR)/../test-skydata" 2>/dev/null || true)" "$$(readlink -f "$(CURDIR)/../../test-skydata" 2>/dev/null || true)" "$$(readlink -f "$(CURDIR)/test-skydata" 2>/dev/null || true)" "$$(readlink -f ../test-skydata 2>/dev/null || true)" "$$(readlink -f ../../test-skydata 2>/dev/null || true)" "$$(readlink -f test-skydata 2>/dev/null || true)"; do \
			if [ -n "$$candidate" ] && [ -d "$$candidate" ]; then \
				SKYDATA_SRC="$$candidate"; \
				break; \
			fi; \
		done; \
	fi; \
	if [ -z "$$TILES_SRC" ] || [ ! -d "$$TILES_SRC" ]; then \
		echo "错误: 离线地图瓦片数据不存在。"; \
		echo "请设置 TILES_SRC_DIR=/absolute/path/to/tiles，或把 tiles 放到以下任一路径："; \
		echo "  - ../../tile-server/tiles"; \
		echo "  - ../tile-server/tiles"; \
		echo "  - ./tile-server/tiles"; \
		exit 1; \
	fi; \
	echo "[tiles] source=$$TILES_SRC"; \
	if [ "$${SWE_COPY_SKYDATA:-0}" = "1" ]; then \
		if [ -z "$$SKYDATA_SRC" ] || [ ! -d "$$SKYDATA_SRC" ]; then \
			echo "错误: 星图数据目录不存在。"; \
			echo "请设置 SKYDATA_SRC_DIR=/absolute/path/to/test-skydata，或提供 ../test-skydata"; \
			exit 1; \
		fi; \
		echo "[skydata] source=$$SKYDATA_SRC"; \
		echo "[skydata] mode=copy (webpack 构建阶段复制到 dist/skydata)"; \
	else \
		echo "[skydata] mode=skip"; \
	fi; \
	if [ -e dist ] && [ ! -w dist ]; then \
		echo "错误: dist 目录当前不可写，无法清理旧构建产物。"; \
		ls -ld dist; \
		echo "如果之前用 sudo/root 构建过，请先修复权限，例如：sudo chown -R $$(id -un):$$(id -gn) dist"; \
		exit 1; \
	fi; \
	TILES_MODE=$${TILES_MODE:-copy}; \
	if [ "$$TILES_MODE" = "copy" ]; then \
		echo "[tiles] mode=copy (webpack 构建阶段复制到 dist/tiles)"; \
		export TILES_SRC_DIR="$$TILES_SRC" SKYDATA_SRC_DIR="$$SKYDATA_SRC" SWE_TILES_MODE=copy; \
		$(WITH_NVM); \
		npm run build; \
	else \
		echo "[tiles] mode=symlink (构建后建立 dist/tiles -> $$TILES_SRC)"; \
		export TILES_SRC_DIR="$$TILES_SRC" SKYDATA_SRC_DIR="$$SKYDATA_SRC" SWE_TILES_MODE=none; \
		$(WITH_NVM); \
		npm run build; \
		mkdir -p dist; \
		rm -rf dist/tiles; \
		ln -sfn "$$TILES_SRC" dist/tiles; \
	fi
	@echo "构建完成，开始校验 dist/tiles..."
	@echo "瓦片文件验证:"
	@if [ -f dist/tiles/0/0/0.png ]; then \
		ls -la dist/tiles/0/0/0.png; \
		echo "✅ 基础瓦片文件存在"; \
	else \
		echo "❌ 基础瓦片文件缺失: dist/tiles/0/0/0.png"; \
	fi
	@if [ "$${SWE_COPY_SKYDATA:-0}" = "1" ]; then \
		echo "星图数据验证:"; \
		ls -ld dist/skydata 2>/dev/null && echo "✅ dist/skydata 已存在" || echo "❌ dist/skydata 缺失"; \
	fi
	@echo "可以运行 'make start' 或 'make start-https' 来启动服务"

start:
	cd dist && python3 ../server.py 8080

start-https:
	cd dist && python3 ../server.py 9090

start-all:
	make start & make start-https

i18n:
	python3 ./tools/update-i18n-en.py

# 生成自签名证书
gen-cert:
	mkdir -p certs
	openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
		-keyout certs/server.key -out certs/server.crt \
		-subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"
