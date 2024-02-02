<template>
    <div class="exp-time-btn-bar">
      <button v-for="time in exposureTimes"
              :key="time"
              :class="{ active: selectedTime === time }"
              @click="selectTime(time)">
        {{ time }}
      </button>
    </div>
  </template>
  
  <script>
  export default {
    name: 'ExpTimeBtnBar',
    data() {
      return {
        selectedTime: null,
        exposureTimes: ['1ms', '5ms', '10ms', '30ms', '50ms', '100ms', '1s', '5s', '10s']
      };
    },
    methods: {
      selectTime(time) {
        this.selectedTime = time;
        // 向父组件发出事件
        this.$emit('time-selected', time);
      }
    }
  }
  </script>
  
  <style scoped>
  .exp-time-btn-bar {
    /* border: 1px solid rgba(255, 255, 255, 0.8); 
    border-radius: 4px;
    backdrop-filter: blur(5px); 
    background-color: rgba(0, 0, 0, 0.1); */
    background: transparent;

    white-space: nowrap;
    display: inline-flex; /* 使用inline-flex来自适应按钮的大小 */
    align-items: center; /* 垂直居中按钮 */

    /* padding: 0.2rem; */
  }

  .exp-time-btn-bar button {
    /* margin: 0.2rem;
    padding: 0.5rem 1rem; */
    color: white;
    border-radius: 10px;
    cursor: pointer;
    transition: background-color 0.3s ease;

    width: 50px;
    height: 50px;

    backdrop-filter: blur(5px); /* 添加毛玻璃效果 */
    background-color: rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.8);
    text-align: center; /* 文本水平居中对齐 */
  }

  .exp-time-btn-bar button.active {
    background-color: rgba(255, 255, 255, 0.7);
  }
  </style>
  
