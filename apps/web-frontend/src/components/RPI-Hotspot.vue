<template>
  <transition name="dialog">
    <div class="HotspotDialog" :style="{ top: top + 'px' }" data-testid="ui-rpi-hotspot-root">
      <section class="PanelCard HeroCard">
        <div class="CardHead">
          <div>
            <div class="CardEyebrow">Hotspot</div>
            <div class="HotspotName">{{ CurrentName || '-' }}</div>
          </div>
          <div class="StateChip" :class="{ online: isStaConnected }">
            {{ isStaConnected ? 'AP + STA' : 'AP' }}
          </div>
        </div>

        <div class="NameEditor">
          <v-text-field
            class="NameEdit"
            label="Hotspot Name"
            v-model="InputText"
            variant="outlined"
            hide-details
            data-testid="ui-rpi-hotspot-input-input-text"
          ></v-text-field>

          <div v-show="isEdited || SaveBtnSelect" class="HotspotEditBar">
            <button class="custom-button IconBtn no-select" @click="RedoHotspotName" data-testid="ui-rpi-hotspot-btn-redo-hotspot-name">
              <v-icon color="rgba(255, 255, 255, 0.88)">mdi-refresh</v-icon>
            </button>

            <button class="custom-button IconBtn no-select" :class="{ active: SaveBtnSelect }" @click="SaveBtnClick" data-testid="ui-rpi-hotspot-btn-save-btn-click">
              <v-icon v-if="!SaveBtnSelect" color="rgba(255, 255, 255, 0.88)">mdi-pencil</v-icon>
              <v-icon v-else color="rgba(255, 255, 255, 0.88)">mdi-close</v-icon>
            </button>

            <button
              v-show="SaveBtnSelect"
              class="custom-button PrimaryBtn no-select"
              @click="UpdateHotspotName"
              data-testid="ui-rpi-hotspot-btn-update-hotspot-name"
            >
              Apply
            </button>
          </div>
        </div>

        <span v-show="isUpdated" class="TipsText">
          {{ $t('Please connect to the new hotspot in the mobile phone system settings, it will take about a minute to wait.') }}
        </span>
      </section>

      <section class="PanelCard StaCard">
        <div class="CardHead">
          <div>
            <div class="CardEyebrow">STA</div>
            <div class="StaHeadline">{{ currentStaTitle }}</div>
          </div>
          <button class="custom-button GhostBtn no-select" @click="ScanWifi">
            <span>{{ wifiScanning ? 'Scanning' : 'Scan' }}</span>
          </button>
        </div>

        <div class="StaMetaRow">
          <div class="MetaChip">{{ staStatusText }}</div>
          <div v-if="savedStaSsid" class="MetaChip">{{ savedStaSsid }}</div>
          <div v-if="currentIpText" class="MetaChip mono">{{ currentIpText }}</div>
        </div>

        <v-select
          class="WifiSelect"
          :items="wifiItems"
          item-text="text"
          item-value="ssid"
          label="SSID"
          v-model="wifiSelectedSsid"
          variant="outlined"
          hide-details
          dense
        ></v-select>

        <v-text-field
          class="WifiPsk"
          label="Password"
          v-model="wifiPsk"
          variant="outlined"
          type="password"
          hide-details
        ></v-text-field>

        <div class="ActionRow">
          <button class="custom-button PrimaryBtn ActionBtn no-select" @click="ConnectSta">
            <span>{{ wifiSaving ? 'Connecting' : 'Connect' }}</span>
          </button>
          <button class="custom-button GhostBtn ActionBtn no-select" @click="DisconnectSta">
            <span>{{ netBusy ? 'Disconnecting' : 'Disconnect' }}</span>
          </button>
        </div>

        <div class="CompactInfo">
          <span>{{ compactHintText }}</span>
        </div>
      </section>
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
      netStatus: {},
      netBusy: false,
      uplinkProfile: 'wan-uplink',
      wifiScanning: false,
      wifiSaving: false,
      wifiScanResults: [],
      wifiSelectedSsid: '',
      wifiPsk: '',
      staFeedback: '',
      staPollTimer: null,
      staPollAttemptsLeft: 0,
    };
  },
  beforeDestroy() {
    this.StopStaPolling();
  },
  created() {
    this.$bus.$on('HotspotName', this.CurrentHotspotName);
    this.$bus.$on('EditHotspotNameSuccess', this.UpdateSuccess);
    this.$bus.$on('NetStatus', this.OnNetStatus);
    this.$bus.$on('NetModeResult', this.OnNetModeResult);
    this.$bus.$on('WiFiScan', this.OnWiFiScan);
    this.$bus.$on('WiFiSaveResult', this.OnWiFiSaveResult);
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
      this.SaveBtnSelect = false;
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
      this.SyncSavedStaToForm();
      if (this.isStaConnected) {
        this.staFeedback = 'Connected';
        this.StopStaPolling();
      } else if (this.staPollAttemptsLeft > 0) {
        this.ScheduleStaPoll();
      }
    },

    OnNetModeResult(res) {
      this.netBusy = false;
      if (res && res.result === 'ok') {
        this.$bus.$emit('SendConsoleLogMsg', `NetMode ${res.mode} OK`, 'info');
        if (res.mode === 'wan') {
          this.staFeedback = 'Waiting for IP';
          this.StartStaPolling();
        } else if (res.mode === 'ap') {
          this.staFeedback = 'Disconnected';
          this.StopStaPolling();
        }
      } else {
        const detail = (res && res.detail) ? res.detail : '';
        this.$bus.$emit('SendConsoleLogMsg', `NetMode ${res ? res.mode : ''} FAIL ${detail}`, 'warning');
        this.staFeedback = 'Failed';
        this.StopStaPolling();
      }
      this.RequestNetStatus();
    },

    SwitchToWAN() {
      const prompt = this.isPreferredApSta
        ? 'Connect STA uplink now?'
        : 'Enter WAN will turn off hotspot and may disconnect your phone. Continue?';
      const ok = window.confirm(prompt);
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

    ConnectSta() {
      this.staFeedback = 'Saving';
      this.SaveUplinkWifi();
    },

    DisconnectSta() {
      if (this.netBusy) return;
      this.staFeedback = 'Disconnecting';
      this.SwitchToAP();
    },

    b64EncodeUtf8(str) {
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
      this.SyncSavedStaToForm();
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
      if (this.isPreferredApSta) {
        this.netBusy = true;
        this.staFeedback = 'Connecting';
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'netMode:wan');
      }
    },

    OnWiFiSaveResult(res) {
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
        this.staFeedback = this.isPreferredApSta ? 'Profile saved' : 'Saved';
        this.RequestNetStatus();
        if (!this.isPreferredApSta) {
          this.StartStaPolling();
        }
      } else {
        const detail = (res && res.detail) ? res.detail : '';
        this.$bus.$emit('SendConsoleLogMsg', 'WiFi uplink save FAIL ' + detail, 'warning');
        this.netBusy = false;
        this.staFeedback = 'Save failed';
        this.StopStaPolling();
      }
    },
    NormalizeSsidForMatch(ssid) {
      return String(ssid || '')
        .trim()
        .replace(/\s+\d{1,3}%$/, '')
        .trim();
    },
    GetSavedWifiProfile(ssid) {
      if (!ssid) return null;
      const exact = this.savedStaProfiles.find(x => x && x.ssid === ssid);
      if (exact) return exact;
      const normalized = this.NormalizeSsidForMatch(ssid);
      return this.savedStaProfiles.find(x => this.NormalizeSsidForMatch(x && x.ssid) === normalized) || null;
    },
    GetSavedWifiPassword(ssid) {
      const profile = this.GetSavedWifiProfile(ssid);
      if (profile && profile.psk) {
        return profile.psk;
      }
      if (ssid === this.savedStaSsid && this.savedStaPsk) {
        return this.savedStaPsk;
      }
      return '';
    },
    SyncSavedStaToForm() {
      const savedSsid = this.savedStaSsid;
      if (!savedSsid) return;

      if (!this.wifiSelectedSsid) {
        this.wifiSelectedSsid = savedSsid;
      }
      this.wifiPsk = this.GetSavedWifiPassword(this.wifiSelectedSsid);
    },
    StartStaPolling() {
      this.staPollAttemptsLeft = 6;
      this.ScheduleStaPoll();
    },
    ScheduleStaPoll() {
      this.StopStaPolling();
      if (this.staPollAttemptsLeft <= 0 || this.isStaConnected) {
        return;
      }
      this.staPollTimer = window.setTimeout(() => {
        this.staPollAttemptsLeft -= 1;
        this.RequestNetStatus();
      }, 2000);
    },
    StopStaPolling() {
      if (this.staPollTimer) {
        window.clearTimeout(this.staPollTimer);
        this.staPollTimer = null;
      }
      this.staPollAttemptsLeft = 0;
    },
  },
  computed: {
    isEdited() {
      return this.InputText !== this.CurrentName;
    },
    wifiItems() {
      const list = (this.wifiScanResults || []).slice().sort((a, b) => (b.signal || 0) - (a.signal || 0));
      const mapped = list.map(x => ({
        ssid: x.ssid,
        text: `${x.ssid}  ${x.signal || 0}%`
      }));

      const seen = new Set(mapped.map(x => x.ssid));
      const injectSsid = (ssid) => {
        if (!ssid || seen.has(ssid)) return;
        seen.add(ssid);
        mapped.unshift({
          ssid,
          text: ssid
        });
      };

      injectSsid(this.netStatus && this.netStatus.sta_ssid);
      injectSsid(this.savedStaSsid);
      injectSsid(this.wifiSelectedSsid);

      return mapped;
    },
    isPreferredApSta() {
      return this.netStatus && this.netStatus.stack === 'ap_sta_systemd';
    },
    isStaConnected() {
      return Boolean(this.netStatus && this.netStatus.sta_ssid && this.netStatus.wlan_ip);
    },
    savedStaSsid() {
      return this.netStatus && this.netStatus.saved_sta_ssid
        ? this.netStatus.saved_sta_ssid
        : '';
    },
    savedStaPsk() {
      return this.netStatus && this.netStatus.saved_sta_psk
        ? this.netStatus.saved_sta_psk
        : '';
    },
    savedStaProfiles() {
      const arr = this.netStatus && Array.isArray(this.netStatus.saved_sta_profiles)
        ? this.netStatus.saved_sta_profiles
        : [];
      return arr
        .filter(x => x && x.ssid)
        .map(x => ({
          ssid: String(x.ssid || ''),
          psk: String(x.psk || ''),
          name: String(x.name || '')
        }));
    },
    currentStaTitle() {
      return this.netStatus && this.netStatus.sta_ssid
        ? this.netStatus.sta_ssid
        : (this.savedStaSsid || 'Not connected');
    },
    staStatusText() {
      if (this.isStaConnected) return 'Connected';
      if (this.staFeedback) return this.staFeedback;
      if (this.netBusy) return 'Switching';
      if (this.wifiSaving) return 'Connecting';
      if (this.netStatus && this.netStatus.wpa_state) {
        return this.netStatus.wpa_state.replace(/_/g, ' ');
      }
      return this.savedStaSsid ? 'Saved' : 'Idle';
    },
    currentIpText() {
      if (this.netStatus && this.netStatus.wlan_ip) return this.netStatus.wlan_ip;
      if (this.netStatus && this.netStatus.gateway) return this.netStatus.gateway;
      return '';
    },
    compactHintText() {
      if (this.isPreferredApSta) {
        return this.isStaConnected ? 'Hotspot stays on while STA is online' : 'Saved config will auto-fill for the same SSID';
      }
      return 'Connect may switch network mode';
    }
  },
  watch: {
    wifiSelectedSsid(val) {
      this.wifiPsk = this.GetSavedWifiPassword(val);
    }
  }
};
</script>

