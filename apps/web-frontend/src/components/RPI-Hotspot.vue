<template>
  <transition name="dialog">
    <div class="HotspotDialog" :style="{ top: top + 'px' }" data-testid="ui-rpi-hotspot-root">
      <v-text-field class="NameEdit" label="Hotspot Name" v-model="InputText" variant="outlined" data-testid="ui-rpi-hotspot-input-input-text"></v-text-field>

      <div v-show="isEdited" class="HotspotEditBar">
        <button class="custom-button round-action-btn no-select" @click="RedoHotspotName" data-testid="ui-rpi-hotspot-btn-redo-hotspot-name">
          <v-icon color="rgba(255, 120, 120)"> mdi-redo </v-icon>
        </button>

        <button class="custom-button round-action-btn no-select" @click="SaveBtnClick" data-testid="ui-rpi-hotspot-btn-save-btn-click">
          <span v-if="SaveBtnSelect === false">
            <div class="ActionIconWrap">
              <img src="@/assets/images/svg/ui/SaveEdit.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
            </div>
          </span>
          <span v-else>
            <v-icon color="rgba(255, 140, 140)"> mdi-close-circle-outline </v-icon>
          </span>
        </button>

        <button v-show="SaveBtnSelect" class="custom-button round-action-btn confirm-action-btn no-select" @click="UpdateHotspotName" data-testid="ui-rpi-hotspot-btn-update-hotspot-name">
          <v-icon color="rgba(75, 155, 250)"> mdi-check-circle-outline </v-icon>
        </button>

        <span v-show="SaveBtnSelect" class="EditConfirmTip no-select">Confirm edited?</span>
      </div>

      <span v-show="isUpdated" class="TipsText"> 
        {{ $t('Please connect to the new hotspot in the mobile phone system settings, it will take about a minute to wait.') }}
      </span>

      <!-- ===== Network mode (minimal UI) ===== -->
      <div class="NetBox">
        <div class="NetRow">
          <span class="NetLabel">Mode</span>
          <span class="NetValue">{{ netStatus.mode || '-' }}</span>
        </div>
        <div class="NetRow">
          <span class="NetLabel">wlan</span>
          <span class="NetValue">{{ netStatus.wlan_ip || '-' }}</span>
        </div>
        <div class="NetRow">
          <span class="NetLabel">eth</span>
          <span class="NetValue">{{ netStatus.eth_ip || '-' }}</span>
        </div>
        <div class="NetRow">
          <span class="NetLabel">gw</span>
          <span class="NetValue">{{ netStatus.gateway || '-' }}</span>
        </div>
        <div class="NetRow">
          <span class="NetLabel">ZeroTier</span>
          <span class="NetValue">{{ netStatus.zerotier || '-' }}</span>
        </div>

        <div class="NetBtns">
          <button class="custom-button btn-Net no-select" @click="SwitchToWAN">
            <span>Enter WAN</span>
          </button>
          <button class="custom-button btn-Net no-select" @click="SwitchToAP">
            <span>Back AP</span>
          </button>
          <button class="custom-button btn-Net no-select" @click="RequestNetStatus">
            <span>Refresh</span>
          </button>
        </div>
        <div class="NetHint">
          <span v-if="netBusy">Switching network… This may disconnect your phone temporarily.</span>
          <span v-else>Tip: Enter WAN will turn off hotspot (phone may disconnect). If WAN fails it will fallback to AP.</span>
        </div>
      </div>

      <!-- ===== Wi‑Fi uplink setup (scan + save) ===== -->
      <div class="WifiBox">
        <div class="WifiTitle">Uplink Wi‑Fi</div>
        <div class="WifiRow">
          <button class="custom-button btn-Net no-select" @click="ScanWifi">
            <span v-if="!wifiScanning">Scan</span>
            <span v-else>Scanning…</span>
          </button>
          <span class="WifiHint">Save to profile: {{ uplinkProfile }}</span>
        </div>

        <v-select
          class="WifiSelect"
          :items="wifiItems"
          item-text="text"
          item-value="ssid"
          label="Choose SSID"
          v-model="wifiSelectedSsid"
          variant="outlined"
          dense
        ></v-select>

        <v-text-field
          class="WifiPsk"
          label="Password"
          v-model="wifiPsk"
          variant="outlined"
          type="password"
        ></v-text-field>

        <div class="WifiRow">
          <button class="custom-button btn-Net no-select" @click="SaveUplinkWifi">
            <span v-if="!wifiSaving">Save</span>
            <span v-else>Saving…</span>
          </button>
          <span class="WifiHint2">After saving, Enter WAN will try Ethernet first, then this Wi‑Fi.</span>
        </div>
      </div>

    </div>
  </transition>
</template>

