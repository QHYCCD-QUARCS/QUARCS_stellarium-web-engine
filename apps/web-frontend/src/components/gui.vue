// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

<template>
  <div class="click-through"
    style="position:absolute; z-index: 1; width: 100%; height: 100%; display:flex; align-items: flex-end; pointer-events: none;">
    <div v-show="showRedBox" class="red-box"
      :style="{ top: mouseY + 'px', left: mouseX + 'px', width: RedBoxWidth / BinningNum + 'px', height: RedBoxHeight / BinningNum + 'px' }">
    </div>
    <div v-show="showPHD2BoxAndCross && PHD2BoxView" :class="SwitchPHD2BoxClass"
      :style="{ top: PHD2Box_Y + 'px', left: PHD2Box_X + 'px', width: PHD2Box_Width + 'px', height: PHD2Box_Height + 'px' }">
    </div>
    <div v-show="showPHD2BoxAndCross && PHD2CrossView" :class="SwitchPHD2CrossClass"
      :style="{ top: 0 + 'px', left: PHD2Cross_X + 'px', width: 1 + 'px', height: PHD2Cross_Height + 'px' }"></div>
    <div v-show="showPHD2BoxAndCross && PHD2CrossView" :class="SwitchPHD2CrossClass"
      :style="{ top: PHD2Cross_Y + 'px', left: 0 + 'px', width: PHD2Cross_Width + 'px', height: 1 + 'px' }"></div>

    <div v-show="showPHD2BoxAndCross && PHD2CrossView" class="PHD2CircleClass" v-for="(Star, index) in PHD2MultiStars"
      :key="index" :style="{ top: Star.Y + 'px', left: Star.X + 'px' }"></div>

    <message-box v-for="(msg, index) in messageList" :key="msg.id" :message="msg.message" :type="msg.type"
      :Pos="msg.Pos" @close="removeMessage(index)"></message-box>

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
    <selected-object-info
      v-show="isStellariumMode"
      style="position: absolute; top: 48px; left: 0px; width: 350px; max-width: calc(100vw - 12px); margin: 6px; z-index: 100"
      class="get-click"></selected-object-info>

    <!-- <transition name="RightBtn">
    <button v-show="showMountSwitch" @click="toggleImageManagerPanel" class="get-click btn-ImageManagerPanelSwitch">
      <v-icon color="rgba(255, 255, 255)"> mdi-folder-image </v-icon>
    </button>
  </transition> -->

    <!-- <transition name="RightBtn">
      <button v-show="isPolarAxisMode" @click="RecalibratePolarAxis" class="get-click btn-Recalibrate">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/Reset.svg" height="20px"
            style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button>
    </transition> -->

    <!-- <transition name="RightBtn">
      <button v-show="isPolarAxisMode && showSingleSolveBtn" @click="SingleSolveImage" class="get-click btn-SolveImage"
        style=" background-color: rgba(0, 0, 0, 0.1); ">
        <template v-if="!loadingImageSolve">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Solve.svg" height="25px"
              style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </template>
        <template v-else>
          <div class="progress-spinner">
            <v-progress-circular indeterminate color="white" size="20"></v-progress-circular>
          </div>
        </template>
      </button>
    </transition> -->

    <!-- <transition name="RightBtn">
      <button v-show="isPolarAxisMode && !showSingleSolveBtn" @click="LoopSolveImage" class="get-click btn-SolveImage"
        :style="{ 'background-color': PlateSolveInProgress ? 'rgba(46, 160, 67, 0.3)' : 'rgba(0, 0, 0, 0.1)' }">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/LoopSolve.svg" height="25px"
            style="min-height: 25px; pointer-events: none;"></img>
        </div>
      </button>
    </transition> -->

    <div>
      <transition name="RightBtn">
        <button v-show="showMountSwitch" @click="toggleFloatingBox" class="get-click btn-MountPanelSwitch">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/mount.svg" height="33px"
              style="min-height: 33px; pointer-events: none;"></img>
          </div>
        </button>
      </transition>
      <mount-control-panel v-show="showFloatingBox" style="position: absolute; top: 50px; right: 10px; "
        class="get-click"></mount-control-panel>
    </div>

    <progress-bars style="position: absolute; bottom: 54px; right: 12px;"></progress-bars>

    <div>
      <transition name="BottomBar">
        <bottom-bar v-show="isBottomBarShow" :style="{ width: isPolarAxisMode ? '75%' : '100%' }"
          style="position:absolute; justify-content: center; bottom: 0; display:flex; margin-bottom: 0px"
          class="get-click"></bottom-bar>
      </transition>
    </div>

    <transition name="BottomBtn">
      <button v-show="isMainSwitchShow" @click="SwitchMainPage" class="get-click btn-MainPageSwitch">
        <span v-if="CurrentMainPage === 'Stel'">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/sheying.svg" height="33px"
              style="min-height: 33px; pointer-events: none;"></img>
          </div>
        </span>
        <span v-if="CurrentMainPage === 'MainCamera'">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Guiding Curve.svg" height="33px"
              style="min-height: 33px; pointer-events: none;"></img>
          </div>
        </span>
        <span v-if="CurrentMainPage === 'GuiderCamera'">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/skymap.svg" height="33px"
              style="min-height: 33px; pointer-events: none;"></img>
          </div>
        </span>
      </button>
    </transition>

    <ChartComponent v-show="showChartsPanel" class="get-click" />
    <transition name="BottomBtn">
      <button v-show="isCaptureMode" @click="toggleChartsPanel" class="get-click btn-ChartsSwitch">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/GuidingPanel.svg" height="35px"
            style="min-height: 35px; pointer-events: none;"></img>
        </div>
      </button>
    </transition>

    <HistogramPanel v-show="showHistogramPanel" class="get-click" />

    <FocuserPanel v-show="showFocuserPanel" class="get-click" />

    <!-- 使用CSS Grid布局的按钮容器 -->
    <div class="left-button-container">
      <button v-show="isPolarAxisMode" @click="QuitPolarAxisMode" class="get-click btn-QuitPolarAxis">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/Back.svg" height="35px" style="min-height: 35px; pointer-events: none;">
        </div>
      </button>

      <!-- 可自适应布局的按钮组：隐藏按钮、原图按钮、缩放按钮 -->
      <div 
        class="adaptive-buttons-container" 
        :class="{ 'buttons-grid': scaleButtonsOverlap, 'buttons-vertical': !scaleButtonsOverlap }"
        :style="scaleButtonsOverlap ? { marginTop: scaleButtonsMarginTop + 'px' } : {}"
      >
        <button v-show="isShowImage && isShowHideUi" @click="hideCaptureUI" class="get-click btn-UISwitch">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/UI_Hide.svg" height="20px"
              style="min-height: 20px; pointer-events: none;"></img>
          </div>
        </button>

        <button v-show="!isShowImage && isShowHideUi" @click="showCaptureUI" class="get-click btn-ShowUISwitch">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/UI_Show.svg" height="20px" style="min-height: 20px; pointer-events: none;">
          </div>
        </button>

        <button :disabled="loadingOriginalImage" v-show="isCaptureMode" @click="getOriginalImage"
          class="get-click btn-OriginalImage">
          <template v-if="!loadingOriginalImage">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/OriginalImage.svg" height="20px"
                style="min-height: 20px; pointer-events: none;"></img>
            </div>
          </template>
          <template v-else>
            <div class="progress-spinner">
              <v-progress-circular indeterminate color="white" size="20"></v-progress-circular>
            </div>
          </template>
        </button>

        <button v-show="isShowScaleChange && isShowImage" @click="ScaleChange('+')" class="get-click btn-ScaleAdd">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/ScaleAdd.svg" height="20px"
              style="min-height: 20px; pointer-events: none;"></img>
          </div>
        </button>

        <button v-show="isShowScaleChange && isShowImage" @click="ScaleChange('-')" class="get-click btn-ScaleSub">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/ScaleSub.svg" height="20px"
              style="min-height: 20px; pointer-events: none;"></img>
          </div>
        </button>
      </div>
    </div>

    <transition name="ToolBar">
      <div v-show="isCaptureMode" class="TopLeft-Info">
        <p>{{ ImageInfo }}</p>
      </div>
    </transition>

    <transition name="ToolBar">
      <div v-show="isStellariumMode" class="TopLeft-Info">
        <p>{{ PositionInfo }}</p>
      </div>
    </transition>

    <!-- <button v-show="isCaptureMode" @click="calcWhiteBalanceGains" class="get-click btn-WhiteBalance">
    <div style="display: flex; justify-content: center; align-items: center;">
      <img src="@/assets/images/svg/ui/WhiteBalance.svg" height="20px" style="min-height: 20px"></img>
    </div>
  </button> -->

    <DateTimePicker v-show="ShowDateTimePicker" v-model="pickerDate" :location="$store.state.currentLocation">
    </DateTimePicker>

    <ImageManagerPanel v-show="ShowImageManagerPanel" />

    <DeviceAllocationPanel v-show="ShowDeviceAllocationPanel" />

    <INDIDebugDialog v-show="ShowINDIDebugDialog" />

    <RPIHotspotDialog v-show="ShowRPIHotspotDialog" />

    <SchedulePanel v-show="ShowSchedulePanel" class="get-click" style="position: absolute; z-index: 200;" />
    <ScheduleKeyBoard v-show="ShowSchedulePanel" />
    <ScheduleList v-show="ShowSchedulePanel" class="get-click" style="position: absolute; z-index: 200;" />

    <v-dialog v-model="ConfirmDialog" width="220" persistent>
      <v-expand-x-transition>
        <v-card class="flashing-border" style="backdrop-filter: blur(5px); background-color: rgba(64, 64, 64, 0.5);">
          <v-card-title style="font-size: 20px;">
            {{ $t(ConfirmDialogTitle) }}
          </v-card-title>
          <v-card-text style="font-size: 15px; margin-bottom: -20px; line-height: 1.5;">
            {{ $t(ConfirmDialogText) }}
          </v-card-text>
          <v-card-actions style="margin-top: -20px; padding-top: -20px;">
            <v-spacer></v-spacer>
            <v-btn @click="ConfirmDialogCancel()" style="background-color: rgba(255, 255, 255, 0.1);">
              <v-icon color="rgba(255, 0, 0)"> mdi-close </v-icon>
            </v-btn>
            <v-btn @click="ConfirmDialogToDo()" style="background-color: rgba(255, 255, 255, 0.1);">
              <v-icon color="rgba(51, 218, 121)"> mdi-check </v-icon>
            </v-btn>
            <v-spacer></v-spacer>
          </v-card-actions>
        </v-card>
      </v-expand-x-transition>
    </v-dialog>

    <v-dialog v-model="DSLRsSetupDialog" width="250" persistent>
      <v-expand-x-transition>
        <v-card class="flashing-border" style="backdrop-filter: blur(5px); background-color: rgba(64, 64, 64, 0.5);">
          <v-card-title style="font-size: 15px;">
            {{ DSLRCameraName }}
          </v-card-title>

          <v-card-text>
            <v-row>
              <v-col cols="6">
                <v-text-field v-model="DSLRCameraWidth" label="Width(px)" type="number" outlined dense></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field v-model="DSLRCameraHeight" label="Height(px)" type="number" outlined dense></v-text-field>
              </v-col>
            </v-row>

            <v-text-field v-model="DSLRCameraPixelPitch" label="Pixel Pitch(µm)" type="number" outlined dense
              style="margin-top: -20px;"></v-text-field>
          </v-card-text>

          <v-card-text v-show="showDSLRsTips" style="margin-top: -40px;">
            <span style="font-size: 10px; color: #2C9DDE; user-select: none; text-align: center; width: 100%;">
              {{ $t('This is a one-time setup. You can obtain these values from your camera manual or from online sources such as www.digicamdb.com.') }}
            </span>
          </v-card-text>

          <v-card-actions :style="{ 'margin-top': showDSLRsTips ? '-30px' : '-50px' }">
            <v-btn @click="showDSLRsTips = !showDSLRsTips" style="background-color: rgba(255, 255, 255, 0.1);">
              <v-icon color="#2C9DDE"> mdi-help </v-icon>
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn @click="ConfirmDSLRsSetup(DSLRCameraWidth, DSLRCameraHeight, DSLRCameraPixelPitch)"
              style="background-color: rgba(255, 255, 255, 0.1);">
              <v-icon color="rgb(255, 255, 255)"> mdi-check </v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-expand-x-transition>
    </v-dialog>


    <div v-if="CaptureImageProgressCard && isCaptureMode" class="CaptureImageProgress-card">
      <div class="text-center">
        <v-progress-circular :value="Number(CaptureImageProgressNum_)" :rotate="360" :size="70" :width="7"
          style="top: 7px; color: rgba(255, 255, 255, 0.7);">
          <template v-slot:default> {{ CaptureImageProgressNum }} % </template>
        </v-progress-circular>
      </div>
      <span
        style="position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); font-size: 10px; color: rgba(255, 255, 255, 0.3); user-select: none; text-align: center; width: 100%;">
        {{ $t('Image loading in progress...') }}
      </span>
    </div>


    <!-- 更新命令显示文本框的命名为解析进度显示 -->
    <!-- <div v-if="showParsingProgress && isPolarAxisMode"
      style="background-color: rgba(0, 0, 0, 0.7); color: white; padding: 10px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; height: 150px; display: flex; flex-direction: column; justify-content: flex-end; overflow: hidden;">
      <div v-for="(progress, index) in parsingProgressList" :key="index" style="margin-top: 5px;">
        {{ progress }}
      </div>
    </div> -->

    <!-- 更新进度对话框 -->
    <UpdateProgressDialog 
      :visible="showUpdateDialog"
      @close="closeUpdateDialog"
      @retry="retryUpdate"
    />

    <!-- <div v-show="showLocationInputs && isPolarAxisMode" style="position: absolute; top: 22px; left: 60px;">
      <location-focal-inputs 
        @location-update="handleLocationUpdate"
      />
    </div> -->
    <AutomaticPolarAlignmentCalibration
      :visible.sync="isCalibrationVisible"
      :auto-start="false"
    />

    <CapturePanel v-show="isCaptureMode" />
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
import USBFilesDialog from '@/components/USBFilesDialog.vue'
import ObservingPanel from '@/components/observing-panel.vue'

