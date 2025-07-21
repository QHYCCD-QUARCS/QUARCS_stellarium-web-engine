const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 8080;

// 启用CORS
app.use(cors());

// 地理编码代理端点
app.get('/api/geocode/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: '缺少必要的lat和lng参数' });
    }
    
    // 多个地理编码服务
    const services = [
      {
        name: 'Nominatim',
        url: `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=zh,en`,
        headers: { 'User-Agent': 'QUARCS' }
      },
      {
        name: 'MapBox (如果有API密钥)',
        url: `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=YOUR_TOKEN&language=zh`,
        headers: {},
        disabled: true // 需要API密钥
      }
    ];
    
    for (const service of services) {
      if (service.disabled) continue;
      
      try {
        console.log(`尝试地理编码服务: ${service.name}`);
        
        const response = await fetch(service.url, {
          headers: service.headers,
          timeout: 8000
        });
        
        if (!response.ok) {
          console.log(`${service.name} HTTP ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        
        if (data && data.display_name) {
          console.log(`${service.name} 成功返回地址信息`);
          return res.json(data);
        }
      } catch (error) {
        console.log(`${service.name} 失败:`, error.message);
        continue;
      }
    }
    
    // 所有服务都失败
    res.status(503).json({ 
      error: '地理编码服务暂时不可用',
      message: '无法获取该位置的地址信息，请稍后重试'
    });
    
  } catch (error) {
    console.error('地理编码代理错误:', error);
    res.status(500).json({ 
      error: '服务器内部错误',
      message: error.message 
    });
  }
});

// 提供瓦片文件
app.get('/tiles/:z/:x/:y.png', (req, res) => {
  const { z, x, y } = req.params;
  const tilePath = path.join(__dirname, 'tiles', z, x, `${y}.png`);
  
  // 检查瓦片文件是否存在
  if (fs.existsSync(tilePath)) {
    res.sendFile(tilePath);
  } else {
    // 返回空白瓦片或默认瓦片
    const defaultTilePath = path.join(__dirname, 'default-tile.png');
    if (fs.existsSync(defaultTilePath)) {
      res.sendFile(defaultTilePath);
    } else {
      res.status(404).send('Tile not found');
    }
  }
});

// 提供瓦片元数据
app.get('/tiles/metadata', (req, res) => {
  const metadata = {
    name: 'Offline Map Tiles',
    description: 'Local map tiles for offline use',
    format: 'png',
    minzoom: 0,
    maxzoom: 18,
    bounds: [-180, -85, 180, 85]
  };
  res.json(metadata);
});

// 静态文件服务 - 瓦片
app.use('/tiles', express.static(path.join(__dirname, 'tiles')));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    services: ['tiles', 'geocoding'],
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`瓦片服务器运行在 http://localhost:${PORT}`);
  console.log('瓦片目录结构: tiles/z/x/y.png');
  console.log(`地理编码代理: http://localhost:${PORT}/api/geocode/reverse?lat=40&lng=116`);
}); 