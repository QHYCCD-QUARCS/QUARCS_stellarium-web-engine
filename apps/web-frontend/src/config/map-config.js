/**
 * 地图配置文件
 * 用于控制地图的行为和限制
 */

export const MapConfig = {
  // 缩放级别配置
  zoom: {
    // 离线瓦片的可用级别范围
    offline: {
      min: 0,      // 最小缩放级别
      max: 6,      // 最大缩放级别
      default: 3   // 默认缩放级别
    },
    
    // 在线瓦片的级别范围（开发环境使用）
    online: {
      min: 0,
      max: 18,
      default: 10
    },
    
    // 严格模式：是否严格限制在可用瓦片范围内
    strictMode: true
  },
  
  // 瓦片检测配置
  detection: {
    // 检测超时时间（毫秒）
    timeout: 3000,
    
    // 要测试的缩放级别
    testLevels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    
    // 是否启用自动检测
    autoDetect: true
  },
  
  // 用户体验配置
  ux: {
    // 是否显示缩放级别信息
    showZoomInfo: false,
    
    // 是否在达到缩放限制时显示提示
    showZoomLimitWarning: true,
    
    // 缩放限制提示消息
    zoomLimitMessages: {
      minReached: '已达到最小缩放级别',
      maxReached: '已达到最大缩放级别，离线瓦片数据不支持更高精度'
    }
  }
}

export default MapConfig 