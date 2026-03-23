// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

/*
位置管理器组件 - 信号槽接口说明

主要方法：
1. updateMapPosition(lat, lng, options) - 通用位置更新方法
   参数：
   - lat: 纬度 (number)
   - lng: 经度 (number) 
   - options: 配置选项 (object)
     - updateMarker: 是否更新地图钉 (boolean, 默认true)
     - fetchAddress: 是否获取地址信息 (boolean, 默认true)
     - zoom: 缩放级别 (number, 可选)
     - animate: 是否使用动画 (boolean, 默认true)
     - accuracy: 位置精度 (number, 默认0)

便捷方法：
2. flyToPosition(lat, lng, zoom) - 动画跳转到位置
3. setPosition(lat, lng, zoom) - 直接设置位置（无动画）
4. centerMapAt(lat, lng, zoom, animate) - 仅移动地图中心
5. updateToKnownLocation(locationObj, animate) - 通过位置对象更新

事件：
- mapPositionUpdated: 位置更新完成时触发
- addressInfoUpdated: 地址信息获取完成时触发  
- addressInfoError: 地址信息获取失败时触发

使用示例：
// 在父组件中
this.$refs.locationManager.flyToPosition(39.9042, 116.4074, 15)
this.$refs.locationManager.setPosition(40.7128, -74.0060)
this.$refs.locationManager.centerMapAt(51.5074, -0.1278, 12, false)

// 监听事件
<location-mgr 
  @mapPositionUpdated="onPositionUpdated"
  @addressInfoUpdated="onAddressUpdated"
  @addressInfoError="onAddressError"
  ref="locationManager">
</location-mgr>


<template>
  <div data-testid="ui-location-mgr-root">
    <v-row justify="space-around">
      <v-col cols="4" v-if="doShowMyLocation">
        <v-list two-line subheader>
          <v-subheader>{{ $t('My Locations') }}</v-subheader>
          <v-list-item href="javascript:;" v-for="item in knownLocations" v-bind:key="item.id" @click.native.stop="selectKnownLocation(item)" :style="(item && knownLocationMode && selectedKnownLocation && item.id === selectedKnownLocation.id) ? 'background-color: #455a64' : ''" data-testid="ui-components-location-mgr-act-select-known-location">
            <v-list-item-icon>
              <v-icon>mdi-map-marker</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>{{ item.short_name }}</v-list-item-title>
              <v-list-item-subtitle>{{ item.country }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-col>
      <v-col cols="doShowMyLocation ? 8 : 12" >
        <v-card class="blue-grey darken-2 white--text">
          <v-card-title primary-title>
            <v-container fluid>
              <v-row>
                <!-- 左侧位置信息区域 -->
                <v-col>
                  <div>
                    <div class="text-h5" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                      {{ locationForDetail ? locationForDetail.short_name + ', ' + locationForDetail.country : $t('locationMgr.selectLocation') }}
                      <v-progress-circular v-if="geoCodeLoading" indeterminate size="16" width="2" color="orange" style="margin-left: 8px;"></v-progress-circular>
                    </div>
                    <div class="grey--text text-subtitle-2" v-if="locationForDetail && locationForDetail.street_address">{{ locationForDetail.street_address }}</div>
                    <div class="grey--text text-subtitle-2">
                      {{ hasValidSelection ? locationForDetail.lat.toFixed(5) + ' ' + locationForDetail.lng.toFixed(5) : $t('locationMgr.dragToSelect') }}
                      <span v-if="geoCodeLoading" style="color: #ff9800; margin-left: 8px;">{{ $t('locationMgr.fetchingAddress') }}</span>
                    </div>
                  </div>
                </v-col>
                
                <!-- 右侧控制区域 -->
                <v-col cols="auto" style="min-width: 200px;">
                  <div class="d-flex flex-column" style="gap: 8px;">
                    <!-- 地图模式切换（上部）- 状态图标与开关在同一水平线 -->
                    <div class="d-flex align-center justify-space-between" style="width: 100%; min-height: 32px;">
                      <div class="d-flex align-center" style="gap: 6px; line-height: 1;">
                        <v-icon :color="getMapStatusColor()" size="16">{{ getMapStatusIcon() }}</v-icon>
                        <span class="text-caption" :style="`color: ${getMapStatusColor()}; line-height: 1;`">{{ getMapStatusText() }}</span>
                      </div>
                      <div class="d-flex align-center">
                        <v-switch
                          v-model="useOnlineMap"
                          @change="onMapTypeToggle"
                          dense
                          hide-details
                          color="primary"
                          class="mt-0 pt-0"
                          style="margin-left: 12px;"
                         data-testid="ui-location-mgr-switch-on-map-type-toggle">
                          <template v-slot:label>
                            <span class="text-caption" style="line-height: 1;">{{ $t('locationMgr.onlineMap') }}</span>
                          </template>
                        </v-switch>
                      </div>
                    </div>
                    <!-- 使用此位置按钮（下部） -->
                    <div>
                      <v-btn 
                        @click.native.stop="useLocation()" 
                        :disabled="!hasValidSelection"
                        color="primary"
                        small
                        style="width: 100%;"
                      >
                        <v-icon small>mdi-chevron-right</v-icon>
                        {{ $t('Use this location') }}
                      </v-btn>
                    </div>
                  </div>
                </v-col>
              </v-row>
            </v-container>
          </v-card-title>
          <div style="height: 375px">
            <l-map class="black--text" ref="myMap" :center="mapCenter" :zoom="defaultZoom" style="width: 100%; height: 375px;" :options="{zoomControl: false, minZoom: effectiveMinZoom, maxZoom: effectiveMaxZoom, worldCopyJump: true}">
              <l-control-zoom position="topright"></l-control-zoom>
              <l-tile-layer :url="url" attribution='&copy; <a target="_blank" rel="noopener" href="http://osm.org/copyright">OpenStreetMap</a> contributors'></l-tile-layer>
              <l-marker :key="loc.id || 'marker-' + index"
                  v-for="(loc, index) in validKnownLocations"
                  :lat-lng="[ loc.lat, loc.lng ]"
                  :clickable="true"
                  :opacity="(!pickLocationMode && selectedKnownLocation && selectedKnownLocation === loc ? 1.0 : 0.25)"
                  @click="selectKnownLocation(loc)"
                  :draggable="!pickLocationMode && selectedKnownLocation && selectedKnownLocation === loc" 
                  @dragend="dragEnd"
                >
                  <l-tooltip>
                    <div class="black--text">
                      <strong>{{ loc.short_name }}</strong><br>
                      <span v-if="loc.city && loc.city !== $t('locationMgr.unknownCity')">{{ loc.city }}<span v-if="loc.state">, {{ loc.state }}</span><br></span>
                      {{ loc.country }}<br>
                      {{ $t('locationMgr.coordinates') }}: {{ loc.lat.toFixed(4) }}, {{ loc.lng.toFixed(4) }}<br>
                      <small style="color: #666;">
                        <span v-if="!pickLocationMode && selectedKnownLocation && selectedKnownLocation === loc">{{ $t('locationMgr.dragToMove') }}</span>
                        <span v-else>{{ $t('locationMgr.clickToSelect') }}</span>
                      </small>
                    </div>
                  </l-tooltip>
                </l-marker>
              <l-circle v-if="startLocation && isValidLocation(startLocation)"
                :lat-lng="[ startLocation.lat, startLocation.lng ]"
                :radius="startLocation.accuracy || 100"
                :options="{
                  strokeColor: '#0000FF',
                  strokeOpacity: 0.5,
                  strokeWeight: 1,
                  fillColor: '#0000FF',
                  fillOpacity: 0.08}"></l-circle>
              <l-marker v-if="shouldShowPickLocation" 
                :lat-lng="[ pickLocation.lat, pickLocation.lng ]"
                :draggable="true" 
                @dragend="dragEnd">
                <l-tooltip>
                  <div class="black--text">
                    <strong>{{ pickLocation.short_name }}</strong><br>
                    <span v-if="pickLocation.city && pickLocation.city !== $t('locationMgr.unknownCity')">{{ pickLocation.city }}<span v-if="pickLocation.state">, {{ pickLocation.state }}</span><br></span>
                    <span v-if="pickLocation.country && pickLocation.country !== $t('locationMgr.unknown')">{{ pickLocation.country }}<br></span>
                    {{ $t('locationMgr.coordinates') }}: {{ pickLocation.lat.toFixed(4) }}, {{ pickLocation.lng.toFixed(4) }}<br>
                    <small style="color: #666;">{{ $t('locationMgr.dragToAdjust') }}</small>
                  </div>
                </l-tooltip>
              </l-marker>
            </l-map>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import swh from '@/assets/sw_helpers.js'
import { LMap, LTileLayer, LMarker, LCircle, LTooltip, LControlZoom } from 'vue2-leaflet'
import L from 'leaflet'
import MapConfig from '@/config/map-config.js'

export default {
  data: function () {
    return {
      mode: 'pick',
      pickLocation: undefined,
      selectedKnownLocation: undefined,
      mapCenter: [39.9042, 116.4074],
      url: process.env.NODE_ENV === 'production' ? '/tiles/{z}/{x}/{y}.png' : 'http://localhost:8080/tiles/{z}/{x}/{y}.png',
      fallbackUrl: '/tiles/{z}/{x}/{y}.png',
      serverUrl: 'http://localhost:8080/tiles/{z}/{x}/{y}.png',
      onlineUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      // 使用配置文件中的缩放级别设置
      minZoom: MapConfig.zoom.offline.min,
      maxZoom: MapConfig.zoom.offline.max,
      defaultZoom: MapConfig.zoom.offline.default,
      // 地理编码加载状态
      geoCodeLoading: false,
      // 地图类型和网络状态
      useOnlineMap: true,              // 使用在线地图（用户选择）
      isOnlineMapAvailable: false,     // 在线地图是否可用
      isNetworkConnected: false,       // 网络是否连通
      currentMapType: 'checking',      // 当前地图类型: 'online', 'offline', 'checking'
      networkCheckInterval: null,      // 网络检测定时器
      // 请求控制
      currentRequestId: 0,
      abortController: null
    }
  },
  props: ['showMyLocation', 'knownLocations', 'startLocation', 'realLocation'],
  computed: {
    doShowMyLocation: function () {
      return this.showMyLocation === undefined ? false : this.showMyLocation
    },
    pickLocationMode: function () {
      return this.mode === 'pick'
    },
    knownLocationMode: function () {
      return this.mode === 'known'
    },
    locationForDetail: function () {
      let location = null
      
      if (this.pickLocationMode && this.pickLocation === undefined) {
        location = this.startLocation
      } else {
        location = this.pickLocationMode ? this.pickLocation : this.selectedKnownLocation
      }
      
      // 如果有有效位置就清理并返回
      if (location && this.isValidLocation(location)) {
        const sanitized = this.sanitizeLocation(location)
        if (sanitized) {
          return sanitized
        }
      }
      
      // 返回默认信息用于显示，但不会影响地图钉
      return {
        lat: 39.9042,
        lng: 116.4074,
        accuracy: 1000,
        short_name: this.$t('locationMgr.beijing'),
        country: this.$t('locationMgr.china'),
        street_address: this.$t('locationMgr.beijingCity'),
        city: this.$t('locationMgr.beijingCity'),
        state: this.$t('locationMgr.beijingCity'),
        postcode: ''
      }
    },
    // 动态缩放级别配置
    effectiveMinZoom: function () {
      // 在线地图使用更宽松的限制，离线地图使用严格限制
      if (this.currentMapType === 'online') {
        return MapConfig.zoom.online.min  // 在线地图：通常是0或1
      } else {
        return MapConfig.zoom.offline.min  // 离线地图：基于可用瓦片
      }
    },
    effectiveMaxZoom: function () {
      // 在线地图使用更宽松的限制，离线地图使用严格限制
      if (this.currentMapType === 'online') {
        return MapConfig.zoom.online.max  // 在线地图：通常是18或19
      } else {
        return MapConfig.zoom.offline.max  // 离线地图：基于可用瓦片
      }
    },
    validKnownLocations: function () {
      if (!this.knownLocations || !Array.isArray(this.knownLocations) || this.knownLocations.length === 0) {
        // 如果没有传入任何已知位置，不显示默认地图钉
        return []
      }
      
      const validLocations = this.knownLocations.filter(this.isValidLocation)
      return validLocations
    },
    // 控制pickLocation地图钉是否显示
    shouldShowPickLocation: function () {
      // 在pickLocationMode且有有效pickLocation时显示（包括默认位置）
      return this.pickLocationMode && 
             this.pickLocation && 
             this.isValidLocation(this.pickLocation)
    },
    hasValidSelection: function () {
      // 检查是否有真正的位置选择
      if (this.selectedKnownLocation) {
        return true // 选择了已知位置
      }
      
      if (this.pickLocation && this.isValidLocation(this.pickLocation)) {
        // 如果地址信息显示"拖拽选择位置"或"默认位置"，说明用户还没有操作
        if (this.pickLocation.short_name === this.$t('locationMgr.dragToSelectPin') || 
            this.pickLocation.country === this.$t('locationMgr.defaultLocation')) {
          return false
        }
        return true
      }
      
      return false
    }
  },
  watch: {
    startLocation: function (newLocation) {
      if (this.isValidLocation(newLocation)) {
        this.setPickLocation(newLocation)
      } else {
        console.warn('Invalid startLocation received:', newLocation)
      }
    }
  },
  created() {
    this.$bus.$on('updateMapPosition', this.updateMapPosition);
  },
  mounted: function () {
    const that = this
    
    // 修复Leaflet图标问题
    this.fixLeafletIcons()
    
    // 只有在传入有效startLocation时才设置pickLocation
    if (this.startLocation && this.isValidLocation(this.startLocation)) {
      this.setPickLocation(this.startLocation)
    } else {
      // 如果没有startLocation，创建一个默认的pickLocation在地图中心
      this.pickLocation = {
        lat: 39.9042,
        lng: 116.4074,
        accuracy: 0,
        short_name: this.$t('locationMgr.dragToSelectPin'),
        country: this.$t('locationMgr.defaultLocation'),
        street_address: this.$t('locationMgr.dragPinToTarget')
      }
      this.setPickLocationMode()
    }
    
    // 启动网络监控
    this.startNetworkMonitoring()
    
    // 检测并设置地图类型
    this.detectAndSetMapType()
    
    this.$nextTick(() => {
      const map = this.$refs.myMap.mapObject
      map._onResize()

      // 设置缩放限制
      this.updateZoomLimits(map)
    })
  },
  beforeDestroy: function () {
    // 清理定时器
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval)
    }
    
    // 清理请求控制器
    if (this.abortController) {
      this.abortController.abort()
      console.log('组件销毁，取消地理编码请求')
    }
    
    // 移除网络状态监听器
    window.removeEventListener('online', this.detectAndSetMapType)
    window.removeEventListener('offline', this.detectAndSetMapType)
  },
  methods: {
    selectKnownLocation: function (loc) {
      this.selectedKnownLocation = loc
      this.setKnownLocationMode()
      this.mapCenter = [loc.lat, loc.lng]
    },
    useLocation: function () {
      console.log('触发位置更新useLocation:', this.locationForDetail.lat, this.locationForDetail.lng)
      this.$bus.$emit('locationSelected', this.locationForDetail)
      const lat = parseFloat(this.locationForDetail.lat.toFixed(3))
      const lng = parseFloat(this.locationForDetail.lng.toFixed(3))
      this.$bus.$emit('resetLocation', lat, lng,false)
    },
    setPickLocationMode: function () {
      this.mode = 'pick'
    },
    setKnownLocationMode: function () {
      this.mode = 'known'
    },
    setPickLocation: function (loc) {
      // 验证输入数据
      if (!this.isValidLocation(loc)) {
        console.warn('Invalid location data received:', loc)
        // 不创建默认位置，直接返回
        return
      }
      
      // 清理数据
      const sanitizedLoc = this.sanitizeLocation(loc)
      
      if (sanitizedLoc.accuracy < 100) {
        for (const l of this.knownLocations) {
          if (this.isValidLocation(l)) {
            const d = swh.getDistanceFromLatLonInM(l.lat, l.lng, sanitizedLoc.lat, sanitizedLoc.lng)
            if (d < 100) {
              this.selectKnownLocation(l)
              return
            }
          }
        }
      }
      
      // 设置有效的位置
      this.mapCenter = [sanitizedLoc.lat, sanitizedLoc.lng]
      this.pickLocation = sanitizedLoc
      this.setPickLocationMode()
    },
    // Called when the user clicks on the small cross button
    centerOnRealPosition: function () {
      this.setPickLocation(this.realLocation)
    },
    
    // 通过信号槽更新地图显示位置
    updateMapPosition: function (lat, lng, options = {}) {
      console.log('收到位置更新信号:', lat, lng, options)
      
      // 验证输入参数（经度允许超界，后续归一化）
      if (typeof lat !== 'number' || typeof lng !== 'number' || 
          isNaN(lat) || isNaN(lng) || 
          lat < -90 || lat > 90) {
        console.error('无效的位置坐标:', { lat, lng })
        return false
      }

      // 经度标准化，处理环世界拖拽
      const normLng = this.normalizeLongitude(lng)
      
      // 默认选项
      const defaultOptions = {
        updateMarker: true,        // 是否更新地图钉位置
        fetchAddress: true,        // 是否获取地址信息
        zoom: null,               // 可选的缩放级别
        animate: true,            // 是否使用动画
        accuracy: 0               // 位置精度
      }
      
      const config = Object.assign({}, defaultOptions, options)
      
      try {
        // 更新地图中心
        if (config.animate && this.$refs.myMap && this.$refs.myMap.mapObject) {
          // 使用动画平滑移动
          const map = this.$refs.myMap.mapObject
          const targetZoom = config.zoom || map.getZoom()
          map.flyTo([lat, normLng], targetZoom, {
            duration: 1.5,  // 动画时长（秒）
            easeLinearity: 0.1
          })
        } else {
          // 直接设置地图中心
          this.mapCenter = [lat, normLng]
          
          // 如果指定了缩放级别，设置缩放
          if (config.zoom && this.$refs.myMap && this.$refs.myMap.mapObject) {
            this.$nextTick(() => {
              this.$refs.myMap.mapObject.setZoom(config.zoom)
            })
          }
        }
        
        // 更新地图钉位置
        if (config.updateMarker) {
          const newLocation = {
            lat: lat,
            lng: normLng,
            accuracy: config.accuracy,
            short_name: config.fetchAddress ? this.$t('locationMgr.fetchingLocationInfo') : this.$t('locationMgr.newLocation'),
            country: config.fetchAddress ? this.$t('locationMgr.pleaseWait') : this.$t('locationMgr.unknown'),
            street_address: `${this.$t('locationMgr.coordinates')}: ${lat.toFixed(6)}, ${normLng.toFixed(6)}`
          }
          
          // 根据当前模式更新位置
          if (this.pickLocationMode) {
            this.pickLocation = newLocation
            this.setPickLocationMode()
          } else {
            // 创建新的拾取位置
            this.pickLocation = newLocation
            this.setPickLocationMode()
          }
          
          // 获取地址信息
          if (config.fetchAddress) {
            this.requestLocationInfo(lat, normLng)
          }
        }
        
        // 触发位置更新事件
        this.$emit('mapPositionUpdated', { lat, lng: normLng, options: config })
        
        console.log('地图位置更新成功:', { lat, lng, config })
        return true
        
      } catch (error) {
        console.error('地图位置更新失败:', error)
        return false
      }
    },
    
    // 辅助方法：请求位置信息
    requestLocationInfo: function (lat, lng) {
      // 生成新的请求ID
      const requestId = ++this.currentRequestId
      
      // 延迟获取地理信息，避免频繁请求
      setTimeout(() => {
        // 检查是否是最新的请求
        if (requestId !== this.currentRequestId) {
          console.log('位置信息请求已过期，跳过地理编码')
          return
        }
        
        // 获取地理信息（在线或离线）
        this.getCityInfo({ lat, lng }, requestId).then(cityInfo => {
          // 再次检查请求是否仍然有效
          if (requestId !== this.currentRequestId) {
            console.log('地理编码完成，但请求已过期')
            return
          }
          
          const updatedPos = {
            lat: lat,
            lng: lng,
            accuracy: this.pickLocation?.accuracy || 0,
            ...cityInfo
          }
          
          // 更新位置信息
          if (this.pickLocationMode && this.pickLocation) {
            Object.assign(this.pickLocation, updatedPos)
            this.$forceUpdate()
          }
          
          console.log('位置信息已更新:', updatedPos)
          
          // 触发地址信息更新事件
          this.$emit('addressInfoUpdated', updatedPos)
          
        }).catch(error => {
          // 检查是否是请求取消错误
          if (error.name === 'AbortError') {
            console.log('地理编码请求被取消')
            return
          }
          
          // 再次检查请求是否仍然有效
          if (requestId !== this.currentRequestId) {
            console.log('地理编码失败，但请求已过期')
            return
          }
          
          console.error('获取位置信息失败:', error)
          
          // 错误处理
          const errorLocationInfo = {
            lat: lat,
            lng: lng,
            accuracy: this.pickLocation?.accuracy || 0,
            short_name: this.$t('locationMgr.fetchLocationFailed'),
            country: this.$t('locationMgr.unknownRegion'),
            street_address: `${this.$t('locationMgr.coordinates')}: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
          }
          
          if (this.pickLocationMode && this.pickLocation) {
            Object.assign(this.pickLocation, errorLocationInfo)
            this.$forceUpdate()
          }
          
          // 触发错误事件
          this.$emit('addressInfoError', { lat, lng, error: error.message })
        })
      }, 100) // 100ms延迟
    },
    checkTileAvailability: function () {
      const that = this
      
      // 在生产环境下优先使用静态瓦片
      if (process.env.NODE_ENV === 'production') {
        that.testStaticTiles().then(isAvailable => {
          if (isAvailable) {
            console.log('使用静态瓦片文件')
            that.url = that.fallbackUrl
          } else {
            console.log('静态瓦片不可用，尝试tile服务器')
            that.testTileServer()
          }
        })
      } else {
        // 开发环境下优先尝试tile服务器
        that.testTileServer()
      }
    },
    
    testStaticTiles: function () {
      const that = this
      return new Promise((resolve) => {
        // 测试多个缩放级别的瓦片是否存在
        const testUrls = [
          '/tiles/0/0/0.png',
          '/tiles/1/0/0.png',
          '/tiles/2/1/1.png'
        ]
        
        let testCount = 0
        let successCount = 0
        
        testUrls.forEach(url => {
          fetch(url, { method: 'HEAD' })
            .then(response => {
              testCount++
              if (response.ok) {
                successCount++
              }
              
              if (testCount === testUrls.length) {
                // 如果至少一半的测试瓦片可用，认为静态瓦片可用
                resolve(successCount >= testUrls.length / 2)
              }
            })
            .catch(() => {
              testCount++
              if (testCount === testUrls.length) {
                resolve(successCount >= testUrls.length / 2)
              }
            })
        })
        
        // 超时处理
        setTimeout(() => {
          if (testCount < testUrls.length) {
            resolve(false)
          }
        }, 2000)
      })
    },
    
    testTileServer: function () {
      const that = this
      
      // 测试tile服务器是否可用
      const testUrl = this.serverUrl.replace('{z}', '0').replace('{x}', '0').replace('{y}', '0')
      
      fetch(testUrl, { method: 'HEAD', timeout: 3000 })
        .then(response => {
          if (response.ok) {
            console.log('tile服务器可用')
            that.url = that.serverUrl
          } else {
            throw new Error('tile服务器响应错误')
          }
        })
        .catch(error => {
          console.log('tile服务器不可用，使用静态瓦片:', error)
          that.url = that.fallbackUrl
          
          // 如果静态瓦片也不可用，最后尝试在线瓦片
          that.testStaticTiles().then(isAvailable => {
            if (!isAvailable && process.env.NODE_ENV === 'development') {
              console.log('切换到在线瓦片服务')
              that.url = that.onlineUrl
            }
          })
        })
    },
    updateZoomLimits: function (map) {
      const that = this
      
      // 动态设置缩放限制
      map.setMinZoom(this.effectiveMinZoom)
      map.setMaxZoom(this.effectiveMaxZoom)
      
      console.log(`地图缩放限制更新: ${this.effectiveMinZoom} - ${this.effectiveMaxZoom} (${this.currentMapType}模式)`)
      
      // 只在离线模式下检测可用瓦片级别
      if (this.currentMapType === 'offline' && process.env.NODE_ENV === 'production') {
        this.detectAvailableTileLevels().then(levels => {
          if (levels.min !== null && levels.max !== null) {
            map.setMinZoom(levels.min)
            map.setMaxZoom(levels.max)
            console.log(`离线瓦片级别检测: ${levels.min} - ${levels.max}`)
          }
        })
      }
    },
    
    detectAvailableTileLevels: function () {
      const that = this
      return new Promise((resolve) => {
        const testLevels = MapConfig.detection.testLevels
        let availableLevels = []
        let testCount = 0
        
        testLevels.forEach(level => {
          const testUrl = `/tiles/${level}/0/0.png`
          
          fetch(testUrl, { method: 'HEAD' })
            .then(response => {
              testCount++
              if (response.ok) {
                availableLevels.push(level)
              }
              
              if (testCount === testLevels.length) {
                availableLevels.sort((a, b) => a - b)
                resolve({
                  min: availableLevels.length > 0 ? availableLevels[0] : null,
                  max: availableLevels.length > 0 ? availableLevels[availableLevels.length - 1] : null,
                  available: availableLevels
                })
              }
            })
            .catch(() => {
              testCount++
              if (testCount === testLevels.length) {
                availableLevels.sort((a, b) => a - b)
                resolve({
                  min: availableLevels.length > 0 ? availableLevels[0] : null,
                  max: availableLevels.length > 0 ? availableLevels[availableLevels.length - 1] : null,
                  available: availableLevels
                })
              }
            })
        })
        
        // 使用配置的超时时间
        setTimeout(() => {
          if (testCount < testLevels.length) {
            resolve({ 
              min: MapConfig.zoom.offline.min, 
              max: MapConfig.zoom.offline.max, 
              available: [] 
            })
          }
        }, MapConfig.detection.timeout)
      })
    },
    isValidLocation: function (location) {
      if (!location) {
        console.debug('位置验证: 位置对象为空')
        return false
      }
      
      // 检查必需的属性是否存在
      if (typeof location.lat === 'undefined' || typeof location.lng === 'undefined') {
        console.debug('位置验证: 缺少lat或lng属性', location)
        return false
      }
      
      // 检查经纬度是否为有效数字
      const lat = parseFloat(location.lat)
      const lng = parseFloat(location.lng)
      
      if (isNaN(lat) || isNaN(lng)) {
        console.debug('位置验证: 坐标不是有效数字', { lat: location.lat, lng: location.lng, parsedLat: lat, parsedLng: lng })
        return false
      }
      
      // 检查纬度范围（经度允许超界，后续归一化处理）
      if (lat < -90 || lat > 90) {
        console.debug('位置验证: 坐标超出有效范围', { lat, lng })
        return false
      }
      
      // 检查是否是极值（可能表示错误数据）
      if (lat === 0 && lng === 0) {
        console.debug('位置验证: 坐标为(0,0)，可能是错误数据')
        return false
      }
      
      return true
    },
    sanitizeLocation: function (location) {
      if (!location) {
        console.debug('位置清理: 输入位置为空')
        return null
      }
      
      // 确保有基本的坐标
      const lat = parseFloat(location.lat)
      const lng = parseFloat(location.lng)
      
      if (isNaN(lat) || isNaN(lng)) {
        console.debug('位置清理: 无效的坐标数据', location)
        return null
      }
      
      const sanitized = {
        lat: Math.max(-90, Math.min(90, lat)),     // 确保纬度在有效范围内
        lng: this.normalizeLongitude(lng),   // 经度标准化到[-180,180)
        accuracy: parseFloat(location.accuracy) || 100,
        short_name: location.short_name || this.$t('locationMgr.unknownLocation'),
        country: location.country || this.$t('locationMgr.unknownCountry'),
        street_address: location.street_address || '',
        city: location.city || this.$t('locationMgr.unknownCity'),
        state: location.state || '',
        postcode: location.postcode || ''
      }
      
      // 再次验证清理后的位置
      if (!this.isValidLocation(sanitized)) {
        console.debug('位置清理: 清理后仍然无效', sanitized)
        return null
      }
      
      return sanitized
    },
    // 将经度归一化到[-180, 180)
    normalizeLongitude: function (lng) {
      const x = parseFloat(lng)
      if (isNaN(x)) return lng
      return ((((x + 180) % 360) + 360) % 360) - 180
    },

    fixLeafletIcons: function () {
      // 修复Leaflet图标问题
      L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.7.1/dist/images/'
      
      // 确保触屏拖拽支持
      this.$nextTick(() => {
        if (this.$refs.myMap && this.$refs.myMap.mapObject) {
          const map = this.$refs.myMap.mapObject
          // 启用触屏拖拽
          map.options.touchZoom = true
          map.options.touchPan = true
        }
      })
    },
    getCityInfo: function (position, requestId) {
      // 设置加载状态
      this.geoCodeLoading = true
      
      // 创建AbortController
      const abortController = new AbortController()
      this.abortController = abortController
      
      // 直接基于已确定的地图类型选择地理编码方式（不重复判断网络状态）
      if (this.currentMapType === 'online') {
        return this.getOnlineGeocodingInfo(position, abortController)
      } else {
        return this.getOfflineGeocodingInfo(position)
      }
    },
    
    // 在线地理编码
    getOnlineGeocodingInfo: function (position, abortController) {
      console.log('使用在线地理编码服务')
      
      // 尝试多种地理编码服务和策略
      const tryGeocoding = async () => {
        // 策略1: 尝试使用JSONP方式绕过CORS（如果服务支持）
        // 策略2: 使用公开的代理服务
        // 策略3: 降级到离线模式
        
        const services = [
          {
            name: 'BigDataCloud-API',
            url: `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.lat}&longitude=${position.lng}&localityLanguage=zh-CN`,
            method: 'fetch-cors'
          },
          {
            name: 'OpenCage-Demo',
            url: `https://api.opencagedata.com/geocode/v1/json?q=${position.lat}+${position.lng}&key=demo&language=zh-CN&pretty=1&no_annotations=1`,
            method: 'fetch-cors'
          }
        ]
        
        for (const service of services) {
          try {
            console.log(`尝试使用${service.name}获取地址信息...`)
            
            let data
            if (service.method === 'jsonp') {
              // JSONP方法
              data = await this.fetchWithJSONP(service.url, 8000)
            } else if (service.method === 'fetch-cors') {
              // 支持CORS的API
              const response = await fetch(service.url, {
                signal: abortController.signal,
                mode: 'cors',
                credentials: 'omit'
              })
              
              if (!response.ok) {
                throw new Error(`${service.name} HTTP ${response.status}`)
              }
              
              data = await response.json()
            } else {
              // 常规fetch方法
              const response = await fetch(service.url, {
                headers: service.headers || {},
                signal: abortController.signal,
                mode: 'cors',
                credentials: 'omit'
              })
              
              if (!response.ok) {
                throw new Error(`${service.name} HTTP ${response.status}`)
              }
              
              data = await response.json()
            }
            
            console.log(`${service.name}响应:`, data)
            
            // 处理不同服务的响应格式
            let cityInfo
            if (service.name.includes('BigDataCloud')) {
              // BigDataCloud API格式
              if (data && data.city) {
                cityInfo = {
                  short_name: this.formatBigDataCloudLocationName(data),
                  country: data.countryName || this.$t('locationMgr.unknownCountry'),
                  street_address: data.locality || data.city || this.$t('locationMgr.unknownAddress'),
                  city: data.city || data.locality || this.$t('locationMgr.unknownCity'),
                  state: data.principalSubdivision || '',
                  postcode: data.postcode || ''
                }
              }
            } else if (service.name.includes('OpenCage')) {
              // OpenCage API格式
              if (data && data.results && data.results.length > 0) {
                const result = data.results[0]
                const components = result.components || {}
                cityInfo = {
                  short_name: this.formatOpenCageLocationName(components),
                  country: components.country || this.$t('locationMgr.unknownCountry'),
                  street_address: result.formatted || this.$t('locationMgr.unknownAddress'),
                  city: components.city || components.town || components.village || components.county || this.$t('locationMgr.unknownCity'),
                  state: components.state || components.province || '',
                  postcode: components.postcode || ''
                }
              }
            } else {
              // Nominatim格式
              if (data && (data.display_name || data.name)) {
                const address = data.address || {}
                cityInfo = {
                  short_name: this.formatLocationName(address),
                  country: address.country || this.$t('locationMgr.unknownCountry'),
                  street_address: data.display_name || data.name || this.$t('locationMgr.unknownAddress'),
                  city: address.city || address.town || address.village || address.county || this.$t('locationMgr.unknownCity'),
                  state: address.state || address.province || '',
                  postcode: address.postcode || ''
                }
              }
            }
            
            if (cityInfo) {
              console.log(`${service.name}成功获取地址信息`)
              return cityInfo
            } else {
              throw new Error(`${service.name}未返回有效地址信息`)
            }
          } catch (error) {
            console.warn(`${service.name}失败:`, error.message)
            
            // 如果是取消请求，直接抛出
            if (error.name === 'AbortError') {
              throw error
            }
            
            // 继续尝试下一个服务
            continue
          }
        }
        
        // 所有在线服务都失败了，降级到离线模式
        console.log('所有在线地理编码服务都失败，降级到离线模式')
        throw new Error('所有在线地理编码服务都不可用')
      }
      
      // 创建带超时的Promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('在线地理编码超时')), 6000) // 6秒超时
      })
      
      return Promise.race([tryGeocoding(), timeoutPromise])
      .catch(error => {
        console.warn('在线地理编码失败，降级到离线模式:', error.message)
        
        // 如果是取消请求，直接抛出
        if (error.name === 'AbortError') {
          throw error
        }
        
        // 降级到离线模式
        return this.generateOfflineLocationInfo(position)
      })
      .finally(() => {
        // 清除加载状态
        this.geoCodeLoading = false
        if (this.abortController === abortController) {
          this.abortController = null
        }
      })
    },
    
    // JSONP辅助方法
    fetchWithJSONP: function (url, timeout = 8000) {
      return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random())
        const script = document.createElement('script')
        
        // 设置超时
        const timeoutId = setTimeout(() => {
          cleanup()
          reject(new Error('JSONP请求超时'))
        }, timeout)
        
        // 清理函数
        const cleanup = () => {
          if (script.parentNode) {
            script.parentNode.removeChild(script)
          }
          if (window[callbackName]) {
            delete window[callbackName]
          }
          clearTimeout(timeoutId)
        }
        
        // 设置回调
        window[callbackName] = (data) => {
          cleanup()
          resolve(data)
        }
        
        // 处理错误
        script.onerror = () => {
          cleanup()
          reject(new Error('JSONP脚本加载失败'))
        }
        
        // 执行请求 - 修复回调函数名称替换
        const finalUrl = url.replace('CALLBACK_PLACEHOLDER', callbackName)
        script.src = finalUrl
        console.log('JSONP请求URL:', finalUrl)
        document.head.appendChild(script)
      })
    },
    
    // 离线地理编码
    getOfflineGeocodingInfo: function (position) {
      console.log('使用离线地理编码')
      
      return new Promise((resolve) => {
        // 模拟短暂的加载时间
        setTimeout(() => {
          // 基于坐标生成基本地理信息
          const cityInfo = this.generateOfflineLocationInfo(position)
          
          console.log('离线位置信息生成:', cityInfo.short_name)
          resolve(cityInfo)
        }, 200) // 200ms延迟，提供良好的用户体验
      })
      .finally(() => {
        // 清除加载状态
        this.geoCodeLoading = false
        this.abortController = null
      })
    },
    generateOfflineLocationInfo: function (position) {
      const lat = position.lat
      const lng = position.lng
      
      // 确定大致的地理区域
      let regionInfo = this.determineRegion(lat, lng)
      
      // 生成位置名称
      const locationName = `${regionInfo.region}地区`
      
      return {
        short_name: locationName,
        country: regionInfo.country,
        street_address: `坐标: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        city: regionInfo.city,
        state: regionInfo.state,
        postcode: ''
      }
    },
    
    determineRegion: function (lat, lng) {
      // 基于坐标范围确定大致地理区域（离线逻辑）
      
      // 中国区域判断
      if (lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135) {
        if (lat >= 39.4 && lat <= 41.1 && lng >= 115.4 && lng <= 117.5) {
          return { region: this.$t('locationMgr.beijing'), country: this.$t('locationMgr.china'), city: this.$t('locationMgr.beijingCity'), state: this.$t('locationMgr.beijingCity') }
        } else if (lat >= 30.8 && lat <= 31.9 && lng >= 120.9 && lng <= 122.0) {
          return { region: this.$t('locationMgr.shanghai'), country: this.$t('locationMgr.china'), city: this.$t('locationMgr.shanghaiCity'), state: this.$t('locationMgr.shanghaiCity') }
        } else if (lat >= 22.4 && lat <= 23.6 && lng >= 113.8 && lng <= 114.6) {
          return { region: this.$t('locationMgr.shenzhen'), country: this.$t('locationMgr.china'), city: this.$t('locationMgr.shenzhenCity'), state: this.$t('locationMgr.guangdongProvince') }
        } else if (lat >= 30.1 && lat <= 30.9 && lng >= 103.9 && lng <= 104.9) {
          return { region: this.$t('locationMgr.chengdu'), country: this.$t('locationMgr.china'), city: this.$t('locationMgr.chengduCity'), state: this.$t('locationMgr.sichuanProvince') }
        } else if (lat >= 22.0 && lat <= 23.6 && lng >= 112.9 && lng <= 114.0) {
          return { region: this.$t('locationMgr.guangzhou'), country: this.$t('locationMgr.china'), city: this.$t('locationMgr.guangzhouCity'), state: this.$t('locationMgr.guangdongProvince') }
        } else {
          return { region: this.$t('locationMgr.china'), country: this.$t('locationMgr.china'), city: this.$t('locationMgr.unknownCity'), state: this.$t('locationMgr.unknownProvince') }
        }
      }
      
      // 其他主要国家/地区
      if (lat >= 24.5 && lat <= 49.4 && lng >= -125 && lng <= -66) {
        return { region: this.$t('locationMgr.usa'), country: this.$t('locationMgr.usa'), city: this.$t('locationMgr.unknownCity'), state: this.$t('locationMgr.unknownState') }
      } else if (lat >= 45.8 && lat <= 71.0 && lng >= -141 && lng <= -52) {
        return { region: this.$t('locationMgr.canada'), country: this.$t('locationMgr.canada'), city: this.$t('locationMgr.unknownCity'), state: this.$t('locationMgr.unknownProvince') }
      } else if (lat >= 35.8 && lat <= 45.6 && lng >= 138.7 && lng <= 146.0) {
        return { region: this.$t('locationMgr.japan'), country: this.$t('locationMgr.japan'), city: this.$t('locationMgr.unknownCity'), state: this.$t('locationMgr.unknownPrefecture') }
      } else if (lat >= 33.0 && lat <= 38.6 && lng >= 124.6 && lng <= 130.9) {
        return { region: this.$t('locationMgr.korea'), country: this.$t('locationMgr.korea'), city: this.$t('locationMgr.unknownCity'), state: this.$t('locationMgr.unknownProvince') }
      } else if (lat >= 36.0 && lat <= 71.2 && lng >= -30.0 && lng <= 32.0) {
        return { region: this.$t('locationMgr.europe'), country: this.$t('locationMgr.europe'), city: this.$t('locationMgr.unknownCity'), state: this.$t('locationMgr.unknownRegion') }
      }
      
      // 根据经纬度确定大洲
      if (lat >= -55 && lat <= 71) {
        if (lng >= -168 && lng <= -30) {
          return { region: this.$t('locationMgr.americas'), country: this.$t('locationMgr.americas'), city: this.$t('locationMgr.unknownCity'), state: this.$t('locationMgr.unknownRegion') }
        } else if (lng >= -11 && lng <= 180) {
          if (lat >= -47 && lng >= 110) {
            return { region: this.$t('locationMgr.oceania'), country: this.$t('locationMgr.oceania'), city: this.$t('locationMgr.unknownCity'), state: this.$t('locationMgr.unknownRegion') }
          } else {
            return { region: this.$t('locationMgr.asia'), country: this.$t('locationMgr.asia'), city: this.$t('locationMgr.unknownCity'), state: this.$t('locationMgr.unknownRegion') }
          }
        }
      } else if (lat >= -55 && lat <= 37 && lng >= -30 && lng <= 55) {
        return { region: this.$t('locationMgr.africa'), country: this.$t('locationMgr.africa'), city: this.$t('locationMgr.unknownCity'), state: this.$t('locationMgr.unknownRegion') }
      }
      
      // 默认位置
      return { 
        region: this.$t('locationMgr.unknown'), 
        country: this.$t('locationMgr.unknownRegion'), 
        city: this.$t('locationMgr.unknownCity'), 
        state: this.$t('locationMgr.unknownRegion') 
      }
    },
    formatLocationName: function (address) {
      // 格式化位置名称，优先显示城市信息
      const city = address.city || address.town || address.village || address.county
      const state = address.state || address.province
      const country = address.country
      
      if (city && state) {
        return `${city}, ${state}`
      } else if (city) {
        return city
      } else if (state) {
        return state
      } else if (country) {
        return country
      } else {
        return this.$t('locationMgr.unknownLocation')
      }
    },
    formatBigDataCloudLocationName: function (data) {
      // 格式化BigDataCloud API的位置名称
      const city = data.city || data.locality
      const state = data.principalSubdivision
      const country = data.countryName
      
      if (city && state) {
        return `${city}, ${state}`
      } else if (city) {
        return city
      } else if (state) {
        return state
      } else if (country) {
        return country
      } else {
        return this.$t('locationMgr.unknownLocation')
      }
    },
    formatOpenCageLocationName: function (components) {
      // 格式化OpenCage API的位置名称
      const city = components.city || components.town || components.village || components.county
      const state = components.state || components.province
      const country = components.country
      
      if (city && state) {
        return `${city}, ${state}`
      } else if (city) {
        return city
      } else if (state) {
        return state
      } else if (country) {
        return country
      } else {
        return this.$t('locationMgr.unknownLocation')
      }
    },
    getMapStatusColor: function () {
      switch (this.currentMapType) {
        case 'online':
          return 'green'
        case 'offline':
          return this.useOnlineMap ? 'orange' : 'blue'
        case 'checking':
          return 'grey'
        default:
          return 'red'
      }
    },
    getMapStatusIcon: function () {
      switch (this.currentMapType) {
        case 'online':
          return 'mdi-cloud-check'
        case 'offline':
          return 'mdi-cloud-off'
        case 'checking':
          return 'mdi-loading mdi-spin'
        default:
          return 'mdi-alert-circle'
      }
    },
    getMapStatusText: function () {
      switch (this.currentMapType) {
        case 'online':
          return this.$t('locationMgr.onlineMap')
        case 'offline':
          return this.useOnlineMap ? this.$t('locationMgr.offlineMapFallback') : this.$t('locationMgr.offlineMap')
        case 'checking':
          return this.$t('locationMgr.checking')
        default:
          return this.$t('locationMgr.connectionFailed')
      }
    },
    onMapTypeToggle: function () {
      // 用户切换地图模式
      console.log('用户切换地图模式为:', this.useOnlineMap ? '在线地图' : '离线地图')
      
      if (this.useOnlineMap) {
        // 用户选择在线模式，检测网络并尝试使用在线地图
        this.detectAndSetMapType()
      } else {
        // 用户选择离线模式，直接切换到离线地图
        this.currentMapType = 'offline'
        this.url = this.fallbackUrl
        console.log('🔧 用户手动选择离线地图')
        
        // 更新缩放限制
        this.$nextTick(() => {
          if (this.$refs.myMap && this.$refs.myMap.mapObject) {
            const map = this.$refs.myMap.mapObject
            map.invalidateSize()
            this.updateZoomLimits(map)
          }
        })
      }
    },
    
    // 网络连接检测
    checkNetworkConnection: function () {
      return new Promise((resolve) => {
        // 方法1: 检测navigator.onLine
        if (!navigator.onLine) {
          console.log('网络检测: navigator.onLine为false')
          resolve(false)
          return
        }
        
        // 方法2: 尝试访问地理编码服务来测试网络
        const testUrls = [
          // 直接测试地理编码服务
          'https://nominatim.openstreetmap.org/reverse?format=json&lat=40&lon=116&accept-language=en',
          // 备用测试
          'https://www.openstreetmap.org/favicon.ico'
        ]
        
        let completed = 0
        let hasSuccess = false
        const timeout = 3000 // 减少到3秒超时
        
        testUrls.forEach((url, index) => {
          // 使用fetch测试，更准确
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), timeout)
          
          fetch(url, {
            method: 'HEAD',
            mode: 'no-cors', // 避免CORS问题
            signal: controller.signal,
            cache: 'no-cache'
          })
          .then(() => {
            clearTimeout(timeoutId)
            if (!hasSuccess) {
              hasSuccess = true
              console.log(`网络检测: ${url} 连接成功`)
              resolve(true)
            }
          })
          .catch(error => {
            clearTimeout(timeoutId)
            completed++
            console.log(`网络检测: ${url} 连接失败:`, error.name)
            if (completed === testUrls.length && !hasSuccess) {
              console.log('网络检测: 所有测试都失败，判定网络不可用')
              resolve(false)
            }
          })
        })
        
        // 总体超时
        setTimeout(() => {
          if (!hasSuccess) {
            console.log('网络检测: 超时，判定网络不可用')
            resolve(false)
          }
        }, timeout + 500)
      })
    },
    
    // 检测在线地图可用性
    checkOnlineMapAvailability: function () {
      return new Promise((resolve) => {
        const testUrls = [
          'https://a.tile.openstreetmap.org/0/0/0.png',
          'https://b.tile.openstreetmap.org/0/0/0.png',
          'https://c.tile.openstreetmap.org/0/0/0.png'
        ]
        
        let completed = 0
        let hasSuccess = false
        
        testUrls.forEach(url => {
          fetch(url, { 
            method: 'HEAD', 
            mode: 'no-cors',
            cache: 'no-cache'
          })
          .then(() => {
            if (!hasSuccess) {
              hasSuccess = true
              resolve(true)
            }
          })
          .catch(() => {
            completed++
            if (completed === testUrls.length && !hasSuccess) {
              resolve(false)
            }
          })
        })
        
        // 3秒超时
        setTimeout(() => {
          if (!hasSuccess) {
            resolve(false)
          }
        }, 3000)
      })
    },
    
    // 检测并设置地图类型（仅在用户选择在线模式时调用）
    detectAndSetMapType: async function () {
      this.currentMapType = 'checking'
      console.log('检测在线地图可用性...')
      
      try {
        // 检测网络连接
        this.isNetworkConnected = await this.checkNetworkConnection()
        console.log('网络连接状态:', this.isNetworkConnected)
        
        if (this.isNetworkConnected) {
          // 检测在线地图可用性
          this.isOnlineMapAvailable = await this.checkOnlineMapAvailability()
          console.log('在线地图可用性:', this.isOnlineMapAvailable)
          
          if (this.isOnlineMapAvailable) {
            this.currentMapType = 'online'
            this.url = this.onlineUrl
            console.log('✅ 使用在线地图')
          } else {
            this.currentMapType = 'offline'
            this.url = this.fallbackUrl
            console.log('⚠️ 在线地图不可用，自动降级到离线地图')
          }
        } else {
          // 网络不可用，降级到离线地图
          this.currentMapType = 'offline'
          this.url = this.fallbackUrl
          console.log('📡 网络不可用，自动降级到离线地图')
        }
        
        // 更新地图
        this.$nextTick(() => {
          if (this.$refs.myMap && this.$refs.myMap.mapObject) {
            const map = this.$refs.myMap.mapObject
            map.invalidateSize()
            // 根据新的地图类型更新缩放限制
            this.updateZoomLimits(map)
          }
        })
        
      } catch (error) {
        console.error('地图检测失败:', error)
        this.currentMapType = 'offline'
        this.url = this.fallbackUrl
        this.isNetworkConnected = false
        this.isOnlineMapAvailable = false
        console.log('❌ 检测失败，降级到离线地图')
      }
    },
    
    // 启动网络状态监控
    startNetworkMonitoring: function () {
      // 监听网络状态变化事件（这些是真正的网络状态变化）
      window.addEventListener('online', () => {
        console.log('系统网络连接恢复')
        // 只有在用户偏好在线地图时才重新检测
        if (this.useOnlineMap) {
          this.detectAndSetMapType()
        }
      })
      
      window.addEventListener('offline', () => {
        console.log('系统网络连接断开')
        this.isNetworkConnected = false
        this.isOnlineMapAvailable = false
        this.currentMapType = 'offline'
        this.url = this.fallbackUrl
      })
      
      // 定期检测频率大幅降低，避免频繁网络请求
      this.networkCheckInterval = setInterval(() => {
        // 只有在以下条件全部满足时才重新检测：
        // 1. 用户选择在线地图
        // 2. 当前使用离线地图
        // 3. 系统显示网络在线
        if (this.useOnlineMap && 
            this.currentMapType === 'offline' && 
            navigator.onLine) {
          console.log('尝试从离线模式恢复到在线模式')
          this.detectAndSetMapType()
        }
      }, 60000) // 降低到每60秒检测一次
    },
    
    // 拖拽结束事件
    dragEnd: function (event) {
      const lat = event.target._latlng.lat
      const lng = this.normalizeLongitude(event.target._latlng.lng)
      const newPos = { lat, lng, accuracy: 0 }
      
      console.log('拖拽结束，新位置:', newPos.lat.toFixed(6), newPos.lng.toFixed(6))
      
      // 使用新的updateMapPosition方法处理拖拽
      this.updateMapPosition(newPos.lat, newPos.lng, {
        updateMarker: true,
        fetchAddress: true,
        animate: false,  // 拖拽时不使用动画
        accuracy: 0
      })
      
      // 发送位置重置事件（保持向后兼容）
      // this.$emit('resetLocation', newPos.lat, newPos.lng)
    },
    
    // 便捷方法：快速跳转到指定位置（带动画）
    flyToPosition: function (lat, lng, zoom = null) {
      return this.updateMapPosition(lat, lng, {
        animate: true,
        zoom: zoom,
        updateMarker: true,
        fetchAddress: true
      })
    },
    
    // 便捷方法：直接设置位置（无动画）
    setPosition: function (lat, lng, zoom = null) {
      return this.updateMapPosition(lat, lng, {
        animate: false,
        zoom: zoom,
        updateMarker: true,
        fetchAddress: true
      })
    },
    
    // 便捷方法：仅更新地图中心（不移动地图钉）
    centerMapAt: function (lat, lng, zoom = null, animate = true) {
      return this.updateMapPosition(lat, lng, {
        animate: animate,
        zoom: zoom,
        updateMarker: false,
        fetchAddress: false
      })
    },
    
    
    // 便捷方法：通过已知位置对象更新
    updateToKnownLocation: function (locationObj, animate = true) {
      if (!locationObj || !this.isValidLocation(locationObj)) {
        console.error('无效的位置对象:', locationObj)
        return false
      }
      
      return this.updateMapPosition(locationObj.lat, this.normalizeLongitude(locationObj.lng), {
        animate: animate,
        updateMarker: true,
        fetchAddress: false,  // 已知位置通常不需要重新获取地址
        accuracy: locationObj.accuracy || 0
      })
    }
  },
  components: { LMap, LTileLayer, LMarker, LCircle, LTooltip, LControlZoom }
}
</script>

<style>
.leaflet-control-geocoder-form input {
  caret-color:#000 !important;
  color: #000 !important;
}

/* Tooltip样式增强 */
.leaflet-tooltip {
  font-size: 12px !important;
  font-weight: 500 !important;
}

.leaflet-tooltip strong {
  color: #ff9800 !important;
}

.leaflet-tooltip small {
  font-style: italic;
}

/* 拖拽中的标记动画 */
.leaflet-marker-dragging {
  transition: none !important;
}
</style>
