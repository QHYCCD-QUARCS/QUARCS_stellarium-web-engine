# 地图数据版权声明

## OpenStreetMap 数据许可

本项目使用的离线地图瓦片数据基于 **OpenStreetMap (OSM)** 数据。

### 📋 许可协议

OpenStreetMap 数据采用 **Open Database License (ODbL)** 许可证：

- **许可证全称**: Open Database License v1.0
- **官方链接**: https://opendatacommons.org/licenses/odbl/1-0/
- **中文说明**: https://wiki.openstreetmap.org/wiki/Zh:Open_Database_License

### ✅ 允许的使用

根据 ODbL 许可证，您可以：

1. **自由使用** - 可以用于任何目的，包括商业用途
2. **复制和分发** - 可以复制、分发地图数据
3. **修改和适配** - 可以修改数据以适应您的需求
4. **创建衍生作品** - 基于OSM数据创建新的地图或应用

### 📝 必须遵守的条件

使用OSM数据时必须：

1. **署名 (Attribution)**
   - 必须明确标明数据来源为OpenStreetMap
   - 必须包含版权声明："© OpenStreetMap contributors"
   - 必须提供ODbL许可证链接

2. **相同许可 (Share-Alike)**
   - 如果您分发基于OSM的数据库，必须采用相同的ODbL许可
   - 必须提供数据获取方式

3. **开放数据 (Keep Open)**
   - 如果您改进了OSM数据，建议回馈给OSM社区

### 🔧 本项目的合规实践

#### 前端页面署名
在您的地图组件中已正确添加版权声明：
```html
<l-tile-layer 
  :url="url" 
  attribution='&copy; <a target="_blank" rel="noopener" href="http://osm.org/copyright">OpenStreetMap</a> contributors'>
</l-tile-layer>
```

#### 瓦片服务器来源
瓦片数据来源于：
- 主要来源：`https://tile.openstreetmap.de`
- 备用来源：`https://tile.openstreetmap.org`

#### 建议的完整署名
在您的应用中应包含：
```
地图数据 © OpenStreetMap contributors, CC-BY-SA
瓦片渲染基于 OpenStreetMap 数据
许可证：Open Database License (ODbL)
```

### 🌐 相关链接

- **OpenStreetMap 官网**: https://www.openstreetmap.org/
- **版权页面**: https://www.openstreetmap.org/copyright
- **ODbL 许可证**: https://opendatacommons.org/licenses/odbl/1-0/
- **使用条款**: https://wiki.osmfoundation.org/wiki/Terms_of_Use
- **瓦片使用政策**: https://operations.osmfoundation.org/policies/tiles/

### ⚖️ 法律建议

1. **商业使用**: 可以用于商业项目，但必须保持署名
2. **分发限制**: 分发大量瓦片数据时需要遵守ODbL条款
3. **API限制**: 请遵守OpenStreetMap瓦片服务器的使用限制
4. **本地部署**: 建议大规模应用时使用本地瓦片服务器

### 📊 使用统计和限制

#### 瓦片服务器使用限制
- **请求频率**: 不超过每秒2个请求
- **并发限制**: 避免并行下载超过2个连接
- **User-Agent**: 必须包含有意义的应用标识
- **缓存**: 建议缓存瓦片以减少服务器负载

#### 数据更新
- OSM数据持续更新
- 建议定期更新本地瓦片数据
- 可以通过API获取最新数据变更

---

**注意**: 本文档仅为使用指导，具体法律要求请参考官方许可证文本。 