<script>
export default {
  name: 'HotspotDialog',
  data() {
    return {
      top: 45,

      CurrentName: 'RaspBerryPi-WiFi',

      InputText: 'RaspBerryPi-WiFi',

      SaveBtnSelect: false,
      defaultShow: false,

      isUpdated: false,

      // network mode status (from Qt: NetStatus|{...})
      netStatus: {},
      netBusy: false,

      // Wi‑Fi uplink setup
      uplinkProfile: 'wan-uplink',
      wifiScanning: false,
      wifiSaving: false,
      wifiScanResults: [],
      wifiSelectedSsid: '',
      wifiPsk: '',
      
    };
  },
  created() {
    this.$bus.$on('HotspotName', this.CurrentHotspotName);
    this.$bus.$on('EditHotspotNameSuccess', this.UpdateSuccess);
    this.$bus.$on('NetStatus', this.OnNetStatus);
    this.$bus.$on('NetModeResult', this.OnNetModeResult);
    this.$bus.$on('WiFiScan', this.OnWiFiScan);
    this.$bus.$on('WiFiSaveResult', this.OnWiFiSaveResult);
    // when dialog toggles, request status once
    this.$bus.$on('toggleRPIHotspotDialog', this.RequestNetStatus);
  },
  methods: {
    CurrentHotspotName(name) {
      console.log('CurrentHotspotName', name);
      this.CurrentName = name;
      this.InputText = name;
      this.isUpdated = false;
      this.defaultShow = false;
    },

    SaveBtnClick() {
      if (this.SaveBtnSelect) {
        this.SaveBtnSelect = false;
      } else {
        this.SaveBtnSelect = true;
        this.defaultShow = true;
      }
    },

    RedoHotspotName() {
      this.InputText = this.CurrentName;
      this.isUpdated = false;
    },

    UpdateHotspotName() {
      this.SaveBtnSelect = false;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'editHotspotName:' + this.InputText);
      this.$bus.$emit('SendConsoleLogMsg', 'Edit Hotspot Name:' + this.InputText, 'info');
    },

    UpdateSuccess() {
      this.isUpdated = true;
      this.CurrentName = this.InputText;
      this.$bus.$emit('SendConsoleLogMsg', 'Update Hotspot Name Success.', 'info');
    },

    RequestNetStatus() {
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'netStatus');
    },
    OnNetStatus(obj) {
      this.netStatus = obj || {};
      this.netBusy = false;
    },
    OnNetModeResult(res) {
      this.netBusy = false;
      if (res && res.result === 'ok') {
        this.$bus.$emit('SendConsoleLogMsg', `NetMode ${res.mode} OK`, 'info');
      } else {
        const detail = (res && res.detail) ? res.detail : '';
        this.$bus.$emit('SendConsoleLogMsg', `NetMode ${res ? res.mode : ''} FAIL ${detail}`, 'warning');
      }
      // always refresh status after a mode command
      this.RequestNetStatus();
    },
    SwitchToWAN() {
      const ok = window.confirm('Enter WAN will turn off hotspot and may disconnect your phone. Continue?');
      if (!ok) return;
      this.netBusy = true;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'netMode:wan');
      this.$bus.$emit('SendConsoleLogMsg', 'Switch network -> WAN', 'info');
    },
    SwitchToAP() {
      this.netBusy = true;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'netMode:ap');
      this.$bus.$emit('SendConsoleLogMsg', 'Switch network -> AP', 'info');
    },

    b64EncodeUtf8(str) {
      // Vue2 build target: use btoa with utf8 conversion
      try {
        return btoa(unescape(encodeURIComponent(str)));
      } catch (e) {
        console.error('b64EncodeUtf8 failed', e);
        return '';
      }
    },
    ScanWifi() {
      if (this.wifiScanning) return;
      this.wifiScanning = true;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'wifiScan');
      this.$bus.$emit('SendConsoleLogMsg', 'WiFi scan requested', 'info');
    },
    OnWiFiScan(arr) {
      this.wifiScanning = false;
      this.wifiScanResults = Array.isArray(arr) ? arr : [];
      if (!this.wifiSelectedSsid && this.wifiScanResults.length > 0) {
        this.wifiSelectedSsid = this.wifiScanResults[0].ssid || '';
      }
    },
    SaveUplinkWifi() {
      if (this.wifiSaving) return;
      if (!this.wifiSelectedSsid) {
        this.$bus.$emit('SendConsoleLogMsg', 'Please choose SSID', 'warning');
        return;
      }
      if (!this.wifiPsk) {
        this.$bus.$emit('SendConsoleLogMsg', 'Please input password', 'warning');
        return;
      }
      const payloadObj = { name: this.uplinkProfile, ssid: this.wifiSelectedSsid, psk: this.wifiPsk };
      const b64 = this.b64EncodeUtf8(JSON.stringify(payloadObj));
      if (!b64) {
        this.$bus.$emit('SendConsoleLogMsg', 'Encode WiFi payload failed', 'warning');
        return;
      }
      this.wifiSaving = true;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'wifiSaveB64|' + b64);
      this.$bus.$emit('SendConsoleLogMsg', 'WiFi uplink saved request sent', 'info');
    },
    OnWiFiSaveResult(res) {
      // action: save / scan
      if (res && res.action === 'scan') {
        this.wifiScanning = false;
        if (res.result !== 'ok') {
          const detail = (res && res.detail) ? res.detail : '';
          this.$bus.$emit('SendConsoleLogMsg', 'WiFi scan FAIL ' + detail, 'warning');
        }
        return;
      }

      this.wifiSaving = false;
      if (res && res.result === 'ok') {
        this.$bus.$emit('SendConsoleLogMsg', 'WiFi uplink saved OK', 'info');
      } else {
        const detail = (res && res.detail) ? res.detail : '';
        this.$bus.$emit('SendConsoleLogMsg', 'WiFi uplink save FAIL ' + detail, 'warning');
      }
    },

  },
  computed: {
    isEdited() {
      return this.InputText !== this.CurrentName;
    },
    wifiItems() {
      // Show strongest first
      const list = (this.wifiScanResults || []).slice().sort((a, b) => (b.signal || 0) - (a.signal || 0));
      return list.map(x => ({
        ssid: x.ssid,
        text: `${x.ssid}  (${x.signal || 0}%)  ${x.security || ''}`
      }));
    }
  }
};
</script>