import MountControlPanel from '@/components/MountControlPanel.vue'

import MessageBox from "@/components/MessageBox.vue";


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

import DeviceAllocationPanel from '@/components/DeviceAllocationPanel.vue';

import INDIDebugDialog from '@/components/indiDebugDialog.vue';

import RPIHotspotDialog from '@/components/RPI-Hotspot.vue';

import DateTimePicker from '@/components/date-time-picker.vue'
import Moment from 'moment'

import UpdateProgressDialog from '@/components/UpdateProgressDialog.vue';

import AutomaticPolarAlignmentCalibration from '@/components/AutomaticPolarAlignmentCalibration.vue'

// import LocationFocalInputs from '@/components/LocationFocalInputs.vue';

export default {
  data: function () {
    return {
      messageList: [],  // 用于存储消息框的数据
      messageNum: 0,    // 消息数量
      showFloatingBox: false,  // 是否显示浮动框
      isSettingWindowShow: false,  // 是否显示设置窗口
      isBottomBarShow: true,  // 是否显示底部栏
      CurrentMainPage: 'Stel',  // 当前主页面
      // 极轴对准页面前处于的页面
      lastMainPage: 'None',  // 上一个主页面
      isExpTimeBarShow: false,  // 是否显示曝光时间栏
      isCFWSelectBarShow: false,  // 是否显示CFW选择栏
      showChartsPanel: false,  // 是否显示图表面板
      showHistogramPanel: false,  // 是否显示直方图面板
      showFocuserPanel: false,  // 是否显示聚焦面板
      showToolbar: true,  // 是否显示工具栏
      showMountSwitch: true,  // 是否显示安装开关
      isMainSwitchShow: true,  // 是否显示主开关
      isRedBoxMode: false,  // 是否为红框模式
      ShowSchedulePanel: false,  // 是否显示日程面板
      ShowImageManagerPanel: false,  // 是否显示图像管理器面板
      ShowDeviceAllocationPanel: false,  // 是否显示设备分配面板
      ShowINDIDebugDialog: false,  // 是否显示INDI调试对话框
      ShowRPIHotspotDialog: false,  // 是否显示RPI热点对话框
      ShowDateTimePicker: false,  // 是否显示日期时间选择器
      loadingOriginalImage: false,  // 是否正在加载原始图像
      isShowHideUi: true,  // 是否显示隐藏用户界面
      showLocationInputs: false, // 是否显示经纬度输入框
      isCalibrationVisible: false,  // 是否显示自动对极轴页面

      currentImageWidth: 0,
      currentImageHeight: 0,

      showRedBox: false, // 控制小红框显示与隐藏
      isInitRedBox: true,
      mouseX: 0, // 鼠标的X坐标
      mouseY: 0, // 鼠标的Y坐标
      mouseX_: 0,
      mouseY_: 0,
      BoxSideLength: 300,
      RedBoxWidth: 300,
      RedBoxHeight: 300,
      RedBoxWidth_: 300,
      RedBoxHeight_: 300,

      isStellariumMode: true,
      isCaptureMode: false,
      isGuiderMode: false,
      isShowImage: true,

      ImageProportion: 1,
      RedBoxOffset_X: 0,
      RedBoxOffset_Y: 0,

      Scale: 1,


      FocalLength: 0,         // QHY462C: 130  5.568 3.132
      // CameraSizeWidth: 5.568,   // QHY163M: 510  17.7  13.4
      // CameraSizeHeight: 3.132, 

      PlateSolveInProgress: false,

      isPolarAxisMode: false,

      showSingleSolveBtn: true,

      DifferenceText: '',
      TargetText: '',
      CurrentText: '',

      ConfirmDialog: false,
      ConfirmDialogTitle: 'Title',
      ConfirmDialogText: 'Text',

      ConfirmToDo: '',

      DSLRsSetupDialog: false,
      DSLRCameraName: '',
      DSLRCameraWidth: 0,
      DSLRCameraHeight: 0,
      DSLRCameraPixelPitch: 0,
      showDSLRsTips: false,

      CaptureImageProgressCard: false,
      CaptureImageProgressNum: 0,
      CaptureImageProgressNum_: 0,

      showPHD2BoxAndCross: false,
      PHD2Box_X: 0,
      PHD2Box_Y: 0,
      PHD2Box_Width: 0,
      PHD2Box_Height: 0,

      PHD2Cross_X: 0,
      PHD2Cross_Y: 0,
      PHD2Cross_Width: 0,
      PHD2Cross_Height: 0,

      PHD2MultiStars: [],

      CurrentGuiderStatus: 'null',

      PHD2BoxView: true,
      PHD2CrossView: true,

      loadingImageSolve: false,

      currentPolarAxisStep: 1,

      PolarAxisStepTips: [
        "Rotate the equatorial dec axis by a certain angle and then take photos for analysis.",
        "The Dec axis remains stationary, rotate the Ra axis by a certain angle, and then take photos for analysis.",
        "Continue rotating the Ra axis and then take photos for analysis.",
        "Turn on the loop shooting analysis, keep the Ra and Dec axes still, adjust the equatorial meter to make the two circles in the star chart as close to each other as possible."
      ],

      BinningNum: 1,
      PositionInfo: '',

      showParsingProgress: false,  // 控制解析进度文本框的显示
      parsingProgressList: [],     // 存储解析进度的列表
      isShowScaleChange: false,
      scaleButtonsOverlap: false, // 缩放按钮是否与CapturePanel重合
      scaleButtonsMarginTop: 0, // 缩放按钮向上移动的距离

      previousState: {        // 保存隐藏时的ui状态
        isShowImage: false,
        showMountSwitch: false,
        isRedBoxMode: false,
        showToolbar: false,
        isCaptureMode: false,
        showFloatingBox: false,
        showHistogramPanel: false,
        isExpTimeBarShow: false,
        isCFWSelectBarShow: false,
        isMainSwitchShow: false,
        showFocuserPanel: false,
        showChartsPanel: false,
        isShowScaleChange: false
      },

      selectStarX: 0, // 选择星点的X坐标
      selectStarY: 0, // 选择星点的Y坐标

      showUpdateDialog: false, // 是否显示更新进度对话框

    }
  },
  created() {
    this.$bus.$on('add-driver', this.handleAddDriver);
    this.$bus.$on('add-device', this.handleAddDevice);
    this.$bus.$on('showMsgBox', this.showMessageBox);
    this.$bus.$on('MainCameraSize', this.resizeRedBox);
    this.$bus.$on('MainCameraBinning', this.SetBinningNum);
    this.$bus.$on('RedBoxSizeChange', this.setOriginalRedBoxLength);
    this.$bus.$on('time-selected', this.handleExpTimeSelected);
    // this.$bus.$on('cfw-selected', this.handleCFWSelected);
    this.$bus.$on('toggleSchedulePanel', this.toggleSchedulePanel);
    this.$bus.$on('closeScheduleAndDateTimePicker', this.closeScheduleAndDateTimePicker);
    this.$bus.$on('MountPanelClose', this.toggleFloatingBox);
    this.$bus.$on('toggleHistogramPanel', this.toggleHistogramPanel);
    this.$bus.$on('toggleFocuserPanel', this.toggleFocuserPanel);
    this.$bus.$on('ImageManagerPanelClose', this.toggleImageManagerPanel);
    this.$bus.$on('ImageManagerPanelOpen', this.toggleImageManagerPanel);
    this.$bus.$on('toggleDeviceAllocationPanel', this.toggleDeviceAllocationPanel);
    this.$bus.$on('toggleINDIDebugDialog', this.toggleINDIDebugDialog);
    this.$bus.$on('toggleRPIHotspotDialog', this.toggleRPIHotspotDialog);
    this.$bus.$on('toggleDateTimePicker', this.toggleDateTimePicker);
    // this.$bus.$on('RedBoxClick', this.handleTouchOrMouseDown);
    // this.$bus.$on('RedBox_XY', this.RedBox_XY);
    // this.$bus.$on('RedBoxOffset', this.setRedBoxOffset);
    // this.$bus.$on('RedBoxScale', this.SetRedBoxScale);
    // this.$bus.$on('ScaleImageSize', this.setScaleImageSize);
    this.$bus.$on('CalibratePolarAxisMode', this.CalibratePolarAxisMode);
    this.$bus.$on('showSolveImage', this.showSolveImage);
    this.$bus.$on('HideSingleSolveBtn', this.HideSingleSolveBtn);
    this.$bus.$on('ShowAzAltText', this.ShowAzAltText);
    this.$bus.$on('ShowCurrentAzAltText', this.ShowCurrentAzAltText);
    this.$bus.$on('ShowConfirmDialog', this.ShowConfirmDialog);
    // this.$bus.$on('CameraInExposuring', this.SwitchMainPage);
    this.$bus.$on('ShowCaptureImageProgress', this.ShowCaptureImageProgress);
    this.$bus.$on('PHD2BoxPosition', this.PHD2BoxPosition);
    this.$bus.$on('ClearPHD2MultiStars', this.ClearPHD2MultiStars);
    this.$bus.$on('PHD2MultiStarsPosition', this.PHD2MultiStarsPosition);
    this.$bus.$on('PHD2CrossPosition', this.PHD2CrossPosition);
    this.$bus.$on('GuiderStatus', this.GuiderStatus);
    this.$bus.$on('PHD2StarBoxView', this.togglePHD2StarBox);
    this.$bus.$on('PHD2StarCrossView', this.togglePHD2StarCross);
    this.$bus.$on("ImageSolveFinished", this.ImageSolveFinished);
    // this.$bus.$on('Focal Length (mm)', this.FocalLengthSet);
    this.$bus.$on('SetFocalLengthNum', this.FocalLengthSet);
    this.$bus.$on('FocalLength', this.FocalLengthSet);
    this.$bus.$on('SetBinningNum', this.SetBinningNum);
    this.$bus.$on('ShowDSLRsSetup', this.ShowDSLRsSetup);
    this.$bus.$on('ReloadShowDSLRsSetup', this.ReloadShowDSLRsSetup);
    this.$bus.$on('ShowPositionInfo', this.ShowPositionInfo);
    this.$bus.$on('ParseInfoEmitted', this.addParsingProgress);
    this.$bus.$on('setParsingProgress', this.setParsingProgress);
    this.$bus.$on('LoopSolveImageFinished', this.LoopSolveImageFinished);
    this.$bus.$on('setRedBoxPosition', this.setRedBoxPosition);
    this.$bus.$on('setRedBoxLength', this.setRedBoxLength);
    // this.$bus.$on('setOriginalRedBoxSideLength', this.setOriginalRedBoxLength);
    this.$bus.$on('getRedBoxState', this.getRedBoxState);
    this.$bus.$on('selectStar', this.selectStar);
    this.$bus.$on('setScale', this.setScale);
    this.$bus.$on('reRunUpdate', this.reRunUpdate);   // 用于在更新失败后重新运行更新
    this.$bus.$on('closeUpdateDialog', this.closeUpdateDialog);
  },
  mounted() {
    // 根据屏幕分辨率高度判断布局，立即执行（不需要等待DOM渲染）
    this.checkScaleButtonsOverlap();
    
    // this.resizeRedBox(1920, 1080);
    // this.$bus.$emit('syncROI_length');
  },
  methods: {
    toggleFloatingBox() {
      this.showFloatingBox = !this.showFloatingBox; // 切换显示状态
    },
    toggleChartsPanel() {
      this.showChartsPanel = !this.showChartsPanel;
      if (this.showFocuserPanel) {
        this.showFocuserPanel = !this.showFocuserPanel;
      }
      else if (this.showHistogramPanel) {
        this.showHistogramPanel = !this.showHistogramPanel;
      }
      this.$bus.$emit('SwitchImageToShow', true);
    },
    toggleHistogramPanel() {
      this.showRedBox = false;
      this.showHistogramPanel = !this.showHistogramPanel;
      if (this.showFocuserPanel) {
        this.showFocuserPanel = !this.showFocuserPanel;
      }
      else if (this.showChartsPanel) {
        this.showChartsPanel = !this.showChartsPanel;
      }
      this.$bus.$emit('SwitchImageToShow', true);
    },
    toggleFocuserPanel() {
      this.showFocuserPanel = !this.showFocuserPanel;
      if (this.showHistogramPanel) {
        this.showHistogramPanel = !this.showHistogramPanel;

      }
      else if (this.showChartsPanel) {
        this.showChartsPanel = !this.showChartsPanel;
      }
      this.$bus.$emit('SwitchImageToShow', !this.showFocuserPanel);
      if (this.showFocuserPanel) {
        // document.addEventListener('click', this.handleTouchOrMouseDown);
        this.showRedBox = true;
      } else {
        this.showRedBox = false;
      }
    },
    toggleSchedulePanel() {
      this.ShowSchedulePanel = !this.ShowSchedulePanel;
    },

    closeScheduleAndDateTimePicker() {
      // 关闭任务计划表和时间控制器
      if (this.ShowSchedulePanel) {
        this.ShowSchedulePanel = false;
      }
      if (this.ShowDateTimePicker) {
        this.ShowDateTimePicker = false;
      }
    },

    toggleImageManagerPanel() {
      this.ShowImageManagerPanel = !this.ShowImageManagerPanel;
      if (this.ShowImageManagerPanel) {
        // 打开文件管理时，关闭任务计划表和时间控制器
        if (this.ShowSchedulePanel) {
          this.ShowSchedulePanel = false;
        }
        if (this.ShowDateTimePicker) {
          this.ShowDateTimePicker = false;
        }
        this.$bus.$emit('calculateTotalPage');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ShowAllImageFolder');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'USBCheck');
      }
    },

    toggleDeviceAllocationPanel() {
      this.ShowDeviceAllocationPanel = !this.ShowDeviceAllocationPanel;
      if (this.ShowDeviceAllocationPanel) {
        // 打开设备管理时，关闭任务计划表和时间控制器
        if (this.ShowSchedulePanel) {
          this.ShowSchedulePanel = false;
        }
        if (this.ShowDateTimePicker) {
          this.ShowDateTimePicker = false;
        }
      }
    },

    toggleINDIDebugDialog() {
      this.ShowINDIDebugDialog = !this.ShowINDIDebugDialog;
      if (this.ShowINDIDebugDialog) {
        // 打开INDI调试对话框时，关闭任务计划表和时间控制器
        if (this.ShowSchedulePanel) {
          this.ShowSchedulePanel = false;
        }
        if (this.ShowDateTimePicker) {
          this.ShowDateTimePicker = false;
        }
      }
    },

    toggleRPIHotspotDialog() {
      this.ShowRPIHotspotDialog = !this.ShowRPIHotspotDialog;
    },

    toggleDateTimePicker() {
      this.ShowDateTimePicker = !this.ShowDateTimePicker;
    },

    showCaptureUI() {
      // 恢复之前保存的 UI 状态
      this.isShowImage = this.previousState.isShowImage;
      this.showMountSwitch = this.previousState.showMountSwitch;
      this.isRedBoxMode = this.previousState.isRedBoxMode;
      this.showToolbar = this.previousState.showToolbar;
      this.isCaptureMode = this.previousState.isCaptureMode;
      this.isShowScaleChange = this.previousState.isShowScaleChange;
      this.showFloatingBox = this.previousState.showFloatingBox;
      this.showHistogramPanel = this.previousState.showHistogramPanel;
      this.isExpTimeBarShow = this.previousState.isExpTimeBarShow;
      this.isCFWSelectBarShow = this.previousState.isCFWSelectBarShow;
      this.isMainSwitchShow = this.previousState.isMainSwitchShow;
      this.showFocuserPanel = this.previousState.showFocuserPanel;
      this.showChartsPanel = this.previousState.showChartsPanel;
      this.isShowHideUi = this.previousState.isShowHideUi;
      // this.isPolarAxisMode = this.previousState.isPolarAxisMode;

      // 发送极轴模式状态更新
      this.$bus.$emit('PolarAxisMode', this.isPolarAxisMode);
    },
    hideCaptureUI(isShowequatorial_jnow = false) {
      // document.addEventListener('click', this.handleTouchOrMouseDown);
      this.previousState = {
        isShowImage: this.isShowImage,                // 隐藏与现实按钮的切换
        showMountSwitch: this.showMountSwitch,        // 显示与隐藏赤道仪切换按钮
        isRedBoxMode: this.isRedBoxMode,             // 显示与隐藏小红框
        showToolbar: this.showToolbar,               // 显示与隐藏工具栏
        isCaptureMode: this.isCaptureMode,           // 显示与隐藏拍照模式
        isShowScaleChange: this.isShowScaleChange,   // 显示与隐藏缩放按钮
        showFloatingBox: this.showFloatingBox,       // 显示与隐藏浮动框
        showHistogramPanel: this.showHistogramPanel, // 显示与隐藏直方图面板
        isExpTimeBarShow: this.isExpTimeBarShow,     // 显示与隐藏曝光时间条
        isCFWSelectBarShow: this.isCFWSelectBarShow, // 显示与隐藏滤镜轮选择器
        isMainSwitchShow: this.isMainSwitchShow,     // 显示与隐藏主页切换按钮
        showFocuserPanel: this.showFocuserPanel,   // 显示与隐藏聚焦器面板
        showChartsPanel: this.showChartsPanel,      // 显示与隐藏图表面板
        isShowHideUi: this.isShowHideUi,            // 显示与隐藏隐藏用户界面

      };

      this.isShowImage = false;
      this.showMountSwitch = false;
      this.isRedBoxMode = false;
      this.showToolbar = false;
      this.isCaptureMode = false;
      this.showFloatingBox = false;
      this.showHistogramPanel = false;
      this.isExpTimeBarShow = false;
      this.isCFWSelectBarShow = false;
      this.isMainSwitchShow = false;
      this.showFocuserPanel = false;
      this.showHistogramPanel = false;
      this.showChartsPanel = false;
      this.isShowScaleChange = false;
      if (isShowequatorial_jnow) {
        this.$stel.core.lines.equatorial_jnow.visible = true;
        // this.showMountSwitch = true;
      }

    },

    // RedBox_XY(event) {
    //   if (this.isRedBoxMode) {
    //     // this.mouseX = X;
    //     // this.mouseY = Y;
    //     this.handleTouchOrMouseDown(event);
    //   }
    // },

    // setRedBoxOffset(X, Y) {
    //   this.RedBoxOffset_X = X;
    //   this.RedBoxOffset_Y = Y;
    //   // console.log('RedBoxOffset:', this.RedBoxOffset_Y);
    //   this.mouseX = this.mouseX_ - this.RedBoxOffset_X;
    //   this.mouseY = this.mouseY_ - this.RedBoxOffset_Y;
    // },

    // SetRedBoxScale(value) {
    //   this.RedBoxWidth = this.RedBoxWidth_ * value;
    //   this.RedBoxHeight = this.RedBoxHeight_ * value;
    // },

    SetBinningNum(num) {
      this.BinningNum = num;
      console.log('currentImageBin:', num);
    },

    FocalLengthSet(num) {
      if (num === '') {
        this.FocalLength = 0;
      } else {
        this.FocalLength = num;
      }
      console.log('currentFocalLength:', num);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'saveToConfigFile:FocalLength:' + num);
    },

    PHD2BoxPosition(BoxStartX, BoxStartY, BoxWidth, BoxHeight) {
      this.PHD2Box_X = BoxStartX;
      this.PHD2Box_Y = BoxStartY;
      this.PHD2Box_Width = BoxWidth;
      this.PHD2Box_Height = BoxHeight;
    },

    PHD2CrossPosition(CrossStartX, CrossStartY) {
      this.PHD2Cross_X = CrossStartX;
      this.PHD2Cross_Y = CrossStartY;
      this.PHD2Cross_Width = window.innerWidth;
      this.PHD2Cross_Height = window.innerHeight;
    },

    PHD2MultiStarsPosition(StarStartX, StarStartY) {
      this.PHD2MultiStars.push({ X: StarStartX, Y: StarStartY });
    },

    ClearPHD2MultiStars() {
      this.PHD2MultiStars = [];
    },

    GuiderStatus(status) {
      if (status === 'InGuiding') {
        this.CurrentGuiderStatus = 'InGuiding';
      } else if (status === 'InCalibration') {
        this.CurrentGuiderStatus = 'InCalibration';
      } else if (status === 'StarLostAlert') {
        this.CurrentGuiderStatus = 'StarLostAlert';
      } else if (status === 'Connected') {
        this.CurrentGuiderStatus = 'Connected';
      } else {
        this.CurrentGuiderStatus = 'null';
      }
    },

    // setScaleImageSize(width, height) {
    //   this.ScaleImageWidth = width;
    //   this.ScaleImageHeight = height;
    //   // console.log('ScaleImageSize: ' + this.ScaleImageWidth + ', ' + this.ScaleImageHeight);
    // },

    setRedBoxPosition(x, y) {
      // 计算 RedBox 的中心位置
      const halfBoxWidth = Math.floor(this.RedBoxWidth / 2);
      const halfBoxHeight = Math.floor(this.RedBoxHeight / 2);

      // // 确保 RedBox 中心坐标 (x, y) 不会使 RedBox 超出画布边界
      // const windowWidth = window.innerWidth;
      // const windowHeight = window.innerHeight;

      // // 调整 x 和 y 使得 RedBox 保持在画布内
      // if (x - halfBoxWidth < 0) {
      //   x = halfBoxWidth;
      //   xisside = 1;
      // } else if (x + halfBoxWidth > windowWidth) {
      //   x = windowWidth - halfBoxWidth;
      //   xisside = 2;
      // }

      // if (y - halfBoxHeight < 0) {
      //   y = halfBoxHeight;
      //   yisside = 1;
      // } else if (y + halfBoxHeight > windowHeight) {
      //   y = windowHeight - halfBoxHeight;
      //   yisside = 2;
      // }

      // this.$bus.$emit('SendConsoleLogMsg', '图像偏移: x=' + this.RedBoxOffset_X + ',y=' + this.RedBoxOffset_Y, 'info');

      // 计算中心点坐标
      x = x - halfBoxWidth;
      y = y - halfBoxHeight;

      // 确保 RedBox 的中心坐标 (x, y) 是偶数
      // if ((x - halfBoxWidth) % 2 != 0) {
      //     x = x + 1;
      // }
      // if ((y - halfBoxHeight) % 2 != 0) {
      //     y = y + 1;
      // }

      // 更新 RedBox 的位置
      this.mouseX = Math.floor(x);
      this.mouseX_ = Math.floor(x);
      this.mouseY = Math.floor(y);
      this.mouseY_ = Math.floor(y);

      console.log('Updated RedBox position: ', this.mouseX, ',', this.mouseY);


      // 发送更新位置的消息
      // if (ROI_x !== 0 && ROI_y !== 0) {
      //   this.$bus.$emit('AppSendMessage', 'Vue_Command', 'setROIPosition:' + ROI_x + ":" + ROI_y);
      // }
      // this.$bus.$emit('AppSendMessage', 'Vue_Command', 'RedBox:' + this.mouseX + ":" + this.mouseY + ":" + window.innerWidth + ":" + window.innerHeight);
    },

    setRedBoxLength(width, height) {

      this.RedBoxWidth = width;
      this.RedBoxWidth_ = width;
      this.RedBoxHeight = height;
      this.RedBoxHeight_ = height;
    },

    setOriginalRedBoxLength(length) {
      console.log('初始化小红框大小: RedBoxWidth: ', this.RedBoxWidth, ', RedBoxHeight: ', this.RedBoxHeight, ', BoxSideLength: ', this.BoxSideLength, ', Scale: ', this.Scale);
      const scale = length / this.BoxSideLength;
      // 使用基准尺寸进行缩放，避免重复累计缩放
      this.RedBoxWidth = this.RedBoxWidth_ * scale;
      this.RedBoxHeight = this.RedBoxHeight_ * scale;
      this.BoxSideLength = length;
      // 更新基准为当前尺寸
      this.RedBoxWidth_ = this.RedBoxWidth;
      this.RedBoxHeight_ = this.RedBoxHeight;
      console.log('更新小红框大小: RedBoxWidth: ', this.RedBoxWidth, ', RedBoxHeight: ', this.RedBoxHeight, ', BoxSideLength: ', this.BoxSideLength, ', Scale: ', this.Scale);
    },

    // handleTouchOrMouseDown(event) {
    //   // 获取触摸或鼠标位置
    //   const clientX = event.type.startsWith('touch') ? event.touches[0].clientX : event.clientX;
    //   const clientY = event.type.startsWith('touch') ? event.touches[0].clientY : event.clientY;

    //   // 更新位置
    //   this.mouseX = Math.floor(clientX);
    //   this.mouseX_ = Math.floor(clientX);
    //   this.mouseY = Math.floor(clientY);
    //   this.mouseY_ = Math.floor(clientY);

    //   console.log('handleTouchOrMouseDown: ', this.mouseX, ',', this.mouseY);

    //   const windowWidth = window.innerWidth;
    //   const windowHeight = window.innerHeight;


    //   this.$bus.$emit('AppSendMessage', 'Vue_Command', 'RedBox:'+ Math.floor((this.mouseX + this.RedBoxOffset_X) / this.ScaleImageWidth * windowWidth) + ":" + Math.floor((this.mouseY + this.RedBoxOffset_Y) / this.ScaleImageHeight * windowHeight) + ":" + windowWidth + ":" + windowHeight);
    // },

    resizeRedBox(CameraWidth, CameraHeight) {
      this.currentImageWidth = CameraWidth;
      this.currentImageHeight = CameraHeight;

      // const windowWidth = window.innerWidth;
      // const windowHeight = window.innerHeight;

      // this.RedBoxWidth = this.BoxSideLength * windowWidth / CameraWidth / this.Scale;
      // this.RedBoxHeight = this.BoxSideLength * windowHeight / CameraHeight / this.Scale;
      // this.$bus.$emit('SendConsoleLogMsg', '设置小红框大小: ' + this.RedBoxWidth + ', ' + this.RedBoxHeight, 'info');
      // this.$bus.$emit('RedBoxSideLength', this.BoxSideLength);
      this.ImageProportion = CameraWidth / CameraHeight;
      this.$bus.$emit('ImageProportion', this.ImageProportion);
      // // this.RedBoxHeight = this.RedBoxHeight * this.ImageProportion;

      // this.RedBoxWidth_ = this.RedBoxWidth;
      // this.RedBoxHeight_ = this.RedBoxHeight;

      // console.log('RedBoxSize:', this.RedBoxWidth, ', ', this.RedBoxHeight);

      // if (this.isInitRedBox === true) {
      //   // 将小红框置于界面中央
      //   this.mouseX = (windowWidth - this.RedBoxWidth) / 2; // 100是小红框的宽度
      //   this.mouseX_ = (windowWidth - this.RedBoxWidth) / 2; // 100是小红框的宽度
      //   this.mouseY = (windowHeight - this.RedBoxHeight) / 2; // 100是小红框的高度
      //   this.mouseY_ = (windowHeight - this.RedBoxHeight) / 2; // 100是小红框的高度
      //   this.isInitRedBox = false;
      // }

      // this.$bus.$emit('AppSendMessage', 'Vue_Command', 'RedBox:' + this.mouseX + ":" + this.mouseY + ":" + windowWidth + ":" + windowHeight);  //TODO: BoxSize
    },

    // RedBoxSizeChange(length) {
    //   this.BoxSideLength = length;
    //   // console.log('RedBoxSizeChange: ', this.BoxSideLength);
    //   // this.$bus.$emit('SendConsoleLogMsg', 'Red Box Size Change:' + this.BoxSideLength, 'info');
    //   // this.$bus.$emit('AppSendMessage', 'Vue_Command', 'RedBox Side Length (px):' + this.BoxSideLength);
    //   // this.$bus.$emit('RedBoxSideLength', this.BoxSideLength);
    // },

    // handleAddDriver(driver) {
    //   if (driver.type === 'Mount') {
    //     this.$refs.mountDialog.AddDrivers(driver);
    //   } else if (driver.type === 'Focuser') {
    //     this.$refs.focuserDialog.AddDrivers(driver);
    //   } else if (driver.type === 'PoleCamera') {
    //     this.$refs.polecameraDialog.AddDrivers(driver);
    //   } else if (driver.type === 'MainCamera') {
    //     this.$refs.maincameraDialog.AddDrivers(driver);
    //   } else if (driver.type === 'Guider') {
    //     this.$refs.guiderDialog.AddDrivers(driver);
    //   } else if (driver.type === 'CFW') {
    //     this.$refs.cfwDialog.AddDrivers(driver);
    //   }
    // },
    // handleAddDevice(device) {
    //   if (device.type === 'Mount') {
    //     this.$refs.mountDialog.AddDevices(device);
    //   } else if (device.type === 'Focuser') {
    //     this.$refs.focuserDialog.AddDevices(device);
    //   } else if (device.type === 'PoleCamera') {
    //     this.$refs.polecameraDialog.AddDevices(device);
    //   } else if (device.type === 'MainCamera') {
    //     this.$refs.maincameraDialog.AddDevices(device);
    //   } else if (device.type === 'Guider') {
    //     this.$refs.guiderDialog.AddDevices(device);
    //   } else if (device.type === 'CFW') {
    //     this.$refs.cfwDialog.AddDevices(device);
    //   }
    // },

    // 消息框
    showMessageBox(msg, type) {
      console.log("QHYCCD | show Message Box.");

      this.messageNum += 1;

      const newMessage = {
        id: this.messageNum,
        message: msg,
        type: type,  // 你可以动态设置不同的消息类型
        Pos: this.messageList.length
      };
      this.messageList.push(newMessage);

      // 设置定时器，5秒后自动移除
      setTimeout(() => {
        this.removeMessage(this.messageList.indexOf(newMessage));
      }, 5000);
    },
    // 消息框

    removeMessage(index) {
      this.messageList.splice(index, 1);
      this.messageList.forEach((msg, i) => {
        msg.Pos = i;  // 重新计算 Pos
      });
    },

    SwitchMainPage() {
      if (this.CurrentMainPage === 'Stel') {
        this.CurrentMainPage = 'MainCamera';
        this.isBottomBarShow = false;
        this.isExpTimeBarShow = true;

        this.isStellariumMode = false;
        this.isCaptureMode = true;
        this.isShowScaleChange = true;
        this.isGuiderMode = false;

        this.showMountSwitch = true;

        this.showChartsPanel = false;
        this.showRedBox = false;

        this.$bus.$emit('HideTargetSearch');

        this.showPHD2BoxAndCross = false;

        // 清除星图选择的对象，避免信息框在其他画布显示
        try {
          if (this.$stel && this.$stel.core) {
            this.$stel.core.selection = 0;
          }
        } catch (e) {
          // $stel可能不存在，忽略错误
        }
        this.$store.commit('setSelectedObject', 0);
      }
      else if (this.CurrentMainPage === 'MainCamera') {
        this.CurrentMainPage = 'GuiderCamera';
        this.isBottomBarShow = false;
        this.isExpTimeBarShow = false;
        this.isCFWSelectBarShow = false;

        this.isStellariumMode = false;
        this.isCaptureMode = false;
        this.isGuiderMode = true;
        this.isShowScaleChange = false;
        this.showMountSwitch = true;

        this.showChartsPanel = true;
        this.showHistogramPanel = false;
        this.showFocuserPanel = false;
        this.showRedBox = false;
        this.showPHD2BoxAndCross = true;

        // 清除星图选择的对象，避免信息框在其他画布显示
        try {
          if (this.$stel && this.$stel.core) {
            this.$stel.core.selection = 0;
          }
        } catch (e) {
          // $stel可能不存在，忽略错误
        }
        this.$store.commit('setSelectedObject', 0);
      }
      else if (this.CurrentMainPage === 'GuiderCamera') {
        this.CurrentMainPage = 'Stel';
        this.isBottomBarShow = true;
        this.isExpTimeBarShow = false;
        this.isCFWSelectBarShow = false;

        this.isStellariumMode = true;
        this.isCaptureMode = false;
        this.isGuiderMode = false;
        this.isShowScaleChange = false;
        this.showMountSwitch = true;

        this.showChartsPanel = false;
        this.showHistogramPanel = false;
        this.showFocuserPanel = false;
        this.showRedBox = false;
        this.showPHD2BoxAndCross = false;

        this.$bus.$emit('ShowTargetSearch');
      }

      this.$bus.$emit('showCanvas',this.CurrentMainPage);
    },

    handleExpTimeSelected(time) {
      console.log('QHYCCD | ExpTimeSelected:', time);

      // 匹配数字（整数或小数）+ 单位（字母或汉字）
      const match = time.trim().match(/^([\d.]+)\s*([a-zA-Z\u4e00-\u9fa5]+)?$/);

      if (match) {
        const numericPart = parseFloat(match[1]);  // 支持小数
        const unitPart = (match[2] || 'ms').toLowerCase(); // 默认单位 ms

        let convertedTime = numericPart;

        // 支持的单位：s、秒、ms、毫秒
        if (unitPart === 's' || unitPart === '秒') {
          convertedTime *= 1000;  // 秒转毫秒
        }

        // 强制最小曝光时间为 1ms
        if (convertedTime < 1) {
          convertedTime = 1;
        }

        // 向上取整到整数毫秒
        convertedTime = Math.round(convertedTime);

        console.log('Numeric part:', numericPart);
        console.log('Unit part:', unitPart);
        console.log('Converted time (ms):', convertedTime);

        // 发送事件
        this.$bus.$emit('SetExpTime', convertedTime);
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'setExposureTime:' + convertedTime);

      } else {
        console.warn('Invalid exposure time format:', time);
      }
    },

    ImageSolveFinished(success) {
      // console.log("Image Solve Finished!!!");
      this.$bus.$emit('SendConsoleLogMsg', 'Image Solve Finished!!!', 'info');

      this.loadingImageSolve = false;

      if (success) {
        this.currentPolarAxisStep = Math.min(this.currentPolarAxisStep + 1, 4);
      }
    },

    SingleSolveImage() {
      if (this.FocalLength === 0) {
        this.showMessageBox('Please set Focal Length first.', 'error');
        return;
      }

      if (this.loadingImageSolve) {
        this.$bus.$emit('showMsgBox', 'Image solve is currently in progress.', 'warning');
        this.ShowConfirmDialog('Confirm', 'Are you sure you want to cancel the shooting and analysis?', 'EndCaptureAndSolve');
        this.$bus.$emit('setParsingProgress', false);
      } else {
        this.loadingImageSolve = true;
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'SolveImage:' + this.FocalLength);
        this.$bus.$emit('setParsingProgress', true);
      }
    },

    LoopSolveImage() {
      if (this.PlateSolveInProgress) {
        this.PlateSolveInProgress = false;
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'stopLoopSolveImage');
        this.$bus.$emit('SendConsoleLogMsg', 'stop Loop SolveImage', 'info');
        this.$bus.$emit('setParsingProgress', false);
        this.setParsingProgress(false);
      } else {
        this.PlateSolveInProgress = true;
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'startLoopSolveImage:' + this.FocalLength);
        this.$bus.$emit('SendConsoleLogMsg', 'start Loop SolveImage', 'info');
        this.$bus.$emit('setParsingProgress', true);
        this.setParsingProgress(true);
      }
    },

    CalibratePolarAxisMode() {
      this.lastMainPage = this.CurrentMainPage;
      this.CurrentMainPage = 'Stel';
      this.$bus.$emit('showStelCanvas');
      this.hideCaptureUI(true);

      this.isPolarAxisMode = true;
      this.isBottomBarShow = true;
      this.isExpTimeBarShow = false;
      this.isCFWSelectBarShow = false;

      this.isStellariumMode = true;
      this.isCaptureMode = false;
      this.isGuiderMode = false;
      this.isShowScaleChange = false;
      this.showMountSwitch = true;

      this.showChartsPanel = false;
      this.showHistogramPanel = false;
      this.showFocuserPanel = false;
      this.showRedBox = false;
      this.showPHD2BoxAndCross = false;
      this.isShowHideUi = false;

      // 打开自动极轴校准时，关闭任务计划表和时间控制器
      if (this.ShowSchedulePanel) {
        this.ShowSchedulePanel = false;
      }
      if (this.ShowDateTimePicker) {
        this.ShowDateTimePicker = false;
      }

      // this.$bus.$emit('ShowTargetSearch');
      document.removeEventListener('click', this.handleTouchOrMouseDown);
      this.$bus.$emit('showPolarAlignment');           // 显示校准界面
      console.log('********* isShowHideUi **********: ', this.isShowHideUi);
    },

    QuitPolarAxisMode() {
      this.isPolarAxisMode = false;
      this.isStellariumMode = false;
      this.showLocationInputs = false;
      this.showMountSwitch = false;
      this.showCaptureUI();
      
      if (this.lastMainPage === 'None') {
        this.CurrentMainPage = 'MainCamera';
      } else {
        this.CurrentMainPage = this.lastMainPage;
        if (this.CurrentMainPage === 'Stel') {
          this.isStellariumMode = true;
        }
      }
      this.$bus.$emit('PolarAxisMode', this.isPolarAxisMode);
      this.$bus.$emit('showCanvas',this.CurrentMainPage);
      this.lastMainPage = 'None';
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'StopLoopCapture');
      this.$bus.$emit('SendConsoleLogMsg', 'Stop Loop Capture', 'info');
      this.$bus.$emit('hidePolarAlignment');           // 隐藏校准界面
      
    },

    showSolveImage(img) {
      const canvas = document.getElementById('SolveImage-Canvas');

      if (canvas.getContext) {
        const ctx = canvas.getContext('2d');
        const canvasWidth = window.innerWidth / 4;
        const canvasHeight = window.innerHeight / 4;

        let resizeImg = new cv.Mat();

        cv.resize(img, resizeImg, new cv.Size(window.innerWidth / 4, window.innerHeight / 4), 0, 0, cv.INTER_LINEAR);

        // // 清除画布
        // ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // // 调整图像尺寸以适应画布尺寸
        // ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

        // Set canvas size to match the image
        canvas.width = resizeImg.cols;
        canvas.height = resizeImg.rows;

        // Draw the image on canvas
        cv.imshow(canvas, resizeImg);
        // img.delete();
      }
    },

    HideSingleSolveBtn() {
      this.showSingleSolveBtn = false;
    },

    LoopSolveImageFinished() {
      this.PlateSolveInProgress = false;
      this.setParsingProgress(false);
    },

    RecalibratePolarAxis() {
      this.currentPolarAxisStep = 1;
      console.log('Recalibrate the polar axis');
      this.$bus.$emit('SendConsoleLogMsg', 'Recalibrate the polar axis.', 'info');
      this.showSingleSolveBtn = true;
      this.$bus.$emit('RecalibratePolarAxis');

      if (this.PlateSolveInProgress) {
        this.PlateSolveInProgress = false;
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'stopLoopSolveImage');
        this.$bus.$emit('SendConsoleLogMsg', 'stop Loop Solve Image', 'info');
      }

      this.DifferenceText = '';
      this.TargetText = '';
      this.CurrentText = '';
    },

    ShowAzAltText(Az1, Alt1, Az2, Alt2) {
      this.DifferenceText = `${this.$t('Azimuth Offset')}: ${Az1.toFixed(3)}°, ${this.$t('Altitude Offset')}: ${Alt1.toFixed(3)}°`;
      this.TargetText = `${this.$t('Target Azimuth')}: ${Az2.toFixed(3)}°, ${this.$t('Target Altitude')}: ${Alt2.toFixed(3)}°`;
    },

    ShowCurrentAzAltText(Az, Alt) {
      this.CurrentText = `${this.$t('Current')}: ${Az.toFixed(3)}°, ${Alt.toFixed(3)}°`;
    },

    ShowConfirmDialog(title, text, ToDo) {
      this.ConfirmDialog = true;
      this.ConfirmDialogTitle = title;
      this.ConfirmDialogText = text;
      this.ConfirmToDo = ToDo;
    },

    ConfirmDialogCancel() {
      this.ConfirmDialog = false;
      if (this.ConfirmToDo === 'startAutoFocus') {
        this.$bus.$emit('updateAutoFocuserState', false);
        this.$bus.$emit('SendConsoleLogMsg', 'Cancel Auto Focus', 'info');
      }
    },

    ConfirmDialogToDo() {
      this.ConfirmDialog = false;
      if (this.ConfirmToDo === 'Refresh') {
        window.location.reload();
      } else if (this.ConfirmToDo === 'disconnectAllDevice') {
        this.$bus.$emit('disconnectAllDevice', true);
      } else if (this.ConfirmToDo === 'SwitchOutPutPower') {
        const parts = this.ConfirmDialogTitle.split(':');
        const index = parseInt(parts[1]);
        this.$bus.$emit('SwitchOutPutPower', index, false);
      } else if (this.ConfirmToDo === 'Recalibrate') {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'PHD2Recalibrate');
        this.$bus.$emit('SendConsoleLogMsg', 'PHD2 Recalibrate', 'info');
      } else if (this.ConfirmToDo === 'EndCaptureAndSolve') {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'EndCaptureAndSolve');
        this.$bus.$emit('SendConsoleLogMsg', 'End Capture And Solve', 'info');
        this.loadingImageSolve = false;
      } else if (this.ConfirmToDo === 'RestartRaspberryPi') {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'RestartRaspberryPi');
      } else if (this.ConfirmToDo === 'ShutdownRaspberryPi') {
        // this.$bus.$emit('SendConsoleLogMsg', '关闭树莓派并退出', 'info');
        this.$bus.$emit('CloseWebView');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ShutdownRaspberryPi');
      } else if (this.ConfirmToDo === 'restartQtServer') {
        this.$bus.$emit('AppSendMessage', 'Process_Command_Return', 'restartQtServer');
        window.location.reload();
      } else if (this.ConfirmToDo.startsWith('updateCurrentClient')) {
        this.$bus.$emit('AppSendMessage', 'Process_Command_Return', this.ConfirmToDo);
        this.showUpdateDialog = true;
      } else if (this.ConfirmToDo === 'StartCalibration') {
        this.$bus.$emit('StartCalibration');
      }else if (this.ConfirmToDo === 'startAutoFocus') {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'AutoFocusConfirm:Yes');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ClearDataPoints');
        this.$bus.$emit('ClearAllData');
      }
    },

    ShowDSLRsSetup(name) {
      this.DSLRCameraName = name;
      this.DSLRsSetupDialog = true;
      console.log('Show DSLR Setup:', name);
    },

    ReloadShowDSLRsSetup(name, sizeX, sizeY, pixelSize) {
      this.DSLRCameraName = name;
      this.DSLRCameraWidth = sizeX;
      this.DSLRCameraHeight = sizeY;
      this.DSLRCameraPixelPitch = pixelSize;
      this.DSLRsSetupDialog = true;
      console.log('Reload Show DSLR Setup:', name, sizeX, sizeY, pixelSize);
    },

    ConfirmDSLRsSetup(width, height, pixelPitch) {
      this.DSLRsSetupDialog = false;
      console.log('DSLR Camera Info:', width, ',', height, ',', pixelPitch);
      this.$bus.$emit('SendConsoleLogMsg', 'DSLR Camera Info:' + width + ',' + height + ',' + pixelPitch, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'DSLRCameraInfo:' + width + ':' + height + ':' + pixelPitch);
    },

    getOriginalImage() {
      if(this.BinningNum === 1) {
        this.$bus.$emit('showMsgBox', 'The current image is already the original one.', 'warning');
      } else {
        this.loadingOriginalImage = true;
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'getOriginalImage');
      }
    },

    // getOriginalImage() {
    //   this.$bus.$emit('showMsgBox', 'Reload the original image.', 'info');
    //   this.loadingOriginalImage = true;
    //   this.$bus.$emit('AppSendMessage', 'Vue_Command', 'getOriginalImage');
    // },

    ShowCaptureImageProgress(num) {
      this.CaptureImageProgressCard = true;
      this.CaptureImageProgressNum = num;

      if (num % 5 === 0) {
        this.CaptureImageProgressNum_ = num;
      }

      if (num === 100) {
        this.CaptureImageProgressCard = false;
        this.CaptureImageProgressNum = 0;
        this.CaptureImageProgressNum_ = 0;
        this.loadingOriginalImage = false;
      }
    },

    togglePHD2StarBox(Boxview) {
      if (Boxview === 'true') {
        this.PHD2BoxView = true;
      } else {
        this.PHD2BoxView = false;
      }
    },
    togglePHD2StarCross(Crossview) {
      if (Crossview === 'true') {
        this.PHD2CrossView = true;
      } else {
        this.PHD2CrossView = false;
      }
    },

    switchPolarAxisTips() {
      this.currentPolarAxisStep = Math.min(this.currentPolarAxisStep + 1, 4);
    },

    getLocalTime: function () {
      var d = new Date()
      d.setMJD(this.$store.state.stel.observer.utc)
      const m = Moment(d)
      m.local()
      return m
    },

    ShowPositionInfo(lat, lng) {
      this.PositionInfo = 'Lat & Long: ' + lat + ', ' + lng;
    },

    // calcWhiteBalanceGains() {
    //   this.$bus.$emit('calcWhiteBalanceGains');
    // },


    // handleCFWSelected(cfw) {
    //   console.log('QHYCCD | CFWSelected: ', cfw);
    //   // 根据需要处理选择的时间
    // },

    // 添加解析进度到列表并显示
    addParsingProgress(progress) {
      this.parsingProgressList.push(progress);
    },

    // 切换解析进度文本框的显示状态
    setParsingProgress(show) {
      this.showParsingProgress = show;
    },
    getRedBoxState() {
      this.$bus.$emit('RedBoxSideLength:' + this.BoxSideLength);
    },

    selectStar(x, y) {
      this.$bus.$emit('SendConsoleLogMsg', 'Select Star: ' + x + ', ' + y, 'info');
      this.selectStarX = x;
      this.selectStarY = y;
    },

    ScaleChange(type) {
      this.$bus.$emit('ScaleChange', type);
    },
    checkScaleButtonsOverlap() {
      // 根据屏幕分辨率高度来判断布局
      const screenHeight = window.innerHeight;
      
      // 如果屏幕高度较小（例如小于800px），使用田字分布以避免与CapturePanel重合
      // 如果屏幕高度较大，使用竖直排列
      // 可以根据实际需要调整这个阈值
      const heightThreshold = 700; // 高度阈值，小于此值使用田字分布
      
      this.scaleButtonsOverlap = screenHeight < heightThreshold;
      
      // 如果使用田字分布，计算需要向上移动的距离
      if (this.scaleButtonsOverlap) {
        // CapturePanel高度约200px，位于底部
        // 按钮容器在top: 65px，4个按钮竖直排列时高度约170px (4*35 + 3*10)
        // 如果屏幕高度较小，需要向上移动以避免与CapturePanel重合
        const buttonContainerTop = 65;
        const buttonContainerHeight = 4 * 35 + 3 * 10; // 竖直排列时的高度
        const buttonContainerBottom = buttonContainerTop + buttonContainerHeight;
        
        // CapturePanel在底部，高度约200px
        const capturePanelHeight = 200;
        const capturePanelTop = screenHeight - capturePanelHeight - 10; // bottom: 10px
        
        // 如果按钮容器底部会与CapturePanel顶部重合，需要向上移动
        if (buttonContainerBottom > capturePanelTop - 20) { // 20px间距
          const overlapDistance = buttonContainerBottom - (capturePanelTop - 20);
          const requiredMove = overlapDistance + capturePanelHeight + 20;
          
          // 限制移动距离，确保按钮不会移出可视区域
          const minTop = 65;
          const maxMove = buttonContainerTop - minTop;
          
          // 计算新的margin-top（负值表示向上移动）
          let newMarginTop = -Math.min(requiredMove, maxMove);
          
          // 确保不会移出可视区域太多（最多向上移动250px）
          if (newMarginTop < -250) {
            newMarginTop = -250;
          }
          
          this.scaleButtonsMarginTop = newMarginTop;
        } else {
          this.scaleButtonsMarginTop = 0;
        }
      } else {
        this.scaleButtonsMarginTop = 0;
      }
      
      console.log('按钮布局初始化（根据分辨率）:', {
        screenHeight,
        heightThreshold,
        scaleButtonsOverlap: this.scaleButtonsOverlap,
        scaleButtonsMarginTop: this.scaleButtonsMarginTop
      });
    },

    setScale(scale) {
      this.Scale = scale;
    },
    reRunUpdate() {
      this.showUpdateDialog = false;
      this.$bus.$emit('AppSendMessage', 'Process_Command_Return','VueClientVersion:'+process.env.VUE_APP_VERSION);
    },
    closeUpdateDialog() {
      this.showUpdateDialog = false;
    }
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
        'location-dialog',
        'u-s-b-files-dialog'
      ]
      for (const i in this.$stellariumWebPlugins()) {
        const plugin = this.$stellariumWebPlugins()[i]
        if (plugin.dialogs) {
          res = res.concat(plugin.dialogs.map(d => d.name))
        }
      }
      return res
    },
    SwitchPHD2BoxClass() {
      return [
        {
          'box-InGuiding': this.CurrentGuiderStatus === 'InGuiding',
          'box-InCalibration': this.CurrentGuiderStatus === 'InCalibration',
          'box-StarLostAlert': this.CurrentGuiderStatus === 'StarLostAlert',
          'box-null': this.CurrentGuiderStatus === 'null',
          'box-Connected': this.CurrentGuiderStatus === 'Connected',
        }
      ];
    },
    SwitchPHD2CrossClass() {
      return [
        {
          'cross-InGuiding': this.CurrentGuiderStatus === 'InGuiding',
          'cross-InCalibration': this.CurrentGuiderStatus === 'InCalibration',
          'cross-StarLostAlert': this.CurrentGuiderStatus === 'StarLostAlert',
          'cross-null': this.CurrentGuiderStatus === 'null',
          'cross-Connected': this.CurrentGuiderStatus === 'Connected',
        }
      ];
    },
    currentPolarAxisStepTips() {
      return this.PolarAxisStepTips[this.currentPolarAxisStep - 1];
    },
    ImageInfo() {
      let imageInfo;
      if (this.currentImageWidth === 0 || this.currentImageHeight === 0) {
        imageInfo = 'N/A';
      } else {
        if (this.BinningNum === 1) {
          imageInfo = 'Original image, Size: [' + this.currentImageWidth + 'x' + this.currentImageHeight + ']';
        } else {
          imageInfo = 'Binning: ' + this.BinningNum + ', Size: [' + this.currentImageWidth + 'x' + this.currentImageHeight + ']';
        }
      }

      return imageInfo;
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
    },

  },
  components: {
    Toolbar,
    BottomBar,
    DataCreditsDialog,
    ViewSettingsDialog,
    PlanetsVisibility,
    SelectedObjectInfo,
    LocationDialog,
    USBFilesDialog,
    ProgressBars,
    ObservingPanel,
    MountControlPanel,
    MessageBox,
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
    DeviceAllocationPanel,
    INDIDebugDialog,
    RPIHotspotDialog,
    DateTimePicker,
    UpdateProgressDialog,
    AutomaticPolarAlignmentCalibration,
    // LocationFocalInputs,
  }
}
</script>

