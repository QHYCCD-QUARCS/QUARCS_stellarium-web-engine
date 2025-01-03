<template>
  <transition name="panel">
    <div class="DeviceAllocationPanel-panel" :style="{ bottom: bottom + 'px', top: top + 'px', width: panelWidth }">
      <!-- <ul class="device-list">
        <li v-for="(device, index) in DeviceList" :key="index" @click="SelectedDeviceName(device)">
          {{ device.DeviceName }}
        </li>
      </ul> -->

      <div class="DeviceTypes-list">
        <DevicePicker v-for="(deviceType, index) in DeviceTypes" :key="index" :DeviceType="deviceType.DeviceType"
          :DeviceName="deviceType.DeviceName" :DeviceBind="deviceType.isBind" :PickerIndex="index" :PickerSelect="deviceType.isSelected"
          :style="{ top: Position[index].top, left: Position[index].left }" />
      </div>

      <span style="position: absolute; top: 10px; right: 15px; font-size: 15px; color: rgba(255, 255, 255, 0.5); user-select: none;"> 
        {{ $t('Device To Be Allocated') }}
      </span>

      <ul class="device-list">
        <li v-for="(device, index) in DeviceList" :key="index" @click="SelectedDeviceName(device)">
          {{ device.DeviceName }}
        </li>
      </ul>

      <span style="position: absolute; bottom: 5px; right: 15px; font-size: 12px; font-weight: bold; color: rgba(0, 121, 214, 0.8); user-select: none;" @click="ClosePanel"> 
        {{ $t('CLOSE') }}
      </span>



    </div>
  </transition>
</template>

<script>
import DevicePicker from './DevicePicker.vue';

export default {
  name: 'DeviceAllocationPanel',
  data() {
    return {
      bottom: 70,
      top: 70,
      DeviceList: [
        // { DeviceName: 'QHY CCD QHY5III462C-075', isBind: false },
        // { DeviceName: 'QHY CCD QHY268C-59aa8c4', isBind: false },
        // { DeviceName: 'LX200 OnStep', isBind: false },
        // { DeviceName: 'QHY CCD QHY1920M-075', isBind: false },
        // { DeviceName: 'QHY CCD QHY163C-075', isBind: false },
      ],

      DeviceTypes: [
        // { DeviceType: 'Guider', DeviceName: '', isBind: false, isSelected: false },
        // { DeviceType: 'Main Camera', DeviceName: '', isBind: false, isSelected: false },
        // { DeviceType: 'Mount', DeviceName: '', isBind: false, isSelected: false },

        // { DeviceType: 'Focuser', DeviceName: '', isBind: false, isSelected: false },
        // { DeviceType: 'Pole Camera', DeviceName: '', isBind: false, isSelected: false },
        // { DeviceType: 'CFW', DeviceName: '', isBind: false, isSelected: false },
      ],

      Position: [
        { top: '12%', left: '15px' },
        { top: '39%', left: '15px' },
        { top: '66%', left: '15px' },

        { top: '12%', left: '175px' },
        { top: '39%', left: '175px' },
        { top: '66%', left: '175px' },
      ],
    };
  },
  created() {
    this.$bus.$on('SelectPickerIndex', this.SelectPickerIndex);
    this.$bus.$on('AddDeviceType',this.AddDeviceType);
    this.$bus.$on('DeviceToBeAllocated',this.DeviceToBeAllocated);
    this.$bus.$on('DeviceConnectSuccess', this.DeviceConnectSuccess);
    this.$bus.$on('BindDeviceIndex', this.BindingDevice);
    this.$bus.$on('UnBindDeviceIndex', this.UnBindingDevice);
    this.$bus.$on('claerDeviceAllocationList',this.claerDeviceAllocationList);
  },
  methods: {
    SelectPickerIndex(num) {
      for(let i = 0; i < this.DeviceTypes.length; i++) {
        this.DeviceTypes[i].isSelected = false;
      }
      console.log('Select Picker Index:', num);
      if(!this.DeviceTypes[num].isBind){
        this.DeviceTypes[num].isSelected = true;
      }
    },

    SelectedDeviceName(device) {
      for (let i = 0; i < this.DeviceTypes.length; i++) {
        if (this.DeviceTypes[i].DeviceName === device.DeviceName) {
          this.DeviceTypes[i].DeviceName = '';
        }
      }

      for (let i = 0; i < this.DeviceTypes.length; i++) {
        if (this.DeviceTypes[i].isSelected === true) {
          this.DeviceTypes[i].DeviceName = device.DeviceName;
        }
      }
    },

    AddDeviceType(DeviceType) {
      const exists = this.DeviceTypes.some(item => item.DeviceType === DeviceType);
      if (exists) {
        console.log('Device Type already exists:', DeviceType);
      } else {
        console.log('Add Device Type:', DeviceType);
        this.DeviceTypes.push({DeviceType: DeviceType, DeviceName: '', isBind: false, isSelected: false });
      }
    },

    DeviceToBeAllocated(index,name) {
      const exists = this.DeviceList.some(item => item.DeviceName === name);
      if (exists) {
        console.log('Device already exists:', name);
      } else {
        console.log('Add Device To Be Allocated:', index, name);
        this.DeviceList.push({DeviceName: name, DeviceIndex: index });
      }
    },

    DeviceConnectSuccess(type, newDevice) {
      // for (let i = 0; i < this.DeviceTypes.length; i++) {
      //   if (this.DeviceTypes[i].DeviceType === type) {
      //     this.DeviceTypes[i].DeviceName = newDevice;
      //     this.DeviceTypes[i].isBind = true;
      //     this.DeviceTypes[i].isSelected = false;
      //   }
      // }

      let found = false;

      for (let i = 0; i < this.DeviceTypes.length; i++) {
        if (this.DeviceTypes[i].DeviceType === type) {
          this.DeviceTypes[i].DeviceName = newDevice;
          this.DeviceTypes[i].isBind = true;
          this.DeviceTypes[i].isSelected = false;
          found = true; // 标记已找到匹配项
          break; // 找到后可以跳出循环，优化性能
        }
      }

      // 如果没有找到匹配项，添加新的设备对象
      if (!found) {
        this.DeviceTypes.push({
          DeviceType: type,
          DeviceName: newDevice,
          isBind: true,
          isSelected: false,
        });
      }

      const indexToRemove = this.DeviceList.findIndex(item => item.DeviceName === newDevice);
      if (indexToRemove !== -1) {
        this.DeviceList.splice(indexToRemove, 1); // 删除该项
      }
    },

    BindingDevice(index) {
      const type = this.DeviceTypes[index].DeviceType;
      const name = this.DeviceTypes[index].DeviceName;

      const DeviceNameIndex = this.DeviceList.findIndex(item => item.DeviceName === name);
      if (DeviceNameIndex !== -1) {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'BindingDevice:' + type + ':' + this.DeviceList[DeviceNameIndex].DeviceIndex);
        this.$bus.$emit('SendConsoleLogMsg', 'Binding Device:' + type + ':' + this.DeviceList[DeviceNameIndex].DeviceIndex, 'info');
      }

    },

    UnBindingDevice(index) {
      const type = this.DeviceTypes[index].DeviceType;

      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'UnBindingDevice:' + type);
      this.$bus.$emit('SendConsoleLogMsg', 'UnBinding Device:' + type, 'info');

      this.DeviceTypes[index].isBind = false;
      this.DeviceTypes[index].DeviceName = '';
    },

    ClosePanel() {
      this.$bus.$emit('toggleDeviceAllocationPanel');
    },

    claerDeviceAllocationList() {
      this.DeviceTypes = [];
      this.DeviceList = [];
    },

    GetConnectedDevices() {
      this.$bus.$emit('GetConnectedDevices');
    },

    
  },
  components: {
    DevicePicker,
  },
  computed: {
    panelWidth() {
      // 如果 DeviceTypes 中的项目数小于或等于 3，则宽度为 360px
      // 如果大于 3，则宽度为 500px
      return this.DeviceTypes.length <= 3 ? '360px' : '500px';
    },
  },
  mounted: function () {
    this.GetConnectedDevices();
  },
  watch: {},
};
</script>

