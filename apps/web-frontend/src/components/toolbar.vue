// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

<template>
  <div id="toolbar-image" data-testid="tb-root">
    <v-toolbar height="40px" elevation="0" class="transparent" dense>
      <v-app-bar-nav-icon @click="toggleNavigationDrawer" data-testid="tb-act-toggle-navigation-drawer"></v-app-bar-nav-icon>
      <img class="tbtitle hidden-xs-only" id="stellarium-web-toolbar-logo" src="@/assets/images/logo.svg" width="33" height="33"  style="pointer-events: none;" alt="Stellarium Web Logo"/>
      <span class="tbtitle hidden-xs-only">Q U A R C S</span>
      <v-spacer></v-spacer>
      <target-search v-show="isTargetSearchShow" style="width: 20%;"></target-search>
      <v-spacer></v-spacer>
      <div>
        <div class="subheader text-subtitle-2 pr-2" style="user-select: none;">
          CPU T {{ cpuTemp !== null ? cpuTemp + '°C' : '--' }} <!-- 添加单位，并只在 cpuTemp 为 null 时显示 '--' -->
        </div>
        <div class="subheader text-subtitle-2 pr-2" style="user-select: none;">
          CPU U {{ cpuUsage !== null ? cpuUsage + '%' : '--' }} <!-- 添加单位，并只在 cpuUsage 为 null 时显示 '--' -->
        </div>
      </div>
      <div>
        <div v-if="$store.state.showFPS" class="subheader text-subtitle-2 pr-2" style="user-select: none;">
          FPS {{ renderFpsDisplay }}
        </div>
        <!-- 调试：同时展示 SDK / Render / UI 三路 FPS，便于对比后端 SDK 循环与前端实际刷新 -->
        <div
          v-if="showFpsDebug && $store.state.showFPS"
          class="text-caption pr-2"
          style="user-select: none; opacity: 0.85;"
        >
          SDK {{ sdkFpsDisplay }} / Proc {{ LiveProcessFPS }} / UI {{ uiFpsDisplay }}
        </div>
        <div class="subheader text-subtitle-2" style="user-select: none;">FOV {{ fov }}</div>
      </div>
      <!-- <v-btn class="transparent" v-if="!$store.state.showSidePanel" to="/p" data-testid="tb-btn-transparent">{{ $t('Observe') }}<v-icon>mdi-chevron-down</v-icon></v-btn> -->
      <!-- <v-menu v-if="$store.state.showTimeButtons" :close-on-content-click="false" transition="v-slide-y-transition" offset-y top left>
        <template v-slot:activator="{ on }">
          <button class="TimerPickBtn" v-on="on" data-testid="tb-btn-timer-pick-btn">
            <v-icon class="hidden-sm-and-up">mdi-clock-outline</v-icon>
            <span class="hidden-xs-only">
              <div class="text-subtitle-2">{{ time }}</div>
              <div class="text-subtitle-2">{{ date }}</div>
            </span>
          </button>
        </template>
        <date-time-picker v-model="pickerDate" :location="$store.state.currentLocation"></date-time-picker>
      </v-menu> -->

      <button class="TimerPickBtn" @click="toggleDateTimePicker">
        <v-icon class="hidden-sm-and-up">mdi-clock-outline</v-icon>
        <span class="hidden-xs-only">
          <div class="text-subtitle-2">{{ time }}</div>
          <div class="text-subtitle-2">{{ date }}</div>
        </span>
      </button>

      <span v-if="isConnect" @click="toggleRPIHotspotDialog">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/wifi.svg" height="30px" style="min-height: 30px; pointer-events: none;"></img>
        </div>
      </span>
      <span v-else @click="toggleRPIHotspotDialog">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/wifi_off.svg" height="30px" style="min-height: 30px; pointer-events: none;"></img>
        </div>
      </span>

      <card
        class="Card-Status"
        :style="{ width: openStatusCard ? '105px' : '30px' }"
        data-testid="tb-status-card"
        :data-state="openStatusCard ? 'open' : 'closed'"
        @click="toggleStatusCard"
      >

        <div
          style="position: absolute;"
          data-testid="tb-status-maincamera"
          :data-state="mainCameraStatusState"
          :style="{ top: openStatusCard ? '5px' : '0px', left: openStatusCard ? '5px' : '0px', width: openStatusCard ? '20px' : '15px', height: openStatusCard ? '20px' : '15px'}"
        >
          <span v-if="MainCameraInProgress&&MainCameraConnect">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/MainCamera-yellow.svg" :style="{height: openStatusCard ? '20px' : '15px'}" style="pointer-events: none;"></img>
            </div>
          </span>
          <span v-if="!MainCameraInProgress&&MainCameraConnect">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/MainCamera-green.svg" :style="{height: openStatusCard ? '20px' : '15px'}" style="pointer-events: none;"></img>
            </div>
          </span>
          <span v-if="!MainCameraConnect">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/MainCamera-white.svg" :style="{height: openStatusCard ? '20px' : '15px'}" style="pointer-events: none;"></img>
            </div>
          </span>
          
          <!-- <span v-if="...">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/MainCamera-red.svg" :style="{height: openStatusCard ? '20px' : '15px'}" style="pointer-events: none;"></img>
            </div>
          </span> -->
        </div>

        <div
          style="position: absolute;"
          data-testid="tb-status-mount"
          :data-state="mountStatusState"
          :style="{ top: openStatusCard ? '5px' : '0px', left: openStatusCard ? '30px' : '15px', width: openStatusCard ? '20px' : '15px', height: openStatusCard ? '20px' : '15px'}"
        >
          <!-- <span v-if="MountInProgress&&MountConnect">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/Mount-red.svg" :style="{height: openStatusCard ? '20px' : '15px'}" style="pointer-events: none;"></img>
            </div>
          </span> -->
          <span v-if="MountInProgress&&MountConnect">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/Mount-yellow.svg" :style="{height: openStatusCard ? '20px' : '15px'}" style="pointer-events: none;"></img>
            </div>
          </span>
          <span v-if="!MountInProgress&&MountConnect">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/Mount-green.svg" :style="{height: openStatusCard ? '20px' : '15px'}" style="pointer-events: none;"></img>
            </div>
          </span>
          <span v-if="!MountConnect">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/Mount-white.svg" :style="{height: openStatusCard ? '20px' : '15px'}" style="pointer-events: none;"></img>
            </div>
          </span>
        </div>

        <div
          style="position: absolute;"
          data-testid="tb-status-guider"
          :data-state="guiderStatusState"
          :style="{ top: openStatusCard ? '5px' : '15px', left: openStatusCard ? '55px' : '0px', width: openStatusCard ? '20px' : '15px', height: openStatusCard ? '20px' : '15px'}"
        >
          <span v-if="!GuiderConnect">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/Guider-white.svg" :style="{height: openStatusCard ? '20px' : '15px'}" style="pointer-events: none;"></img>
            </div>
          </span>
          <span v-if="GuiderConnect && GuiderInProgress && !GuiderError">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/Guider-yellow.svg" :style="{height: openStatusCard ? '20px' : '15px'}" style="pointer-events: none;"></img>
            </div>
          </span>
          <span v-if="GuiderConnect && !GuiderInProgress && !GuiderError">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/Guider-green.svg" :style="{height: openStatusCard ? '20px' : '15px'}" style="pointer-events: none;"></img>
            </div>
          </span>
          <span v-if="GuiderConnect && GuiderInProgress && GuiderError">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/Guider-red.svg" :style="{height: openStatusCard ? '20px' : '15px'}" style="pointer-events: none;"></img>
            </div>
          </span>
          <span v-if="GuiderConnect && !GuiderInProgress && GuiderError">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/Guider-green.svg" :style="{height: openStatusCard ? '20px' : '15px'}" style="pointer-events: none;"></img>
            </div>
          </span>
        </div>

        <div
          style="position: absolute;"
          data-testid="tb-status-focuser"
          :data-state="focuserStatusState"
          :style="{ top: openStatusCard ? '5px' : '15px', left: openStatusCard ? '80px' : '15px', width: openStatusCard ? '20px' : '15px', height: openStatusCard ? '20px' : '15px'}"
        >
          <span v-if="CurrentFocusStatus === 0">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/Focuser-white.svg" :style="{height: openStatusCard ? '20px' : '15px'}" style="pointer-events: none;"></img>
            </div>
          </span>
          <span v-if="CurrentFocusStatus === 1">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/Focuser-green.svg" :style="{height: openStatusCard ? '20px' : '15px'}" style="pointer-events: none;"></img>
            </div>
          </span>
          <span v-if="CurrentFocusStatus === 2">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/Focuser-yellow.svg" :style="{height: openStatusCard ? '20px' : '15px'}" style="pointer-events: none;"></img>
            </div>
          </span>
          <span v-if="CurrentFocusStatus === 3">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/Focuser-red.svg" :style="{height: openStatusCard ? '20px' : '15px'}" style="pointer-events: none;"></img>
            </div>
          </span>
        </div>

      </card>

      <button class="ScheduleBtn" @click="toggleSchedulePanel" data-testid="tb-btn-toggle-schedule-panel">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/schedule_table.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
        </div>
      </button>
      
    </v-toolbar>
  </div>
