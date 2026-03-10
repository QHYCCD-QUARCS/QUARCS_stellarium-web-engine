# Stellarium Web frontend

This directory contains the Graphical User Interface for using
Stellarium Web Engine in a web page.

This is a Vuejs project, which can generate a fully static webpage with webpack.

Official page: [stellarium-web.org](https://stellarium-web.org)

## Build setup using Docker
Make sure docker is installed, then:

``` bash
# generate the docker image and build engine WASM/js files
make setup

# and build and run the web GUI (go to http://localhost:8080 on your machine)
make dev

# Optionally, compile a production version of the site with minification
make build

# and finally to host it on a test server (http://localhost:8000)
make start
```

Note that before you build the web GUI the first time, the JS version of
the engine also needs to be built by running make setup, you can then update
the engine at any time by running

``` bash
make update-engine
```

For a detailed explanation on how things work, check out the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).

## Cursor MCP（Model Context Protocol）: E2E 动态测试工具

本项目提供一个 **stdio MCP server**，把现有的 Playwright 确定性 E2E（flows/specs）封装成 Cursor 可调用的 tools。

### 1) 安装依赖

在 `apps/web-frontend/` 下：

```bash
npm install
```

### 2) 启动 MCP server（stdio）

```bash
npm run mcp:e2e
```

### 3) 在 Cursor 中配置 MCP server

#### 方法一：直接编辑配置文件（推荐）

编辑 `~/.cursor/mcp.json` 文件，添加以下配置：

```json
{
  "mcpServers": {
    "quarcs-web-frontend-e2e": {
      "command": "node",
      "args": [
        "/home/quarcs/workspace/QUARCS/QUARCS_stellarium-web-engine/apps/web-frontend/scripts/mcp-e2e-server.mjs"
      ],
      "env": {
        "E2E_BASE_URL": "http://127.0.0.1:8080",
        "QUARCS_TOTAL_VERSION": "",
        "QUARCS_WORKSPACE_DIR": "/home/quarcs/workspace/QUARCS"
      }
    }
  }
}
```

#### 方法二：通过 Cursor UI 配置

在 Cursor：
- Settings → Features → MCP → **Add New MCP Server**
- Type 选 **stdio**
- Command 填：`node`
- Args 填：`/home/quarcs/workspace/QUARCS/QUARCS_stellarium-web-engine/apps/web-frontend/scripts/mcp-e2e-server.mjs`
- Environment（可选）：
  - `E2E_BASE_URL`（默认 `http://127.0.0.1:8080`）
  - `QUARCS_TOTAL_VERSION`（当前版本号，格式: x.y.z）
  - `QUARCS_WORKSPACE_DIR`（QUARCS 工作目录）

> 注意：该 MCP tool **不会自动启动**前端 dev server；你需要先把 web-frontend 跑起来，或把 `E2E_BASE_URL` 指向一个可访问的地址。

> 注意：自动化测试和更新流程工具已集成到 E2E 测试 MCP 服务器中，无需单独配置。如果需要，也可以通过环境变量设置：
> - `QUARCS_TOTAL_VERSION`（可选，当前版本号，格式: x.y.z）
> - `QUARCS_WORKSPACE_DIR`（可选，QUARCS 工作目录，默认自动检测）

### 4) 可用工具（tools）

#### E2E 测试相关工具

- `e2e_search_testids`: 在 `docs/e2e/E2E_TEST_IDS_INDEX.json` 中搜索 `data-testid`
- `e2e_get_testid_info`: 精确查询某个 `data-testid` 的元信息
- `e2e_qhyccd_sdk_capture`: 确定性流程（QHYCCD SDK 连接 -> 拍摄一次 -> 保存/下载）
- `e2e_run_flow`: 运行可组合确定性 flow（steps 列表 + params）
- `web_screenshot`: 网页截图（PNG）

#### 自动化测试和更新流程工具

这些工具已集成到 `quarcs-web-frontend-e2e` MCP 服务器中，无需额外配置。

- `quarcs_auto_test_and_update`: 运行完整的自动化测试和更新流程
  - 执行 E2E 测试
  - 生成新版本号（或使用指定版本号）
  - 创建更新包
  - 上传更新包到服务器
  - 验证版本号是否正确更新
  - 参数：
    - `skipTest` (boolean, 可选): 是否跳过 E2E 测试
    - `skipUpload` (boolean, 可选): 是否跳过上传步骤
    - `version` (string, 可选): 指定版本号（格式: x.y.z），不指定则自动递增
    - `workspaceDir` (string, 可选): 工作目录，默认使用 QUARCS 根目录
    - `timeoutSec` (number, 可选): 整体超时秒数，默认 3600

- `quarcs_get_version`: 获取 QUARCS 当前版本号
  - 从环境变量 `QUARCS_TOTAL_VERSION` 或 `.quarcs_version` 文件读取
  - 参数：
    - `workspaceDir` (string, 可选): 工作目录，默认使用 QUARCS 根目录

> 注意：这些工具需要 `autoTestAndUpdate.sh` 脚本位于 QUARCS 根目录。环境变量 `QUARCS_TOTAL_VERSION` 可用于指定当前版本号。


