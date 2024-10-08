<template>
<transition name="panel">
  <div class="chart-panel" :style="{ bottom: bottom + 'px', left: left + 'px', right: right + 'px', height: height + 'px' }">
    <LineChart ref="linechart" class="line-chart"/>
    
    <ScatterChart ref="scatterchart" class="scatter-chart"/>

    <div class="buttons-container">

      <!-- <button :class="GuiderSwitchBtnClass" :style="{ animationDuration: ExpTime + 'ms' }" @touchend="GuiderSwitch">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/Guider.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button> -->

      <button :class="GuiderSwitchBtnClass" :style="{ animationDuration: ExpTime + 'ms' }" 
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
      left: 170,
      right: 170,
      height: 90,
      ExpTime: 1000,
      isGuiding: false,
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
    this.$bus.$on('GuiderStatus', this.GuiderStatus);
  },
  mounted() {
    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'getGuiderSwitchStatus');
  },
  computed: {
    GuiderSwitchBtnClass() {
        return [
          {
            'btn-Guider-true': this.isGuiding, 
            'btn-Guider-false': !this.isGuiding, 
          },
          {
            'btn-InGuiding': this.CurrentGuiderStatus === 'InGuiding',
            'btn-InCalibration': this.CurrentGuiderStatus === 'InCalibration',
            'btn-StarLostAlert': this.CurrentGuiderStatus === 'StarLostAlert',
            'btn-null': this.CurrentGuiderStatus === 'null',
          }
        ];
    }
  },
  methods: {
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
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderSwitch');
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
  transition: width 0.2s ease;
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

.btn-Guider-false {
  width: 30px;
  height: 30px; 

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%; 
  box-sizing: border-box;
}

.btn-Guider-true {
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
    transform: rotate(90deg);
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

