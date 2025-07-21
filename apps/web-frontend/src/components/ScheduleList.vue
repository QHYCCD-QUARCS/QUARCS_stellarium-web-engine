<template>
  <div
    class="chart-panel"
    :style="{ width: width + 'px', top: '40px', bottom: '0px', right: '0px' }"
  >
    <button class="get-click btn-transparent"></button>

    <div
      class="list-container"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @scroll="handleScrollA"
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
          backgroundColor: selectedIndex === index ? 'rgba(75, 155, 250, 0.7)' : 'transparent',
          cursor: selectedIndex === index ? 'grab' : 'default',
        }"
      >
        Process: {{ processValues[index] || 0 }}%
      </div>
    </div>

    <button @click="EditList" @touchend="active" class="get-click btn-AddData"
      :style="{
        backgroundColor: isItemSelected === true ? 'rgba(250, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.3)',
      }"
    >
      <span v-if="isItemSelected">
        Delete
      </span>
      <span v-else>
        Add
      </span>
    </button>

    <button class="get-click btn-Process"> Process: {{ processValue }}% </button>
    
  </div>
</template>

<script>
export default {
  name: 'SchedulePanel',
  data() {
    return {
      width: 100,
      itemList: ['0% ', '0% ', '0% ', '0% ', '0% ', '0% ', '0% ', '0% ', ],
      dragIndex: null,
      offsetY: 0,
      selectedIndex: null, // 存储选中项的索引
      isItemSelected: false,
      startY: null,
      processValues: {}, // 存储每个表格的进度
    };
  },
  created() {
    // 监听来自事件总线的滚动事件
    this.$bus.$on('scrollEventB', (scrollTop) => {
      // 使用 scrollTo 方法控制 A 组件的滚动
      this.$refs.listA.scrollTo(0, scrollTop);
    });
    this.$bus.$on('UpdateScheduleProcess', this.setScheduleItemList);
    this.$bus.$on('TianWen', this.addTianWen);
  },
  methods: {
    setScheduleItemList(RowNum, Process) {
      // 检查行号是否有效
      if (RowNum === null || RowNum === undefined || RowNum < 0 || RowNum >= this.itemList.length) {
        console.warn(`Invalid row number: ${RowNum}`);
        return;
      }

      // 检查进度值是否有效
      if (Process === null || Process === undefined) {
        console.warn(`Invalid process value for row ${RowNum}`);
        return;
      }

      this.itemList[RowNum] = Process + '%';
      this.updateProcess(RowNum, Process);
    },
    handleItemClick(index) {
      if (index === null || index === undefined || index < 0 || index >= this.itemList.length) {
        console.warn(`Invalid item index: ${index}`);
        return;
      }

      console.log(`Item clicked: ${this.itemList[index]}`);
      if (this.selectedIndex === index) {
        this.selectedIndex = null;
        this.isItemSelected = false;
        this.$bus.$emit('NoSelectedScheduleRow');
      } else {
        this.selectedIndex = index;
        this.isItemSelected = true;
        this.$bus.$emit('NoSelectedScheduleRow');
        this.$bus.$emit('SelectedScheduleRow', index + 1);
      }
    },
    EditList() {
      if(this.isItemSelected === false) {
        const newIndex = this.itemList.length;
        this.itemList.push('0%');
        this.updateProcess(newIndex, 0); // 初始化新表格的进度
        this.$bus.$emit('AddScheduleRow');
      } else {
        if (this.selectedIndex !== null && this.selectedIndex >= 0 && this.selectedIndex < this.itemList.length) {
          this.$bus.$emit('DeleteSelectedScheduleRow', this.selectedIndex + 1);
          this.itemList.splice(this.selectedIndex, 1);
          // 删除对应的进度值
          this.$delete(this.processValues, this.selectedIndex);
          this.selectedIndex = null;
          this.isItemSelected = false;
          this.$bus.$emit('NoSelectedScheduleRow');
        } else {
          console.warn('Invalid selected index for deletion');
        }
      }
    },
    active() {},
    handleTouchStart(event, index) {
      // 检查是否选中，只有选中项才能拖动
      if (this.selectedIndex === index) {
        this.dragIndex = index;
        this.offsetY = event.touches[0].clientY - event.target.getBoundingClientRect().top;
      }
      else
      {
        this.startY = event.touches[0].clientY;
      }
    },
    handleTouchMove(event) {
      if (this.dragIndex !== null) {
        event.preventDefault();
        const targetIndex = this.calculateTargetIndex(event.touches[0].clientY);
        this.handleDragOver(event, targetIndex);
      }

      if(this.isItemSelected === false)
      {
        // 计算手指在垂直方向上的滑动距离
        const deltaY = event.touches[0].clientY - this.startY;

        // 更新列表的滚动位置
        this.$refs.listA.scrollTop -= deltaY;

        // 更新起始位置信息
        this.startY = event.touches[0].clientY;
      }

    },
    handleTouchEnd() {
      if (this.dragIndex !== null) {
        this.handleDrop(this.dragIndex);
        this.dragIndex = null;
        this.offsetY = 0;
        this.clearStyles();
      }
      this.startY = null;
    },
    handleDragOver(event, targetIndex) {
      if (this.dragIndex !== null && 
          this.dragIndex !== targetIndex && 
          this.dragIndex >= 0 && 
          this.dragIndex < this.itemList.length &&
          targetIndex >= 0 && 
          targetIndex < this.itemList.length) {
        
        const rect = event.currentTarget.getBoundingClientRect();
        const mouseY = event.touches[0].clientY;
        const offsetY = mouseY - rect.top;
        
        // 保存拖拽项的进度值
        const draggedProcess = this.processValues[this.dragIndex];
        
        this.itemList.splice(targetIndex, 0, this.itemList.splice(this.dragIndex, 1)[0]);
        this.dragIndex = targetIndex;
        this.selectedIndex = targetIndex;

        // 更新进度值的位置
        if (draggedProcess !== undefined) {
          this.$set(this.processValues, targetIndex, draggedProcess);
        }

        this.$bus.$emit('MoveScheduleRow', targetIndex + 1);

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
    handleScrollA() {
      this.$bus.$emit('scrollEventA', this.$refs.listA.scrollTop);
      // console.log('ScrollTop: ', this.$refs.listA.scrollTop);
    },
    addTianWen() {
      this.itemList.push('0%');
    },
    updateProcess(index, value) {
      // 检查索引是否有效
      if (index === null || index === undefined || index < 0 || index >= this.itemList.length) {
        console.warn(`Invalid table index: ${index}`);
        return;
      }

      // 检查进度值是否有效
      if (value === null || value === undefined) {
        console.warn(`Invalid process value for table ${index}`);
        return;
      }

      // 确保进度值在0-100之间
      const validValue = Math.min(Math.max(Number(value), 0), 100);
      this.$set(this.processValues, index, validValue);
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
  height: calc(100% - 90px);
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

.btn-transparent {
  height: 36px;
  width: 100px;
  /* top: -40px; */
  color: #fff;
  user-select: none;
  /* position:absolute; */
  background-color: rgba(0, 0, 0, 0.0);
  backdrop-filter: blur(5px);
  border-radius: 5px; 
  box-sizing: border-box;
}

.btn-Process {
  position:absolute;
  height: 40px;
  width: 100px;
  top: 0px;
  right: 0px;
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
