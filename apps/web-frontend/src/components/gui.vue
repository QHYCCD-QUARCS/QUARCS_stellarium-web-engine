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
  <div>
    <transition name="ToolBar">
      <toolbar v-show="showToolbar" v-if="$store.state.showMainToolBar" class="get-click"></toolbar>
    </transition>
  </div>
  <observing-panel></observing-panel>
  <template v-for="(item, i) in pluginsGuiComponents">
    <component :is="item" :key="i"></component>
  </template>
  <template v-for="(item, i) in dialogs">
    <component :is="item" :key="i + pluginsGuiComponents.length"></component>
  </template>
  <selected-object-info style="position: absolute; top: 48px; left: 0px; width: 350px; max-width: calc(100vw - 12px); margin: 6px" class="get-click"></selected-object-info>

  <!-- <transition name="RightBtn">
    <button v-show="showMountSwitch" @click="toggleImageManagerPanel" class="get-click btn-ImageManagerPanelSwitch">
      <v-icon color="rgba(255, 255, 255)"> mdi-folder-image </v-icon>
    </button>
  </transition> -->

  <transition name="RightBtn">
    <button v-show="isPolarAxisMode" @click="RecalibratePolarAxis" class="get-click btn-Recalibrate">
      <div style="display: flex; justify-content: center; align-items: center;">
        <img src="@/assets/images/svg/ui/Reset.svg" height="20px" style="min-height: 20px"></img>
      </div>
    </button>
  </transition>

  <transition name="RightBtn">
    <button v-show="isPolarAxisMode && showSingleSolveBtn" @click="SingleSolveImage" class="get-click btn-SolveImage" style=" background-color: rgba(0, 0, 0, 0.1); ">
      <div style="display: flex; justify-content: center; align-items: center;">
        <img src="@/assets/images/svg/ui/Solve.svg" height="25px" style="min-height: 25px"></img>
      </div>
    </button>
  </transition>

  <transition name="RightBtn">
    <button v-show="isPolarAxisMode && !showSingleSolveBtn" @click="LoopSolveImage" class="get-click btn-SolveImage" :style="{ 'background-color': PlateSolveInProgress ? 'rgba(46, 160, 67, 0.3)' : 'rgba(0, 0, 0, 0.1)' }">
      <div style="display: flex; justify-content: center; align-items: center;">
        <img src="@/assets/images/svg/ui/LoopSolve.svg" height="25px" style="min-height: 25px"></img>
      </div>
    </button>
  </transition>

  <div>
    <transition name="RightBtn">
    <button v-show="showMountSwitch" @click="toggleFloatingBox" class="get-click btn-MountPanelSwitch">
      <div style="display: flex; justify-content: center; align-items: center;">
        <img src="@/assets/images/svg/ui/mount.svg" height="33px" style="min-height: 33px"></img>
      </div>
    </button>
    </transition>
    <mount-control-panel v-show="showFloatingBox" style="position: absolute; top: 50px; right: 10px; " class="get-click"></mount-control-panel>
  </div>
  

  <!-- 设备设置窗口组件 -->
  <MountSettingWindow ref="mountDialog"></MountSettingWindow>
  <PoleCameraSettingWindow ref="polecameraDialog"></PoleCameraSettingWindow>
  <MainCameraSettingWindow ref="maincameraDialog"></MainCameraSettingWindow>
  <GuiderSettingWindow ref="guiderDialog"></GuiderSettingWindow>
  <FocuserSettingWindow ref="focuserDialog"></FocuserSettingWindow>
  <CFWSettingWindow ref="cfwDialog"></CFWSettingWindow>

  <progress-bars style="position: absolute; bottom: 54px; right: 12px;"></progress-bars>

  <div>
    <transition name="BottomBar">
      <bottom-bar v-show="isBottomBarShow" :style="{ width: isPolarAxisMode ? '75%' : '100%' }" style="position:absolute; justify-content: center; bottom: 0; display:flex; margin-bottom: 0px" class="get-click"></bottom-bar>
    </transition>
  </div>

  <!-- <div v-show="isExpTimeBarShow" class="exp-time-btn-bar-container">
    <exp-time-btn-bar @time-selected="handleExpTimeSelected" class="get-click"></exp-time-btn-bar>
  </div>

  <div v-show="isCFWSelectBarShow" class="cfw-select-btn-bar-container">
    <CFWSelectBtnBar @cfw-selected="handleCFWSelected" class="get-click"/>
  </div>

  <button v-if="isCaptureMode" @click="Switch_ExpTime_CFW" class="get-click btn-ExpTime-CFW-Switch">Switch ExpTime CFW</button> -->

  <transition name="BottomBtn">
  <button v-show="isMainSwitchShow" @click="SwitchMainPage" class="get-click btn-MainPageSwitch">
    <span v-if="CurrentMainPage === 'Stel'">
      <div style="display: flex; justify-content: center; align-items: center;">
        <img src="@/assets/images/svg/ui/sheying.svg" height="33px" style="min-height: 33px"></img>
      </div>
    </span>
    <span v-if="CurrentMainPage === 'MainCamera'">
      <div style="display: flex; justify-content: center; align-items: center;">
        <img src="@/assets/images/svg/ui/Guiding Curve.svg" height="33px" style="min-height: 33px"></img>
      </div>
    </span>
    <span v-if="CurrentMainPage === 'GuiderCamera'">
      <div style="display: flex; justify-content: center; align-items: center;">
        <img src="@/assets/images/svg/ui/skymap.svg" height="33px" style="min-height: 33px"></img>
      </div>
    </span>
  </button>
  </transition>

  <!-- <div v-show="isCaptureMode">
    <CircularProgressButton ref="CaptureBtn" class="get-click btn-Capture" />
  </div> -->

  <ChartComponent v-show="showChartsPanel" style="position: absolute; bottom: 10px; left: 170px; " class="get-click"/>
  <transition name="BottomBtn">
  <button  v-show="isCaptureMode" @click="toggleChartsPanel" class="get-click btn-ChartsSwitch">
    <div style="display: flex; justify-content: center; align-items: center;">
      <img src="@/assets/images/svg/ui/GuidingPanel.svg" height="35px" style="min-height: 35px"></img>
    </div>
  </button>
  </transition>

  <HistogramPanel v-show="showHistogramPanel" style="position: absolute; bottom: 10px; left: 170px; " class="get-click"/>

  <FocuserPanel v-show="showFocuserPanel" style="position: absolute; bottom: 10px; left: 170px; " class="get-click"/>
  
  <!-- <button v-show="isCaptureMode" @click="hideCaptureUI" class="get-click btn-UISwitch"> <v-icon> mdi-flip-to-back </v-icon> </button> -->
  <button v-show="isCaptureMode" @click="hideCaptureUI" class="get-click btn-UISwitch">
    <div style="display: flex; justify-content: center; align-items: center;">
      <img src="@/assets/images/svg/ui/UI_Hide.svg" height="20px" style="min-height: 20px"></img>
    </div>
  </button>

  <!-- <button v-show="isRedBoxMode" @click="showCaptureUI" class="get-click btn-ShowUISwitch"> <v-icon> mdi-flip-to-front </v-icon> </button> -->
  <button v-show="isRedBoxMode" @click="showCaptureUI" class="get-click btn-ShowUISwitch">
    <div style="display: flex; justify-content: center; align-items: center;">
      <img src="@/assets/images/svg/ui/UI_Show.svg" height="20px" style="min-height: 20px">
    </div>
  </button>

  <button v-show="isPolarAxisMode" @click="QuitPolarAxisMode" class="get-click btn-ShowUISwitch">
    <!-- <div style="display: flex; justify-content: center; align-items: center;">
      <img src="@/assets/images/svg/ui/UI_Show.svg" height="20px" style="min-height: 20px">
    </div> -->
    <v-icon color="rgba(255, 255, 255)"> mdi-close-outline </v-icon>
  </button>

  <transition name="BottomCanvas">
    <div v-show="isPolarAxisMode" class="Canvas-SolveImage">
      <canvas ref="SolveImageCanvas" id="SolveImage-Canvas"></canvas>
    </div>
  </transition>

  <transition name="BottomCanvas">
    <div v-show="isPolarAxisMode" class="Text-SolveImage">
      <span style="position: absolute; top: 0px; left: 5%; height: 30%; width: 90%; font-size: 10px; color: rgba(255, 255, 255, 0.3); user-select: none;"> 
        Difference: {{ DifferenceText }}
      </span>
      <span style="position: absolute; top: 35%; left: 5%; height: 30%; width: 90%; font-size: 10px; color: rgba(255, 255, 255, 0.3); user-select: none;"> 
        Target: {{ TargetText }}
      </span>
      <span style="position: absolute; top: 70%; left: 5%; height: 30%; width: 90%; font-size: 10px; color: rgba(255, 255, 255, 0.3); user-select: none;"> 
        Current: {{ CurrentText }}
      </span>
    </div>
  </transition>

  

  <CapturePanel v-show="isCaptureMode" />

  <ImageManagerPanel v-show="ShowImageManagerPanel" />

  <SchedulePanel v-show="ShowSchedulePanel" class="get-click" style="position: absolute;"/>
  <ScheduleKeyBoard v-show="ShowSchedulePanel" />
  <ScheduleList v-show="ShowSchedulePanel" class="get-click" style="position: absolute;"/>

  

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

