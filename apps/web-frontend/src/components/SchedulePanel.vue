<template>
  <div class="chart-panel" :style="{ left: PanelLeft + 'px', right: '100px', top: '40px', bottom: '50px', zIndex: 200 }">
  
    <ScheduleTable v-show="showTabel"></ScheduleTable>

    <button class="btn-More" @click="toggleMore">
      <span v-if="isExpanded">
        <v-icon>mdi-chevron-right</v-icon>
      </span>
      <span v-else>
        <v-icon>mdi-chevron-left</v-icon>
      </span>
    </button>

    <button class="additional-btn" @click="toggleSchedule" :style="{ left: '0px', width: '50px', height: BtnHeight + 'px', top: '45px' }">
      <v-icon>{{ isScheduleRunning ? 'mdi-pause' : 'mdi-play' }}</v-icon>
    </button>
    <button class="additional-btn" :style="{ left: '0px', width: '50px', height: BtnHeight + 'px', top: BtnTop1 + 'px',}">Save</button>
    <button class="additional-btn" :style="{ left: '0px', width: '50px', height: BtnHeight + 'px', bottom: '0px' }">Load</button>
   
  </div>
</template>

<script>
import ScheduleTable from './ScheduleTable.vue';

export default {
  name: 'SchedulePanel',
  data() {
    return {
      isExpanded: false,
      showTabel: false,
      BtnHeight: 0,
      BtnTop1: 0,
      BtnTop2: 0,

      PanelLeft: 0,
      isScheduleRunning: false, // 计划任务表运行状态

    };
  },
  components: {
    ScheduleTable,
  },
  created() {
    this.$bus.$on('toggleSchedulePanel', this.setBtnHeight);
    // 监听计划任务完成事件，重置按钮状态
    this.$bus.$on('ScheduleComplete', this.onScheduleComplete);
  },
  methods: {
    toggleMore() {
      this.isExpanded = !this.isExpanded;
      if (this.isExpanded) {
        setTimeout(() => {
          this.showTabel = true;
        }, 100);
        this.PanelLeft = 0;
      } else {
        setTimeout(() => {
          this.showTabel = false;
        }, 30);

        const Width = window.innerWidth;
        this.PanelLeft = Width - 150;
      }
      this.$bus.$emit('toggleScheduleKeyBoard');
    },
    setBtnHeight() {
      const Height = window.innerHeight;
      // 现在只有3个按钮（开始/停止切换、Save、Load），所以除以3
      this.BtnHeight = (Height - 130) / 3 -5;
      // Save按钮位置：开始/停止按钮下方，加上按钮高度和5px间距
      this.BtnTop1 = 45 + this.BtnHeight + 5;
      this.BtnTop2 = 55 + this.BtnHeight * 2;

      const Width = window.innerWidth;
      this.PanelLeft = Width - 150;

      this.isExpanded = false;
      this.showTabel = false;
    },
    toggleSchedule() {
      if (this.isScheduleRunning) {
        // 如果正在运行，则停止
        this.isScheduleRunning = false;
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'StopSchedule');
      } else {
        // 如果未运行，则开始
        this.isScheduleRunning = true;
        this.$bus.$emit('getTableData', true);
      }
    },
    onScheduleComplete() {
      // 计划任务完成，重置按钮状态为未运行状态
      this.isScheduleRunning = false;
    },
    
  }
}
</script>

<style scoped>
.chart-panel {
  position: absolute;
  background-color: rgba(128, 128, 128, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 5px; 
  overflow: hidden;
  transition: left 0.2s ease;
}

.btn-More {
  position:absolute;
  top: 0px;
  left: 0px;
  
  width: 50px;
  height: 40px;
  
  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 5px; 
  box-sizing: border-box;
}

.additional-btn {
  position:absolute;
  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 5px; 
  box-sizing: border-box;
}

.additional-btn:active,
.btn-More:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

</style>


