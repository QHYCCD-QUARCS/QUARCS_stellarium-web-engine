<template>
  <transition name="dialog">
    <div class="HotspotDialog" data-testid="ui-rpi-hotspot-root">
      <section class="PanelCard HeroCard">
        <div class="HotspotLine">
          <div class="HotspotSummary">
            <div class="HotspotName">{{ CurrentName || '-' }}</div>
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

          <div class="ApBadge">
            <v-icon color="#5f9cff">mdi-wifi</v-icon>
            <span>AP</span>
          </div>

          <div class="HotspotMode">
            <span class="StatusDot active"></span>
            <span>AP Active</span>
          </div>
        </div>

        <span v-show="isUpdated" class="TipsText">
          {{ $t('Please connect to the new hotspot in the mobile phone system settings, it will take about a minute to wait.') }}
        </span>
      </section>

      <section class="PanelCard StaCard">
        <div class="CardHead">
          <div class="StaTitleBlock">
            <div class="CardEyebrow">STA</div>
            <div class="StaHeadlineRow">
              <v-icon class="StaIcon" color="#59a7ff">mdi-wifi</v-icon>
              <div>
                <div class="StaHeadline">{{ currentStaTitle }}</div>
                <div class="StaSubline" :class="{ connected: isStaConnected, failed: Boolean(staErrorText) }">
                  <span class="StatusDot" :class="{ active: isStaConnected, failed: Boolean(staErrorText) }"></span>
                  <span>{{ staStatusText }}</span>
                </div>
              </div>
            </div>
          </div>
          <button class="custom-button GhostBtn ScanBtn no-select" @click="ScanWifi">
            <v-icon color="#6ee7f5">mdi-magnify</v-icon>
            <span>{{ wifiScanning ? 'Scanning' : 'Scan' }}</span>
          </button>
        </div>

        <div class="StaStatusPanel" :class="connectionStateClass">
          <div class="StaStatusMain">
            <span class="StatusDot" :class="{ active: isStaConnected, failed: Boolean(staErrorText), pending: isStaConnecting }"></span>
            <span>{{ connectionStateText }}</span>
          </div>
          <div class="StaStatusDetail">{{ connectionDetailText }}</div>
        </div>

        <div v-if="staErrorText" class="ErrorBanner">
          <v-icon color="#ff6978">mdi-alert-circle-outline</v-icon>
          <span>{{ staErrorText }}</span>
        </div>

        <div class="WifiForm">
          <div class="FormRow">
            <div class="FieldLabel">SSID</div>
            <v-select
              class="WifiSelect"
              :items="wifiItems"
              item-text="text"
              item-value="ssid"
              label=""
              v-model="wifiSelectedSsid"
              variant="outlined"
              hide-details
              dense
              :menu-props="{ offsetY: true, contentClass: 'WifiSelectMenu' }"
            >
              <template v-slot:selection="{ item }">
                <span class="WifiSelectionText">{{ item.ssid }}</span>
                <span v-if="item.connected" class="ConnectedMark">(已连接)</span>
              </template>
              <template v-slot:item="{ item }">
                <div class="WifiOption">
                  <span class="WifiOptionName">{{ item.ssid }}</span>
                  <span v-if="item.connected" class="ConnectedMark">(已连接)</span>
                  <span v-else-if="item.signalText" class="SignalText">{{ item.signalText }}</span>
                </div>
              </template>
            </v-select>
          </div>

          <div class="FormRow">
            <div class="FieldLabel">Password</div>
            <v-text-field
              class="WifiPsk"
              v-model="wifiPsk"
              variant="outlined"
              :type="showWifiPsk ? 'text' : 'password'"
              :append-icon="showWifiPsk ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append="showWifiPsk = !showWifiPsk"
              hide-details
            ></v-text-field>
          </div>

          <div class="FormRow">
            <div class="FieldLabel">IP address (optional)</div>
            <v-text-field
              class="WifiIp"
              :value="currentIpText"
              variant="outlined"
              readonly
              disabled
              hide-details
            ></v-text-field>
          </div>
        </div>

        <div class="ActionRow">
          <button class="custom-button PrimaryBtn ActionBtn no-select" @click="ConnectSta">
            <v-icon color="white">mdi-link</v-icon>
            <span>{{ wifiSaving ? 'Connecting' : 'Connect' }}</span>
          </button>
          <button class="custom-button GhostBtn ActionBtn no-select" @click="DisconnectSta">
            <v-icon color="#ff6978">mdi-link-off</v-icon>
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
      showWifiPsk: false,
      staFeedback: '',
      staErrorDetail: '',
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
    // 组件创建后主动同步一次网络状态，避免首次打开前显示默认 AP 状态
    this.RequestNetStatus();
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
        this.staFeedback = '已连接';
        this.staErrorDetail = '';
        this.StopStaPolling();
      } else if (this.staPollAttemptsLeft > 0) {
        this.ScheduleStaPoll();
      } else if (this.staFeedback === 'Waiting for IP') {
        this.staFeedback = '连接失败';
        this.staErrorDetail = '连接超时，未获取到 IP 地址';
      }
    },

    OnNetModeResult(res) {
      this.netBusy = false;
      if (res && res.result === 'ok') {
        this.$bus.$emit('SendConsoleLogMsg', `NetMode ${res.mode} OK`, 'info');
        if (res.mode === 'wan') {
          this.staFeedback = 'Waiting for IP';
          this.staErrorDetail = '';
          this.StartStaPolling();
        } else if (res.mode === 'ap') {
          this.staFeedback = '未连接';
          this.staErrorDetail = '';
          this.StopStaPolling();
        }
      } else {
        const detail = (res && res.detail) ? res.detail : '';
        if (detail === 'busy') {
          this.$bus.$emit('SendConsoleLogMsg', 'Network settings are already being changed. Duplicate request ignored.', 'warning');
          this.staFeedback = '忙碌中';
          this.staErrorDetail = '网络设置正在变更，请稍后再试';
        } else {
          this.$bus.$emit('SendConsoleLogMsg', `NetMode ${res ? res.mode : ''} FAIL ${detail}`, 'warning');
          this.staFeedback = '连接失败';
          this.staErrorDetail = this.FormatFailureReason(detail);
        }
        this.StopStaPolling();
      }
      this.RequestNetStatus();
    },

    SwitchToWAN() {
      if (this.netBusy || this.wifiSaving) {
        this.$bus.$emit('SendConsoleLogMsg', 'Network settings are already being changed. Duplicate request ignored.', 'warning');
        return;
      }
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
      if (this.netBusy || this.wifiSaving) {
        this.$bus.$emit('SendConsoleLogMsg', 'Network settings are already being changed. Duplicate request ignored.', 'warning');
        return;
      }
      this.netBusy = true;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'netMode:ap');
      this.$bus.$emit('SendConsoleLogMsg', 'Switch network -> AP', 'info');
    },

    ConnectSta() {
      this.staFeedback = '连接中';
      this.staErrorDetail = '';
      this.SaveUplinkWifi();
    },

    DisconnectSta() {
      if (this.netBusy) return;
      this.staFeedback = '断开中';
      this.staErrorDetail = '';
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
      if (this.wifiSaving || this.netBusy) {
        this.$bus.$emit('SendConsoleLogMsg', 'Network settings are already being changed. Duplicate request ignored.', 'warning');
        return;
      }
      if (!this.wifiSelectedSsid) {
        this.$bus.$emit('SendConsoleLogMsg', 'Please choose SSID', 'warning');
        this.staFeedback = '请选择 SSID';
        this.staErrorDetail = '请选择要连接的 Wi-Fi';
        return;
      }
      if (!this.wifiPsk) {
        this.$bus.$emit('SendConsoleLogMsg', 'Please input password', 'warning');
        this.staFeedback = '请输入密码';
        this.staErrorDetail = '请输入 Wi-Fi 密码';
        return;
      }
      const payloadObj = { name: this.uplinkProfile, ssid: this.wifiSelectedSsid, psk: this.wifiPsk };
      const b64 = this.b64EncodeUtf8(JSON.stringify(payloadObj));
      if (!b64) {
        this.$bus.$emit('SendConsoleLogMsg', 'Encode WiFi payload failed', 'warning');
        this.staFeedback = '连接失败';
        this.staErrorDetail = 'Wi-Fi 配置编码失败';
        return;
      }
      this.wifiSaving = true;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'wifiSaveB64|' + b64);
      this.$bus.$emit('SendConsoleLogMsg', 'WiFi uplink saved request sent', 'info');
      if (this.isPreferredApSta) {
        this.netBusy = true;
        this.staFeedback = '连接中';
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
      this.netBusy = false;
      if (res && res.result === 'ok') {
        this.$bus.$emit('SendConsoleLogMsg', 'WiFi uplink saved OK', 'info');
        this.staFeedback = this.isPreferredApSta ? 'Waiting for IP' : '已保存';
        this.staErrorDetail = '';
        this.RequestNetStatus();
        this.StartStaPolling();
      } else {
        const detail = (res && res.detail) ? res.detail : '';
        if (detail === 'busy') {
          this.$bus.$emit('SendConsoleLogMsg', 'Network settings are already being changed. Duplicate request ignored.', 'warning');
          this.staFeedback = '忙碌中';
          this.staErrorDetail = '网络设置正在变更，请稍后再试';
        } else {
          this.$bus.$emit('SendConsoleLogMsg', 'WiFi uplink save FAIL ' + detail, 'warning');
          this.staFeedback = '连接失败';
          this.staErrorDetail = this.FormatFailureReason(detail);
        }
        this.StopStaPolling();
      }
    },
    FormatFailureReason(detail) {
      const text = String(detail || '').trim();
      if (!text) return '未返回失败原因';
      if (text === 'bad_password') return '密码错误';
      if (text === 'not_found') return '未找到该 Wi-Fi';
      if (text === 'timeout') return '连接超时';
      if (text === 'busy') return '网络设置正在变更，请稍后再试';
      return text;
    },
    NormalizeSsidForMatch(ssid) {
      return String(ssid || '')
        .trim()
        .replace(/\s+\d{1,3}%$/, '')
        .trim();
    },
    IsConnectedSsid(ssid) {
      return Boolean(this.connectedStaSsid && this.NormalizeSsidForMatch(ssid) === this.NormalizeSsidForMatch(this.connectedStaSsid));
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
        text: this.IsConnectedSsid(x.ssid) ? `${x.ssid} (已连接)` : `${x.ssid}  ${x.signal || 0}%`,
        signalText: `${x.signal || 0}%`,
        connected: this.IsConnectedSsid(x.ssid)
      }));

      const seen = new Set(mapped.map(x => x.ssid));
      const injectSsid = (ssid) => {
        if (!ssid || seen.has(ssid)) return;
        seen.add(ssid);
        mapped.unshift({
          ssid,
          text: this.IsConnectedSsid(ssid) ? `${ssid} (已连接)` : ssid,
          signalText: '',
          connected: this.IsConnectedSsid(ssid)
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
    isStaConnecting() {
      return Boolean(this.wifiSaving || this.netBusy || this.staPollAttemptsLeft > 0 || this.staFeedback === 'Waiting for IP');
    },
    connectedStaSsid() {
      return this.isStaConnected && this.netStatus && this.netStatus.sta_ssid
        ? this.netStatus.sta_ssid
        : '';
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
    staErrorText() {
      return this.staErrorDetail ? `连接失败：${this.staErrorDetail}` : '';
    },
    connectionStateClass() {
      if (this.staErrorText) return 'failed';
      if (this.isStaConnected) return 'connected';
      if (this.isStaConnecting) return 'pending';
      return 'idle';
    },
    connectionStateText() {
      if (this.staErrorText) return '连接失败';
      if (this.isStaConnected) return 'Wi-Fi 已连接';
      if (this.isStaConnecting) return '正在连接 Wi-Fi';
      if (this.savedStaSsid) return 'Wi-Fi 未连接，已保存配置';
      return 'Wi-Fi 未连接';
    },
    connectionDetailText() {
      if (this.staErrorText) return this.staErrorDetail;
      if (this.isStaConnected) {
        const ip = this.currentIpText ? ` · IP ${this.currentIpText}` : '';
        return `${this.connectedStaSsid}${ip}`;
      }
      if (this.isStaConnecting) {
        const ssid = this.wifiSelectedSsid || this.savedStaSsid || this.currentStaTitle;
        return ssid ? `目标网络：${ssid}` : '正在等待网络状态更新';
      }
      if (this.savedStaSsid) return `保存的网络：${this.savedStaSsid}`;
      return '请选择 SSID 并输入密码';
    },
    staStatusText() {
      if (this.isStaConnected) return '已连接';
      if (this.staErrorDetail) return '连接失败';
      if (this.staFeedback) return this.staFeedback;
      if (this.netBusy) return '切换中';
      if (this.wifiSaving) return '连接中';
      if (this.netStatus && this.netStatus.wpa_state) {
        return this.netStatus.wpa_state.replace(/_/g, ' ');
      }
      return this.savedStaSsid ? '已保存' : '未连接';
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
  --dialog-top: clamp(36px, 5vh, 58px);
  --dialog-width: min(88vw, 680px);
  --dialog-pad: clamp(10px, 1.4vw, 16px);
  --card-pad-y: clamp(12px, 1.55vw, 18px);
  --card-pad-x: clamp(14px, 2vw, 22px);
  --card-radius: clamp(14px, 1.7vw, 18px);
  --gap: clamp(10px, 1.35vw, 14px);
  --title-size: clamp(20px, 2.2vw, 26px);
  --body-size: clamp(12px, 1.25vw, 15px);
  --small-size: clamp(11px, 1.05vw, 13px);
  --control-height: clamp(44px, 5.2vh, 54px);
  --ap-size: clamp(48px, 6.4vw, 64px);
  pointer-events: auto;
  position: fixed;
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: auto;
  left: 50%;
  top: var(--dialog-top);
  width: var(--dialog-width);
  max-height: calc(100vh - var(--dialog-top) - 12px);
  padding: var(--dialog-pad);
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  transform: translateX(-50%);
  border-radius: calc(var(--card-radius) + 4px);
  border: 1px solid rgba(132, 162, 214, 0.38);
  background: rgba(9, 16, 33, 0.88);
  backdrop-filter: blur(16px);
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.44);
}

.dialog-enter-active {
  animation: showPanelAnimation 0.3s forwards;
}

.dialog-leave-active {
  animation: hidePanelAnimation 0.3s forwards;
}

@keyframes showPanelAnimation {
  from {
    top: calc(var(--dialog-top) - 60px);
    opacity: 0;
    transform: translateX(-50%) scale(0.98);
  }

  to {
    top: var(--dialog-top);
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
}

@keyframes hidePanelAnimation {
  from {
    top: var(--dialog-top);
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
  padding: var(--card-pad-y) var(--card-pad-x);
  border-radius: var(--card-radius);
  background: linear-gradient(145deg, rgba(17, 29, 56, 0.72), rgba(8, 14, 30, 0.76));
  border: 1px solid rgba(120, 148, 197, 0.34);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.HeroCard {
  min-height: clamp(76px, 13vh, 92px);
}

.CardHead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--gap);
  margin-bottom: var(--gap);
}

.CardEyebrow {
  font-size: var(--small-size);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(133, 176, 235, 0.78);
}

.HotspotLine {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 1.18fr) auto;
  grid-template-areas:
    "summary editor badge"
    "status editor badge";
  align-items: center;
  column-gap: var(--gap);
  row-gap: 6px;
}

.HotspotSummary {
  grid-area: summary;
  min-width: 0;
}

.HotspotName,
.StaHeadline {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.96);
  font-size: var(--title-size);
  line-height: 1.15;
  font-weight: 800;
  word-break: break-word;
}

.HotspotMode,
.StaSubline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 0;
  color: rgba(153, 255, 210, 0.95);
  font-size: var(--small-size);
}

.HotspotMode {
  grid-area: status;
  width: fit-content;
  max-width: 100%;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(79, 240, 164, 0.28);
  background: rgba(79, 240, 164, 0.08);
  white-space: nowrap;
}

.StaSubline {
  margin-top: 6px;
  color: rgba(190, 202, 224, 0.82);
}

.StaSubline.connected {
  color: rgba(153, 255, 210, 0.95);
}

.StaSubline.failed {
  color: rgba(255, 132, 148, 0.96);
}

.StatusDot {
  width: clamp(8px, 1vw, 10px);
  height: clamp(8px, 1vw, 10px);
  border-radius: 50%;
  background: rgba(190, 202, 224, 0.5);
}

.StatusDot.active {
  background: #4ff0a4;
  box-shadow: 0 0 14px rgba(79, 240, 164, 0.65);
}

.StatusDot.failed {
  background: #ff6978;
  box-shadow: 0 0 14px rgba(255, 105, 120, 0.55);
}

.StatusDot.pending {
  background: #ffd36d;
  box-shadow: 0 0 14px rgba(255, 211, 109, 0.5);
}

.ApBadge {
  grid-area: badge;
  width: var(--ap-size);
  height: var(--ap-size);
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 50%;
  border: 1px solid rgba(126, 159, 214, 0.52);
  color: #72b7ff;
  font-size: var(--small-size);
  font-weight: 700;
  background: rgba(255, 255, 255, 0.04);
}

.NameEditor {
  grid-area: editor;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.NameEdit,
.WifiSelect,
.WifiPsk,
.WifiIp {
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
  min-height: clamp(36px, 4.8vh, 40px);
  border-radius: clamp(10px, 1.4vw, 12px);
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
  padding: 0 clamp(12px, 1.8vw, 16px);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(116, 145, 194, 0.36);
}

.PrimaryBtn {
  padding: 0 clamp(14px, 2vw, 18px);
  background: linear-gradient(135deg, #286bff, #21c7bd);
  box-shadow: 0 14px 30px rgba(45, 123, 255, 0.28);
}

.custom-button:active {
  transform: scale(0.98);
}

.TipsText {
  display: block;
  margin-top: 16px;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(255, 185, 185, 0.95);
}

.StaTitleBlock {
  min-width: 0;
}

.StaHeadlineRow {
  display: flex;
  align-items: center;
  gap: var(--gap);
  margin-top: 8px;
}

.StaIcon {
  font-size: clamp(30px, 4.4vw, 38px);
}

.ScanBtn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #75eaff;
  border-color: rgba(56, 113, 255, 0.72);
}

.ErrorBanner {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: -4px 0 var(--gap);
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 105, 120, 0.32);
  background: rgba(255, 105, 120, 0.1);
  color: rgba(255, 202, 208, 0.98);
  font-size: var(--body-size);
}

.StaStatusPanel {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--gap);
  margin: -6px 0 var(--gap);
  padding: 9px 12px;
  border-radius: 12px;
  border: 1px solid rgba(116, 145, 194, 0.3);
  background: rgba(255, 255, 255, 0.035);
}

