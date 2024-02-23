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
          <tr v-for="row in numberOfRows" :key="row" :class="{ selected: isSelectedRow(row) }">
            <td v-for="column in numberOfColumns" :key="column" :class="{ 'selected-cell': isSelected(row, column) }"
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
      selectedRow_: null,
      selectedRow: null,
      selectedColumn: null,
      selectedCellValue: '', // 新增选中单元格内容的变量
      numberOfRows: 8,
      numberOfColumns: 7,
      cellValues: {},
      
      initialColumnValues: {
        1: 'null ',
        2: '',
        3: '1 s',
        4: 'L',
        5: '1',
        6: 'Light',
        7: 'OFF',
      },
    };
  },
  created() {
    this.$bus.$on('toggleSchedulePanel', this.setMaxHeight);

    // 监听来自事件总线的滚动事件
    this.$bus.$on('scrollEventA', (scrollTop) => {
      // 使用 scrollTo 方法控制组件的滚动
      this.$refs.listB.scrollTo(0, scrollTop);
    });

    this.$bus.$on('AddScheduleRow',this.AddScheduleRow);

    this.$bus.$on('SelectedScheduleRow', this.SelectedScheduleRow);

    this.$bus.$on('NoSelectedScheduleRow', this.NoSelectedScheduleRow);

    this.$bus.$on('MoveScheduleRow',this.MoveScheduleRow);

    this.$bus.$on('DeleteSelectedScheduleRow',this.DeleteSelectedScheduleRow);

    this.$bus.$on('EditContent',this.EditContent);

  },
  mounted() {
    // 初始化表格数据
    this.initializeTable();
  },
  methods: {
    selectCell(row, column) {
      this.selectedRow = row;
      this.selectedColumn = column;

      this.selectedCellValue = this.cellValues[`${row}-${column}`] || ''; // 获取选中单元格的内容
      console.log(`selectCell: `, this.selectedCellValue);

      if(column === 1)
      {
        this.$bus.$emit('KeyBoardMode','Target');
      }
      else if(column === 2)
      {
        this.$bus.$emit('KeyBoardMode','Time');
      }
      else if(column === 3)
      {
        this.$bus.$emit('KeyBoardMode','ExpTime');
      }
      else if(column === 4)
      {
        this.$bus.$emit('KeyBoardMode','CFW');
      }
      else if(column === 5)
      {
        this.$bus.$emit('KeyBoardMode','Repeat');
      }
      else if(column === 6)
      {
        this.$bus.$emit('KeyBoardMode','Type');
      }
      else if(column === 7)
      {
        this.$bus.$emit('KeyBoardMode','Focus');
      }
    },

    SelectedScheduleRow(index) {
      this.selectedRow_ = index;
    },

    NoSelectedScheduleRow() {
      this.selectedRow_ = null;
    },

    isSelected(row, column) {
      return this.selectedRow === row && this.selectedColumn === column;
    },

    isSelectedRow(row) {
      return this.selectedRow_ === row;
    },

    MoveScheduleRow(index) {
      // 检查选中的行是否有效
      if (this.selectedRow_ === null || index < 1 || index > this.numberOfRows || index === this.selectedRow_) {
        return;
      }

      // 获取选中行的数据
      const selectedRowData = {};
      for (let column = 1; column <= this.numberOfColumns; column++) {
        const key = `${this.selectedRow_}-${column}`;
        selectedRowData[key] = this.cellValues[key] || '';
      }

      // 删除选中的行
      if (this.selectedRow_ < index) {
        // 如果选中的行在目标位置的下方，需要先删除再插入
        for (let row = this.selectedRow_; row < index; row++) {
          for (let column = 1; column <= this.numberOfColumns; column++) {
            const currentKey = `${row}-${column}`;
            const nextKey = `${row + 1}-${column}`;
            this.cellValues[currentKey] = this.cellValues[nextKey] || '';
          }
        }
      } else {
        // 如果选中的行在目标位置的上方，直接插入
        for (let row = this.selectedRow_; row > index; row--) {
          for (let column = 1; column <= this.numberOfColumns; column++) {
            const currentKey = `${row}-${column}`;
            const prevKey = `${row - 1}-${column}`;
            this.cellValues[currentKey] = this.cellValues[prevKey] || '';
          }
        }
      }

      // 在目标位置插入选中的行数据
      for (let column = 1; column <= this.numberOfColumns; column++) {
        const key = `${index}-${column}`;
        this.$set(this.cellValues, key, selectedRowData[`${this.selectedRow_}-${column}`]);
      }

      // 更新选中的行索引
      this.selectedRow_ = index;
    },

    DeleteSelectedScheduleRow(index) {
      if (index >= 1 && index <= this.numberOfRows) {
        // 更新 numberOfRows
        this.numberOfRows -= 1;

        // 删除 cellValues 中对应行的数据
        for (let row = index; row <= this.numberOfRows; row++) {
          for (let column = 1; column <= this.numberOfColumns; column++) {
            const currentKey = `${row}-${column}`;
            const nextKey = `${row + 1}-${column}`;
            this.cellValues[currentKey] = this.cellValues[nextKey] || '';
          }
        }

        // 删除最后一行的数据
        for (let column = 1; column <= this.numberOfColumns; column++) {
          const lastRowKey = `${this.numberOfRows + 1}-${column}`;
          delete this.cellValues[lastRowKey];
        }

        // 如果删除的行是选中的行，取消选中状态
        if (this.selectedRow_ === index) {
          this.selectedRow_ = null;
        } else if (this.selectedRow_ > index) {
          // 如果删除的行在选中行的上方，需要更新选中行的索引
          this.selectedRow_ -= 1;
        }
      }
    },

    EditContent(text) {
      if (this.selectedRow !== null && this.selectedColumn !== null) {
        const key = `${this.selectedRow}-${this.selectedColumn}`;
        if (this.selectedColumn === 4 || this.selectedColumn === 6 || this.selectedColumn === 7) {
          // 如果 selectedColumn 为 4、6 或 7，则直接赋值给单元格内容
          this.cellValues[key] = text;
        } else if (this.selectedColumn === 1) {
          const currentValue = this.cellValues[key] || '';
          if (!isNaN(text)) {
            // 如果 text 是数字，则将数字插入到现有文本的后面
            this.cellValues[key] = currentValue + text;
          } else if (text === 'Prefix' && currentValue.includes('null')) {
            this.cellValues[key] = currentValue.replace('null', 'M');
          } else if (text === 'Prefix' && currentValue.includes('M')) {
            this.cellValues[key] = currentValue.replace('M', 'IC');
          } else if (text === 'Prefix' && currentValue.includes('IC')) {
            this.cellValues[key] = currentValue.replace('IC', 'NGC');
          } else if (text === 'Prefix' && currentValue.includes('NGC')) {
            this.cellValues[key] = currentValue.replace('NGC', 'M');
          } else if (text === 'Delete') {
            // 如果 text 是 "Delete"，则删除现有文本中数字部分的最后一位，但不能删除空格以及空格前的字母部分
            const spaceIndex = currentValue.indexOf(' ');
            if (spaceIndex !== -1) {
              const numberPart = currentValue.slice(spaceIndex + 1);
              if (numberPart.length > 0) {
                this.cellValues[key] = currentValue.slice(0, spaceIndex + 1) + numberPart.slice(0, -1);
              }
            }
          }
        } else if (this.selectedColumn === 3) {
          const currentValue = this.cellValues[key] || '';
          if (!isNaN(text)) {
            // 如果 text 是数字，则将数字插入到现有文本中空格前的数字后面
            const spaceIndex = currentValue.indexOf(' ');
            if (spaceIndex !== -1) {
              this.cellValues[key] = currentValue.slice(0, spaceIndex) + text + currentValue.slice(spaceIndex);
            } else {
              this.cellValues[key] += text;
            }
          } else if (text === 'Delete') {
            // 如果 text 为 "Delete"，则删除空格前的数字部分的最后一位
            const spaceIndex = currentValue.indexOf(' ');
            if (spaceIndex !== -1) {
              const numberPart = currentValue.slice(0, spaceIndex);
              if (numberPart.length > 0) {
                this.cellValues[key] = numberPart.slice(0, -1) + currentValue.slice(spaceIndex);
              }
            }
          } else if (text === 's/ms' && currentValue.includes('ms')) {
            // 如果 text 是 "ms"，且现有文本包含 "ms"，则将 "ms" 修改为 "s"
            this.cellValues[key] = currentValue.replace('ms', 's');
          } else if (text === 's/ms' && currentValue.includes('s')) {
            // 如果 text 是 "s"，且现有文本包含 "s"，则将 "s" 修改为 "ms"
            this.cellValues[key] = currentValue.replace('s', 'ms');
          } 
        } else if (text === 'Delete') {
          // 如果 text 为 "Delete"，则删除单元格现有内容的最后一位
          this.cellValues[key] = (this.cellValues[key] || '').slice(0, -1);
        } else {
          // 否则，在单元格现有内容的后面插入 text
          this.cellValues[key] = (this.cellValues[key] || '') + text;
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
    AddScheduleRow() {
      this.numberOfRows += 1;

      for (let column = 1; column <= this.numberOfColumns; column++) {
        const key = `${this.numberOfRows}-${column}`;
        this.$set(this.cellValues, key, this.initialColumnValues[column] || '');
      }

    },

    initializeTable() {
      // 为初始行添加默认值
      for (let row = 1; row <= this.numberOfRows; row++) {
        for (let column = 1; column <= this.numberOfColumns; column++) {
          const key = `${row}-${column}`;
          // 如果当前单元格没有值，则设置默认值
          if (!this.cellValues[key]) {
            const initialValue = this.initialColumnValues[column] || '';
            this.$set(this.cellValues, key, initialValue);
          }
        }
      }
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

.selected-cell {
  background-color: rgba(51, 218, 121, 0.7);
  backdrop-filter: blur(5px);
}


</style>
