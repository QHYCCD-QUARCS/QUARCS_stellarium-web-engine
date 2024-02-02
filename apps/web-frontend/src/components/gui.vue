// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

<template>
<div class="click-through" style="position:absolute; z-index: 1; width: 100%; height: 100%; display:flex; align-items: flex-end;">
  <div v-show="showRedBox" class="red-box" :style="{ top: mouseY + 'px', left: mouseX + 'px', width: RedBoxWidth + 'px', height: RedBoxHeight + 'px' }"></div>
  <message-box v-if="isMessageBoxShow" ref="messageBox"></message-box>
  <toolbar v-show="showToolbar" v-if="$store.state.showMainToolBar" class="get-click"></toolbar>
  <observing-panel></observing-panel>
  <template v-for="(item, i) in pluginsGuiComponents">
    <component :is="item" :key="i"></component>
  </template>
  <template v-for="(item, i) in dialogs">
    <component :is="item" :key="i + pluginsGuiComponents.length"></component>
  </template>
  <selected-object-info style="position: absolute; top: 48px; left: 0px; width: 350px; max-width: calc(100vw - 12px); margin: 6px" class="get-click"></selected-object-info>

  <div v-show="showMountSwitch">
    <button  @click="toggleFloatingBox" class="get-click btn-MountPanelSwitch">Mount Panel</button>
    <mount-control-panel v-show="showFloatingBox" style="position: absolute; top: 50px; right: 100px; " class="get-click"></mount-control-panel>
  </div>
  

  <!-- 设备设置窗口组件 -->
  <MountSettingWindow ref="mountDialog"></MountSettingWindow>
  <PoleCameraSettingWindow ref="polecameraDialog"></PoleCameraSettingWindow>
  <MainCameraSettingWindow ref="maincameraDialog"></MainCameraSettingWindow>
  <GuiderSettingWindow ref="guiderDialog"></GuiderSettingWindow>
  <FocuserSettingWindow ref="focuserDialog"></FocuserSettingWindow>
  <CFWSettingWindow ref="cfwDialog"></CFWSettingWindow>

  <progress-bars style="position: absolute; bottom: 54px; right: 12px;"></progress-bars>

  <div v-show="isBottomBarShow">
    <bottom-bar style="position:absolute; width: 100%; justify-content: center; bottom: 0; display:flex; margin-bottom: 0px" class="get-click"></bottom-bar>
  </div>

  <div v-show="isExpTimeBarShow" class="exp-time-btn-bar-container">
    <exp-time-btn-bar @time-selected="handleExpTimeSelected" class="get-click"></exp-time-btn-bar>
  </div>

  <!-- <div v-if="isCFWSelectBarShow" class="cfw-select-btn-bar-container">
    <cfw-select-btn-bar @cfw-selected="handleCFWSelected" class="get-click"></cfw-select-btn-bar>
  </div> -->
  <div v-show="isCFWSelectBarShow" class="cfw-select-btn-bar-container">
    <CFWSelectBtnBar @cfw-selected="handleCFWSelected" class="get-click"/>
  </div>

  <button v-if="isCaptureMode" @click="Switch_ExpTime_CFW" class="get-click btn-ExpTime-CFW-Switch">Switch ExpTime CFW</button>

  <button v-show="isMainSwitchShow" @click="SwitchMainPage" class="get-click btn-MainPageSwitch">Switch Main Page</button>

  <div v-show="isCaptureMode">
    <CircularProgressButton ref="CaptureBtn" class="get-click btn-Capture" />
  </div>

  <ChartComponent v-show="showChartsPanel" style="position: absolute; bottom: 50px; right: 70px; " class="get-click"/>
  <button  v-show="isGuiderMode" @click="toggleChartsPanel" class="get-click btn-ChartsSwitch">Charts Panel</button>

  <HistogramPanel v-show="showHistogramPanel" style="position: absolute; bottom: 50px; left: 100px; " class="get-click"/>
  <button  v-show="isCaptureMode" @click="toggleHistogramPanel" class="get-click btn-HistogramSwitch">Histogram Panel</button>

  <FocuserPanel v-show="showFocuserPanel" style="position: absolute; bottom: 50px; left: 100px; " class="get-click"/>
  
  <button 
    v-show="isCaptureMode" 
    @click="toggleFocuserPanel" 
    @touchstart="startLongPress" 
    @touchend="cancelLongPress" 
    @touchcancel="cancelLongPress" 
    @mousedown="startLongPress" 
    @mouseup="cancelLongPress" 
    @mouseleave="cancelLongPress" 
    class="get-click btn-FocuserSwitch">
      Focuser Panel
  </button>

  <button v-show="isRedBoxMode" @click="showCaptureUI" class="get-click btn-ShowUISwitch">Show UI</button>

  <SchedulePanel v-show="ShowSchedulePanel" class="get-click" style="position: absolute;"/>
  <ScheduleList v-show="ShowSchedulePanel" class="get-click" style="position: absolute;"/>
  <button  @click="toggleSchedulePanel" class="get-click btn-SchedulePanelSwitch">SchedulePanel</button>

