<template>
    <div class="cfw-select-btn-bar">
      <button v-for="cfw in FilterWheels"
              :key="cfw"
              :class="{ active: selectedCFW === cfw }"
              @click="selectCFW(cfw)">
        {{ cfw }}
      </button>
    </div>
  </template>
  
  <script>
  export default {
    name: 'CFWSelectBtnBar',
    data() {
      return {
        selectedCFW: null,
        FilterWheels: ['L', 'R', 'G', 'B', 'Ha', 'OIIII', 'SII', 'Null', ' Null ']
      };
    },
    methods: {
      selectCFW(cfw) {
        this.selectedCFW = cfw;
        // 向父组件发出事件
        this.$emit('cfw-selected', cfw);
      }
    }
  }
  </script>
  
  <style scoped>
  .cfw-select-btn-bar {
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

  .cfw-select-btn-bar button {
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

  .cfw-select-btn-bar button.active {
    background-color: rgba(255, 255, 255, 0.7);
  }
  </style>
  