import ScheduleKeyBoard from '@/components/ScheduleKeyBoard.vue';

import CapturePanel from '@/components/CapturePanel.vue';

import ImageManagerPanel from '@/components/ImageManagerPanel.vue';

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
      ShowImageManagerPanel: false,

      showRedBox: false, // 控制小红框显示与隐藏
      isInitRedBox: true,
      mouseX: 0, // 鼠标的X坐标
      mouseY: 0, // 鼠标的Y坐标
      mouseX_: 0, 
      mouseY_: 0, 
      BoxSideLength: 500,
      RedBoxWidth: 20,
      RedBoxHeight: 20,
      RedBoxWidth_: 20,
      RedBoxHeight_: 20,

      isStellariumMode: true,
      isCaptureMode: false,
      isGuiderMode: false,

      ImageProportion: 1,
      RedBoxOffset_X: 0,
      RedBoxOffset_Y: 0,

      ScaleImageWidth: 0,
      ScaleImageHeight: 0,

      FocalLength: 130,         // QHY462C: 130  5.568 3.132
      CameraSizeWidth: 5.568,   // QHY163M: 510  17.7  13.4
      CameraSizeHeight: 3.132, 

      PlateSolveInProgress: false,

      isPolarAxisMode: false,

      showSingleSolveBtn: true,

      DifferenceText: '',
      TargetText: '',
      CurrentText: '',
      

    }
  },
  created() {
    this.$bus.$on('add-driver', this.handleAddDriver);
    this.$bus.$on('add-device', this.handleAddDevice);
    this.$bus.$on('showMsgBox', this.showMessageBox);
    this.$bus.$on('MainCameraSize', this.resizeRedBox);
    this.$bus.$on('RedBox Side Length (px)', this.RedBoxSizeChange);
    this.$bus.$on('time-selected', this.handleExpTimeSelected);
    // this.$bus.$on('cfw-selected', this.handleCFWSelected);
    this.$bus.$on('toggleSchedulePanel', this.toggleSchedulePanel);
    this.$bus.$on('MountPanelClose', this.toggleFloatingBox);
    this.$bus.$on('toggleHistogramPanel', this.toggleHistogramPanel);
    this.$bus.$on('toggleFocuserPanel', this.toggleFocuserPanel);
    this.$bus.$on('ImageManagerPanelClose', this.toggleImageManagerPanel);
    this.$bus.$on('ImageManagerPanelOpen', this.toggleImageManagerPanel);
    
    // this.$bus.$on('RedBoxClick', this.handleTouchOrMouseDown);
    this.$bus.$on('RedBox_XY', this.RedBox_XY);
    this.$bus.$on('RedBoxOffset', this.setRedBoxOffset);
    this.$bus.$on('RedBoxScale', this.SetRedBoxScale);
    this.$bus.$on('ScaleImageSize', this.setScaleImageSize);
    this.$bus.$on('CalibratePolarAxisMode', this.CalibratePolarAxisMode);
    this.$bus.$on('showSolveImage', this.showSolveImage);
    this.$bus.$on('HideSingleSolveBtn', this.HideSingleSolveBtn);
    this.$bus.$on('ShowAzAltText', this.ShowAzAltText);
    this.$bus.$on('ShowCurrentAzAltText', this.ShowCurrentAzAltText);
  },
  mounted() {
    this.resizeRedBox(1920, 1080);
  },
  methods: {
    toggleFloatingBox() {
      this.showFloatingBox = !this.showFloatingBox; // 切换显示状态
    },
    toggleChartsPanel() {
      this.showChartsPanel = !this.showChartsPanel;
      if(this.showFocuserPanel) {
        this.showFocuserPanel = !this.showFocuserPanel;
      } 
      else if(this.showHistogramPanel) {
        this.showHistogramPanel = !this.showHistogramPanel;
      }
    },
    toggleHistogramPanel() {
      this.showHistogramPanel = !this.showHistogramPanel;
      if(this.showFocuserPanel) {
        this.showFocuserPanel = !this.showFocuserPanel;
      } 
      else if(this.showChartsPanel) {
        this.showChartsPanel = !this.showChartsPanel;
      }
    },
    toggleFocuserPanel() {
      this.showFocuserPanel = !this.showFocuserPanel;
      if(this.showHistogramPanel) {
        this.showHistogramPanel = !this.showHistogramPanel;
      }
      else if(this.showChartsPanel) {
        this.showChartsPanel = !this.showChartsPanel;
      }
      this.$bus.$emit('SwitchImageToShow', !this.showFocuserPanel);
    },
    toggleSchedulePanel() {
      this.ShowSchedulePanel = !this.ShowSchedulePanel;
    },

    toggleImageManagerPanel() {
      this.ShowImageManagerPanel = !this.ShowImageManagerPanel;
      if(this.ShowImageManagerPanel){
        this.$bus.$emit('calculateTotalPage');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ShowAllImageFolder');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'USBCheck');
      }
    },

    showCaptureUI() {
      document.removeEventListener('click', this.handleTouchOrMouseDown);
      this.isRedBoxMode = false;
      this.showToolbar = true;
      this.isCaptureMode = true;
      this.isExpTimeBarShow = true;
      this.isMainSwitchShow = true;
      this.showMountSwitch = true;
      this.isPolarAxisMode = false;
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
      this.showChartsPanel = false;
    },

    RedBox_XY(event) {
      if (this.isRedBoxMode){
        // this.mouseX = X;
        // this.mouseY = Y;
        this.handleTouchOrMouseDown(event);
      }
    },

    setRedBoxOffset(X, Y) {
      this.RedBoxOffset_X = X;
      this.RedBoxOffset_Y = Y;
      // console.log('RedBoxOffset:', this.RedBoxOffset_Y);
      this.mouseX =  this.mouseX_ - this.RedBoxOffset_X;
      this.mouseY =  this.mouseY_ - this.RedBoxOffset_Y;
    },

    SetRedBoxScale(value) {
      this.RedBoxWidth = this.RedBoxWidth_ * value;
      this.RedBoxHeight = this.RedBoxHeight_ * value;
    },

    setScaleImageSize(width, height) {
      this.ScaleImageWidth = width;
      this.ScaleImageHeight = height;
      // console.log('ScaleImageSize: ' + this.ScaleImageWidth + ', ' + this.ScaleImageHeight);
    },
    
    handleTouchOrMouseDown(event) {
      // 获取触摸或鼠标位置
      const clientX = event.type.startsWith('touch') ? event.touches[0].clientX : event.clientX;
      const clientY = event.type.startsWith('touch') ? event.touches[0].clientY : event.clientY;

      // 更新位置
      this.mouseX = Math.floor(clientX);
      this.mouseX_ = Math.floor(clientX);
      this.mouseY = Math.floor(clientY);
      this.mouseY_ = Math.floor(clientY);

      console.log('handleTouchOrMouseDown: ', this.mouseX, ',', this.mouseY);

      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'RedBox:'+ Math.floor((this.mouseX + this.RedBoxOffset_X) / this.ScaleImageWidth * windowWidth) + ":" + Math.floor((this.mouseY + this.RedBoxOffset_Y) / this.ScaleImageHeight * windowHeight) + ":" + windowWidth + ":" + windowHeight);
    },

    resizeRedBox(CameraWidth, CameraHeight) {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      this.RedBoxWidth = this.BoxSideLength * windowWidth / CameraWidth;
      this.RedBoxHeight = this.BoxSideLength * windowHeight / CameraHeight;

      this.ImageProportion = this.RedBoxWidth/this.RedBoxHeight;
      this.$bus.$emit('ImageProportion', this.ImageProportion);
      this.RedBoxHeight = this.RedBoxHeight * this.ImageProportion;

      this.RedBoxWidth_ = this.RedBoxWidth;
      this.RedBoxHeight_ = this.RedBoxHeight;

      console.log('RedBoxSize:', this.RedBoxWidth, ', ' , this.RedBoxHeight);

      if(this.isInitRedBox === true)
      {
        // 将小红框置于界面中央
        this.mouseX = (windowWidth - this.RedBoxWidth) / 2; // 100是小红框的宽度
        this.mouseY = (windowHeight - this.RedBoxHeight) / 2; // 100是小红框的高度
        this.isInitRedBox = false;
      }

      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'RedBox:'+ Math.floor((this.mouseX + this.RedBoxOffset_X) / this.ScaleImageWidth * windowWidth) + ":" + Math.floor((this.mouseY + this.RedBoxOffset_Y) / this.ScaleImageHeight * windowHeight) + ":" + windowWidth + ":" + windowHeight);  //TODO: BoxSize
    },

    RedBoxSizeChange(payload) {
      const [signal, value] = payload.split(':');
      this.BoxSideLength = value;
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
        this.$refs.cfwDialog.AddDevices(device);
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

        this.$bus.$emit('HideTargetSearch');
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

        this.showMountSwitch = true;

        this.showChartsPanel = true;
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

        this.$bus.$emit('ShowTargetSearch');
      }

      this.$bus.$emit('Switch-MainPage');
    },

    // Switch_ExpTime_CFW() {
    //   if(this.isExpTimeBarShow === true)
    //   {
    //     this.isExpTimeBarShow = false;
    //     this.isCFWSelectBarShow = true;
    //   }
    //   else {
    //     this.isExpTimeBarShow = true;
    //     this.isCFWSelectBarShow = false;
    //   }
    // },

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

        // this.$refs.CaptureBtn.SetDuration(convertedTime);
        this.$bus.$emit('SetExpTime',convertedTime);
      } else {
        console.log('No numeric part found in time:', time);
      }
    },

    SingleSolveImage() {
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'SolveImage:' + this.FocalLength + ':' + this.CameraSizeWidth + ':' + this.CameraSizeHeight);
    },

    LoopSolveImage() {
      if (this.PlateSolveInProgress) {
        this.PlateSolveInProgress = false;
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'stopLoopSolveImage');
      } else {
        this.PlateSolveInProgress = true;
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'startLoopSolveImage:' + this.FocalLength + ':' + this.CameraSizeWidth + ':' + this.CameraSizeHeight);
      }
    },

    CalibratePolarAxisMode() {
      this.$bus.$emit('showStelCanvas');
      this.CurrentMainPage = 'Stel';
      this.isBottomBarShow = true;
      this.hideCaptureUI();
      this.isPolarAxisMode = true;
      this.isRedBoxMode = false;
      document.removeEventListener('click', this.handleTouchOrMouseDown);


    },

    QuitPolarAxisMode() {
      this.showCaptureUI();
      this.isCaptureMode = false;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'StopLoopCapture');
    },

    showSolveImage(img) {
      const canvas = document.getElementById('SolveImage-Canvas');

      if (canvas.getContext) {
        const ctx = canvas.getContext('2d');
        const canvasWidth = window.innerWidth / 4;
        const canvasHeight = window.innerHeight /4;

        // 清除画布
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // 调整图像尺寸以适应画布尺寸
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      }
    },

    HideSingleSolveBtn() {
      this.showSingleSolveBtn = false;
    },

    RecalibratePolarAxis() {
      console.log('Re calibrate the polar axis');
      this.showSingleSolveBtn = true;
      this.$bus.$emit('RecalibratePolarAxis');

      if (this.PlateSolveInProgress) {
        this.PlateSolveInProgress = false;
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'stopLoopSolveImage');
      }

      this.DifferenceText = '';
      this.TargetText = '';
      this.CurrentText = '';
    },

    ShowAzAltText(Az1, Alt1, Az2, Alt2) {
      this.DifferenceText = Az1.toFixed(3) + ', ' + Alt1.toFixed(3);
      this.TargetText = Az2.toFixed(3) + ', ' + Alt2.toFixed(3);
    },

    ShowCurrentAzAltText(Az, Alt) {
      this.CurrentText = Az.toFixed(3) + ', ' + Alt.toFixed(3);
    },

    // handleCFWSelected(cfw) {
    //   console.log('QHYCCD | CFWSelected: ', cfw);
    //   // 根据需要处理选择的时间
    // },

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
    ScheduleKeyBoard,
    CapturePanel,
    ImageManagerPanel,
  }
}
</script>

