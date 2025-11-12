# 离线地图瓦片系统

本系统提供了完整的离线地图解决方案，支持地图瓦片的下载、服务和集成到前端应用。

## 快速开始

### 1. 下载离线地图数据

```bash
cd tile-server
python3 download-tiles.py
```

选择预设区域或自定义区域进行下载。推荐区域：
- `beijing_small`: 北京小区域 (~260 MB)
- `china_full`: 中国全境 (~20 GB)
- `world_low`: 全球低分辨率 (~28 MB)

### 2. 构建包含离线地图的前端应用

```bash
cd apps/web-frontend
make build-with-tiles
```

这将：
- 检查瓦片数据是否存在
- 构建前端应用
- 自动将瓦片数据复制到 `dist/tiles/` 目录

### 3. 启动应用服务

```bash
cd apps/web-frontend
make start          # HTTP服务 (端口8080)
make start-https    # HTTPS服务 (端口9090)
```

## 系统架构

### 前端集成

前端应用在编译时会自动将离线地图数据复制到 `dist/tiles/` 目录。地图组件会：

1. **生产环境**: 优先使用静态瓦片文件 (`/tiles/{z}/{x}/{y}.png`)
2. **开发环境**: 优先使用tile服务器 (`http://localhost:8080/tiles/{z}/{x}/{y}.png`)
3. **降级处理**: 自动检测可用性并切换到合适的瓦片源

### 瓦片URL层级

```
生产环境优先级：
/tiles/{z}/{x}/{y}.png (静态文件)
↓
http://localhost:8080/tiles/{z}/{x}/{y}.png (tile服务器)

开发环境优先级：
http://localhost:8080/tiles/{z}/{x}/{y}.png (tile服务器)
↓
/tiles/{z}/{x}/{y}.png (静态文件)
↓
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png (在线服务)
```

## 文件结构

```
tile-server/
├── tiles/                     # 瓦片数据存储
│   ├── 0/                    # 缩放级别 0
│   │   └── 0/
│   │       └── 0.png
│   ├── 1/                    # 缩放级别 1
│   └── ...
├── download-tiles.py         # 瓦片下载脚本
├── server.js                 # Node.js瓦片服务器
├── retry-failed.py          # 失败重试脚本
└── README.md

apps/web-frontend/
├── dist/                     # 构建输出
│   ├── tiles/               # 编译时复制的瓦片数据
│   └── ...
├── vue.config.js            # 包含瓦片复制配置
└── Makefile                 # 包含 build-with-tiles 目标
```

## 高级配置

### 自定义瓦片源

在 `vue.config.js` 中可以配置不同的瓦片源：

```javascript
// 修改瓦片复制源
pathConfigs.unshift({
  from: '../../tile-server/tiles',  // 瓦片数据源
  to: to + '/tiles',               // 目标目录
  noErrorOnMissing: true
});
```

### 瓦片服务器配置

独立的瓦片服务器（用于开发环境）：

```bash
cd tile-server
npm install
node server.js  # 启动在端口8080
```

### 批量下载和重试

```bash
# 下载失败后重试
python3 retry-failed.py

# 查看下载统计
cat tiles/failed_tiles.txt
```

## 部署建议

### 生产环境部署

1. **静态文件部署**：
   ```bash
   make build-with-tiles
   # 将 dist/ 目录部署到 web 服务器
   ```

2. **检查瓦片完整性**：
   ```bash
   # 检查关键瓦片是否存在
   ls -la dist/tiles/0/0/0.png
   ls -la dist/tiles/1/0/0.png
   ```

3. **服务器配置**：
   ```nginx
   location /tiles/ {
       expires 30d;
       add_header Cache-Control "public, immutable";
       try_files $uri =404;
   }
   ```

### 开发环境

开发时可以同时运行：
- 前端开发服务器（热重载）
- 瓦片服务器（提供地图数据）

```bash
# 终端1: 启动瓦片服务器
cd tile-server && node server.js

# 终端2: 启动前端开发服务器
cd apps/web-frontend && make dev
```

## 故障排除

### 常见问题

1. **瓦片加载失败**：
   - 检查 `tiles/` 目录是否存在
   - 验证关键瓦片文件是否完整
   - 查看浏览器网络面板的404错误

2. **构建时瓦片复制失败**：
   - 确保 `tile-server/tiles/` 目录存在
   - 检查文件权限
   - 查看webpack构建日志

3. **地图显示空白**：
   - 打开浏览器开发者工具
   - 检查网络请求是否成功
   - 验证瓦片URL格式

### 调试模式

在浏览器控制台中可以看到瓦片加载的详细信息：

```
使用静态瓦片文件
tile服务器可用
切换到在线瓦片服务
```

## 瓦片数据管理

### 预估存储空间

| 区域 | 级别 | 预计大小 | 适用场景 |
|------|------|----------|----------|
| beijing_small | 0-12 | ~260 MB | 本地开发 |
| china_full | 0-10 | ~20 GB | 全国部署 |
| world_low | 0-6 | ~28 MB | 最小化部署 |
| world_medium | 0-8 | ~1.7 GB | 平衡方案 |

### 瓦片清理

```bash
# 清理下载的瓦片
rm -rf tile-server/tiles/

# 清理构建输出中的瓦片
rm -rf apps/web-frontend/dist/tiles/
```

## 性能优化

1. **瓦片压缩**：生产环境中可以对瓦片进行压缩
2. **CDN部署**：将瓦片数据部署到CDN以加速访问
3. **缓存策略**：配置合适的HTTP缓存头
4. **预加载**：预加载关键区域的瓦片数据

## 许可证

使用OpenStreetMap数据，遵循ODbL许可证。 