</template>

<script>

import TargetSearch from '@/components/target-search'
// import DateTimePicker from '@/components/date-time-picker.vue'
import Moment from 'moment'

export default {
  data: function () {
    return {
      isDrawerShow: false,
      isTargetSearchShow: true,
      isConnect: true,
      openStatusCard: false,

      MainCameraInProgress: false,
      MountInProgress: true,
      GuiderInProgress: false,
      
      CurrentFocusStatus: 0,

      MainCameraConnect: false,
      GuiderConnect: false,
      MountConnect: false,

      GuiderError: false,

      cpuTemp: null,
      cpuUsage: null,

      // Live模式下相机出图帧率（来自后端 SDK 的无限循环读取统计）
      liveCameraFps: null,
      // 后端处理帧率（以“进入FITS/PNG/瓦片处理链路”为准）
      liveProcessFps: null,
      // 当前拍摄模式
      captureMode: 'Single', // 'Single' | 'Live' | 'Burst'
      // UI 实际刷新 FPS（由画面绘制端统计并通过总线上报）
      frameUpdateFps: null,
    }
  },
  created() {
    this.$bus.$on('ShowTargetSearch', this.ShowTargetSearch);
    this.$bus.$on('HideTargetSearch', this.HideTargetSearch);
    this.$bus.$on('ShowNetStatus', this.ShowNetStatus);

    this.$bus.$on('MainCameraStatus',this.MainCameraStatus);
    this.$bus.$on('MountStatus',this.MountStatus);
    // this.$bus.$on('UpdateGuiderToolStatus', this.UpdateGuiderToolStatus);
    this.$bus.$on('GuiderConnected', this.GuiderConnected);
    this.$bus.$on('GuiderStop', this.GuiderStatusStop);
    this.$bus.$on('GuiderUpdateStatus', this.GuiderUpdateStatus);

    this.$bus.$on('MainCameraConnected', this.MainCameraConnected);
    this.$bus.$on('MountConnected', this.MountConnected);
    this.$bus.$on('FocuserConnected', this.FocuserConnected);
    this.$bus.$on('FocusInProgress', this.FocusStatus);

    this.$bus.$on('updateCPUInfo', this.updateCPUInfo);

    // 接收Live FPS和拍摄模式
    this.$bus.$on('LiveFPS', (fps) => {
      this.liveCameraFps = fps;
    });
    // 接收后端处理帧率
    this.$bus.$on('LiveProcessFPS', (fps) => {
      this.liveProcessFps = fps;
    })
    this.$bus.$on('SetCaptureMode', (mode) => {
      this.captureMode = String(mode || 'Single');
      // 如果切换到非Live模式，清空Live FPS
      if (this.captureMode !== 'Live') {
        this.liveCameraFps = null;
        this.liveProcessFps = null;
      }
    });

    // UI 刷新 FPS（由 App.vue 在每帧绘制完成时统计后上报）
    this.$bus.$on('UIFPS', (fps) => {
      if (typeof fps === 'number' && isFinite(fps)) {
        this.frameUpdateFps = fps
      }
    })
  },
  beforeDestroy() {
    // 解绑总线事件
    this.$bus.$off('UIFPS')
  },
  computed: {
    fov: function () {
      if (!this.$store.state.stel) return '-'
      const fov = this.$store.state.stel.fov * 180 / Math.PI
      return fov.toPrecision(3) + '°'
    },
    displayFps: function () {
      // 前端显示帧率：以 UI 实际刷新统计（UIFPS）为准
      if (this.frameUpdateFps != null && isFinite(this.frameUpdateFps)) return this.frameUpdateFps.toFixed(1)
      return '?'
    },
    // 调试：SDK / Render / UI 三路 FPS 文本
    sdkFpsDisplay () {
      if (this.liveCameraFps === null || this.liveCameraFps === undefined || !isFinite(this.liveCameraFps)) return '-'
      return this.liveCameraFps.toFixed(1)
    },
    uiFpsDisplay () {
      if (this.frameUpdateFps == null || !isFinite(this.frameUpdateFps)) return '-'
      return this.frameUpdateFps.toFixed(1)
    },
    procFpsDisplay () {
      if (this.liveProcessFps == null || !isFinite(this.liveProcessFps)) return '-'
      return this.liveProcessFps.toFixed(1)
    },
    mainCameraStatusState () {
      if (!this.MainCameraConnect) return 'disconnected'
      return this.MainCameraInProgress ? 'busy' : 'connected'
    },
    mountStatusState () {
      if (!this.MountConnect) return 'disconnected'
      return this.MountInProgress ? 'busy' : 'connected'
    },
    guiderStatusState () {
      if (!this.GuiderConnect) return 'disconnected'
      if (this.GuiderInProgress) return this.GuiderError ? 'error-busy' : 'busy'
      return this.GuiderError ? 'error' : 'connected'
    },
    focuserStatusState () {
      if (this.CurrentFocusStatus === 0) return 'disconnected'
      if (this.CurrentFocusStatus === 1) return 'connected'
      if (this.CurrentFocusStatus === 2) return 'busy'
      if (this.CurrentFocusStatus === 3) return 'error'
      return 'unknown'
    },
    // cpuTemp: function () {
    //   return this.$store.state.cpuTemp
    // },
    // cpuUsage: function () {
    //   return this.$store.state.cpuUsage
    // },

    time: {
      get: function () {
        return this.getLocalTime().format('HH:mm:ss')
      }
    },
    date: {
      get: function () {
        return this.getLocalTime().format('YYYY-MM-DD')
      }
    },
    pickerDate: {
      get: function () {
        const t = this.getLocalTime()
        t.milliseconds(0)
        return t.format()
      },
      set: function (v) {
        const m = Moment(v)
        m.local()
        m.milliseconds(this.getLocalTime().milliseconds())
        this.$stel.core.observer.utc = m.toDate().getMJD()
      }
    }
  },
  // mounted: function () {
  //   this.GetConnectedDevices();

  // },
  methods: {
    toggleNavigationDrawer: function () {
      this.$store.commit('toggleBool', 'showNavigationDrawer')
      // this.$bus.$emit('AppSendMessage', 'Vue_Command', 'localMessage');
    },

    getLocalTime: function () {
      var d = new Date()
      d.setMJD(this.$store.state.stel.observer.utc)
      const m = Moment(d)
      m.local()
      return m
    },

    ShowTargetSearch() {
      this.isTargetSearchShow = true;
    },

    HideTargetSearch() {
      this.isTargetSearchShow = false;
    },

    ShowNetStatus(status) {
      if(status === 'true')
      {
        this.isConnect = true;
      }
      else if(status === 'false')
      {
        this.isConnect = false;
      }
      else if(status === 'abnormal')
      {
        this.isConnect = false;
      }
      
    },

    toggleSchedulePanel() {
      this.$bus.$emit('toggleSchedulePanel');
    },

    toggleStatusCard() {
      this.openStatusCard = !this.openStatusCard;
    },

    toggleDateTimePicker() {
      this.$bus.$emit('toggleDateTimePicker');
    },

    toggleRPIHotspotDialog() {
      this.$bus.$emit('toggleRPIHotspotDialog');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'getHotspotName');
    },

    MainCameraStatus(status) {
      if(status === 'Exposuring') {
        this.MainCameraInProgress = true;
      } 
      else {
        this.MainCameraInProgress = false;
      }
    },

    // MountStatus(status) {
    //   if(status === 'Slewing') {
    //     this.MountInProgress = true;
    //   } 
    //   else {
    //     this.MountInProgress = false;
    //   }
    // },
    
    MountStatus(status) {
      if(status === 'Moving') {
        this.MountInProgress = true;
      } 
      else {
        this.MountInProgress = false;
      }
    },


    // UpdateGuiderToolStatus(connect, inProgress, error) {
    //   if(connect === 'true') {
    //     this.GuiderConnect = true;
    //   } else {
    //     this.GuiderConnect = false;
    //   }
    //   if(inProgress === 'true') {
    //     this.GuiderInProgress = true;
    //   } else {
    //     this.GuiderInProgress = false;
    //   }
    //   if(error === 'true') {
    //     this.GuiderError = true;
    //   } else {
    //     this.GuiderError = false;
    //   }
    // },

    FocusStatus(status) {
      if(status) {
        this.CurrentFocusStatus = 2;
      } else {
        this.CurrentFocusStatus = 1;
      }
    },

    GuiderStatusStop() {
      this.GuiderInProgress = false;
      this.GuiderError = false;
    },

    GuiderConnected(status) {
      if(status === 0) {
        this.GuiderConnect = false;
      } else {
        this.GuiderConnect = true;
      }
    },

    GuiderUpdateStatus(status) {
      if(status === 0) {
        this.GuiderInProgress = false;
        this.GuiderError = false;
      }
      else if(status === 1) {
        this.GuiderInProgress = true;
        this.GuiderError = false;
      }
      else if(status === 2) {
        this.GuiderInProgress = true;
        this.GuiderError = true;
      }
    },

    MainCameraConnected(num) {
      if(num === 0){
        this.MainCameraConnect = false;
      } else {
        this.MainCameraConnect = true;
      }
      console.log('MainCamera is Connected: ', num);
    },

    MountConnected(num) {
      if(num === 0){
        this.MountConnect = false;
      } else {
        this.MountConnect = true;
      }
      console.log('Mount is Connected: ', num);
    },

    FocuserConnected(num) {
      this.CurrentFocusStatus = num;
    },

    updateCPUInfo(cpuTemp, cpuUsage) {
      this.cpuTemp = cpuTemp;
      this.cpuUsage = cpuUsage;
      // console.log('CPU Temp: ', this.cpuTemp);
      // console.log('CPU Usage: ', this.cpuUsage);
    },

    // GetConnectedDevices() {
    //   this.$bus.$emit('GetConnectedDevices');
    // },

  },
  components: { 
    TargetSearch, 
    // DateTimePicker 
  }
}
</script>