</div>

</template>

<script>
import Toolbar from '@/components/toolbar.vue'
import BottomBar from '@/components/bottom-bar.vue'
import SelectedObjectInfo from '@/components/selected-object-info.vue'
import ProgressBars from '@/components/progress-bars'

import DataCreditsDialog from '@/components/data-credits-dialog.vue'
import ViewSettingsDialog from '@/components/view-settings-dialog.vue'
import PlanetsVisibility from '@/components/planets-visibility.vue'
import LocationDialog from '@/components/location-dialog.vue'
import ObservingPanel from '@/components/observing-panel.vue'

import MountControlPanel from '@/components/MountControlPanel.vue'
import MountSettingWindow from '@/components/Settings-Dialog-Mount.vue'
import PoleCameraSettingWindow from '@/components/Settings-Dialog-PoleCamera.vue'
import MainCameraSettingWindow from '@/components/Settings-Dialog-MainCamera.vue'
import GuiderSettingWindow from '@/components/Settings-Dialog-Guider.vue'
import FocuserSettingWindow from '@/components/Settings-Dialog-Focuser.vue'
import CFWSettingWindow from '@/components/Settings-Dialog-CFW.vue'

import MessageBox from "@/components/MessageBox.vue";

import ExpTimeBtnBar from "@/components/ExpTimeBtnBar.vue";
import CFWSelectBtnBar from "@/components/CFWSelectBtnBar.vue";

import CircularProgressButton from '@/components/CircularButton.vue';

import ChartComponent from '@/components/ChartComponent.vue';

import HistogramPanel from '@/components/HistogramPanel.vue';

import FocuserPanel from '@/components/FocuserPanel.vue';

import SchedulePanel from '@/components/SchedulePanel.vue';
import ScheduleList from '@/components/ScheduleList.vue';

