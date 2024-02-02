<template>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <!-- <th>序号</th> -->
          <th>拍摄目标</th>
          <th>拍摄时间</th>
          <th>曝光时间</th>
          <th>滤镜轮号</th>
          <th>重复张数</th>
          <th>拍摄类型</th>
          <th>重新调焦</th>
          <!-- <th>进度</th> -->
        </tr>
      </thead>
    </table>
    <div :style="{ 'max-height': containerMaxHeight + 'px' }" class="scrollable-container" @scroll="handleScrollB" ref="listB">
      <table>
        <tbody class="scrollable-body">
          <tr v-for="row in numberOfRows" :key="row">
            <td v-for="column in numberOfColumns" :key="column" :class="{ selected: isSelected(row, column) }"
              @click="selectCell(row, column)">
              {{ cellValues[`${row}-${column}`] || '' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
  
<script>
export default {
  data() {
    return {
      containerMaxHeight: 0,
      selectedRow: null,
      selectedColumn: null,
      numberOfRows: 8,
      numberOfColumns: 7,
      cellValues: {},
      numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 'DEL'],
    };
  },
  created() {
    this.$bus.$on('toggleSchedulePanel', this.setMaxHeight);

    // 监听来自事件总线的滚动事件
    this.$bus.$on('scrollEventA', (scrollTop) => {
      // 使用 scrollTo 方法控制 B 组件的滚动
      this.$refs.listB.scrollTo(0, scrollTop);
    });

  },
  mounted() {
    
  },
  methods: {
    selectCell(row, column) {
      this.selectedRow = row;
      this.selectedColumn = column;
    },
    isSelected(row, column) {
      return this.selectedRow === row && this.selectedColumn === column;
    },
    inputNumber(number) {
      if (this.selectedRow !== null && this.selectedColumn !== null) {
        const key = `${this.selectedRow}-${this.selectedColumn}`;
        if (number === 'DEL') {
          // 使用JavaScript的delete操作符来删除属性
          delete this.cellValues[key];
        } else {
          // 直接设置对象属性来更新值
          this.cellValues[key] = (this.cellValues[key] || '') + number;
        }
      }
    },
    setMaxHeight() {
      const Height = window.innerHeight;
      this.containerMaxHeight = Height - 140;
    },
    handleScrollB() {
      this.$bus.$emit('scrollEventB', this.$refs.listB.scrollTop);
      console.log(`handleScrollB: `, this.$refs.listB.scrollTop);
    },
  },
};
</script>
  
<style>
.table-container {
  overflow-x: auto;
  display: block;
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: transparent transparent; /* Firefox */
  width: calc(100% - 50px);
  margin-left: auto;
}

.scrollable-container { 
  /*TODO: 设置最大高度，使内容超过该高度时出现滚动条 */
  max-height: 260px;
  /* height: calc(100% - 0px);  */
  overflow-y: auto; /* 垂直方向上出现滚动条 */
  position: relative; /* 使该容器相对定位，不会影响到表头的布局 */
  
  &::-webkit-scrollbar {
    width: 0px; /* 设置滚动条宽度 */
  }
}

.scrollable-body {
  /* 如果需要水平滚动条，请使用 overflow-x: auto; */
}

table {
  width: calc(100% - 0px);
  border-collapse: collapse;
  /* This ensures that table borders are collapsed into a single border */
  table-layout: fixed;
}

td {
  border: 1px solid #ddd;
  text-align: center;
  height: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

th {
  border: 1px solid #ddd;
  text-align: center;
  height: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  color: white;
}

.selected {
  background-color: rgba(75, 155, 250, 0.7);
  backdrop-filter: blur(5px);
}

</style>
