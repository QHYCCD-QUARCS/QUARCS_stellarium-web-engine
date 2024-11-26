<template>
<transition name="panel">
  <div class="chart-panel" :style="{ bottom: bottom + 'px', left: ComponentPadding + 'px', right: ComponentPadding + 'px', height: height + 'px' }">
    <LineChart ref="linechart" class="line-chart"/>
    
    <ScatterChart ref="scatterchart" class="scatter-chart"/>

    <div class="buttons-container">

      <button :class="LoopExpSwitchBtnClass" :style="{ animationDuration: ExpTime + 'ms' }" @touchend="LoopExpSwitch">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/GuiderLoopExp.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button>

      <button class="btn-Style" :class="GuiderSwitchBtnClass"
        @mousedown="startPress" @mouseup="endPress"
        @touchstart="startPress" @touchend="endPress">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/Guider.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button>

      <button class="btn-Style" @touchend="ExpTimeSwitch">
        <span v-if="ExpTime === 1000">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Exp-1000.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </span>
        <span v-if="ExpTime === 2000">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Exp-2000.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </span>
        <span v-if="ExpTime === 500">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Exp-500.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </span>
      </button>

      <button class="btn-Style" @touchend="DataClear">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/delete.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button>

      <button class="btn-Style" @touchend="RangeSwitch">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/suofang.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button>

    </div>
    
  </div>
</transition>
</template>

<script>
import LineChart from './Chart-Line.vue';
import ScatterChart from './Chart-Scatter.vue';

export default {
  name: 'ChartsPanel',
  data() {
    return {
      bottom: 10,
      ComponentPadding: 0,
      height: 90,
      ExpTime: 1000,
      isGuiding: false,
      isLoopping: false,
      CurrentGuiderStatus: 'null',

      pressTimer: null,
      longPressThreshold: 1000,
      isLongPress: false, // 标记是否为长按
      canClick: true,

    };
  },
  components: {
    LineChart,
    ScatterChart,
  },
  created() {
    this.$bus.$on('GuiderSwitchStatus', this.GuiderSwitchStatus);
    this.$bus.$on('GuiderLoopExpStatus', this.GuiderLoopExpStatus);
    this.$bus.$on('GuiderStatus', this.GuiderStatus);
  },
  mounted() {
    this.updatePosition(); // 初始化位置
    window.addEventListener('resize', this.updatePosition);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updatePosition);
  },
  computed: {
    GuiderSwitchBtnClass() {
        return [
          // {
          //   'btn-LoopExp-true': this.isGuiding, 
          //   'btn-LoopExp-false': !this.isGuiding, 
          // },
          {
            'btn-InGuiding': this.CurrentGuiderStatus === 'InGuiding',
            'btn-InCalibration': this.CurrentGuiderStatus === 'InCalibration',
            'btn-StarLostAlert': this.CurrentGuiderStatus === 'StarLostAlert',
            'btn-null': this.CurrentGuiderStatus === 'null',
          }
        ];
    },
    LoopExpSwitchBtnClass() {
        return [
          {
            'btn-LoopExp-true': this.isLoopping, 
            'btn-LoopExp-false': !this.isLoopping, 
          },
        ];
    }
  },
  methods: {
    updatePosition() {
      const screenWidth = window.innerWidth;
      const halfWidth = screenWidth / 2 - 250;
      this.ComponentPadding = Math.max(halfWidth, 170);
      // console.log('Updated Padding:', this.ComponentPadding);

      // 计算宽度
      const newWidth = screenWidth - (this.ComponentPadding * 2);
      // console.log('update LineChart Width:', newWidth);
      this.$bus.$emit('updateLineChartWidth', newWidth);
    },
    startPress() {
      this.isLongPress = false; // 重置长按标记
      this.pressTimer = setTimeout(() => {
        this.isLongPress = true; // 标记为长按
        this.handleLongPress();
      }, this.longPressThreshold);
    },
    endPress() {
      clearTimeout(this.pressTimer); // 清除定时器
      if (!this.isLongPress) {
        this.handleClick(); // 如果不是长按，则触发点击事件
      }
      this.pressTimer = null; // 重置定时器
    },
    handleClick() {
      if (!this.canClick) return; // 如果不可点击，直接返回
      this.canClick = false; // 设置为不可点击
      // console.log("Button clicked");

      this.GuiderSwitch();

      // 恢复点击权限
      setTimeout(() => {
        this.canClick = true;
      }, 1000); // 1秒后恢复
    },
    handleLongPress() {
      if(this.isGuiding) return;
      // 长按事件的处理
      console.log("Button long pressed");

      this.$bus.$emit('ShowConfirmDialog', 'Recalibrate', "Are you sure you need to clear the calibration data and recalibrate?", 'Recalibrate');
    },

    GuiderSwitch() {
      if(this.isLoopping) {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderSwitch');
      } else {
        this.$bus.$emit('showMsgBox', 'Please open the loop exposure first.', 'error');
      }
    },

    LoopExpSwitch() {
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderLoopExpSwitch');
    },

    ExpTimeSwitch() {
      if (this.ExpTime === 1000) {
        this.ExpTime = 2000;
      } else if (this.ExpTime === 2000) {
        this.ExpTime = 500;
      } else if (this.ExpTime === 500) {
        this.ExpTime = 1000;
      }
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderExpTimeSwitch:' + this.ExpTime);
    },

    GuiderSwitchStatus(value) {
      if(value === 'true') {
        this.isGuiding = true;
      } else {
        this.isGuiding = false;
        this.CurrentGuiderStatus = 'null';
        this.$bus.$emit('GuiderStop');
      }
      console.log('GuiderSwitchStatus:', this.isGuiding);
    },

    GuiderLoopExpStatus(value) {
      if(value === 'true') {
        this.isLoopping = true;
      } else {
        this.isLoopping = false;
        this.isGuiding = false;
      }
      console.log('GuiderLoopExpSwitchStatus:', this.isLoopping);
    },

    GuiderStatus(status) {
      if(status === 'InGuiding') {
        this.CurrentGuiderStatus = 'InGuiding';
      } else if(status === 'InCalibration') {
        this.CurrentGuiderStatus = 'InCalibration';
      } else if(status === 'StarLostAlert') {
        this.CurrentGuiderStatus = 'StarLostAlert';
        this.$bus.$emit('showMsgBox', 'Lost guiding star target.', 'error');
      }
      console.log('GuiderStatus:', this.CurrentGuiderStatus);
    },
    
    DataClear() {
      this.$bus.$emit('clearChartData');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'clearGuiderData');
    },
    RangeSwitch() {
      this.$bus.$emit('ChartRangeSwitch');
    },
  }
}
</script>