.StaStatusPanel.connected {
  border-color: rgba(79, 240, 164, 0.32);
  background: rgba(79, 240, 164, 0.09);
}

.StaStatusPanel.pending {
  border-color: rgba(255, 211, 109, 0.34);
  background: rgba(255, 211, 109, 0.08);
}

.StaStatusPanel.failed {
  border-color: rgba(255, 105, 120, 0.34);
  background: rgba(255, 105, 120, 0.1);
}

.StaStatusMain {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.94);
  font-size: var(--body-size);
  font-weight: 700;
  white-space: nowrap;
}

.StaStatusDetail {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(199, 213, 238, 0.78);
  font-size: var(--small-size);
  white-space: nowrap;
}

.WifiForm {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(116, 145, 194, 0.28);
}

.FormRow {
  display: grid;
  grid-template-columns: minmax(128px, 28%) minmax(0, 1fr);
  align-items: center;
  min-height: var(--control-height);
  background: rgba(255, 255, 255, 0.025);
  border-bottom: 1px solid rgba(116, 145, 194, 0.22);
}

.FormRow:last-child {
  border-bottom: none;
}

.FormRow > .v-input {
  min-width: 0;
}

.FieldLabel {
  padding: 0 clamp(12px, 1.8vw, 16px);
  color: rgba(199, 213, 238, 0.9);
  font-size: var(--body-size);
}