<style>
.btn-MountPanelSwitch {
  position:absolute;
  width: 35px;
  height: 35px;
  top: 50px;
  right: 20px;
  
  user-select: none;
  backdrop-filter: blur(5px);
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.btn-ImageManagerPanelSwitch {
  position:absolute;
  width: 35px;
  height: 35px;
  top: 100px;
  right: 20px;
  
  user-select: none;
  backdrop-filter: blur(5px);
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.btn-SolveImage {
  position:absolute;
  width: 35px;
  height: 35px;
  top: calc(50% - 35px);
  right: 20px;
  
  user-select: none;
  backdrop-filter: blur(5px);
  /* background-color: rgba(0, 0, 0, 0.1); */
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.btn-Recalibrate {
  position:absolute;
  width: 35px;
  height: 35px;
  top: calc(75% - 70px);
  right: 20px;
  
  user-select: none;
  backdrop-filter: blur(5px);
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.Canvas-SolveImage {
  position:absolute;
  bottom: 20px;
  right: 20px;

  width: 25%;
  height: 25%;
  
  user-select: none;
  background-color: rgba(0, 0, 0, 0.0);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 10px; 
  box-sizing: border-box;
  overflow: hidden;
}

.Text-SolveImage {
  position:absolute;
  width: calc(25% - 50px);
  height: 25%;
  top: calc(50% - 35px);
  right: 70px;
  
  user-select: none;
  /* backdrop-filter: blur(1px);
  background-color: rgba(0, 0, 0, 0.1); */
  border-radius: 10px;
  /* border: 1px solid rgba(255, 255, 255, 0.8); */
}

.btn-ChartsSwitch {
  position:absolute;
  width: 35px;
  height: 35px;
  bottom: 20px;
  right: 90px;
  
  user-select: none;
  backdrop-filter: blur(5px);
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 50%; 
  /* border: 1px solid rgba(255, 255, 255, 0.8); */
}

.btn-UISwitch {
  position:absolute;
  width: 35px;
  height: 35px;
  top: 50px;
  left: 20px;
  
  user-select: none;
  backdrop-filter: blur(5px);
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  /* border: 1px solid rgba(255, 255, 255, 0.8); */
}

.btn-MainPageSwitch {
  position:absolute;
  width: 35px;
  height: 35px;
  bottom: 20px;
  right: 20px;
  
  user-select: none;
  backdrop-filter: blur(5px);
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-sizing: border-box;
}

.red-box {
  position: absolute;
  background-color: transparent;
  border: 1px solid rgba(255, 212, 9, 0.6);
}

.btn-ShowUISwitch {
  position:absolute;
  width: 35px;
  height: 35px;
  top: 50px;
  left: 20px;
  
  user-select: none;
  backdrop-filter: blur(5px);  
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 50%;  
  /* border: 1px solid rgba(255, 255, 255, 0.8); */
}


.btn-ImageManagerPanelSwitch:active,
.btn-MountPanelSwitch:active,
.btn-ChartsSwitch:active,
.btn-UISwitch:active,
.btn-MainPageSwitch:active,
.btn-ShowUISwitch:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

@keyframes showBottomBarAnimation {
  from {
    bottom: -50px;
  }
  to {
    bottom: 0;
  }
}

@keyframes hideBottomBarAnimation {
  from {
    bottom: 0;
  }
  to {
    bottom: -50px;
  }
}

.BottomBar-enter-active {
  animation: showBottomBarAnimation 0.15s forwards;
}

.BottomBar-leave-active {
  animation: hideBottomBarAnimation 0.15s forwards;
}

@keyframes showToolBarAnimation {
  from {
    top: -40px;
  }
  to {
    top: 0;
  }
}

@keyframes hideToolBarAnimation {
  from {
    top: 0;
  }
  to {
    top: -40px;
  }
}

.ToolBar-enter-active {
  animation: showToolBarAnimation 0.15s forwards;
}

.ToolBar-leave-active {
  animation: hideToolBarAnimation 0.15s forwards;
}

@keyframes showBottomBtnAnimation {
  from {
    bottom: -50px;
  }
  to {
    bottom: 20px;
  }
}

@keyframes hideBottomBtnAnimation {
  from {
    bottom: 20px;
  }
  to {
    bottom: -50px;
  }
}

.BottomBtn-enter-active {
  animation: showBottomBtnAnimation 0.15s forwards;
}

.BottomBtn-leave-active {
  animation: hideBottomBtnAnimation 0.15s forwards;
}

@keyframes showRightBtnAnimation {
  from {
    right: -50px;
  }
  to {
    right: 20px;
  }
}

@keyframes hideRightBtnAnimation {
  from {
    right: 20px;
  }
  to {
    right: -50px;
  }
}

.RightBtn-enter-active {
  animation: showRightBtnAnimation 0.15s forwards;
}

.RightBtn-leave-active {
  animation: hideRightBtnAnimation 0.15s forwards;
}

@keyframes showBottomCanvasAnimation {
  from {
    bottom: -25%;
  }
  to {
    bottom: 20px;
  }
}

@keyframes hideBottomCanvasAnimation {
  from {
    bottom: 20px;
  }
  to {
    bottom: -25%;
  }
}

.BottomCanvas-enter-active {
  animation: showBottomCanvasAnimation 0.15s forwards;
}

.BottomCanvas-leave-active {
  animation: hideBottomCanvasAnimation 0.15s forwards;
}

</style>
