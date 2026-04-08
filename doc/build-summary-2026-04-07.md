# QUARCS_stellarium-web-engine 编译与运行排查总结

日期：2026-04-07

环境：

- 主机类型：虚拟机
- 系统：Ubuntu 24.04
- 工作区：`/home/q/workspace_origin/QUARCS_stellarium-web-engine`
- 参考工作区：`/home/q/workspace/QUARCS_stellarium-web-engine`

## 本次目标

本次工作的目标是：

1. 在当前工作区成功编译 `QUARCS_stellarium-web-engine`
2. 成功构建 `apps/web-frontend` 前端产物
3. 启动本地服务并验证页面可访问
4. 排查“页面能打开，但恒星等星表对象不显示”的问题

## 最终结果

已经完成以下事项：

- 成功生成引擎产物：
  - `build/stellarium-web-engine.js`
  - `build/stellarium-web-engine.wasm`
- 成功生成前端产物：
  - `apps/web-frontend/dist/`
- 成功启动本地服务：
  - `http://127.0.0.1:8080`
- 成功修复运行时缺失星表数据的问题：
  - 恒星
  - 深空天体
  - skyculture 相关数据
  - 其它依赖 `skydata` 的对象数据

## 本次实际使用的关键工具

- `scons`
- `emscripten 3.1.6`
- `node`
- `npm`
- `python3`
- `flask`

## 本次遇到的两个阶段性问题

### 问题 1：当前工作区没有带上上次 Ubuntu 24.04 的构建兼容修复

现象：

- 当前仓库中的 `SConstruct` 仍是原始写法
- 直接参考旧工作区比对后，发现缺少多项适配新版 Emscripten 的修复

根因：

- 当前工作区是另一份代码拷贝
- 之前在 `~/workspace` 中为 Ubuntu 24.04 / Emscripten 3.1.6 做过的兼容改动，没有同步到 `~/workspace_origin`

处理方式：

- 对照旧工作区的已验证版本，补回以下修改：
  - `SConstruct`
  - `src/modules/comets.c`
  - 根目录 `Makefile`

主要修复包括：

- 将 Emscripten 的编译参数和链接参数拆分
- 增加 `SUPPORT_LONGJMP=emscripten`
- 增加：
  - `-Wno-error=deprecated-non-prototype`
  - `-Wno-error=unused-but-set-variable`
- 修正：
  - `-DGLES2 1` -> `-DGLES2=1`
- 为根目录增加一键构建入口：
  - `make build-all`

结果：

- `make build-all` 可以成功通过引擎编译与前端构建

### 问题 2：页面能打开，但只有大气、月亮、大行星等，恒星和深空对象不显示

现象：

- 浏览器可以正常打开 `http://127.0.0.1:8080`
- 页面基础框架正常
- 但运行效果不完整
- 用户观察到：
  - 大气渲染正常
  - 月亮正常
  - 大行星正常
  - 恒星等对象缺失

这类现象非常像前端运行时缺少 `skydata` 数据目录，而不是引擎本身没有编译成功。

## 排查过程

### 1. 对比旧工作区与当前工作区

首先检查旧工作区与当前工作区中前端代码差异，重点关注：

- `apps/web-frontend/src/App.vue`
- `apps/web-frontend/vue.config.js`
- `apps/test-skydata/`

发现：

- 当前工作区前端运行时仍会请求：
  - `/skydata/stars`
  - `/skydata/stars_base`
  - `/skydata/stars_extend`
  - `/skydata/dso`
  - `/skydata/skycultures/...`
  - `/skydata/CometEls.txt`
  - `/skydata/mpcorb.dat`
- 但当前构建出来的 `apps/web-frontend/dist/` 中最初并没有 `skydata/`

### 2. 对实际 HTTP 请求进行验证

直接验证当前服务中的关键路径：

```text
http://127.0.0.1:8080/skydata/stars
http://127.0.0.1:8080/skydata/skycultures/western/index.json
http://127.0.0.1:8080/skydata/dso
```

结果：

- 都返回 `404`

这就说明问题不是“恒星模块没有初始化”，而是前端请求的数据文件根本没有被服务提供出来。

### 3. 检查旧工作区的成功状态

继续检查旧工作区已经成功运行时的 `dist/skydata`，发现其中确实存在：

- `dist/skydata/stars/properties`
- `dist/skydata/stars_base/properties`
- `dist/skydata/stars_extend/properties`
- `dist/skydata/skycultures/index.json`
- `dist/skydata/dso/properties`
- `dist/skydata/CometEls.txt`
- `dist/skydata/mpcorb.dat`

而当前工作区最初的 `dist/skydata` 是空的。

至此可以确认：

- 旧工作区之所以显示正常，是因为当时构建产物里已经包含了 `skydata`
- 当前工作区不显示恒星等，是因为新的 `dist/` 没有把 `apps/test-skydata` 复制进去

