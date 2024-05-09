<template>
  <div class="chart-panel" :style="{ left: PanelLeft + 'px', right: '100px', top: '40px', bottom: '50px' }">
  
    <ScheduleTable v-show="showTabel"></ScheduleTable>

    <button class="btn-More" @click="toggleMore">
      <span v-if="isExpanded">
        <v-icon>mdi-chevron-right</v-icon>
      </span>
      <span v-else>
        <v-icon>mdi-chevron-left</v-icon>
      </span>
    </button>

    <button class="additional-btn" @click="PlaySchedule" :style="{ left: '0px', width: '50px', height: BtnHeight + 'px', top: '45px' }"><v-icon>mdi-play</v-icon></button>
    <button class="additional-btn" @click="StopSchedule" :style="{ left: '0px', width: '50px', height: BtnHeight + 'px', top: BtnTop1 + 'px',}"><v-icon>mdi-pause</v-icon></button>
    <button class="additional-btn" :style="{ left: '0px', width: '50px', height: BtnHeight + 'px', top: BtnTop2 + 'px',}">Save</button>
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

    };
  },
  components: {
    ScheduleTable,
  },
  created() {
    this.$bus.$on('toggleSchedulePanel', this.setBtnHeight);
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
      this.BtnHeight = (Height - 130) / 4 -5;
      this.BtnTop1 = 50 + this.BtnHeight;
      this.BtnTop2 = 55 + this.BtnHeight * 2;

      const Width = window.innerWidth;
      this.PanelLeft = Width - 150;

      this.isExpanded = false;
      this.showTabel = false;
    },
    PlaySchedule() {
      this.$bus.$emit('getTableData', true);
    },
    StopSchedule() {
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'StopSchedule');
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