<style scoped>
.HotspotDialog {
  pointer-events: auto;
  position: fixed;
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: auto;
  left: 50%;
  width: min(92vw, 560px);
  max-height: calc(100vh - 70px);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transform: translateX(-50%);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background:
    radial-gradient(circle at top left, rgba(99, 164, 255, 0.2), transparent 40%),
    radial-gradient(circle at bottom right, rgba(60, 214, 176, 0.18), transparent 34%),
    rgba(20, 24, 33, 0.82);
  backdrop-filter: blur(16px);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
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
    opacity: 0;
    transform: translateX(-50%) scale(0.98);
  }

  to {
    top: 45px;
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
}

@keyframes hidePanelAnimation {
  from {
    top: 45px;
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }

  to {
    top: -60px;
    opacity: 0;
    transform: translateX(-50%) scale(0.98);
  }
}

.PanelCard {
  padding: 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.CardHead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.CardEyebrow {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

.HotspotName,
.StaHeadline {
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.96);
  font-size: 24px;
  line-height: 1.15;
  font-weight: 700;
  word-break: break-word;
}

.StateChip,
.MetaChip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.86);
  font-size: 12px;
  white-space: nowrap;
}

.StateChip.online {
  background: rgba(60, 214, 176, 0.16);
  border-color: rgba(60, 214, 176, 0.32);
}