## 根因总结

本次“只有大气、月亮、大行星可见，但恒星等不显示”的直接根因是：

- 前端运行时代码会请求 `/skydata/...`
- 当前构建默认没有把 `apps/test-skydata` 复制到 `apps/web-frontend/dist/skydata`
- 因此这些资源路径在运行时失效
- 页面虽然能打开，但大量依赖星表/深空数据的模块无法正常加载

## 本次修复内容

### 修复 1：让构建默认复制 `skydata`

修改文件：

- `Makefile`

修改内容：

- 将前端构建命令从普通构建改为默认带上：

```bash
SWE_COPY_SKYDATA=1
```

即：

```bash
cd $(FRONTEND_DIR) && env PATH="$(LOCAL_NODE_PATH)" NODE_OPTIONS="$(WEBPACK_NODE_OPTIONS)" SWE_COPY_SKYDATA=1 npm run build
```

效果：

- 执行根目录 `make frontend-build`
- 或执行根目录 `make build-all`
- 会自动把 `apps/test-skydata` 复制到：
  - `apps/web-frontend/dist/skydata`

### 修复 2：恢复开发服务对 `/skydata` 的挂载

修改文件：

- `apps/web-frontend/vue.config.js`

修改内容：

- 恢复 `express` 引入
- 在 `devServer.before(app)` 中挂载：

```js
app.use('/skydata', express.static(skydataPath));
```

同时补回：

- `embeddedBuild`
- `publicPath`
- `copySkydata` 的默认推导逻辑

效果：

- 在开发服务模式下也能正确提供 `/skydata`
- 与旧工作区的可运行状态保持一致

### 修复 3：重建后重启 Flask 服务

这一步也很重要。

在前端重新构建时，`vue-cli build` 会重新生成 `dist/`。如果 Flask 服务是在旧的 `dist` 目录上启动的，那么即使新的 `dist/skydata` 已经生成，旧进程仍然可能停留在已经被删除的旧目录句柄上，继续报：

```text
[Errno 2] No such file or directory
```

因此在生成新的 `dist/skydata` 后，需要重启服务。

## 修复后的验证结果

### 1. `dist/skydata` 已生成

验证到以下文件存在：

- `apps/web-frontend/dist/skydata/stars/properties`
- `apps/web-frontend/dist/skydata/stars_base/properties`
- `apps/web-frontend/dist/skydata/stars_extend/properties`
- `apps/web-frontend/dist/skydata/skycultures/index.json`
- `apps/web-frontend/dist/skydata/dso/properties`
- `apps/web-frontend/dist/skydata/CometEls.txt`
- `apps/web-frontend/dist/skydata/mpcorb.dat`

并且：

- `dist/skydata` 总体积约 `567M`

### 2. 本地 HTTP 验证通过

重启服务后，以下路径返回 `200 OK`：

- `http://127.0.0.1:8080/`
- `http://127.0.0.1:8080/skydata/stars/properties`
- `http://127.0.0.1:8080/skydata/skycultures/index.json`
- `http://127.0.0.1:8080/skydata/dso/properties`

### 3. 页面效果验证通过

用户实际访问后确认：

- 恒星等显示已经恢复正常

## 本次修改的文件

本次为了完成构建并修复运行问题，修改了以下文件：

- `SConstruct`
- `Makefile`
- `src/modules/comets.c`
- `apps/web-frontend/vue.config.js`

此外构建过程中生成或更新了以下内容：

- `build/stellarium-web-engine.js`
- `build/stellarium-web-engine.wasm`
- `apps/web-frontend/dist/*`
- `apps/web-frontend/package-lock.json`
- `apps/web-frontend/yarn.lock`

## 可复用命令

### 一键构建

在仓库根目录执行：

```bash
cd /home/q/workspace_origin/QUARCS_stellarium-web-engine
make build-all
```

### 仅重新构建前端并自动带上 skydata

```bash
cd /home/q/workspace_origin/QUARCS_stellarium-web-engine
make frontend-build
```

### 启动服务

```bash
cd /home/q/workspace_origin/QUARCS_stellarium-web-engine/apps/web-frontend
make start
```

### 手动验证关键资源

```bash
curl -I http://127.0.0.1:8080/
curl -I http://127.0.0.1:8080/skydata/stars/properties
curl -I http://127.0.0.1:8080/skydata/skycultures/index.json
curl -I http://127.0.0.1:8080/skydata/dso/properties
```

## 后续建议

建议后续保留当前行为，不要再把默认构建改回“不复制 skydata”的状态，否则很容易再次出现：

- 页面可打开
- 但恒星、深空对象、部分 survey/skyculture 数据缺失

如果后续需要进一步压缩产物体积，可以单独讨论：

1. 是否按运行场景拆分 `skydata`
2. 是否改为服务端挂载而不是构建时复制
3. 是否区分“开发构建”和“发布构建”的数据策略