<style scoped>
.DeviceAllocationPanel-panel {
  pointer-events: auto;
  position: fixed;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  overflow: hidden;
  left: 50%;
  transform: translateX(-50%);

  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

@keyframes showPanelAnimation {
  from {
    bottom: 100%;
    backdrop-filter: blur(0px);
    background-color: rgba(64, 64, 64, 0.0);
  }

  to {
    bottom: 70px;
    backdrop-filter: blur(5px);
    background-color: rgba(64, 64, 64, 0.3);
  }
}

@keyframes hidePanelAnimation {
  from {
    bottom: 70px;
    backdrop-filter: blur(5px);
    background-color: rgba(64, 64, 64, 0.3);
  }

  to {
    bottom: 100%;
    backdrop-filter: blur(0px);
    background-color: rgba(64, 64, 64, 0.0);
  }
}

.panel-enter-active {
  animation: showPanelAnimation 0.3s forwards;
}

.panel-leave-active {
  animation: hidePanelAnimation 0.3s forwards;
}

.device-list {
  position: absolute;
  top: 30px;
  right: 15px;
  bottom: 25px;

  list-style-type: none;
  /* 去掉列表前的默认点 */
  padding: 0;
  /* 去掉内边距 */
  margin: 0;
  /* 去掉外边距 */
  width: 150px;
  /* 控制列表宽度 */
  max-height: 200px;
  /* 控制列表最大高度 */
  overflow-y: auto;
  /* 允许垂直滚动 */
  border: 1px solid rgba(255, 255, 255, 0.2);
}

li {
  color: white;
  /* 设定文字颜色 */
  padding: 5px 10px;
  /* 添加一些内边距 */
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  /* 添加底部边框 */
  white-space: nowrap;
  /* 确保文本不换行 */
  overflow: hidden;
  /* 超出部分隐藏 */
  text-overflow: ellipsis;
  /* 超出部分用省略号表示 */
}

li:hover {
  background-color: rgba(255, 255, 255, 0.1);
  /* 悬停效果 */
}

.DeviceTypes-list {
  position: absolute;
  top: 30px;
  /* 根据需要调整位置 */
  right: 15px;
  /* 根据需要调整位置 */
  bottom: 15px;
  /* 根据需要调整位置 */
  width: 150px;
  /* 设置宽度，确保右侧的 DevicePicker 组件能够显示 */
  overflow-y: auto;
  /* 允许垂直滚动，如果需要的话 */
}
</style>