.NameEditor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.NameEdit,
.WifiSelect,
.WifiPsk {
  width: 100%;
}

.HotspotEditBar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.IconBtn,
.GhostBtn,
.PrimaryBtn {
  min-height: 40px;
  border-radius: 12px;
  border: none;
  color: rgba(255, 255, 255, 0.92);
  transition: transform 0.18s ease, background-color 0.18s ease, border-color 0.18s ease;
}

.IconBtn {
  width: 40px;
  min-width: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.IconBtn.active {
  background: rgba(255, 126, 126, 0.18);
  border-color: rgba(255, 126, 126, 0.32);
}

.GhostBtn {
  padding: 0 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.PrimaryBtn {
  padding: 0 18px;
  background: linear-gradient(135deg, rgba(80, 146, 255, 0.95), rgba(61, 203, 170, 0.9));
  box-shadow: 0 10px 24px rgba(61, 132, 255, 0.22);
}

.custom-button:active {
  transform: scale(0.98);
}

.TipsText {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(255, 185, 185, 0.95);
}

.StaMetaRow {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.mono {
  font-family: monospace;
}

.ActionRow {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.ActionBtn {
  width: 100%;
}

.CompactInfo {
  margin-top: 12px;
  min-height: 20px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 12px;
  line-height: 1.4;
}

@media (max-width: 600px) {
  .HotspotDialog {
    width: 94vw;
    max-height: calc(100vh - 56px);
    padding: 14px;
    gap: 12px;
    border-radius: 18px;
  }

  .PanelCard {
    padding: 14px;
    border-radius: 16px;
  }

  .HotspotName,
  .StaHeadline {
    font-size: 20px;
  }

  .CardHead {
    flex-direction: column;
    align-items: stretch;
  }

  .ActionRow {
    grid-template-columns: 1fr;
  }
}
</style>