<style>
#toolbar-image {
  background: url("../assets/images/header.png") center;
  background-position-x: 55px;
  background-position-y: 0px;
  height: 40px;
  z-index: 1;
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  backdrop-filter: blur(5px);
  background-color: rgba(0, 0, 0, 0.1);
}

#stellarium-web-toolbar-logo {
  margin-right: 10px;
  margin-left: 20px;
}

@media all and (max-width: 600px) {
  .tmenubt {
    min-width: 30px;
  }
}

.tbtitle {
  font-size: 20px;
  font-weight: 500;
  user-select: none;
}

.tbtitle_ {
  font-size: 30px;
  font-weight: 500;
  user-select: none;
}

.TimerPickBtn {
  padding: 0.2rem 0.6rem;
  color: white;
  cursor: pointer;

  font-size: 14px;
  text-align: center;
  user-select: none;
}

.ScheduleBtn {
    color: white;
    cursor: pointer;

    font-size: x-large;
    text-align: center;
    line-height: 35px;

    width: 35px;
    height: 35px;
    
    user-select: none;
    /* backdrop-filter: blur(5px); */
    background-color: rgba(0, 0, 0, 0.0);
    border-radius: 10px;

    /* border: 1px solid rgba(255, 255, 255, 0.8); */
}

.Card-Status {
  position: relative;
  margin: 5px; 
  border-radius: 5px; 
  height: 30px;
  background-color: rgba(0, 0, 0, 0.1);
}

.icon-container .green-icon {
  color: rgba(51, 218, 121, 0.7);
}

.icon-container .red-icon {
  color: rgba(250, 0, 0, 0.5);
}

</style>