.WifiSelectionText,
.WifiOptionName {
  color: rgba(255, 255, 255, 0.96);
}

.WifiOption {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.WifiOptionName {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ConnectedMark {
  color: #4ff0a4;
  font-weight: 700;
  white-space: nowrap;
}

.SignalText {
  margin-left: auto;
  color: rgba(185, 201, 226, 0.68);
  white-space: nowrap;
}

.mono {
  font-family: monospace;
}

.ActionRow {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--gap);
  margin-top: var(--gap);
}

.ActionBtn {
  width: 100%;
  min-height: var(--control-height);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font-size: var(--body-size);
  font-weight: 800;
}

.CompactInfo {
  margin-top: 10px;
  min-height: 20px;
  color: rgba(255, 255, 255, 0.62);
  font-size: var(--small-size);
  line-height: 1.4;
}

::v-deep .WifiForm .v-input__slot {
  min-height: var(--control-height) !important;
  margin-bottom: 0;
  border-radius: 0 !important;
  background: rgba(255, 255, 255, 0.015) !important;
}

::v-deep .WifiForm .v-input__control {
  width: 100%;
}

::v-deep .WifiForm fieldset {
  border-color: transparent !important;
}

::v-deep .WifiForm input,
::v-deep .WifiForm .v-select__selection {
  color: rgba(255, 255, 255, 0.96) !important;
  font-size: var(--body-size);
}

::v-deep .WifiForm .v-icon {
  color: rgba(221, 230, 247, 0.92) !important;
}

::v-deep .ApBadge .v-icon {
  font-size: clamp(22px, 3vw, 30px);
}

@container (max-width: 560px) {
  .HotspotLine {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "summary badge"
      "status badge"
      "editor editor";
    align-items: center;
  }

  .NameEditor {
    margin-top: 2px;
  }
}

@media (max-width: 720px) {
  .HotspotDialog {
    --dialog-top: clamp(8px, 2vh, 14px);
    --dialog-width: calc(100vw - 20px);
    --dialog-pad: 10px;
    --card-pad-y: 12px;
    --card-pad-x: 12px;
    --gap: 10px;
    --title-size: clamp(18px, 5.1vw, 22px);
    --body-size: clamp(13px, 3.7vw, 15px);
    --small-size: clamp(11px, 3.25vw, 13px);
    --control-height: 48px;
    --ap-size: 52px;
    width: calc(100vw - 20px);
    max-height: calc(100vh - 20px);
  }

  .FormRow {
    grid-template-columns: 1fr;
  }

  .HotspotLine {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "summary badge"
      "status badge"
      "editor editor";
  }

  .HotspotSummary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .ApBadge {
    justify-self: end;
  }

  .CardHead {
    flex-direction: column;
    align-items: stretch;
  }

  .ScanBtn {
    width: 100%;
    justify-content: center;
  }

  .StaHeadlineRow {
    gap: 10px;
  }

  .StaStatusPanel {
    grid-template-columns: 1fr;
    gap: 6px;
    margin: -4px 0 10px;
    padding: 10px 12px;
  }

  .StaStatusMain,
  .StaStatusDetail {
    white-space: normal;
  }

  .FieldLabel {
    padding: 10px 12px 0;
  }

  .StaIcon {
    font-size: 30px;
  }

  .ActionRow {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-top: 12px;
  }

  .ActionBtn {
    min-height: var(--control-height);
  }

  ::v-deep .WifiForm .v-input__slot {
    min-height: 48px !important;
  }

  ::v-deep .WifiForm input,
  ::v-deep .WifiForm .v-select__selection {
    font-size: var(--body-size);
  }
}
</style>
