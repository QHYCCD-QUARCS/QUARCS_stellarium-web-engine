<template>
  <transition name="panel">
    <div class="mount-control-panel"
      :style="panelStyle"
      data-testid="mcp-panel">
      <div class="display-text-container" data-testid="mcp-display">
        <div class="mount-summary-row" data-testid="mcp-summary-row">
          <span v-if="isIDLE" class="status-dot status-dot-idle" data-testid="mcp-status-indicator-idle" data-state="idle"></span>
          <span v-else class="status-dot status-dot-busy" data-testid="mcp-status-indicator-busy" data-state="busy"></span>
          <span class="pier-side-text" data-testid="mcp-pier-side-text">{{ $t('Mount Facing') }} {{ abbreviatedPierSide || '-' }}</span>
        </div>
        <div class="mount-coordinate-row" data-testid="mcp-coordinate-row">
          <v-icon class="coordinate-icon" data-testid="mcp-coordinate-icon">mdi-map-marker</v-icon>
          <div class="radec-text" data-testid="mcp-radec-text">
            <span class="ra-line" data-testid="mcp-value-ra" :data-value="currentLatitude">{{ currentLatitude || '--:--:--' }}</span>
            <span class="dec-line" data-testid="mcp-value-dec" :data-value="currentLongitude">{{ currentLongitude || '--°--\'--\"' }}</span>
          </div>
        </div>
      </div>

      <div class="Direction-Btn" data-testid="mcp-direction-controls">
        <button class="ra-plus no-select" :class="{ 'direction-pressed': activeDirectionButton === 'ra-plus' }"
          @touchstart.stop.prevent="handleMouseDownRA('plus')" @touchend.stop.prevent="stopRA('plus')" @touchcancel.stop.prevent="stopRA('plus')"
          @mousedown="handleMouseDownRA('plus')" @mouseup="stopRA('plus')" data-testid="mcp-btn-ra-plus">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/RA+.svg" height="40px"
              style="min-height: 40px; pointer-events: none;" data-testid="mcp-img-ra-plus"></img>
          </div>
        </button>
        <button class="ra-minus no-select" :class="{ 'direction-pressed': activeDirectionButton === 'ra-minus' }"
          @touchstart.stop.prevent="handleMouseDownRA('minus')" @touchend.stop.prevent="stopRA('minus')" @touchcancel.stop.prevent="stopRA('minus')"
          @mousedown="handleMouseDownRA('minus')" @mouseup="stopRA('minus')" data-testid="mcp-btn-ra-minus">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/RA-.svg" height="40px"
              style="min-height: 40px; pointer-events: none;" data-testid="mcp-img-ra-minus"></img>
          </div>
        </button>
        <button class="dec-plus no-select" :class="{ 'direction-pressed': activeDirectionButton === 'dec-plus' }"
          @touchstart.stop.prevent="handleMouseDownDEC('plus')" @touchend.stop.prevent="stopDEC('plus')" @touchcancel.stop.prevent="stopDEC('plus')"
          @mousedown="handleMouseDownDEC('plus')" @mouseup="stopDEC('plus')" data-testid="mcp-btn-dec-plus">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/DEC+.svg" height="40px"
              style="min-height: 40px; pointer-events: none;" data-testid="mcp-img-dec-plus"></img>
          </div>
        </button>
        <button class="dec-minus no-select" :class="{ 'direction-pressed': activeDirectionButton === 'dec-minus' }"
          @touchstart.stop.prevent="handleMouseDownDEC('minus')" @touchend.stop.prevent="stopDEC('minus')" @touchcancel.stop.prevent="stopDEC('minus')"
          @mousedown="handleMouseDownDEC('minus')" @mouseup="stopDEC('minus')" data-testid="mcp-btn-dec-minus">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/DEC-.svg" height="40px"
              style="min-height: 40px; pointer-events: none;" data-testid="mcp-img-dec-minus"></img>
          </div>
        </button>
      </div>

      <div data-testid="mcp-stop-container">
        <button class="btn-stop no-select" @click="stop" data-testid="mcp-btn-stop"><v-icon data-testid="mcp-icon-stop"> mdi-stop-circle-outline </v-icon></button>
      </div>

      <div data-testid="mcp-speed-container">
        <button class="btn-speed custom-button no-select" @click="MountSlewRateSwitch" data-testid="mcp-btn-speed" :data-value="MountSpeed">
          <span style="position:absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);" data-testid="mcp-speed-value">{{ MountSpeed
            }}</span>
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/SPEED.svg" height="25px"
              style="min-height: 25px; pointer-events: none;" data-testid="mcp-img-speed"></img>
          </div>
        </button>
      </div>

      <div v-if="showButtons" data-testid="mcp-function-buttons">
        <button v-bind:class="{ 'btn-park-on no-select': ParkSwitch, 'btn-park no-select': !ParkSwitch, 'processing': isParkProcessing, 'error-animation': isErrorPark }"
          @click="handleMountPark" data-testid="mcp-btn-park" :data-state="ParkSwitch ? 'on' : 'off'" :data-processing="isParkProcessing">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Park.svg" height="25px"
              style="min-height: 25px; pointer-events: none;" data-testid="mcp-img-park"></img>
          </div>
        </button>
        <button v-bind:class="{ 'btn-track-on no-select': TrackSwitch, 'btn-track no-select': !TrackSwitch, 'processing': isTrackProcessing, 'error-animation': isErrorTrack }"
          @click="handleMountTrack" data-testid="mcp-btn-track" :data-state="TrackSwitch ? 'on' : 'off'" :data-processing="isTrackProcessing"><v-icon data-testid="mcp-icon-track"> mdi-target </v-icon></button>
        <button class="custom-button btn-home no-select" :class="{'processing': isHomeProcessing, 'error-animation': isErrorHome}" @click="handleMountHome"
          data-testid="mcp-btn-home" :data-processing="isHomeProcessing">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Home.svg" height="20px"
              style="min-height: 20px; pointer-events: none;" data-testid="mcp-img-home"></img>
          </div>
        </button>
        <button class="custom-button btn-sync no-select" :class="{'processing': isSyncProcessing, 'error-animation': isErrorSync}" @click="handleMountSYNC"
          data-testid="mcp-btn-sync" :data-processing="isSyncProcessing">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Sync.svg" height="20px"
              style="min-height: 20px; pointer-events: none;" data-testid="mcp-img-sync"></img>
          </div>
        </button>

        <button class="custom-button btn-slove no-select" :class="{'processing': isSolveProcessing, 'error-animation': isErrorSolve}" @click="handleSolveSYNC"
          data-testid="mcp-btn-solve" :data-processing="isSolveProcessing">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Solve.svg" height="25px"
              style="min-height: 25px; pointer-events: none;" data-testid="mcp-img-solve"></img>
          </div>
        </button>
      </div>

      <div data-testid="mcp-close-container">
        <button class="btn-close no-select" @click="PanelClose" data-testid="mcp-btn-close">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/OFF.svg" height="12px"
              style="min-height: 12px; pointer-events: none;" data-testid="mcp-img-close"></img>
          </div>
        </button>
      </div>

    </div>
  </transition>