<style scoped>

/* .v-overlay__scrim {
  display: none !important;
} */

.btn-MountPanelSwitch {
  position: absolute;
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
  position: absolute;
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
  position: absolute;
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
  position: absolute;
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
  position: absolute;
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
  position: absolute;
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
  position: absolute;
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

/* 删除不再需要的按钮样式，现在统一在left-button-container中管理 */

.TopLeft-Info {
  position: absolute;
  height: 10px;
  top: 40px;
  left: 10px;

  text-align: center;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);

  user-select: none;
  background-color: rgba(64, 64, 64, 0);
  border-radius: 3px;
}

.btn-WhiteBalance {
  position: absolute;
  width: 35px;
  height: 35px;
  top: 140px;
  left: 20px;

  user-select: none;
  backdrop-filter: blur(5px);
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 50%;
}

.btn-MainPageSwitch {
  position: absolute;
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

.PHD2-box {
  position: absolute;
  background-color: transparent;
  border: 2px solid rgba(51, 218, 121, 1);
  box-sizing: border-box;
}

.PHD2-cross {
  position: absolute;
  background-color: transparent;
  border: 1px solid rgba(51, 218, 121, 0.5);
  box-sizing: border-box;
}

/* 删除不再需要的按钮样式，现在统一在left-button-container中管理 */


.btn-ImageManagerPanelSwitch:active,
.btn-MountPanelSwitch:active,
.btn-ChartsSwitch:active,
.btn-MainPageSwitch:active,
.btn-WhiteBalance:active {
  transform: scale(0.95);
  /* 点击时缩小按钮 */
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

.CaptureImageProgress-card {
  position: absolute;
  width: 150px;
  height: 100px;
  bottom: calc(50%-50px);
  right: calc(50%-50px);

  user-select: none;
  border-radius: 10px;
  /* border: 1px solid rgba(255, 255, 255, 0.8); */
  box-sizing: border-box;

  backdrop-filter: blur(5px);
  background-color: rgba(64, 64, 64, 0.5);
}

.flashing-border {
  border: 1px solid rgba(255, 0, 0, 0.8);
  animation: flashing 2s infinite;
}

@keyframes flashing {
  0% {
    border-color: rgba(255, 0, 0, 0.8);
  }

  50% {
    border-color: rgba(255, 255, 255, 0.8);
  }

  100% {
    border-color: rgba(255, 0, 0, 0.8);
  }
}

.box-InGuiding {
  position: absolute;
  background-color: transparent;
  box-sizing: border-box;
  outline: 1px solid rgba(51, 218, 121, 1);
}

.box-InCalibration {
  position: absolute;
  background-color: transparent;
  box-sizing: border-box;
  outline: 1px solid rgba(255, 165, 0, 1);
}

.box-StarLostAlert {
  position: absolute;
  background-color: transparent;
  box-sizing: border-box;
  outline: 1px solid rgba(255, 0, 0, 1);
}

.box-null {
  position: absolute;
  background-color: transparent;
  box-sizing: border-box;
  outline: 1px solid rgba(255, 165, 0, 1);
}

.cross-InGuiding {
  position: absolute;
  background-color: rgba(51, 218, 121, 1);
}

.cross-InCalibration {
  position: absolute;
  background-color: rgba(255, 165, 0, 1);
}

.cross-StarLostAlert {
  position: absolute;
  background-color: rgba(255, 0, 0, 1);
}

.cross-null {
  position: absolute;
  background-color: rgba(255, 165, 0, 1);
}

.PHD2CircleClass {
  position: absolute;
  width: 12px;
  height: 12px;

  border-radius: 6px;

  background-color: transparent;
  box-sizing: border-box;
  outline: 1px solid rgba(51, 218, 121, 1);
}

.PolarAxisTips {
  position: absolute;
  width: 50%;
  height: 36px;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);

  user-select: none;
  box-sizing: border-box;

  /* backdrop-filter: blur(5px);  */
  background-color: rgba(64, 64, 64, 0.5);

  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.PolarAxisStepper {
  position: absolute;
  width: 100%;
  height: 50px;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);

  background-color: transparent !important;
  box-shadow: none;
  /* border-radius: 10px; */
  /* border: 1px solid rgba(255, 255, 255, 0.8); */
}

.PolarAxisTipsText {
  position: absolute;
  width: 100%;
  top: 36px;
  left: 0;

  text-align: center;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  user-select: none;

  background-color: rgba(64, 64, 64, 0.5);

  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
}

.left-button-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: absolute;
  top: 65px;
  left: 20px;
  z-index: 10;
}

.left-button-container button {
  width: 35px;
  height: 35px;
  user-select: none;
  backdrop-filter: blur(5px);
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.left-button-container button:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.left-button-container button:active {
  transform: scale(0.95);
  background-color: rgba(255, 255, 255, 0.7);
}

.left-button-container button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 自适应按钮容器 */
.adaptive-buttons-container {
  display: flex;
  gap: 10px;
}

/* 竖直显示（默认）- 所有按钮垂直排列 */
.buttons-vertical {
  flex-direction: column;
}

/* 田字分布（2x2网格）- 当与CapturePanel重合时使用 */
.buttons-grid {
  display: grid;
  grid-template-columns: repeat(2, 35px); /* 2列，每列35px */
  grid-template-rows: repeat(2, 35px); /* 2行，每行35px */
  gap: 10px;
  width: 80px; /* 2列宽度(35px * 2) + gap(10px) */
  /* margin-top通过内联样式动态设置 */
  position: relative;
  z-index: 11; /* 确保在CapturePanel之上 */
  transition: margin-top 0.3s ease; /* 平滑过渡 */
}

.buttons-grid button {
  width: 35px;
  height: 35px;
  margin: 0; /* 清除默认margin */
}
</style>
