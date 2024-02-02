<template>
  <div
    class="chart-panel"
    :style="{ width: width + 'px', top: '90px', bottom: '0px', right: '0px' }"
  >
    <div
      class="list-container"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      ref="listA"
    >
      <div
        class="get-click list-item"
        v-for="(item, index) in itemList"
        :key="index"
        @click="handleItemClick(index)"
        @touchstart="handleTouchStart($event, index)"
        :style="{
          transform: dragIndex === index ? 'scale(0.95)' : 'none',
          zIndex: dragIndex === index ? '1' : '0',
          backgroundColor: dragIndex === index ? 'rgba(255, 255, 255, 0.7)' : 'transparent',
        }"
      >
        {{ item }}
      </div>
    </div>

    <button @click="AddData" @touchend="active" class="get-click btn-AddData">Add</button>
  </div>
</template>

<script>
export default {
  name: 'SchedulePanel',
  data() {
    return {
      width: 100,
      itemList: ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5', 'Item 6', 'Item 7', ],
      dragIndex: null,
      offsetY: 0,
    };
  },
  created() {
    // 监听来自事件总线的滚动事件
    this.$bus.$on('scrollEventB', (scrollTop) => {
      // 使用 scrollTo 方法控制 A 组件的滚动
      this.$refs.listA.scrollTo(0, scrollTop);
    });
  },
  methods: {
    handleItemClick(index) {
      console.log(`Item clicked: ${this.itemList[index]}`);
    },
    AddData() {
      this.itemList.push('newItem');
    },
    active() {},
    handleTouchStart(event, index) {
      this.dragIndex = index;
      this.offsetY = event.touches[0].clientY - event.target.getBoundingClientRect().top;
    },
    handleTouchMove(event) {
      if (this.dragIndex !== null) {
        event.preventDefault();
        const targetIndex = this.calculateTargetIndex(event.touches[0].clientY);
        this.handleDragOver(event, targetIndex);
      }
    },
    handleTouchEnd() {
      if (this.dragIndex !== null) {
        this.handleDrop(this.dragIndex);
        this.dragIndex = null;
        this.offsetY = 0;
        this.clearStyles();
      }
    },
    handleDragOver(event, targetIndex) {
      if (this.dragIndex !== null && this.dragIndex !== targetIndex) {
        const rect = event.currentTarget.getBoundingClientRect();
        const mouseY = event.touches[0].clientY;
        const offsetY = mouseY - rect.top;
        this.itemList.splice(targetIndex, 0, this.itemList.splice(this.dragIndex, 1)[0]);
        this.dragIndex = targetIndex;

        // Apply offsetY
        if (offsetY < rect.height / 2) {
          this.offsetY = offsetY;
        } else {
          this.offsetY = offsetY - rect.height;
        }
      }
    },
    handleDrop(targetIndex) {
      if (this.dragIndex !== null && this.dragIndex !== targetIndex) {
        this.itemList.splice(targetIndex, 0, this.itemList.splice(this.dragIndex, 1)[0]);
      }
    },
    calculateTargetIndex(clientY) {
      const rect = this.$refs.listA.getBoundingClientRect();
      const mouseY = clientY - rect.top;
      const targetIndex = Math.floor(mouseY / 40 + 0.5);
      return Math.max(0, Math.min(targetIndex, this.itemList.length - 1));
    },
    clearStyles() {
      const items = document.querySelectorAll('.list-item');
      items.forEach(item => {
        item.style.zIndex = '0';
        item.style.transform = 'none';
      });
    },
  },
};
</script>

<style scoped>
.chart-panel {
  position: absolute;
  background-color: rgba(128, 128, 128, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 5px;
  overflow: hidden;
}

.list-container {
  touch-action: none;
  height: calc(100% - 50px);
  overflow-y: auto;

  scrollbar-width: thin;
  scrollbar-color: transparent transparent;

  &::-webkit-scrollbar {
    width: 1px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: transparent;
  }
}

.list-item {
  height: 40px;
  border: 1px solid #ddd;
  color: #fff;
  user-select: none;
  background-color: transparent;
  backdrop-filter: blur(5px);
  border-radius: 5px;
}

.btn-AddData {
  height: 50px;
  width: 100px;
  color: #fff;
  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 5px; 
  box-sizing: border-box;
}

.btn-AddData:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}
</style>