</template>

<script>
export default {
  name: 'MountControlPanel',
  data() {
    return {
      top: 50,
      right: 10,
      startX: 0,
      startY: 0,
      width: 150,
      height: 240,
      panelScale: 1,

      isExpanded: true,
      showButtons: true,

      ParkSwitch: false,
      TrackSwitch: false,

      SpeedTotalNum: [],

      isIDLE: true,

      FocalLength: 0,
      // CameraSizeWidth: 24.9,
      // CameraSizeHeight: 16.6,

      RaDec: 0,

      MountSpeed: 1,

      MountPierSide: '',
      currentLatitude: '',
      currentLongitude: '',
      
      // 移除定时器相关变量
      // showPierSide: true,
      // displayTimer: null,
      // timerStarted: false,

      isMountConnected: false,
      
      isParkProcessing: false,
      isTrackProcessing: false, 
      isHomeProcessing: false,
      isSyncProcessing: false,
      isSolveProcessing: false,
      
      isErrorPark: false,
      isErrorTrack: false,
      isErrorHome: false,
      isErrorSync: false,
      isErrorSolve: false,
      activeDirectionButton: null,
    };
  },
  computed: {
    panelStyle() {
      const scale = this.panelScale;
      return {
        top: `${this.top}px`, // 面板距离窗口顶部的位置
        right: `${this.right}px`, // 面板距离窗口右侧的位置
        width: `${this.width}px`, // 面板整体宽度
        height: `${this.height}px`, // 面板整体高度
        '--mcp-border-width': `${Math.max(2, 4 * scale)}px`, // 面板边框宽度
        '--mcp-border-radius': `${10 * scale}px`, // 面板圆角大小
        '--mcp-dir-size': `${120 * scale}px`, // 方向控制圆盘整体尺寸
        '--mcp-dir-top': `${42 * scale}px`, // 方向控制圆盘顶部位置
        '--mcp-dir-left': `${11 * scale}px`, // 方向控制圆盘左侧位置
        '--mcp-dir-piece-size': `${57.5 * scale}px`, // 单个方向按钮扇区尺寸
        '--mcp-dir-piece-offset': `${62.5 * scale}px`, // 下方方向按钮扇区偏移量
        '--mcp-mask-center': `${60 * scale}px`, // 方向按钮遮罩圆心坐标
        '--mcp-mask-negative-center': `${-2.5 * scale}px`, // 方向按钮反向遮罩圆心坐标
        '--mcp-mask-radius': `${35 * scale}px`, // 方向按钮中心镂空半径
        '--mcp-dir-icon-size': `${40 * scale}px`, // RA/DEC 方向图标大小
        '--mcp-stop-size': `${60 * scale}px`, // 中央停止按钮尺寸
        '--mcp-stop-top': `${72 * scale}px`, // 中央停止按钮顶部位置
        '--mcp-stop-left': `${41 * scale}px`, // 中央停止按钮左侧位置
        '--mcp-small-btn-size': `${35 * scale}px`, // 底部小功能按钮尺寸
        '--mcp-small-btn-bottom-top': `${55 * scale}px`, // 第一排小功能按钮底部位置
        '--mcp-small-btn-bottom-bottom': `${10 * scale}px`, // 第二排小功能按钮底部位置
        '--mcp-small-btn-side-gap': `${10 * scale}px`, // 小功能按钮左右边距
        '--mcp-small-btn-half': `${17.5 * scale}px`, // 小功能按钮半宽，用于水平居中
        '--mcp-icon-large': `${25 * scale}px`, // 较大功能图标尺寸
        '--mcp-icon-medium': `${20 * scale}px`, // 中等功能图标尺寸
        '--mcp-v-icon-size': `${24 * scale}px`, // Vuetify 图标尺寸
        '--mcp-speed-font-size': `${14 * scale}px`, // 速度数字字体大小
        '--mcp-status-icon': `${15 * scale}px`, // 状态图标尺寸
        '--mcp-close-icon': `${12 * scale}px`, // 关闭按钮内部图标尺寸
        '--mcp-close-size': `${25 * scale}px`, // 关闭按钮尺寸
        '--mcp-close-offset': `${3 * scale}px`, // 关闭按钮距离面板边缘的偏移
        '--mcp-display-top': `${4 * scale}px`, // 顶部文本区域顶部位置
        '--mcp-display-left': `${8 * scale}px`, // 顶部文本区域左侧位置
        '--mcp-display-right': `${30 * scale}px`, // 顶部文本区域右侧预留位置
        '--mcp-display-height': `${38 * scale}px`, // 顶部文本区域高度
        '--mcp-status-dot-size': `${10 * scale}px`, // 状态圆点尺寸
        '--mcp-pier-font-size': `${Math.max(7, 8.5 * scale)}px`, // 朝向文本字体大小
        '--mcp-radec-font-size': `${Math.max(7, 9 * scale)}px`, // RA/DEC 坐标字体大小
        '--mcp-coordinate-icon-size': `${15 * scale}px`, // 坐标行图标尺寸
        '--mcp-text-gap': `${Math.max(1, scale)}px`, // 顶部文本与图标间距
      };
    },
    // 新增：子午面信息缩写
    abbreviatedPierSide() {
      if (!this.MountPierSide) return '';

      const rawPierSide = String(this.MountPierSide).trim();
      const compactPierSide = rawPierSide.toLowerCase().replace(/[^a-z]/g, '');
      const pierSideTokens = rawPierSide.toLowerCase().split(/[^a-z]+/).filter(Boolean);

      if (
        compactPierSide === 'e' ||
        pierSideTokens.includes('east') ||
        compactPierSide.endsWith('east')
      ) {
        return 'E';
      }

      if (
        compactPierSide === 'w' ||
        pierSideTokens.includes('west') ||
        compactPierSide.endsWith('west')
      ) {
        return 'W';
      }

      if (
        compactPierSide === 'n' ||
        pierSideTokens.includes('north') ||
        compactPierSide.endsWith('north')
      ) {
        return 'N';
      }

      if (
        compactPierSide === 's' ||
        pierSideTokens.includes('south') ||
        compactPierSide.endsWith('south')
      ) {
        return 'S';
      }

      // 兜底：仅在明确是单字符方向时才直接返回，避免 west 被 e 误判。
      const fallbackDirection = rawPierSide.charAt(0).toUpperCase();
      return ['E', 'W', 'N', 'S'].includes(fallbackDirection) ? fallbackDirection : rawPierSide.charAt(0).toUpperCase();
    }
  },
  created() {
    // this.MountTotalSlewRate(7);
    this.$bus.$on('MountParkSwitch', this.MountParkSwitch);
    this.$bus.$on('MountTrackSwitch', this.MountTrackSwitch);
    // this.$bus.$on('MountTotalSlewRate',this.MountTotalSlewRate);
    this.$bus.$on('newMountSlewRate', this.newMountSlewRate);
    this.$bus.$on('TargetRaDec', this.getTargetRaDec);
    this.$bus.$on('MountGoto', this.MountGoto);
    this.$bus.$on('MountStatus', this.MountStatus);
    this.$bus.$on('updateMountPierSide', this.updateMountPierSide);
    this.$bus.$on('MountConnected', this.updateMountConnection);
    this.$bus.$on('MountOperationComplete', this.handleOperationComplete);
    this.$bus.$on('handleOperationComplete', this.handleOperationComplete);
    // 新增经纬度监听
    this.$bus.$on('updateCurrentLocation', this.updateCurrentLocation);
    
    // 移除自动启动定时器的代码
    // this.startDisplayTimer();
  },
  mounted() {
    this.updatePanelSize();
    window.addEventListener('resize', this.updatePanelSize);
  },
  beforeDestroy() {
    // 移除定时器清理代码
    // if (this.displayTimer) {
    //   clearInterval(this.displayTimer);
    //   this.displayTimer = null;
    // }
    window.removeEventListener('resize', this.updatePanelSize);
    this.activeDirectionButton = null;
  },
  methods: {
    updatePanelSize() {
      const viewportWidth = window.innerWidth || 1280;
      const viewportHeight = window.innerHeight || 720;
      const rawScale = Math.min(viewportWidth / 1280, viewportHeight / 720);
      const scale = Math.min(3, Math.max(1, rawScale));

      this.panelScale = scale;
      this.width = Math.round(150 * scale);
      this.height = Math.round(270 * scale);
      this.right = Math.round(Math.min(18, Math.max(8, viewportWidth * 0.012)));
      this.top = Math.round(Math.min(80, Math.max(42, viewportHeight * 0.07)));
    },
    handleMouseDownRA(direction) {
      this.activeDirectionButton = `ra-${direction}`;
      if (!this.isMountConnected) {
        this.$bus.$emit('showMsgBox', '赤道仪未连接，无法执行操作', 'error');
        return;
      }
      const check = this.$canUseDevice('Mount', 'MountManualMove');
      if (!check.allowed) return;
      this.$startFeature(['Mount'], 'MountManualMove');
      this.$bus.$emit('SendConsoleLogMsg', `Mount Move RA ${direction}`, 'info');
      if (direction === 'plus') {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountMoveWest');
      } else {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountMoveEast');
      }
    },
    handleMouseDownDEC(direction) {
      this.activeDirectionButton = `dec-${direction}`;
      if (!this.isMountConnected) {
        this.$bus.$emit('showMsgBox', '赤道仪未连接，无法执行操作', 'error');
        return;
      }
      const check = this.$canUseDevice('Mount', 'MountManualMove');
      if (!check.allowed) return;
      this.$startFeature(['Mount'], 'MountManualMove');
      this.$bus.$emit('SendConsoleLogMsg', `Mount Move DEC ${direction}`, 'info');
      if (direction === 'plus') {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountMoveNorth');
      } else {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountMoveSouth');
      }
    },
    stop() {
      if (!this.isMountConnected) {
        this.$bus.$emit('showMsgBox', '赤道仪未连接，无法执行操作', 'error');
        return;
      }
      console.log('QHYCCD | 停止');
      this.$bus.$emit('SendConsoleLogMsg', 'Mount Move Abort', 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountMoveAbort');
      this.$stopFeature(['Mount'], 'MountManualMove');
    },

    stopRA(direction) {
      this.activeDirectionButton = null;
      if (!this.isMountConnected) {
        this.$bus.$emit('showMsgBox', '赤道仪未连接，无法执行操作', 'error');
        return;
      }
      this.$bus.$emit('SendConsoleLogMsg', `Mount Stop RA ${direction}`, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountMoveRAStop:' + direction);
      this.$stopFeature(['Mount'], 'MountManualMove');
    },

    stopDEC(direction) {
      this.activeDirectionButton = null;
      if (!this.isMountConnected) {
        this.$bus.$emit('showMsgBox', '赤道仪未连接，无法执行操作', 'error');
        return;
      }
      this.$bus.$emit('SendConsoleLogMsg', `Mount Stop DEC ${direction}`, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountMoveDECStop:' + direction);
      this.$stopFeature(['Mount'], 'MountManualMove');
    },

    MountPark() {
      const check = this.$canUseDevice('Mount', 'MountPark');
      if (!check.allowed) return;
      console.log('QHYCCD | Park');
      this.isParkProcessing = true;
      this.$startFeature(['Mount'], 'MountPark');
      this.$bus.$emit('SendConsoleLogMsg', 'Mount Park', 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountPark');
      // 处理状态将由MountOperationComplete信号结束
    },
    MountTrack() {
      const check = this.$canUseDevice('Mount', 'MountTrack');
      if (!check.allowed) return;
      console.log('QHYCCD | Truck');
      this.isTrackProcessing = true;
      // this.$startFeature(['Mount'], 'MountTrack');
      this.$bus.$emit('SendConsoleLogMsg', 'Mount Truck', 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountTrack');
      // 处理状态将由MountOperationComplete信号结束
    },
    MountHome() {
      const check = this.$canUseDevice('Mount', 'MountHome');
      if (!check.allowed) return;
      console.log('QHYCCD | Home');
      this.isHomeProcessing = true;
      this.$startFeature(['Mount'], 'MountHome');
      this.$bus.$emit('SendConsoleLogMsg', 'Mount Home', 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountHome');
      // 1秒后自动结束动画
      setTimeout(() => {
        this.isHomeProcessing = false;
        this.$stopFeature(['Mount'], 'MountHome');
      }, 1000);
    },
    MountSYNC() {
      const check = this.$canUseDevice('Mount', 'MountSync');
      if (!check.allowed) return;
      console.log('QHYCCD | SYNC');
      this.isSyncProcessing = true;
      this.$startFeature(['Mount'], 'MountSync');
      this.$bus.$emit('SendConsoleLogMsg', 'Mount SYNC', 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountSYNC');
      // 1秒后自动结束动画
      setTimeout(() => {
        this.isSyncProcessing = false;
        this.$stopFeature(['Mount'], 'MountSync');
      }, 1000);
    },
    SolveSYNC() {
      // 仅限制：解析同步（主相机未绑定时禁止）
      if (!this.$store.getters['device/isDeviceBound']('MainCamera')) {
        this.$bus.$emit(
          'showMsgBox',
          this.$t('MainCameraNotBoundAction', { action: this.$t('Feature_SolveSync') }),
          'error'
        );
        return;
      }
      // 解算通常需要主相机与赤道仪共同参与
      const mountCheck = this.$canUseDevice('Mount', 'SolveSync');
      const camCheck = this.$canUseDevice('MainCamera', 'SolveSync');
      if (!mountCheck.allowed || !camCheck.allowed) return;
      console.log('QHYCCD | SolveSYNC');
      this.isSolveProcessing = true;
      this.$startFeature(['Mount', 'MainCamera'], 'SolveSync');
      this.$bus.$emit('SendConsoleLogMsg', 'Mount Solve SYNC', 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'SolveSYNC');
      // 处理状态将由MountOperationComplete信号结束
    },
    getTargetRaDec(value) {
      console.log('getTargetRaDec:', value);
      this.RaDec = value;
    },
    MountGoto() {
      const check = this.$canUseDevice('Mount', 'MountGoto');
      if (!check.allowed) return;
      this.$startFeature(['Mount'], 'MountGoto');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountGoto:' + this.RaDec);
    },

    MountStatus(status) {
      this.mountStatusStr = status;
      if (status === 'Moving' || status === 'Slewing') {
        this.isIDLE = false;
        // 刷新后由后端持续状态维持占用，防止互斥提前结束
        this.$startFeature(['Mount'], 'MountSlewing');
      }
      else {
        this.isIDLE = true;
        this.$stopFeature(['Mount'], 'MountSlewing');
        this.$stopFeature(['Mount'], 'MountManualMove');
        this.$stopFeature(['Mount'], 'MountGoto');
      }
    },

    // MountTotalSlewRate(num) {
    //   console.log('MountTotalSlewRate:',num);
    //   this.SpeedTotalNum = [];
    //   for (let i = 1; i <= num; i++) {
    //     this.SpeedTotalNum.push(i);
    //     console.log('pushSpeed:',i);
    //   }
    // },
    newMountSlewRate(num) {
      this.MountSpeed = num;
    },

    MountSlewRateSwitch() {
      if (!this.isMountConnected) {
        this.showErrorAnimation('speed');
        return;
      }
      const check = this.$canUseDevice('Mount', 'MountSpeedSwitch');
      if (!check.allowed) return;
      if (this.MountSpeed !== -1) {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountSpeedSwitch');
      }else{
        this.$bus.$emit('SendConsoleLogMsg', 'Mount not has speed or Mount is not connected!', 'warning');
      }
    },

    MountParkSwitch(Switch) {
      if (Switch === 'ON') {
        this.ParkSwitch = true;
        this.handleOperationComplete('park');
      }
      else {
        this.ParkSwitch = false;
        this.handleOperationComplete('park');
      }
    },

    MountTrackSwitch(Switch) {
      if (Switch === 'ON') {
        this.TrackSwitch = true;
        this.handleOperationComplete('track');
      }
      else {
        this.TrackSwitch = false;
        this.handleOperationComplete('track');
      }
    },

    updateMountPierSide(side) {
      this.MountPierSide = side;
      // 移除定时器启动逻辑
      // if (!this.timerStarted && side && side.trim() !== '') {
      //   this.startDisplayTimer();
      //   this.timerStarted = true;
      //   console.log('首次获取到子午面数据，启动切换定时器:', side);
      // }
    },
    
    updateCurrentLocation(ra, dec) {
      // 处理从App.vue传来的RA和DEC数据
      // console.log('收到望远镜位置数据:', ra, dec);
      
      // 现在RA是度数格式，需要转换为小时格式
      const raDegrees = parseFloat(ra);   // 度数格式
      const decDegrees = parseFloat(dec); // 度数格式
      
      if (!isNaN(raDegrees)) {
        // 将度数转换为小时：小时 = 度数 / 15
        const raHours = raDegrees / 15.0;
        this.currentLatitude = this.formatRATime(raHours);
      }
      
      if (!isNaN(decDegrees)) {
        this.currentLongitude = this.formatDecDegrees(decDegrees);
      }
      
      // 移除定时器启动逻辑
      // if (!this.timerStarted && this.MountPierSide && this.currentLatitude && this.currentLongitude) {
      //   this.startDisplayTimer();
      // }
    },
    
    formatRATime(hours) {
      if (hours === null || hours === undefined || isNaN(hours)) return '';
      
      // 确保小时值在0-24范围内
      let normalizedHours = hours;
      while (normalizedHours < 0) normalizedHours += 24;
      while (normalizedHours >= 24) normalizedHours -= 24;
      
      // 转换为时分秒
      const h = Math.floor(normalizedHours);
      const remainingMinutes = (normalizedHours - h) * 60;
      const m = Math.floor(remainingMinutes);
      const s = Math.floor((remainingMinutes - m) * 60);
      
      // 更紧凑的格式显示
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    },
    
    formatDecDegrees(degrees) {
      if (degrees === null || degrees === undefined || isNaN(degrees)) return '';
      
      const absDegrees = Math.abs(degrees);
      
      // 转换为度分秒
      const d = Math.floor(absDegrees);
      const remainingMinutes = (absDegrees - d) * 60;
      const m = Math.floor(remainingMinutes);
      const s = Math.floor((remainingMinutes - m) * 60);
      
      // 更紧凑的格式显示
      return `${d.toString().padStart(2, '0')}°${m.toString().padStart(2, '0')}'${s.toString().padStart(2, '0')}"`;
    },
    
    // 移除定时器相关方法
    // startDisplayTimer() {
    //   // 移除这个方法
    // },
    
    PanelClose() {
      // 移除定时器清理代码
      // if (this.displayTimer) {
      //   clearInterval(this.displayTimer);
      //   this.displayTimer = null;
      // }
      // this.timerStarted = false;
      this.$bus.$emit('MountPanelClose');
    },

    updateMountConnection(status) {
      this.isMountConnected = status === 1;
    },
    
    handleOperationComplete(operation) {
      switch(operation) {
        case 'park':
          this.isParkProcessing = false;
          this.$stopFeature(['Mount'], 'MountPark');
          // this.$bus.$emit('showMsgBox', this.$t('park complete !'), 'success');
          break;
        case 'track':
          this.isTrackProcessing = false;
          // this.$stopFeature(['Mount'], 'MountTrack');
          // this.$bus.$emit('showMsgBox', this.$t('track complete !'), 'success');
          break;
        case 'home':
          this.isHomeProcessing = false;
          this.$stopFeature(['Mount'], 'MountHome');
          // this.$bus.$emit('showMsgBox', this.$t('home complete !'), 'success');
          break;
        case 'sync':
          this.isSyncProcessing = false;
          this.$stopFeature(['Mount'], 'MountSync');
          // this.$bus.$emit('showMsgBox', this.$t('sync complete !'), 'success');
          break;
        case 'solve':
          this.isSolveProcessing = false;
          this.$stopFeature(['Mount', 'MainCamera'], 'SolveSync');
         // this.$bus.$emit('showMsgBox', this.$t('solve complete !'), 'success');
          break;
      }
    },
    
    showErrorAnimation(type) {
      switch(type) {
        case 'park':
          this.isErrorPark = true;
          setTimeout(() => { this.isErrorPark = false; }, 800);
          break;
        case 'track':
          this.isErrorTrack = true;
          setTimeout(() => { this.isErrorTrack = false; }, 800);
          break;
        case 'home':
          this.isErrorHome = true;
          setTimeout(() => { this.isErrorHome = false; }, 800);
          break;
        case 'sync':
          this.isErrorSync = true;
          setTimeout(() => { this.isErrorSync = false; }, 800);
          break;
        case 'solve':
          this.isErrorSolve = true;
          setTimeout(() => { this.isErrorSolve = false; }, 800);
          break;
      }
      this.$bus.$emit('showMsgBox', '赤道仪未连接，无法执行操作', 'error');
    },
    
    handleMountPark() {
      if (!this.isMountConnected) {
        this.showErrorAnimation('park');
        return;
      }
      this.MountPark();
    },
    
    handleMountTrack() {
      if (!this.isMountConnected) {
        this.showErrorAnimation('track');
        return;
      }
      this.MountTrack();
    },
    
    handleMountHome() {
      if (!this.isMountConnected) {
        this.showErrorAnimation('home');
        return;
      }
      this.MountHome();
    },
    
    handleMountSYNC() {
      if (!this.isMountConnected) {
        this.showErrorAnimation('sync');
        return;
      }
      this.MountSYNC();
    },
    
    handleSolveSYNC() {
      if (!this.isMountConnected) {
        this.showErrorAnimation('solve');
        return;
      }
      this.SolveSYNC();
    },
  }
}
</script>

<style scoped>
.mount-control-panel {
  pointer-events: auto;
  position: fixed;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border-radius: var(--mcp-border-radius);
  border: var(--mcp-border-width) solid rgba(128, 128, 128, 0.5);
  box-sizing: border-box;
  /* overflow: hidden; */
}

@keyframes showPanelAnimation {
  from {
    transform: translateX(calc(100% + 24px));
  }

  to {
    transform: translateX(0);
  }
}

@keyframes hidePanelAnimation {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(calc(100% + 24px));
  }
}

.panel-enter-active {
  animation: showPanelAnimation 0.15s forwards;
}

.panel-leave-active {
  animation: hidePanelAnimation 0.15s forwards;
}

.custom-button {
  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
}

.Direction-Btn {
  width: var(--mcp-dir-size);
  height: var(--mcp-dir-size);
  top: var(--mcp-dir-top);
  left: var(--mcp-dir-left);

  border-radius: 50%;
  overflow: hidden;
  position: relative;
}

.ra-plus {
  /* clip-path: polygon(0 0, 100% 0, 100% 59%, 90% 60%, 80% 64%, 70% 71%, 60% 75%, 50% 50%, 42% 60%, 36% 70%, 32% 80%, 30% 90%, 29% 100%, 0 100%); */

  position: absolute;
  width: var(--mcp-dir-piece-size);
  height: var(--mcp-dir-piece-size);
  top: 0px;
  left: 0px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border: none;
  mask-image: radial-gradient(circle at var(--mcp-mask-center) var(--mcp-mask-center), transparent var(--mcp-mask-radius), black var(--mcp-mask-radius));
}

.ra-minus {
  /* clip-path: polygon(100% 0, 0 0, 0 29%, 10% 30%, 20% 32%, 30% 36%, 40% 42%, 50% 50%, 58% 60%, 64% 70%, 68% 80%, 70% 90%, 71% 100%, 100% 100%); */

  position: absolute;
  width: var(--mcp-dir-piece-size);
  height: var(--mcp-dir-piece-size);
  top: 0px;
  right: 0px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border: none;
  mask-image: radial-gradient(circle at var(--mcp-mask-negative-center) var(--mcp-mask-center), transparent var(--mcp-mask-radius), black var(--mcp-mask-radius));
}

.dec-plus {
  /* clip-path: polygon(0 100%, 100% 100%, 100% 71%, 90% 70%, 80% 68%, 70% 64%, 60% 58%, 50% 50%, 42% 40%, 36% 30%, 32% 20%, 30% 10%, 29% 0, 0 0); */

  position: absolute;
  width: var(--mcp-dir-piece-size);
  height: var(--mcp-dir-piece-size);
  top: var(--mcp-dir-piece-offset);
  left: 0px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border: none;
  mask-image: radial-gradient(circle at var(--mcp-mask-center) var(--mcp-mask-negative-center), transparent var(--mcp-mask-radius), black var(--mcp-mask-radius));
}

.dec-minus {
  /* clip-path: polygon(100% 100%, 0 100%, 0 71%, 10% 70%, 20% 68%, 30% 64%, 40% 58%, 50% 50%, 58% 40%, 64% 30%, 68% 20%, 70% 10%, 71% 0, 100% 0); */

  position: absolute;
  width: var(--mcp-dir-piece-size);
  height: var(--mcp-dir-piece-size);
  top: var(--mcp-dir-piece-offset);
  right: 0px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border: none;
  mask-image: radial-gradient(circle at var(--mcp-mask-negative-center) var(--mcp-mask-negative-center), transparent var(--mcp-mask-radius), black var(--mcp-mask-radius));
}

.btn-stop {
  border-radius: 50%;
  position: absolute;
  width: var(--mcp-stop-size);
  height: var(--mcp-stop-size);
  top: var(--mcp-stop-top);
  left: var(--mcp-stop-left);

  background-color: rgba(255, 0, 0, 0.5);
  /* border: 1px solid rgba(255, 255, 255, 0.8); */
  backdrop-filter: blur(5px);
  /* 添加毛玻璃效果 */
  box-sizing: border-box;
  /* 设置box-sizing为border-box */
  border: none;
}

.btn-stop .v-icon,
.btn-track .v-icon,
.btn-track-on .v-icon {
  font-size: var(--mcp-v-icon-size);
}

.btn-speed span {
  font-size: var(--mcp-speed-font-size);
}

.btn-speed:active,
.btn-park:active,
.btn-truck:active,
.btn-park-on:active,
.btn-truck-on:active,
.btn-home:active,
.btn-close:active,
.btn-sync:active {
  transform: scale(0.95);
  /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

.ra-plus:active,
.ra-minus:active,
.dec-plus:active,
.dec-minus:active,
.direction-pressed {
  /* transform: scale(0.95); */
  background-color: rgba(255, 255, 255, 0.7);
}

.btn-stop:active {
  transform: scale(0.95);
  /* 点击时缩小按钮 */
  background-color: rgba(255, 0, 0, 0.5);
}

.no-select {
  user-select: none;
}

.btn-park {
  position: absolute;
  width: var(--mcp-small-btn-size);
  height: var(--mcp-small-btn-size);
  bottom: var(--mcp-small-btn-bottom-top);
  left: var(--mcp-small-btn-side-gap);

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
}

.btn-track {
  position: absolute;
  width: var(--mcp-small-btn-size);
  height: var(--mcp-small-btn-size);
  bottom: var(--mcp-small-btn-bottom-top);
  right: calc(50% - var(--mcp-small-btn-half));

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
}

.btn-park-on {
  position: absolute;
  width: var(--mcp-small-btn-size);
  height: var(--mcp-small-btn-size);
  bottom: var(--mcp-small-btn-bottom-top);
  left: var(--mcp-small-btn-side-gap);

  user-select: none;
  background-color: rgba(0, 255, 30, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
}

.btn-track-on {
  position: absolute;
  width: var(--mcp-small-btn-size);
  height: var(--mcp-small-btn-size);
  bottom: var(--mcp-small-btn-bottom-top);
  right: calc(50% - var(--mcp-small-btn-half));

  user-select: none;
  background-color: rgba(0, 255, 30, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
}

.btn-home {
  position: absolute;
  width: var(--mcp-small-btn-size);
  height: var(--mcp-small-btn-size);
  bottom: var(--mcp-small-btn-bottom-top);
  right: var(--mcp-small-btn-side-gap);
}

.btn-sync {
  position: absolute;
  width: var(--mcp-small-btn-size);
  height: var(--mcp-small-btn-size);
  bottom: var(--mcp-small-btn-bottom-bottom);
  left: var(--mcp-small-btn-side-gap);
}

.btn-speed {
  position: absolute;
  width: var(--mcp-small-btn-size);
  height: var(--mcp-small-btn-size);
  bottom: var(--mcp-small-btn-bottom-bottom);
  right: calc(50% - var(--mcp-small-btn-half));
}

.btn-slove {
  position: absolute;
  width: var(--mcp-small-btn-size);
  height: var(--mcp-small-btn-size);
  bottom: var(--mcp-small-btn-bottom-bottom);
  right: var(--mcp-small-btn-side-gap);
}

.border-icon {
  position: absolute;
  top: 0px;
  left: 4px;
  font-size: large;
}

.btn-close {
  position: absolute;
  width: var(--mcp-close-size);
  height: var(--mcp-close-size);
  top: var(--mcp-close-offset);
  right: var(--mcp-close-offset);

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border: none;
  border-radius: 50%;
}

.mount-control-panel [data-testid="mcp-img-ra-plus"],
.mount-control-panel [data-testid="mcp-img-ra-minus"],
.mount-control-panel [data-testid="mcp-img-dec-plus"],
.mount-control-panel [data-testid="mcp-img-dec-minus"] {
  height: var(--mcp-dir-icon-size) !important;
  min-height: var(--mcp-dir-icon-size) !important;
}

.mount-control-panel [data-testid="mcp-img-speed"],
.mount-control-panel [data-testid="mcp-img-park"],
.mount-control-panel [data-testid="mcp-img-solve"] {
  height: var(--mcp-icon-large) !important;
  min-height: var(--mcp-icon-large) !important;
}

.mount-control-panel [data-testid="mcp-img-home"],
.mount-control-panel [data-testid="mcp-img-sync"] {
  height: var(--mcp-icon-medium) !important;
  min-height: var(--mcp-icon-medium) !important;
}

.mount-control-panel [data-testid="mcp-img-status-idle"],
.mount-control-panel [data-testid="mcp-img-status-busy"] {
  height: var(--mcp-status-icon) !important;
  min-height: var(--mcp-status-icon) !important;
}

.mount-control-panel [data-testid="mcp-img-close"] {
  height: var(--mcp-close-icon) !important;
  min-height: var(--mcp-close-icon) !important;
}

@keyframes processing-animation {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
  50% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
}

.processing {
  animation: processing-animation 1s infinite;
  background-color: rgba(72, 72, 255, 0.5) !important;
}

@keyframes error-animation {
  0% { transform: scale(1); background-color: rgba(255, 0, 0, 0.3); }
  50% { transform: scale(1.1); background-color: rgba(255, 0, 0, 0.8); }
  100% { transform: scale(1); background-color: rgba(0, 0, 0, 0.3); }
}

.error-animation {
  animation: error-animation 0.8s;
}

.display-text-container {
  position: absolute;
  top: var(--mcp-display-top);
  left: var(--mcp-display-left);
  right: var(--mcp-display-right);
  height: var(--mcp-display-height);
  color: rgba(255, 255, 255, 0.9);
  user-select: none;
  /* 文本分割线：使用伪元素绘制，方便微调垂直位置 */
  --mcp-text-divider-offset: 2px;
  --mcp-text-divider-color: rgba(255, 255, 255, 0.16);
}

.display-text-container::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: var(--mcp-text-divider-offset);
  height: 1px;
  background: var(--mcp-text-divider-color);
  pointer-events: none;
}

.mount-summary-row {
  display: grid;
  grid-template-columns: var(--mcp-coordinate-icon-size) minmax(0, 1fr) var(--mcp-coordinate-icon-size);
  align-items: center;
  gap: var(--mcp-text-gap);
  height: 42%;
  min-width: 0;
}

.status-dot {
  width: var(--mcp-status-dot-size);
  height: var(--mcp-status-dot-size);
  border-radius: 50%;
  justify-self: center;
}

.status-dot-idle {
  background: rgba(51, 218, 121, 1);
}

.status-dot-busy {
  background: rgba(255, 193, 7, 1);
}

.mount-coordinate-row {
  display: grid;
  grid-template-columns: var(--mcp-coordinate-icon-size) minmax(0, 1fr);
  align-items: center;
  gap: var(--mcp-text-gap);
  height: 58%;
  min-width: 0;
}

.pier-side-text {
  grid-column: 2;
  font-size: var(--mcp-pier-font-size);
  line-height: 1;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.coordinate-icon {
  color: rgba(255, 255, 255, 0.9) !important;
  font-size: var(--mcp-coordinate-icon-size) !important;
  flex: 0 0 auto;
}

.radec-text {
  min-width: 0;
  flex: 1 1 auto;
  font-size: var(--mcp-radec-font-size);
  line-height: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  column-gap: var(--mcp-text-gap);
  font-weight: 700;
}

.ra-line, .dec-line {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

</style>
