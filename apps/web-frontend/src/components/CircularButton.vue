<template>
  <div class="circular-button no-select">
    <svg
      @touchstart="handleMouseDown" @touchend="handleMouseUp"
      @mousedown="handleMouseDown" @mouseup="handleMouseUp"
      :width="svgSize"
      :height="svgSize"
      :viewBox="'0 0 ' + svgSize + ' ' + svgSize"
      style="cursor: pointer;"
    >
      <!-- 背景圆圈 -->
      <circle
        :cx="svgSize / 2"
        :cy="svgSize / 2"
        :r="radius"
        fill="none"
        stroke="rgba(255, 255, 255, 0.5)"
        :stroke-width="strokeWidth"
      />
      <!-- 红色进度条（长按时显示） -->
       <circle
        v-if="isLongPress"
        :cx="svgSize / 2"
        :cy="svgSize / 2"
        :r="radius"
        fill="none"
        stroke="rgba(255, 0, 0, 0.7)"
        :stroke-width="strokeWidth"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="circumference * (1 - longPressProgress)"
        stroke-linecap="round"
        :transform="'rotate(-90 ' + svgSize / 2 + ' ' + svgSize / 2 + ')'"
      />
      <!-- 进度条 -->
      <circle
        :cx="svgSize / 2"
        :cy="svgSize / 2"
        :r="radius"
        fill="none"
        stroke="rgba(0, 255, 0, 0.7)"
        :stroke-width="strokeWidth"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="circumference * (1 - progress)"
        stroke-linecap="round"
        :transform="'rotate(-90 ' + svgSize / 2 + ' ' + svgSize / 2 + ')'"
      />
      <!-- 按钮文本 -->
      <text
        :x="svgSize / 2"
        :y="svgSize / 2"
        fill="rgba(255, 255, 255, 0.7)"
        :font-size="fontSize"
        text-anchor="middle"
        alignment-baseline="central"
      >
        {{ progressText }}
      </text>

      <image
        :x="svgSize / 2" 
        :y="svgSize / 2"
        v-if="!isClicked"
        xlink:href="@/assets/images/svg/ui/media record.svg"
        width="20px" height="20px"
        style="transform: translate(-8px, -10px);"
      />

    </svg>
  </div>
</template>

<script>
export default {
  data() {
    return {
      progress: 0,
      // circumference: 339.292,
      radius: 30, // 圆的半径
      strokeWidth: 7, // 圆环的线宽
      CaptureExpTime: 1,
      animationDuration: 1, // 动画时长为1000毫秒（1秒）
      animationStartTime: 0, // 动画开始时间
      isClicked: false,

      longPressThreshold: 1000,
      longPressTimer: null,
      PressTimestamp: 0,

      isLongPress: false,
      longPressProgress: 0,

      MainCameraConnect: false,
      isProcessing: false, // 新增状态变量，表示是否正在处理

      isButtonDisabled: false, // 拍摄按钮是否禁用
    };
  },
  created() {
    this.$bus.$on('ExposureCompleted', this.overProgress);
    this.$bus.$on('SetExpTime',this.SetDuration);
    this.$bus.$on('CameraInExposuring',this.setInProgress);
    this.$bus.$on('MainCameraConnected', this.MainCameraConnected);
    this.$bus.$on('disableCaptureButton', this.disableCaptureButton);
  },
  mounted() {
    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'getCaptureStatus');
  },
  computed: {
    svgSize() {
      // SVG的大小应该足够包含圆形按钮及其边框
      return this.radius * 2 + this.strokeWidth * 2;
    },
    circumference() {
      // 计算圆周长
      return 2 * Math.PI * this.radius;
    },
    progressText() {
      return this.isClicked ? `${(this.progress * 100).toFixed(0)}%` : '';
    },
    fontSize() {
      // 字体大小可以根据按钮的大小动态计算
      return this.radius / 3; // 示例比例
    },
  },
  methods: {
    handleMouseDown() {
      if (this.isButtonDisabled) {
        return; 
      }
      this.mousePressTimestamp = Date.now();
      if (this.isClicked) {
        this.startLongPressAnimation();
        this.longPressTimer = setTimeout(() => {
          if (Date.now() - this.mousePressTimestamp >= this.longPressThreshold) {
            // 处理长按逻辑
            cancelAnimationFrame(this.animationRequest);
            this.resetProgress();
          }
        }, this.longPressThreshold);
      }
    },

    handleMouseUp() {
      clearTimeout(this.longPressTimer);

      cancelAnimationFrame(this.longPressAnimationRequest);
      this.isLongPress = false;
      this.longPressProgress = 0;

      const elapsed = Date.now() - this.mousePressTimestamp;
      if (elapsed < this.longPressThreshold) {
        // 处理点击逻辑
        if(this.MainCameraConnect) {
          this.animateProgress();
        } else {
          this.$bus.$emit('showMsgBox', 'Please connect the camera first.', 'error');
        }
      }
    },

    animateProgress() {
      if (this.isClicked) return; // 如果已点击，则退出方法
      console.log('执行点按，触发拍摄');
      this.animationDuration = this.CaptureExpTime;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'takeExposure:'+this.animationDuration);
      this.$bus.$emit('SendConsoleLogMsg', 'Take Exposure:'+this.animationDuration, 'info');
      this.isClicked = true;
      const startTime = performance.now();
      const animate = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        this.progress = elapsedTime / (this.animationDuration / 0.99);

        if (this.progress < 0.99) {
          this.animationRequest = requestAnimationFrame(animate);
        } else {
          this.progress = 0.99;
          cancelAnimationFrame(this.animationRequest);
        }
      };
      if (this.animationRequest) {
        cancelAnimationFrame(this.animationRequest);
      }
      this.animationRequest = requestAnimationFrame(animate);
    },

    overProgress() {
      this.progress = 1;
      cancelAnimationFrame(this.animationRequest);
      // 延时2秒后重置进度
      setTimeout(() => {
        this.resetProgress();
      }, 2000);
    },

    resetProgress() {
      this.progress = 0;
      this.isClicked = false;
    },

    SetDuration(time) {
      this.CaptureExpTime = time;
    },

    startLongPressAnimation() {
      console.log('执行长按，触发终止拍摄');
      this.isLongPress = true;
      const startTime = performance.now();
      const animate = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        this.longPressProgress = elapsedTime / this.longPressThreshold;

        if (this.longPressProgress < 1) {
          this.longPressAnimationRequest = requestAnimationFrame(animate);
        } else {
          this.longPressProgress = 1;
          cancelAnimationFrame(this.longPressAnimationRequest);
          this.$bus.$emit('AppSendMessage', 'Vue_Command', 'abortExposure');
          this.$bus.$emit('SendConsoleLogMsg', 'Abort Exposure', 'info');
          // 延时2秒后重置进度
          setTimeout(() => {
            this.resetlongPressProgress();
          }, 1000);
        }
      };

      this.longPressAnimationRequest = requestAnimationFrame(animate);
    },

    resetlongPressProgress() {
      this.longPressProgress = 0;
      this.isLongPress = false;
    },

    setInProgress(state) {
      if(state === 'True'){
        this.progress = 0.99;
        this.isClicked = true;
      } else {
        this.progress = 0;
        this.isClicked = false;
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

    disableCaptureButton(status) {
      this.isButtonDisabled = status;
    },

  },
};
</script>

<style scoped>
.circular-button {
  display: flex;
  justify-content: center;
  align-items: center;
}

</style>


