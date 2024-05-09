<template>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <!-- <th>序号</th> -->
          <th>拍摄目标</th>
          <th>赤经赤纬</th>
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
      numberOfColumns: 8,
      cellValues: {},
      tableData: [],
      
      initialColumnValues: {
        1: 'null ',
        2: '',
        3: 'Now',
        4: '1 s',
        5: 'L',
        6: '1',
        7: 'Light',
        8: 'OFF',
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

    this.$bus.$on('insertObjName',this.insertObjName);

    this.$bus.$on('getTableData',this.getTableData);

    this.$bus.$on('TargetRaDec',this.insertObjRaDec);

    this.$bus.$on('StagingScheduleData',this.RecoveryScheduleData);

  },
  mounted() {
    console.log('initialize ScheduleTable------------------------------');
    // this.sendMessage('Vue_Command', 'getStagingScheduleData');
    // 初始化表格数据
    this.initializeTable();
    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'getStagingScheduleData');
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

      }
      else if(column === 3)
      {
        this.$bus.$emit('KeyBoardMode','Time');
      }
      else if(column === 4)
      {
        this.$bus.$emit('KeyBoardMode','ExpTime');
      }
      else if(column === 5)
      {
        this.$bus.$emit('KeyBoardMode','CFW');
      }
      else if(column === 6)
      {
        this.$bus.$emit('KeyBoardMode','Repeat');
      }
      else if(column === 7)
      {
        this.$bus.$emit('KeyBoardMode','Type');
      }
      else if(column === 8)
      {
        this.$bus.$emit('KeyBoardMode','Focus');
      }

      this.getTableData(false);
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

    getTableData(isStart) {
      // this.$bus.$emit('getScheduleItemList');
      // 清空原始表格数据
      this.tableData = [];
      // 遍历每一行
      for (let row = 1; row <= this.numberOfRows; row++) {
        // 检查第一列的单元格内容是否为 'null '
        const firstColumnKey = `${row}-1`;
        const firstColumnValue = this.cellValues[firstColumnKey];
        
        // const RepeatNumKey = `${row}-6`;
        // const RepeatNum = this.cellValues[RepeatNumKey];

        // 如果第一列的内容不是 'null '，则获取该行数据
        if (firstColumnValue !== 'null ') {
          let rowData = ['[']; // 在每一行的开头添加 [
          // 遍历每一列
          for (let column = 1; column <= this.numberOfColumns; column++) {
            const key = `${row}-${column}`;
            // 将单元格数据添加到当前行的数组中
            rowData.push(this.cellValues[key] || '');
          }
          // rowData.push(']'); // 在每一行的结尾添加 ]
          // 将当前行的数组添加到表格数据中
          this.tableData.push(rowData);
        }
      }
      // 输出表格数据
      console.log('Table Data:', this.tableData);
      if(isStart) {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ScheduleTabelData:'+ this.tableData);
      } else {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'StagingScheduleData:'+ this.tableData);
      }
      
    },

    RecoveryScheduleData(text) {
      console.log('RecoveryScheduleData: ', text);
      const rowData = text.split('[');

      // 循环遍历分割后的数组
      for (let i = 1; i < rowData.length; i++) {
        console.log('rowData: ', rowData[i]);

        const colData = rowData[i].split(',');
        for (let j = 1; j < colData.length; j++){
          console.log('colData: ', colData[j]);
          let key;
          if(j === 1) {
            key = `${i}-${1}`;
            this.cellValues[key] = colData[j];
          } else if (j === 2) {
            key = `${i}-${2}`;
            this.cellValues[key] = colData[j];
          } else if (j === 3) {
            key = `${i}-${2}`;
            const currentValue = this.cellValues[key] || '';
            this.cellValues[key] = currentValue + ',' + colData[j];
          } else if (j === 4) {
            key = `${i}-${3}`;
            this.cellValues[key] = colData[j];
          } else if (j === 5) {
            key = `${i}-${4}`;
            this.cellValues[key] = colData[j];
          } else if (j === 6) {
            key = `${i}-${5}`;
            this.cellValues[key] = colData[j];
          } else if (j === 7) {
            key = `${i}-${6}`;
            this.cellValues[key] = colData[j];
          } else if (j === 8) {
            key = `${i}-${7}`;
            this.cellValues[key] = colData[j];
          } else if (j === 9) {
            key = `${i}-${8}`;
            this.cellValues[key] = colData[j];
          }
        }
      }
    },

    EditContent(text) {
      if (this.selectedRow !== null && this.selectedColumn !== null) {
        const key = `${this.selectedRow}-${this.selectedColumn}`;
        if (this.selectedColumn === 5 || this.selectedColumn === 7 || this.selectedColumn === 8) {
          // 如果 selectedColumn 为 5、7 或 8，则直接赋值给单元格内容
          this.cellValues[key] = text;
        } else if (this.selectedColumn === 1) {
          const currentValue = this.cellValues[key] || '';
          // console.log('currentValue', currentValue);
          if (!isNaN(text)) {
            // 如果 text 是数字，则将数字插入到现有文本的后面
            this.cellValues[key] = currentValue + text;
          } else if (text === 'Prefix' && currentValue.includes('null')) {
            this.cellValues[key] = currentValue.replace('null', 'M');
          } else if (text === 'Prefix' && currentValue === ' ') {
            this.cellValues[key] = currentValue.replace(' ', 'M ');
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
          console.log('currentValue', this.cellValues[key]);
          this.$bus.$emit('SearchName',this.cellValues[key]);
        } else if (this.selectedColumn === 2) {
          
        } else if (this.selectedColumn === 3) {
          const currentValue = this.cellValues[key] || '';
          const textIsNumber = !isNaN(text);

          if (textIsNumber) {
            const currentLength = currentValue.length;
            if (currentValue === 'Now') {
              if (text < 3) {
                const updatedValue = text + ':';
                this.cellValues[key] = updatedValue;
              }
            } else if (currentLength === 2) {
              const firstChar = currentValue.charAt(0);
              if (firstChar > 1) {
                if (text < 4) {
                  const insertIndex = currentValue.indexOf(':');
                  const updatedValue = currentValue.slice(0, insertIndex) + text + currentValue.slice(insertIndex);
                  this.cellValues[key] = updatedValue;
                }
              } else {
                const insertIndex = currentValue.indexOf(':');
                const updatedValue = currentValue.slice(0, insertIndex) + text + currentValue.slice(insertIndex);
                this.cellValues[key] = updatedValue;
              }
            } else if (currentLength === 3) {
              if (text < 6) {
                const updatedValue = currentValue + text;
                this.cellValues[key] = updatedValue;
              }
            } else if (currentLength === 4) {
              const updatedValue = currentValue + text;
              this.cellValues[key] = updatedValue;
            }
          } else if (text === 'Delete') {
            const currentLength = currentValue.length;
            if (currentLength === 4 || currentLength === 5) {
              const updatedValue = currentValue.slice(0, -1);
              this.cellValues[key] = updatedValue;
            } else if (currentLength === 3) {
              const indexToDelete = currentValue.indexOf(':') - 1;
              if (indexToDelete >= 0) {
                const updatedValue = currentValue.slice(0, indexToDelete) + currentValue.slice(indexToDelete + 1);
                this.cellValues[key] = updatedValue;
              }
            } else if (currentLength === 2) {
              this.cellValues[key] = 'Now';
            }
          }
        } else if (this.selectedColumn === 4) {
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

    insertObjName(name) {
      if (this.selectedRow !== null && this.selectedColumn !== null) {
        const key = `${this.selectedRow}-${this.selectedColumn}`;
        if (this.selectedColumn === 1) {
          // 如果 selectedColumn 为 1，则直接赋值给单元格内容
          this.cellValues[key] = ' ' + name;
        }
      }
    },

    insertObjRaDec(RaDec) {
      if (this.selectedRow !== null && this.selectedColumn !== null) {
        const key = `${this.selectedRow}-${this.selectedColumn + 1}`;
        if (this.selectedColumn === 1) {
          this.cellValues[key] = ' ' + RaDec;
        }
      }
    },

    setMaxHeight() {
      const Height = window.innerHeight;
      this.containerMaxHeight = Height - 130;
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