export default {
  data: function () {
    return {
      showFloatingBox: false,
      isSettingWindowShow: false,
      isMessageBoxShow: false,
      isBottomBarShow: true,
      CurrentMainPage: 'Stel',
      isExpTimeBarShow: false,
      isCFWSelectBarShow: false,
      showChartsPanel: false,
      showHistogramPanel: false,
      showFocuserPanel: false,
      showToolbar: true,
      showMountSwitch: true,
      isMainSwitchShow: true,
      isRedBoxMode: false,
      ShowSchedulePanel: false,

      showRedBox: false, // 控制小红框显示与隐藏
      isInitRedBox: true,
      mouseX: 0, // 鼠标的X坐标
      mouseY: 0, // 鼠标的Y坐标
      BoxSideLength: 500,
      RedBoxWidth: 20,
      RedBoxHeight: 20,

      longPressTimeout: null,

      isStellariumMode: true,
      isCaptureMode: false,
      isGuiderMode: false,

    }
  },
  created() {
    this.$bus.$on('add-driver', this.handleAddDriver);
    this.$bus.$on('add-device', this.handleAddDevice);
    this.$bus.$on('showMsgBox', this.showMessageBox);
    this.$bus.$on('MainCameraSize', this.resizeRedBox);
    this.$bus.$on('RedBoxSizeChange', this.RedBoxSizeChange);

  },
  mounted() {
    this.resizeRedBox(1920, 1080);
  },
  // beforeDestroy() {
  //   // document.removeEventListener('mousedown', this.handleTouchOrMouseDown);
  //   // document.removeEventListener('touchstart', this.handleTouchOrMouseDown);
  //   // document.removeEventListener('mousemove', this.handleTouchOrMouseDown);
  //   // document.removeEventListener('touchmove', this.handleTouchOrMouseDown);
  //   document.removeEventListener('click', this.handleTouchOrMouseDown);
  // },
  methods: {
    toggleFloatingBox() {
      this.showFloatingBox = !this.showFloatingBox; // 切换显示状态
    },
    toggleChartsPanel() {
      this.showChartsPanel = !this.showChartsPanel;
    },
    toggleHistogramPanel() {
      this.showHistogramPanel = !this.showHistogramPanel;
    },
    toggleFocuserPanel() {
      this.showFocuserPanel = !this.showFocuserPanel;
    },
    toggleSchedulePanel() {
      this.ShowSchedulePanel = !this.ShowSchedulePanel;
      this.$bus.$emit('toggleSchedulePanel');
    },

    startLongPress() {
      this.longPressTimeout = setTimeout(() => {
        // 长按事件处理
        console.log('长按事件触发');
        this.hideCaptureUI();
      }, 2000); // 2000毫秒（可根据需求调整）
    },
    cancelLongPress() {
      clearTimeout(this.longPressTimeout);
    },

    showCaptureUI() {
      document.removeEventListener('click', this.handleTouchOrMouseDown);
      this.isRedBoxMode = false;
      this.showToolbar = true;
      this.isCaptureMode = true;
      this.isExpTimeBarShow = true;
      this.isMainSwitchShow = true;
      this.showMountSwitch = true;
    },
    hideCaptureUI() {
      document.addEventListener('click', this.handleTouchOrMouseDown);
      this.isRedBoxMode = true;
      this.showToolbar = false;
      this.isCaptureMode = false;
      this.showFloatingBox = false;
      this.showHistogramPanel = false;
      this.isExpTimeBarShow = false;
      this.isCFWSelectBarShow = false;
      this.isMainSwitchShow = false;
      this.showMountSwitch = false;
      this.showFocuserPanel = false;
      this.showHistogramPanel = false;
    },
    
    handleTouchOrMouseDown(event) {
      // 获取触摸或鼠标位置
      const clientX = event.type.startsWith('touch') ? event.touches[0].clientX : event.clientX;
      const clientY = event.type.startsWith('touch') ? event.touches[0].clientY : event.clientY;

      // 更新位置
      this.mouseX = clientX;
      this.mouseY = clientY;

      console.log('handleTouchOrMouseDown: ', this.mouseX, ',', this.mouseY);

      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'RedBox:'+ this.mouseX + ":" + this.mouseY + ":" + windowWidth + ":" + windowHeight);
    },

    resizeRedBox(CameraWidth, CameraHeight) {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      this.RedBoxWidth = this.BoxSideLength * windowWidth / CameraWidth;
      this.RedBoxHeight = this.BoxSideLength * windowHeight / CameraHeight;

      if(isInitRedBox === true)
      {
        // 将小红框置于界面中央
        this.mouseX = (windowWidth - this.RedBoxWidth) / 2; // 100是小红框的宽度
        this.mouseY = (windowHeight - this.RedBoxHeight) / 2; // 100是小红框的高度
        isInitRedBox = false;
      }

      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'RedBox:'+ this.mouseX + ":" + this.mouseY + ":" + windowWidth + ":" + windowHeight);  //TODO: BoxSize
    },

    RedBoxSizeChange(length) {
      this.BoxSideLength = length;
      console.log('RedBoxSizeChange: ', this.BoxSideLength);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'RedBoxSizeChange:'+ this.BoxSideLength);
    },

    handleAddDriver(driver) {
      if (driver.type === 'Mount') {
        this.$refs.mountDialog.AddDrivers(driver);
      } else if (driver.type === 'Focuser') {
        this.$refs.focuserDialog.AddDrivers(driver);
      } else if (driver.type === 'PoleCamera') {
        this.$refs.polecameraDialog.AddDrivers(driver);
      } else if (driver.type === 'MainCamera') {
        this.$refs.maincameraDialog.AddDrivers(driver);
      } else if (driver.type === 'Guider') {
        this.$refs.guiderDialog.AddDrivers(driver);
      } else if (driver.type === 'CFW') {
        this.$refs.cfwDialog.AddDrivers(driver);
      }
    },
    handleAddDevice(device) {
      if (device.type === 'Mount') {
        this.$refs.mountDialog.AddDevices(device);
      } else if (device.type === 'Focuser') {
        this.$refs.focuserDialog.AddDevices(device);
      } else if (device.type === 'PoleCamera') {
        this.$refs.polecameraDialog.AddDevices(device);
      } else if (device.type === 'MainCamera') {
        this.$refs.maincameraDialog.AddDevices(device);
      } else if (device.type === 'Guider') {
        this.$refs.guiderDialog.AddDevices(device);
      } else if (device.type === 'CFW') {
        this.$refs.cfwDialog.AddDevices(driver);
      }
    },

    // 消息框
    showMessageBox(msg,type) {
      console.log("QHYCCD | show Message Box.");
      this.isMessageBoxShow = true;
      this.$nextTick(() => {
        this.$refs.messageBox.show(msg,type);
      });
    },
    // 消息框

    SwitchMainPage() {
      if(this.CurrentMainPage === 'Stel')
      {
        this.CurrentMainPage = 'MainCamera';
        this.isBottomBarShow = false;
        this.isExpTimeBarShow = true;

        this.isStellariumMode = false;
        this.isCaptureMode = true;
        this.isGuiderMode = false;

        this.showMountSwitch = true;

        this.showChartsPanel = false;
        this.showRedBox = true;
      }
      else if (this.CurrentMainPage === 'MainCamera')
      {
        this.CurrentMainPage = 'GuiderCamera';
        this.isBottomBarShow = false;
        this.isExpTimeBarShow = false;
        this.isCFWSelectBarShow = false;

        this.isStellariumMode = false;
        this.isCaptureMode = false;
        this.isGuiderMode = true;

        this.showMountSwitch = false;

        this.showHistogramPanel = false;
        this.showFocuserPanel = false;
        this.showRedBox = false;
      }
      else if (this.CurrentMainPage === 'GuiderCamera')
      {
        this.CurrentMainPage = 'Stel';
        this.isBottomBarShow = true;
        this.isExpTimeBarShow = false;
        this.isCFWSelectBarShow = false;

        this.isStellariumMode = true;
        this.isCaptureMode = false;
        this.isGuiderMode = false;

        this.showMountSwitch = true;

        this.showChartsPanel = false;
        this.showHistogramPanel = false;
        this.showFocuserPanel = false;
        this.showRedBox = false;
      }

      this.$bus.$emit('Switch-MainPage');
    },

    Switch_ExpTime_CFW() {
      if(this.isExpTimeBarShow === true)
      {
        this.isExpTimeBarShow = false;
        this.isCFWSelectBarShow = true;
      }
      else {
        this.isExpTimeBarShow = true;
        this.isCFWSelectBarShow = false;
      }
    },

    handleExpTimeSelected(time) {
      console.log('QHYCCD | ExpTimeSelected: ', time);
      // 根据需要处理选择的时间
      const match = time.match(/(\d+)([a-zA-Z]+)/);

      if (match) {
        const numericPart = parseInt(match[1], 10); // 将匹配到的数字部分转换为整数
        const unitPart = match[2].toLowerCase(); // 获取单位部分，并将其转换为小写

        let convertedTime = numericPart; // 默认情况下，将数字部分保持不变

        if (unitPart === 's') {
          convertedTime *= 1000; // 如果单位是秒(s)，则将数字乘以1000
        }

        console.log('Numeric part:', numericPart);
        console.log('Unit part:', unitPart);
        console.log('Converted time:', convertedTime);

        this.$refs.CaptureBtn.SetDuration(convertedTime);
      } else {
        console.log('No numeric part found in time:', time);
      }
    },

    handleCFWSelected(cfw) {
      console.log('QHYCCD | CFWSelected: ', cfw);
      // 根据需要处理选择的时间
    },

  },
  computed: {
    pluginsGuiComponents: function () {
      let res = []
      for (const i in this.$stellariumWebPlugins()) {
        const plugin = this.$stellariumWebPlugins()[i]
        if (plugin.guiComponents) {
          res = res.concat(plugin.guiComponents)
        }
      }
      return res
    },
    dialogs: function () {
      let res = [
        'data-credits-dialog',
        'view-settings-dialog',
        'planets-visibility',
        'location-dialog'
      ]
      for (const i in this.$stellariumWebPlugins()) {
        const plugin = this.$stellariumWebPlugins()[i]
        if (plugin.dialogs) {
          res = res.concat(plugin.dialogs.map(d => d.name))
        }
      }
      return res
    }
  },
  components: { 
    Toolbar, 
    BottomBar, 
    DataCreditsDialog, 
    ViewSettingsDialog, 
    PlanetsVisibility, 
    SelectedObjectInfo, 
    LocationDialog, 
    ProgressBars, 
    ObservingPanel, 
    MountControlPanel, 
    MountSettingWindow, 
    PoleCameraSettingWindow, 
    MainCameraSettingWindow,
    GuiderSettingWindow,
    FocuserSettingWindow,
    CFWSettingWindow,
    MessageBox,
    ExpTimeBtnBar,
    CFWSelectBtnBar,
    CircularProgressButton,
    ChartComponent,
    HistogramPanel,
    FocuserPanel,
    SchedulePanel,
    ScheduleList,
  }
}
</script>