<style scoped>
.chart-panel {
  position: absolute;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 10px;
  border: 4px solid rgba(128, 128, 128, 0.5);
  box-sizing: border-box;
}

@keyframes showPanelAnimation {
  from {
    bottom: -150px;
  }
  to {
    bottom: 10px;
  }
}

@keyframes hidePanelAnimation {
  from {
    bottom: 10px;
  }
  to {
    bottom: -150px;
  }
}

.panel-enter-active {
  animation: showPanelAnimation 0.15s forwards;
}

.panel-leave-active {
  animation: hidePanelAnimation 0.15s forwards;
}

.line-chart {
  position:absolute;
  bottom: 1px;
  left: 5px;
}

.scatter-chart {
  position:absolute;
  top: 1px;
  right: 0px;
}

.buttons-container {
  display: flex;
  justify-content: space-between;
  position: absolute;
  top: -39px;
  left: 5px;
  right: 5px;
}

.btn-Style {
  width: 30px;
  height: 30px; 

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%; 
  box-sizing: border-box;
}

.btn-LoopExp-false {
  width: 30px;
  height: 30px; 

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%; 
  box-sizing: border-box;
}

.btn-LoopExp-true {
  width: 30px;
  height: 30px; 

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  /* border: none; */
  border-radius: 50%; 
  box-sizing: border-box;

  animation: Animation_true infinite;
}

@keyframes Animation_true {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(-180deg);
  }
}

.btn-InGuiding {
  border: 1px solid rgba(51, 218, 121, 1);
}

.btn-InCalibration {
  border: 1px solid rgba(255, 165, 0, 1);
}

.btn-StarLostAlert {
  border: 1px solid rgba(255, 0, 0, 1);
}

.btn-null {
  border: none;
}

.btn-Guider:active,
.btn-Style:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

</style>

