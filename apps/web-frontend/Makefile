# Stellarium Web - Copyright (c) 2019 - Noctua Software Ltd
#
# This program is licensed under the terms of the GNU AGPL v3, or
# alternatively under a commercial licence.
#
# The terms of the AGPL v3 license can be found in the main directory of this
# repository.

.PHONY: setup build dev start start-https i18n

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
	docker run -it $(DOCKER_MOUNTS) stellarium-web-dev yarn install
	pip3 install flask

dev:
	docker run -it -p 8080:8080 -p 8888:8888 $(DOCKER_MOUNTS) \
		-e HTTPS=true \
		-e SSL_CRT_FILE=/app/certs/server.crt \
		-e SSL_KEY_FILE=/app/certs/server.key \
		stellarium-web-dev yarn run dev

lint:
	docker run -it -p 8080:8080 -p 8888:8888 $(DOCKER_MOUNTS) stellarium-web-dev yarn run lint

build:
	docker run -it $(DOCKER_MOUNTS) stellarium-web-dev yarn run build

build-with-tiles:
	@echo "检查离线地图瓦片数据..."
	@if [ ! -d "../../tile-server/tiles" ]; then \
		echo "错误: 离线地图瓦片数据不存在，请先运行下载脚本"; \
		echo "cd ../../tile-server && python3 download-tiles.py"; \
		exit 1; \
	fi
	@echo "开始构建包含离线地图的版本..."
	npm run build
	@echo "构建完成！瓦片数据已复制到 dist/tiles/"
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
