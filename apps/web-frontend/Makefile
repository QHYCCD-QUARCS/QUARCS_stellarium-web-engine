# Stellarium Web - Copyright (c) 2019 - Noctua Software Ltd
#
# This program is licensed under the terms of the GNU AGPL v3, or
# alternatively under a commercial licence.
#
# The terms of the AGPL v3 license can be found in the main directory of this
# repository.

.PHONY: setup build dev start start-https i18n lint gen-cert gen-es6 gen-es6-debug gen-es6-prof update-engine update-engine-debug build-with-tiles

# ---- Force bash (needed for "source" and nvm) ----
SHELL := /bin/bash

# ---- Host Node pinning (for any host-side yarn/npm execution) ----
# If build is executed on host (not in docker), we must avoid /usr/bin/node (v12).
NVM_DIR ?= $(HOME)/.nvm
NODE_VER ?= 20

define WITH_NVM
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
		-e HTTPS=true \
		-e SSL_CRT_FILE=/app/certs/server.crt \
		-e SSL_KEY_FILE=/app/certs/server.key \
		stellarium-web-dev npm run dev

lint:
	docker run -it -p 8080:8080 -p 8888:8888 $(DOCKER_MOUNTS) stellarium-web-dev npm run lint

build:
	docker run -it $(DOCKER_MOUNTS) stellarium-web-dev npm run build

build-with-tiles:
	@echo "检查离线地图瓦片数据..."
	@echo "开始构建包含离线地图的版本..."
	@echo "提示：瓦片数据约 8.7 万文件，全量复制会非常慢。"
	@echo "可通过设置 TILES_MODE=symlink（默认）用软链接加速；设置 TILES_MODE=copy 生成自包含产物（慢）。"
	@set -e; \
	TILES_SRC="$${TILES_SRC_DIR:-}"; \
	if [ -z "$$TILES_SRC" ]; then \
		for candidate in "$$(readlink -f ../../tile-server/tiles 2>/dev/null || true)" "$$(readlink -f ../tile-server/tiles 2>/dev/null || true)" "$$(readlink -f tile-server/tiles 2>/dev/null || true)"; do \
			if [ -n "$$candidate" ] && [ -d "$$candidate" ]; then \
				TILES_SRC="$$candidate"; \
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
	TILES_MODE=$${TILES_MODE:-symlink}; \
	if [ "$$TILES_MODE" = "copy" ]; then \
		echo "[tiles] mode=copy (webpack 构建阶段复制到 dist/tiles)"; \
		TILES_SRC_DIR="$$TILES_SRC" SWE_TILES_MODE=copy $(WITH_NVM) && npm run build; \
	else \
		echo "[tiles] mode=symlink (构建后建立 dist/tiles -> $$TILES_SRC)"; \
		TILES_SRC_DIR="$$TILES_SRC" SWE_TILES_MODE=none $(WITH_NVM) && npm run build; \
		mkdir -p dist; \
		rm -rf dist/tiles; \
		ln -sfn "$$TILES_SRC" dist/tiles; \
	fi
	@echo "构建完成！dist/tiles 已就绪（copy 或 symlink）"
	@echo "瓦片文件验证:"
	@ls -la dist/tiles/0/0/0.png 2>/dev/null && echo "✅ 基础瓦片文件存在" || echo "❌ 基础瓦片文件缺失"
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