<style scoped>
.HotspotDialog {
  pointer-events: auto;
  position: fixed;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: auto;
  left: 50%;
  width: min(92vw, 560px);
  max-height: calc(100vh - 70px);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transform: translateX(-50%);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.dialog-enter-active {
  animation: showPanelAnimation 0.3s forwards;
}
.dialog-leave-active {
  animation: hidePanelAnimation 0.3s forwards;
}

@keyframes showPanelAnimation {
  from {
    top: -60px;
    backdrop-filter: blur(0px);
    background-color: rgba(64, 64, 64, 0.0);
  }

  to {
    top: 45px;
    backdrop-filter: blur(5px);
    background-color: rgba(64, 64, 64, 0.3);
  }
}

@keyframes hidePanelAnimation {
  from {
    top: 45px;
    backdrop-filter: blur(5px);
    background-color: rgba(64, 64, 64, 0.3);
  }

  to {
    top: -60px;
    backdrop-filter: blur(0px);
    background-color: rgba(64, 64, 64, 0.0);
  }
}

.NameEdit {
  width: 100%;
}

.HotspotEditBar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.round-action-btn {
  width: 38px;
  height: 38px;
  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;
  display: inline-flex;
  justify-content: center;
  align-items: center;
}

.round-action-btn:active,
.btn-Net:active {
  transform: scale(0.97);
  background-color: rgba(255, 255, 255, 0.7);
}

.confirm-action-btn {
  background-color: rgba(75, 155, 250, 0.15);
}

.ActionIconWrap {
  display: flex;
  justify-content: center;
  align-items: center;
}

.EditConfirmTip {
  flex: 1 1 180px;
  min-width: 0;
  user-select: none;
  font-size: 12px;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.85);
}

.TipsText {
  text-align: center;
  font-size: 12px;
  color: rgba(255, 120, 120, 0.9);
  user-select: none;
  line-height: 1.45;
}

.NetBox {
  width: 100%;
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  user-select: none;
}
.NetRow {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  margin: 4px 0;
}
.NetLabel {
  opacity: 0.7;
  word-break: break-word;
}
.NetValue {
  min-width: 0;
  text-align: left;
  font-family: monospace;
  white-space: normal;
  word-break: break-all;
  line-height: 1.4;
}
.NetBtns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.btn-Net {
  padding: 8px 12px;
  min-width: 96px;
  min-height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background-color: rgba(0, 0, 0, 0.25);
  color: rgba(255, 255, 255, 0.9);
  display: inline-flex;
  justify-content: center;
  align-items: center;
}
.NetHint {
  margin-top: 6px;
  font-size: 11px;
  opacity: 0.75;
  line-height: 1.45;
}

.WifiBox {
  width: 100%;
  color: rgba(255, 255, 255, 0.9);
}
.WifiTitle {
  font-size: 14px;
  opacity: 0.85;
  margin-bottom: 6px;
}
.WifiRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 6px 0;
}
.WifiHint, .WifiHint2 {
  flex: 1 1 180px;
  font-size: 11px;
  opacity: 0.7;
  line-height: 1.45;
}
.WifiSelect, .WifiPsk {
  width: 100%;
  margin-top: 6px;
}

@media (max-width: 600px) {
  .HotspotDialog {
    width: 94vw;
    max-height: calc(100vh - 56px);
    padding: 14px;
    gap: 12px;
  }

  .NetRow {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 10px;
  }

  .NetBtns,
  .WifiRow {
    gap: 8px;
  }

  .btn-Net {
    min-width: 88px;
    flex: 1 1 110px;
  }
}

</style>
