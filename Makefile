
-include src/private/Makefile

ROOT_DIR := $(CURDIR)
FRONTEND_DIR := $(ROOT_DIR)/apps/web-frontend
FRONTEND_ENGINE_DIR := $(FRONTEND_DIR)/src/assets/js
LOCAL_NODE_PATH := /usr/bin:$(PATH)
WEBPACK_NODE_OPTIONS := --openssl-legacy-provider

.PHONY: check-local-deps
check-local-deps:
	@command -v emcc >/dev/null || { echo "Missing dependency: emcc"; exit 1; }
	@command -v scons >/dev/null || { echo "Missing dependency: scons"; exit 1; }
	@command -v python3 >/dev/null || { echo "Missing dependency: python3"; exit 1; }
	@python3 -c "import flask" >/dev/null 2>&1 || { echo "Missing dependency: python3-flask"; exit 1; }
	@PATH="$(LOCAL_NODE_PATH)" command -v node >/dev/null || { echo "Missing dependency: /usr/bin/node"; exit 1; }
	@PATH="$(LOCAL_NODE_PATH)" command -v npm >/dev/null || { echo "Missing dependency: /usr/bin/npm"; exit 1; }

.PHONY: js
js:
	emscons scons -j8 mode=release

.PHONY: js-debug
js-debug:
	emscons scons -j8 mode=debug

.PHONY: js-prof
js-prof:
	emscons scons -j8 mode=profile

.PHONY: js-es6
js-es6:
	emscons scons -j8 mode=release es6=1
  
.PHONY: js-es6-debug
js-es6-debug:
	emscons scons -j8 mode=debug es6=1

.PHONY: js-es6-prof
js-es6-prof:
	emscons scons -j8 mode=profile es6=1

# Make the doc using natualdocs.  On debian, we only have an old version
# of naturaldocs available, where it is not possible to exclude files by
# pattern.  I don't want to parse the C files (only the headers), so for
# the moment I use a tmp file to copy the sources and remove the C files.
# It's a bit ugly.
.PHONY: doc
doc:
	rm -rf /tmp/swe_src
	cp -rf src /tmp/swe_src
	./build/stellarium-web-engine --gen-doc > /tmp/swe_src/generated-doc.h
	find /tmp/swe_src -name '*.c' | xargs rm
	mkdir -p build/doc/ndconfig
	naturaldocs -nag -i /tmp/swe_src -o html doc -p build/doc/ndconfig

clean:
	scons -c

.PHONY: frontend-sync-engine
frontend-sync-engine: js
	cp $(ROOT_DIR)/build/stellarium-web-engine.js $(FRONTEND_ENGINE_DIR)/
	cp $(ROOT_DIR)/build/stellarium-web-engine.wasm $(FRONTEND_ENGINE_DIR)/

.PHONY: frontend-install
frontend-install:
	cd $(FRONTEND_DIR) && env PATH="$(LOCAL_NODE_PATH)" bash -lc 'npm ci || npm install'

.PHONY: frontend-build
frontend-build: frontend-sync-engine frontend-install
	cd $(FRONTEND_DIR) && env PATH="$(LOCAL_NODE_PATH)" NODE_OPTIONS="$(WEBPACK_NODE_OPTIONS)" SWE_COPY_SKYDATA=1 npm run build

.PHONY: build-all
build-all: check-local-deps frontend-build
	@echo "Build complete: $(FRONTEND_DIR)/dist"

.PHONY: start-web
start-web:
	cd $(FRONTEND_DIR) && make start

.PHONY: clean-all
clean-all: clean
	rm -rf $(FRONTEND_DIR)/dist
	rm -rf $(FRONTEND_DIR)/node_modules
	@echo "Clean complete."
