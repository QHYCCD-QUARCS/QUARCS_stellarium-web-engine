// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

<template>
<v-dialog :max-width="dialogWidth" v-model="$store.state.showViewSettingsDialog">
<v-card v-if="$store.state.showViewSettingsDialog" class="qs-settings-card" elevation="0" style="backdrop-filter: blur(5px); background-color: rgba(64, 64, 64, 0.3);">
  <v-card-title class="qs-title"><div>{{ $t('General Settings') }}</div></v-card-title>
  <v-card-text class="qs-card-text">
    <v-tabs v-model="activeTab" class="qs-tabs" background-color="transparent" dark slider-color="rgba(75, 155, 250, 0.9)" color="rgba(255,255,255,0.7)" fixed-tabs center-active>
      <v-tab class="qs-tab">{{ $t('Display Settings') }}</v-tab>
      <v-tab class="qs-tab">{{ $t('Version Info') }}</v-tab>
      <v-tab class="qs-tab">{{ $t('Memory Settings') }}</v-tab>
    </v-tabs>

    <v-tabs-items v-model="activeTab" class="qs-tabs-items">
      <v-tab-item>
        <div class="qs-pane">
          <div class="qs-section">
            <div class="qs-subheader">{{ $t('Sky Layers') }}</div>
            <v-row no-gutters class="qs-grid" align="center">
              <v-col cols="12" sm="6">
                <v-checkbox dense hide-details :label="$t('Milky Way')" v-model="milkyWayOn"></v-checkbox>
                <v-checkbox dense hide-details :label="$t('DSS')" v-model="dssOn"></v-checkbox>
              </v-col>
              <v-col cols="12" sm="6">
                <v-checkbox dense hide-details :label="$t('Meridian Line')" v-model="meridianOn"></v-checkbox>
                <v-checkbox dense hide-details :label="$t('Ecliptic Line')" v-model="eclipticOn"></v-checkbox>
              </v-col>
            </v-row>
          </div>

          <v-divider class="qs-divider"></v-divider>

          <div class="qs-section">
            <div class="qs-subheader">{{ $t('Performance & Language') }}</div>
            <v-row no-gutters class="qs-grid" align="center">
              <v-col cols="12" sm="6">
                <v-checkbox dense hide-details :label="$t('High FPS')" v-model="highfpsOn"></v-checkbox>
              </v-col>
              <v-col cols="12" sm="6" class="d-flex align-center">
                <div class="qs-inline-field">
                  <span class="qs-inline-label">{{ $t('Select Language') }}</span>
                  <v-select dense hide-details v-model="selectedLanguage" :items="languages" class="qs-inline-select" @change="switchLanguage" :menu-props="{ offsetY: true, attach: true, contentClass: 'qs-menu' }"></v-select>
                </div>
              </v-col>
            </v-row>
          </div>
        </div>
      </v-tab-item>

      <v-tab-item>
        <div class="qs-pane">
          <div class="qs-narrow">
            <!-- 版本总览 -->
            <div class="qs-section">
              <div class="qs-subheader">{{ $t('System Version') }}</div>
              <div class="qs-version-grid">
                <div class="qs-version-item">
                  <div class="qs-version-label">{{ $t('Total Version') }}</div>
                  <div class="qs-version-value">{{ systemVersion.total }}</div>
                </div>
                <div class="qs-version-item">
                  <div class="qs-version-label">{{ $t('Qt Client Version') }}</div>
                  <div class="qs-version-value">{{ systemVersion.qt }}</div>
                </div>
                <div class="qs-version-item">
                  <div class="qs-version-label">{{ $t('Web Client Version') }}</div>
                  <div class="qs-version-value">{{ systemVersion.vue }}</div>
                </div>
                <div class="qs-version-item">
                  <div class="qs-version-label">{{ $t('App Version') }}</div>
                  <div class="qs-version-value">{{ appVersion }}</div>
                </div>
              </div>
            </div>

            <!-- 设备版本信息 -->
            <div class="qs-section">
              <div class="qs-subheader">{{ $t('Device Versions') }}</div>
              <div v-if="deviceVersionRows.length === 0" class="qs-field">
                <span class="qs-inline-label">{{ $t('Status') }}</span>
                <span>{{ $t('No devices connected') }}</span>
              </div>
              <v-simple-table v-else dense class="qs-version-table">
                <thead>
                  <tr>
                    <th class="text-left">{{ $t('Device Type') }}</th>
                    <th class="text-left">{{ $t('Driver') }}</th>
                    <th class="text-left">{{ $t('SDK Version') }}</th>
                    <th class="text-left">{{ $t('Connected') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in deviceVersionRows" :key="row.key">
                    <td>{{ row.title }}</td>
                    <td>{{ row.driverName || '—' }}</td>
                    <td>{{ row.sdkVersion || 'N/A' }}</td>
                    <td>
                      <span :style="{ color: row.connected ? 'rgba(102, 187, 106, 0.9)' : 'rgba(244, 67, 54, 0.8)' }">
                        {{ row.connected ? $t('Connected') : $t('Disconnected') }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </v-simple-table>
              <div class="qs-actions">
                <v-btn small text @click="refreshDevices">{{ $t('Refresh') }}</v-btn>
              </div>
            </div>
          </div>
        </div>
      </v-tab-item>

      <v-tab-item>
        <div class="qs-pane">
            <div class="qs-narrow">
            <div class="qs-section qs-usb-section">
              <div class="qs-subheader">{{ $t('USB Drive') }}</div>
              <div v-if="usbList.length === 0" class="qs-field">
                <span class="qs-inline-label">{{ $t('Name') }}</span>
                <span>—</span>
              </div>
              <div v-else-if="usbList.length === 1" class="qs-usb-single">
                <div class="qs-field">
                  <span class="qs-inline-label">{{ $t('Name') }}</span>
                  <span>{{ usbList[0].name }}</span>
                </div>
                <div class="qs-field">
                  <span class="qs-inline-label">{{ $t('Free Space') }}</span>
                  <span>{{ usbList[0].spaceFormatted }}</span>
                </div>
                <div class="qs-usb-button-container">
                  <v-btn small text @click="openUSBBrowser(usbList[0].name)">{{ $t('View USB Files') }}</v-btn>
                </div>
              </div>
              <div v-else class="qs-usb-multiple">
                <div class="qs-field">
                  <span class="qs-inline-label">{{ $t('Status') }}</span>
                  <span style="color: rgba(255, 165, 0, 0.9);">{{ $t('Multiple USB drives detected') }}</span>
                </div>
                <div class="qs-usb-list">
                  <div v-for="usb in usbList" :key="usb.name" class="qs-usb-item">
                    <div class="qs-usb-item-info">
                      <div class="qs-usb-item-name">{{ usb.name }}</div>
                      <div class="qs-usb-item-space">{{ $t('Free Space') }}: {{ usb.spaceFormatted }}</div>
                    </div>
                    <v-btn small text @click="openUSBBrowser(usb.name)">{{ $t('View Files') }}</v-btn>
                  </div>
                </div>
              </div>
            </div>

            <v-divider class="qs-divider"></v-divider>

            <div class="qs-section">
              <div class="qs-subheader">{{ $t('Box Free Space') }}</div>
              <div class="qs-field">
                <span class="qs-inline-label">{{ $t('Free Space') }}</span>
                <span>{{ boxInfo.spaceFormatted }}</span>
              </div>
              <div class="qs-actions">
                <v-btn small text @click="clearBoxCache">{{ $t('Clear Box Cache') }}</v-btn>
                <v-btn small color="red" text @click="clearLogs">{{ $t('Clear Logs') }}</v-btn>
              </div>
            </div>

            <div class="qs-actions">
              <v-btn small text @click="refreshStorage">{{ $t('Refresh') }}</v-btn>
            </div>
          </div>
        </div>
      </v-tab-item>
    </v-tabs-items>
  </v-card-text>
  <v-card-actions>
    <v-spacer></v-spacer><v-btn class="blue--text darken-1" text @click.native="$store.state.showViewSettingsDialog = false">Close</v-btn>
  </v-card-actions>
</v-card>
</v-dialog>
</template>

<script>

export default {
  data: function () {
    return {
      activeTab: 0,
      HighFPSMode: false,
      selectedLanguage: this.$i18n.locale,
      languages: [
        { text: 'English', value: 'en' },
        { text: 'Simplified Chinese', value: 'cn' }
      ],
      usbList: [], // 存储所有U盘信息 [{name: 'USB1', space: 1000000, spaceFormatted: '1.00 GB'}, ...]
      boxInfo: { space: 0, spaceFormatted: '—' },
      usbSerialPath: '—',
      devices:[],
      screenWidth: (typeof window !== 'undefined') ? window.innerWidth : 1024,
      // 通过信号(bus)接收的系统版本信息，而不是直接从根实例读取
      systemVersion: {
        total: '—',
        qt: 'Not connected',
        vue: '—'
      },
      // 通过单独信号接收的 App 版本号（来自 qtObj / 外部应用）
      appVersion: '—'
    }
  },
  created() { 
    this.$bus.$on('ClientLanguage', this.switchLanguage);
    this.$bus.$on('HighFPSMode', this.switchHighFPSMode);
    this.$bus.$on('sendCurrentConnectedDevices', this.onSendCurrentConnectedDevices);
    this.$bus.$on('DeviceConnectSuccess', this.onDeviceConnectSuccess);
    this.$bus.$on('USB_Name_Sapce', this.onUSBInfo);
    this.$bus.$on('ClearUSBList', this.clearUSBList);
    this.$bus.$on('Box_Space', this.onBoxSpace);
    // 监听来自 App.vue 的系统版本信号：SystemVersion(total, qt, vue)
    this.$bus.$on('SystemVersion', this.onSystemVersion);

    this.$bus.$on('appVersion', this.onAppVersion);

    this.refreshDevices();
    this.refreshUSB();
    this.refreshBoxSpace();
    if (typeof window !== 'undefined') {
      this._onResize = () => { this.screenWidth = window.innerWidth };
      window.addEventListener('resize', this._onResize, { passive: true });
    }
  },
  beforeDestroy() {
    if (this._onResize && typeof window !== 'undefined') {
      window.removeEventListener('resize', this._onResize);
    }
  },
  methods: {
    // 切换语言的方法
    switchLanguage(lang) {
      // this.$bus.$emit('SendConsoleLogMsg', "当前语言:" + lang, 'info');
      this.$i18n.locale = lang;
      this.selectedLanguage = this.$i18n.locale;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'saveToConfigFile:ClientLanguage:'+ lang);
    },
    switchHighFPSMode(Value) {
      if(Value === 'true'){
        window.setHighFrameRate(true);
        this.HighFPSMode = true;
      } else {
        window.setHighFrameRate(false);
        this.HighFPSMode = false;
      }
      console.log('setHighFPSMode:', this.HighFPSMode);
    },
    onDeviceConnectSuccess(type, DeviceName, DriverName, isBind) {
      // 任一设备连接/解绑成功后，刷新一次设备列表
      this.refreshDevices();
    },
    refreshDevices() {
      this.$bus.$emit('GetCurrentConnectedDevices');
    },
    onUSBInfo(name, space) {
      if (name === 'Null') {
        this.usbList = [];
        return;
      }
      
      // 检查U盘是否已存在于列表中
      const existingIndex = this.usbList.findIndex(usb => usb.name === name);
      const bytes = Number(space) || 0;
      const spaceFormatted = this.formatBytes(bytes);
      
      if (existingIndex === -1) {
        // 添加新的U盘信息
        this.usbList.push({
          name: name,
          space: bytes,
          spaceFormatted: spaceFormatted
        });
      } else {
        // 更新已存在的U盘信息
        this.usbList[existingIndex].space = bytes;
        this.usbList[existingIndex].spaceFormatted = spaceFormatted;
      }
    },
    // 接收来自 App.vue 的系统版本信号
    onSystemVersion(total, qt, vue) {
      this.systemVersion.total = total || '—';
      this.systemVersion.qt = qt || 'Not connected';
      this.systemVersion.vue = vue || '—';
    },

    onAppVersion(appVersion) {
      this.appVersion = appVersion || '—';
    },
    
    clearUSBList() {
      this.usbList = [];
    },
    refreshUSB() {
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'USBCheck');
    },
    onBoxSpace(space) {
      const bytes = Number(space) || 0;
      this.boxInfo.space = bytes;
      this.boxInfo.spaceFormatted = this.formatBytes(bytes);
    },
    refreshBoxSpace() {
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'CheckBoxSpace');
    },
    clearBoxCache() {
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ClearBoxCache');
    },
    clearLogs() {
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ClearLogs');
    },
    refreshStorage() {
      // 统一刷新 USB 与盒子可用空间
      this.refreshUSB();
      this.refreshBoxSpace();
    },
    openUSBBrowser(usbName = null) {
      // 打开USB文件浏览器
      // 如果指定了U盘名，传递给文件浏览器
      this.$store.state.showUSBFilesDialog = true;
      this.$store.state.selectedUSBName = usbName; // 存储选中的U盘名
      const command = usbName ? `GetUSBFiles:${usbName}` : 'GetUSBFiles';
      this.$bus.$emit('AppSendMessage', 'Vue_Command', command);
    },
    onSendCurrentConnectedDevices(payload) {
      // 接收来自 App.vue 的完整设备列表，并更新本地 devices 列表
      try {
        this.devices = Array.isArray(payload) ? payload : JSON.parse(payload);
        console.log('devices', this.devices);
      } catch (e) {
        console.warn('sendCurrentConnectedDevices parse error', e);
      }
    },
    // 串口路径直接从全局 devices 中读取

    formatBytes(bytes) {
      // 使用十进制：1000 进制
      const ONE_GB = 1000 * 1000 * 1000;
      const ONE_MB = 1000 * 1000;
      if (bytes >= ONE_GB) return (bytes / ONE_GB).toFixed(2) + ' GB';
      if (bytes >= ONE_MB) return (bytes / ONE_MB).toFixed(2) + ' MB';
      if (bytes > 0) return (bytes / 1000).toFixed(2) + ' KB';
      return '—';
    }
  },
  computed: {
    mainCameraSerialPath() {
      const mc = this.devices && Array.isArray(this.devices)
        ? this.devices.find(d => d.driverType === 'MainCamera')
        : null;
      return mc && mc.usbSerialPath ? mc.usbSerialPath : '';
    },
    guiderSerialPath() {
      const gd = this.devices && Array.isArray(this.devices)
        ? this.devices.find(d => d.driverType === 'Guider')
        : null;
      return gd && gd.usbSerialPath ? gd.usbSerialPath : '';
    },
    deviceEntries() {
      const devices = this.devices && Array.isArray(this.devices) ? this.devices : [];
      const titleMap = {
        'MainCamera': this.$t('Main Camera'),
        'Guider': this.$t('Guider Camera'),
        'Mount': this.$t('Mount'),
        'Focuser': this.$t('Focuser'),
        'PoleCamera': this.$t('PoleCamera'),
        'CFW': 'CFW'
      };
      const list = [];
      const pushEntry = (dev) => {
        // 使用标签控制哪些属性显示（serial / sdk 等），可按需在 devices 中设置 dev.tags=['serial','sdk']
        const tags = dev.tags || (dev.driverType === 'MainCamera' || dev.driverType === 'Guider' ? ['serial','sdk'] : ['serial']);
        list.push({
          title: titleMap[dev.driverType] || dev.driverType,
          driverName: dev.driverName || dev.device || '',
          connected: !!dev.isConnected,
          sdkVersion: dev.sdkVersion || 'N/A',
          usbSerialPath: dev.usbSerialPath || '',
          tags
        });
      };
      const main = devices.find(d => d.driverType === 'MainCamera');
      if (main) pushEntry(main); else pushEntry({ driverType: 'MainCamera' });
      devices.forEach(d => {
        if (d.driverType === 'MainCamera') return;
        // 排除望远镜（Telescopes）设备
        if (d.driverType === 'Telescopes') return;
        if (d.isConnected || (d.driverName && d.driverName !== '')) pushEntry(d);
      });
      return list;
    },
    // 为“设备版本”表格准备的行数据，按设备类型聚合，便于在设备较多时压缩布局
    deviceVersionRows() {
      const entries = this.deviceEntries || [];
      // 目前直接平铺即可，如需按类型分组可在此扩展
      return entries.map((dev, index) => ({
        key: dev.title + '-' + (dev.driverName || '') + '-' + index,
        title: dev.title,
        driverName: dev.driverName,
        sdkVersion: dev.sdkVersion,
        connected: dev.connected
      }));
    },
    dssOn: {
      get: function () {
        return this.$store.state.stel.dss.visible
      },
      set: function (newValue) {
        this.$stel.core.dss.visible = newValue
      }
    },
    milkyWayOn: {
      get: function () {
        return this.$store.state.stel.milkyway.visible
      },
      set: function (newValue) {
        this.$stel.core.milkyway.visible = newValue
      }
    },
    meridianOn: {
      get: function () {
        return this.$store.state.stel.lines.meridian.visible
      },
      set: function (newValue) {
        this.$stel.core.lines.meridian.visible = newValue
      }
    },
    eclipticOn: {
      get: function () {
        return this.$store.state.stel.lines.ecliptic.visible
      },
      set: function (newValue) {
        this.$stel.core.lines.ecliptic.visible = newValue
      }
    },
    highfpsOn: {
      get: function () {
        return this.HighFPSMode
      },
      set: function (newValue) {
        window.setHighFrameRate(newValue)
        this.HighFPSMode = newValue
        console.log('Set High FPS:', this.HighFPSMode)
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'saveToConfigFile:HighFPSMode:'+ newValue)
      }
    },
    jsMemory() { return { usedMB: '—', limitMB: '—' }; },
    dialogWidth() {
      // 自适应宽度：最小 660px，最大 90vw，上限 1000px
      const target = Math.floor(this.screenWidth * 0.9);
      return Math.max(660, Math.min(1000, target));
    }
  }
}
</script>

