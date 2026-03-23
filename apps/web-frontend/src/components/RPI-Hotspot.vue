<template>
  <transition name="dialog">
    <div class="HotspotDialog" :style="{ top: top + 'px', height: DialogHeight + 'px' }" data-testid="ui-rpi-hotspot-root">
      <v-text-field class="NameEdit" label="Hotspot Name" v-model="InputText" variant="outlined" data-testid="ui-rpi-hotspot-input-input-text"></v-text-field>

      <span v-show="isEdited && (defaultShow || SaveBtnSelect)" class="custom-button no-select" :class="{ 'DeleteTips-show': SaveBtnSelect, 'DeleteTips-hide': !SaveBtnSelect }"> Confirm edited? </span>

      <button v-show="isEdited && (defaultShow || SaveBtnSelect)" class="custom-button btn-SureDelete no-select" :class="{ 'btn-SureDelete-show': SaveBtnSelect, 'btn-SureDelete-hide': !SaveBtnSelect }" @click="UpdateHotspotName" data-testid="ui-rpi-hotspot-btn-update-hotspot-name"> 
        <v-icon color="rgba(75, 155, 250)"> mdi-check-circle-outline </v-icon>
      </button>
      
      <button v-show="isEdited" class="custom-button btn-Delete no-select" @click="SaveBtnClick" data-testid="ui-rpi-hotspot-btn-save-btn-click"> 
        <span v-if="SaveBtnSelect === false">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/SaveEdit.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
          </div> 
        </span>
        <span v-if="SaveBtnSelect === true">
          <v-icon color="rgba(255, 0, 0)"> mdi-close-circle-outline </v-icon>
        </span>
      </button>

      <button v-show="isEdited" class="custom-button btn-Redo no-select" @click="RedoHotspotName" data-testid="ui-rpi-hotspot-btn-redo-hotspot-name"> 
        <v-icon color="rgba(255, 0, 0)"> mdi-redo </v-icon>
      </button>

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
    DialogHeight() {
      if (this.isUpdated) {
        return 560;
      }
      return this.isEdited ? 560 : 520;
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
  overflow-y: auto; /* prevent Wi-Fi section from being clipped on smaller viewports */
  left: 50%;
  width: 30%;
  transform: translateX(-50%);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  transition: height 0.3s ease;
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
  position: absolute;
  width: 90%;
  height: 40px;
  top: 5px;
  left: 50%;
  transform: translateX(-50%);

}

.btn-Redo {
  position:absolute;
  top: 65px;
  left: 10px;

  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;
}

.btn-Delete {
  position:absolute;
  top: 65px;
  right: 10px;

  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;
}

.btn-Delete:active,
.btn-SureDelete:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

.btn-SureDelete-show {
  position:absolute;
  top: 65px;
  right: 10px;

  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;

  animation: showAnimation 0.3s forwards;
}

@keyframes showAnimation {
  from {
    right: 10px;
  }
  to {
    right: 135px;
  }
}

.btn-SureDelete-hide {
  position:absolute;
  top: 65px;
  right: 10px;

  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;

  animation: hideAnimation 0.3s forwards;
}

@keyframes hideAnimation {
  from {
    right: 135px;
    opacity: 1;
  }
  to {
    right: 10px;
    opacity: 0;
  }
}

.DeleteTips-show {
  position:absolute;
  top: 65px;
  right: 10px;

  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border-radius: calc(30px / 2);
  box-sizing: border-box;
  border: none;

  opacity: 0;
  overflow: hidden;

  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;

  animation: expandAnimation 0.3s forwards;
}

@keyframes expandAnimation {
  from {
    width: 30px;
    opacity: 0;
  }
  to {
    width: 155px;
    opacity: 1;
  }
}

.DeleteTips-hide {
  position:absolute;
  top: 65px;
  right: 10px;

  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border-radius: calc(30px / 2);
  box-sizing: border-box;
  border: none;

  opacity: 1;
  overflow: hidden;

  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;

  animation: collapseAnimation 0.3s forwards;
}

@keyframes collapseAnimation {
  from {
    width: 155px;
    opacity: 1;
  }
  to {
    width: 30px;
    opacity: 0;
  }
}

.TipsText {
  position: absolute; 
  width: 100%; 
  top: 100px; 
  left: 0; 

  text-align: center; 
  font-size: 10px; 
  color: rgba(255, 0, 0, 0.7); 
  user-select: none;
  line-height: 1;
}

.NetBox {
  position: absolute;
  left: 5%;
  top: 115px;
  width: 90%;
  color: rgba(255, 255, 255, 0.9);
  font-size: 11px;
  user-select: none;
}
.NetRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 2px 0;
}
.NetLabel {
  opacity: 0.7;
  width: 70px;
}
.NetValue {
  flex: 1;
  text-align: right;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.NetBtns {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.btn-Net {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background-color: rgba(0, 0, 0, 0.25);
  color: rgba(255, 255, 255, 0.9);
}
.btn-Net:active {
  transform: scale(0.98);
}
.NetHint {
  margin-top: 6px;
  font-size: 10px;
  opacity: 0.75;
}

.WifiBox {
  position: absolute;
  left: 5%;
  top: 255px;
  width: 90%;
  color: rgba(255, 255, 255, 0.9);
}
.WifiTitle {
  font-size: 12px;
  opacity: 0.85;
  margin-bottom: 6px;
}
.WifiRow {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 6px 0;
}
.WifiHint, .WifiHint2 {
  font-size: 10px;
  opacity: 0.7;
}
.WifiSelect, .WifiPsk {
  width: 100%;
  margin-top: 6px;
}

</style>