<style>
.btn-MountPanelSwitch {
  position:absolute;
  width: 50px;
  height: 50px;
  top: 100px;
  right: 10px;
  
  user-select: none;
  backdrop-filter: blur(5px);  
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 50%;  
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.btn-ChartsSwitch {
  position:absolute;
  width: 50px;
  height: 50px;
  bottom: 100px;
  right: 10px;
  
  user-select: none;
  backdrop-filter: blur(5px);  
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 50%;  
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.btn-HistogramSwitch {
  position:absolute;
  width: 50px;
  height: 50px;
  bottom: 140px;
  left: 10px;
  
  user-select: none;
  backdrop-filter: blur(5px);  
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 50%;  
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.btn-FocuserSwitch {
  position:absolute;
  width: 50px;
  height: 50px;
  bottom: 200px;
  left: 10px;
  
  user-select: none;
  backdrop-filter: blur(5px);
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.btn-SchedulePanelSwitch {
  position:absolute;
  width: 100px;
  height: 40px;
  top: 50px;
  right: 0;
  
  user-select: none;
  backdrop-filter: blur(5px); 
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 5px; 
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.btn-MainPageSwitch {
  position:absolute;
  width: 50px;
  height: 50px;
  bottom: 0;
  right: 0;
  
  user-select: none;
  backdrop-filter: blur(5px);
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.exp-time-btn-bar-container {
  position: fixed; 
  bottom: 0; /* 距离底部0像素 */
  left: 2px;

  /* left: 50%; 
  transform: translateX(-50%); 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  width: 100%;  */
}

.cfw-select-btn-bar-container {
  position: fixed; 
  bottom: 0; /* 距离底部0像素 */
  left: 2px;
}

.btn-ExpTime-CFW-Switch {
  position:absolute;
  width: 50px;
  height: 50px;
  bottom: 0;
  left: 455px;
  
  user-select: none;
  backdrop-filter: blur(5px);  
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.btn-Capture {
  position:absolute;
  user-select: none;
  /* top: calc(50% - 30px); */
  bottom: 60px;
  left: 10px;

  backdrop-filter: blur(5px);  
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.red-box {
  position: absolute;
  background-color: transparent;
  border: 1px solid rgba(255, 0, 0, 0.8);
}

.btn-ShowUISwitch {
  position:absolute;
  width: 50px;
  height: 50px;
  top: 10px;
  left: 10px;
  
  user-select: none;
  backdrop-filter: blur(5px);  
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 50%;  
  border: 1px solid rgba(255, 255, 255, 0.8);
}


</style>