<style>
.input-group {
  margin: 0px;
}

.qs-settings-card .v-card__title {
  padding-bottom: 0;
}
.qs-title { color: rgba(255, 255, 255, 0.92); font-size: clamp(18px, 2vw, 20px); }
.qs-card-text {
  max-height: 60vh;
  overflow-y: auto;
}
.qs-menu { z-index: 1500 !important; }
.qs-tabs {
  margin-bottom: 8px;
}
.qs-tab { min-width: auto; font-size: clamp(15px, 1.8vw, 18px); text-transform: none; white-space: nowrap; }
/* 三等分布局，确保三个菜单固定占满一行且不被裁剪 */
.qs-tabs .v-tab { flex: 0 0 33.3333%; max-width: 33.3333%; }
.qs-pane {
  margin-top: 8px;
}
.qs-section {
  margin-bottom: 4px; /* 再次收紧区块间距 */
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 4px 6px; /* 收紧内边距，提升密度 */
}
.qs-subheader {
  font-size: clamp(16px, 2vw, 20px);
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 4px;
  font-weight: 600;
}
.qs-grid .v-input { margin-right: 8px; }
.qs-grid .v-input, .qs-grid .v-select { min-width: 0; }
.qs-inline-field { display: inline-flex; align-items: center; gap: 8px; flex-wrap: nowrap; min-width: 0; }
.qs-inline-label { font-size: 14px; line-height: 32px; color: rgba(255,255,255,0.7); white-space: nowrap; margin-right: 8px; }
.qs-inline-select { flex: 0 0 180px; min-width: 160px; max-width: 220px; }
.qs-inline-select .v-select__selections {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.qs-field { display: flex; gap: 8px; align-items: center; margin: 4px 0; }
.qs-tabs-items,
.qs-tabs-items .v-window__container,
.qs-tabs-items .v-window-item,
.qs-tabs-items .v-card,
.qs-tabs-items .v-list {
  background: transparent !important;
}
.qs-card-text .v-sheet,
.qs-card-text .theme--dark.v-sheet,
.qs-card-text .v-card {
  background-color: transparent !important;
}
.qs-list .v-list-item {
  min-height: 28px; /* 行高更紧凑 */
  padding-top: 2px;
  padding-bottom: 2px;
}
.qs-list .v-list-item__title,
.qs-list .v-list-item__subtitle {
  /* 与 v-label (表单标签，如 Milky Way) 保持一致的可读尺寸 */
  font-size: 16px;               /* 同 v-label 默认字号 */
  letter-spacing: .009375em;     /* 同 v-label 字间距 */
  line-height: 1.2;              /* 稍紧凑但不拥挤 */
}
.qs-list .v-list-item__title { color: rgba(255, 255, 255, 0.92); font-weight: 500; }
.qs-list .v-list-item__subtitle { color: rgba(255, 255, 255, 0.85); font-weight: 400; }
.qs-divider { opacity: 0.3; margin: 4px 0; }
.qs-actions {
  display: flex;
  gap: 4px;              /* 按钮之间更紧凑 */
  justify-content: flex-end;
  margin-top: 4px;       /* 顶部间距更小 */
}
.qs-actions .v-btn {
  min-width: auto;       /* 取消默认宽度，避免按钮过宽 */
  padding: 0 10px;       /* 收紧左右内边距 */
  font-size: 12px;       /* 字号略小一点 */
}
.qs-usb-section { position: relative; }
.qs-usb-button-container { display: flex; justify-content: flex-end; margin-top: 8px; }
.qs-usb-list { margin-top: 12px; }
.qs-usb-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  margin: 6px 0;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.qs-usb-item-info {
  flex: 1;
}
.qs-usb-item-name {
  font-size: 15px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 4px;
}
.qs-usb-item-space {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}
.qs-narrow { margin: 0 auto; width: 95%; max-width: clamp(520px, 80%, 900px); }
/* 桌面端保证对话框最小宽度，避免英文标签被截断；小屏自动回落 */
.qs-settings-card { min-width: 660px; }
@media (max-width: 700px) {
  .qs-settings-card { min-width: auto; }
}

/* 版本信息布局 */
.qs-version-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); /* 单元格再窄一点 */
  grid-gap: 4px;                                               /* 版本项之间更紧凑 */
}
.qs-version-item {
  padding: 2px 4px;      /* 再次收紧卡片内边距 */
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.qs-version-label {
  font-size: 11px;       /* 标签字体再小一点 */
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 1px;
  white-space: nowrap;
}
.qs-version-value {
  font-size: 12px;       /* 数值字体再小一档，让卡片更小巧 */
  color: rgba(255, 255, 255, 0.9);
  word-break: break-all;
}
.qs-version-table {
  max-height: 220px;
  overflow-y: auto;
  display: block;
}
.qs-version-table table {
  width: 100%;
}
.qs-version-table th,
.qs-version-table td {
  font-size: 13px;
  white-space: nowrap;
}
.qs-version-table tbody tr:nth-child(odd) {
  background-color: rgba(255, 255, 255, 0.02);
}
</style>
