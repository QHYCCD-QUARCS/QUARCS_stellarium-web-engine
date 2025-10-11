// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

<template>
<v-dialog max-width='460' v-model="$store.state.showViewSettingsDialog">
<v-card v-if="$store.state.showViewSettingsDialog" class="qs-settings-card" elevation="0" style="backdrop-filter: blur(5px); background-color: rgba(64, 64, 64, 0.3);">
  <v-card-title class="qs-title"><div>{{ $t('General Settings') }}</div></v-card-title>
  <v-card-text class="qs-card-text">
    <v-tabs v-model="activeTab" class="qs-tabs" background-color="transparent" dark slider-color="rgba(75, 155, 250, 0.9)" color="rgba(255,255,255,0.6)" grow>
      <v-tab class="qs-tab">{{ $t('Display Settings') }}</v-tab>
      <v-tab class="qs-tab">{{ $t('Device Settings') }}</v-tab>
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
              <v-col cols="12" sm="6">
                <div class="qs-inline-field">
                  <span class="qs-inline-label">{{ $t('Select Language') }}</span>
                  <v-select dense hide-details v-model="selectedLanguage" :items="languages" class="qs-inline-select" @change="switchLanguage"></v-select>
                </div>
              </v-col>
            </v-row>
          </div>
        </div>
      </v-tab-item>

      <v-tab-item>
        <div class="qs-pane">
          <v-list dense class="qs-list">
            <v-subheader>{{ $t('Main Camera') }}</v-subheader>
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title>{{ $t('Driver') }}: {{ deviceMainCamera.driverName || '—' }}</v-list-item-title>
                <v-list-item-subtitle>{{ $t('Connected') }}: {{ deviceMainCamera.connected ? 'Yes' : 'No' }}</v-list-item-subtitle>
                <v-list-item-subtitle>{{ $t('SDK Version') }}: {{ deviceMainCamera.sdkVersion }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-divider class="qs-divider"></v-divider>
            <v-subheader>{{ $t('Guider Camera') }}</v-subheader>
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title>{{ $t('Driver') }}: {{ deviceGuider.driverName || '—' }}</v-list-item-title>
                <v-list-item-subtitle>{{ $t('Connected') }}: {{ deviceGuider.connected ? 'Yes' : 'No' }}</v-list-item-subtitle>
                <v-list-item-subtitle>{{ $t('SDK Version') }}: {{ deviceGuider.sdkVersion }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
          <div class="qs-actions">
            <v-btn small text @click="refreshDevices">{{ $t('Refresh') }}</v-btn>
          </div>
        </div>
      </v-tab-item>

      <v-tab-item>
        <div class="qs-pane">
          <v-list dense class="qs-list">
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title>{{ $t('USB Drive') }}: {{ usbInfo.name }}</v-list-item-title>
                <v-list-item-subtitle>{{ $t('Free Space') }}: {{ usbInfo.spaceFormatted }}</v-list-item-subtitle>
              </v-list-item-content>
              <v-list-item-action>
                <v-btn small text @click="refreshUSB">{{ $t('Refresh') }}</v-btn>
              </v-list-item-action>
            </v-list-item>
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title>JS Heap</v-list-item-title>
                <v-list-item-subtitle>
                  {{ jsMemory.usedMB }} / {{ jsMemory.limitMB }} MB
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
          <div class="qs-actions">
            <v-btn small color="red" text @click="clearCaches">{{ $t('Clear Cache') }}</v-btn>
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
      deviceMainCamera: { connected: false, driverName: '', sdkVersion: 'N/A' },
      deviceGuider: { connected: false, driverName: '', sdkVersion: 'N/A' },
      usbInfo: { name: '—', space: 0, spaceFormatted: '—' }
    }
  },
  created() { 
    this.$bus.$on('ClientLanguage', this.switchLanguage);
    this.$bus.$on('HighFPSMode', this.switchHighFPSMode);
    this.$bus.$on('MainCameraConnected', this.onMainCameraConnected);
    this.$bus.$on('GuiderConnected', this.onGuiderConnected);
    this.$bus.$on('DeviceConnectSuccess', this.onDeviceConnectSuccess);
    this.$bus.$on('USB_Name_Sapce', this.onUSBInfo);

    this.refreshDevices();
    this.refreshUSB();
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
    onMainCameraConnected(status) {
      this.deviceMainCamera.connected = parseInt(status, 10) === 1 || status === true;
    },
    onGuiderConnected(status) {
      this.deviceGuider.connected = parseInt(status, 10) === 1 || status === true;
    },
    onDeviceConnectSuccess(type, DeviceName, DriverName, isBind) {
      if (type === 'MainCamera') {
        this.deviceMainCamera.driverName = DriverName || DeviceName || '';
      } else if (type === 'Guider') {
        this.deviceGuider.driverName = DriverName || DeviceName || '';
      }
    },
    refreshDevices() {
      this.$bus.$emit('GetConnectedDevices');
    },
    onUSBInfo(name, space) {
      this.usbInfo.name = name;
      const bytes = Number(space) || 0;
      this.usbInfo.space = bytes;
      this.usbInfo.spaceFormatted = this.formatBytes(bytes);
    },
    refreshUSB() {
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'USBCheck');
    },
    async clearCaches() {
      try {
        try { localStorage.clear(); } catch (e) {}
        try { sessionStorage.clear(); } catch (e) {}
        if (typeof caches !== 'undefined' && caches.keys) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
          const dbs = await indexedDB.databases();
          await Promise.all(dbs.map(db => db && db.name ? new Promise((res) => { const req = indexedDB.deleteDatabase(db.name); req.onsuccess = req.onerror = req.onblocked = () => res(); }) : Promise.resolve()));
        }
        this.$bus.$emit('SendConsoleLogMsg', 'Caches cleared', 'info');
      } catch (err) {
        console.error('clearCaches error', err);
      }
    },
    formatBytes(bytes) {
      const ONE_GB = 1024 * 1024 * 1024;
      const ONE_MB = 1024 * 1024;
      if (bytes >= ONE_GB) return (bytes / ONE_GB).toFixed(2) + ' GB';
      if (bytes >= ONE_MB) return (bytes / ONE_MB).toFixed(2) + ' MB';
      if (bytes > 0) return (bytes / 1024).toFixed(2) + ' KB';
      return '—';
    }
  },
  computed: {
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
    jsMemory() {
      if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
        const used = Math.round(window.performance.memory.usedJSHeapSize / 1048576);
        const limit = Math.round(window.performance.memory.jsHeapSizeLimit / 1048576);
        return { usedMB: used, limitMB: limit };
      }
      return { usedMB: '—', limitMB: '—' };
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
.qs-title {
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
}
.qs-tabs {
  margin-bottom: 8px;
}
.qs-tab {
  min-width: auto;
  font-size: 12px;
  text-transform: none;
}
.qs-card-text {
  max-height: 60vh;
  overflow-y: auto;
}
.qs-pane {
  margin-top: 8px;
}
.qs-section {
  margin-bottom: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 8px;
}
.qs-subheader {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  margin-bottom: 4px;
}
.qs-grid .v-input {
  margin-right: 8px;
}
.qs-inline-field {
  display: flex;
  align-items: center;
  gap: 8px;
}
.qs-inline-label {
  font-size: 12px;
  color: rgba(255,255,255,0.7);
  white-space: nowrap;
}
.qs-inline-select {
  min-width: 160px;
}

/* 透明化 v-tabs-items 内容，避免黑色底色 */
.qs-tabs-items,
.qs-tabs-items .v-window__container,
.qs-tabs-items .v-window-item,
.qs-tabs-items .v-card,
.qs-tabs-items .v-list {
  background: transparent !important;
}

/* 进一步移除内部 sheet 背景，避免黑底块 */
.qs-card-text .v-sheet,
.qs-card-text .theme--dark.v-sheet,
.qs-card-text .v-card {
  background-color: transparent !important;
}
.qs-list .v-list-item__title,
.qs-list .v-list-item__subtitle {
  color: rgba(255, 255, 255, 0.7);
}
.qs-divider {
  opacity: 0.3;
}
.qs-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>

