<template>
  <transition name="panel">
    <div class="DeviceAllocationPanel-panel"
         :style="{ bottom: bottom + 'px', top: top + 'px', width: panelWidth }"
         @click.stop
         @mousedown.stop
         @touchstart.stop
         data-testid="dap-root"
         :data-state="isOpen ? 'open' : 'closed'"
    >
      <!-- <ul class="device-list">
        <li v-for="(device, index) in DeviceList" :key="index" @click="SelectedDeviceName(device)" data-testid="dap-act-selected-device-name" :data-index="index">
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
        <!-- 不做类型过滤：统一显示所有“未绑定的待分配设备” -->
        <li v-for="(device, index) in unboundDeviceList" :key="index" @click="SelectedDeviceName(device)" data-testid="dap-act-selected-device-name-2" :data-index="index">
          <!-- 显示来源类型，避免用户误选（例如 CCD / Mount / Focuser） -->
          {{ device.DeviceType ? ('[' + device.DeviceType + '] ') : '' }}{{ device.DeviceName }}
        </li>
      </ul>

      <span style="position: absolute; bottom: 5px; right: 15px; font-size: 12px; font-weight: bold; color: rgba(0, 121, 214, 0.8); user-select: none;"
            @click.stop="ClosePanel" data-testid="dap-act-close-panel">
        {{ $t('CLOSE') }}
      </span>



    </div>
  </transition>
</template>

<script>
import DevicePicker from './DevicePicker.vue';

export default {
  name: 'DeviceAllocationPanel',
  props: {
    // 由父组件（gui.vue）传入，用于稳定输出 data-state=open|closed（契约要求）
    isOpen: { type: Boolean, default: false },
  },
  data() {
    return {
      bottom: 70,
      top: 70,
      DeviceList: [
        // { DeviceName: 'QHY CCD QHY5III462C-075', DeviceIndex: 0, isBind: false },
        // { DeviceName: 'QHY CCD QHY268C-59aa8c4', DeviceIndex: 1, isBind: false },
        // { DeviceName: 'LX200 OnStep', DeviceIndex: 2, isBind: false },
        // { DeviceName: 'QHY CCD QHY1920M-075', DeviceIndex: 3, isBind: false },
        // { DeviceName: 'QHY CCD QHY163C-075', DeviceIndex: 4, isBind: false },
      ],

      // 槽位显示规则：
      // - 未连接任何设备时：不显示左侧槽位（保持空）
      // - 一旦检测到至少有设备已连接：初始化默认槽位，后续由 BindDeviceTypeList/DeviceConnectSuccess 覆盖绑定状态
      DeviceTypes: [],

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
    this.$bus.$on('clearDeviceAllocationList',this.clearDeviceAllocationList);
    this.$bus.$on('deleteDeviceTypeAllocationList',this.deleteDeviceTypeAllocationList);
    this.$bus.$on('deleteDeviceAllocationList',this.deleteDeviceAllocationList);
    this.$bus.$on('loadBindDeviceList',this.loadBindDeviceList);
    this.$bus.$on('loadBindDeviceTypeList',this.loadBindDeviceTypeList);
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
      // 若当前没有选中任何角色卡片，直接忽略（避免把选择写到未知槽位）
      const selectedRole = (this.DeviceTypes || []).find(t => t && t.isSelected);
      if (!selectedRole) return;

      // 绑定安全校验：即使右侧列表不过滤，也不允许跨类型误选导致错绑
      const role = selectedRole.DeviceType;
      const expectedCandidateType = (role === 'MainCamera' || role === 'Guider' || role === 'PoleCamera') ? 'CCD' : role;
      if (device && device.DeviceType && expectedCandidateType && device.DeviceType !== expectedCandidateType) {
        this.$bus.$emit('SendConsoleLogMsg', `Device type mismatch: ${role} expects ${expectedCandidateType}, but selected ${device.DeviceType}`, 'warning');
        return;
      }
      // 重要：不要跨角色清空其他 DeviceType 的 DeviceName。
      // 否则在给 Guider 选设备时，可能把 MainCamera 的绑定信息误清空，造成“主相机异常绑定”的错觉/误操作。
      for (let i = 0; i < this.DeviceTypes.length; i++) {
        if (this.DeviceTypes[i].isSelected === true) {
          this.DeviceTypes[i].DeviceName = device.DeviceName;
          this.DeviceTypes[i].selectedDeviceIndex = device.DeviceIndex;
        }
      }
    },

    AddDeviceType(DeviceType) {
      const exists = this.DeviceTypes.some(item => item.DeviceType === DeviceType);
      if (exists) {
        console.log('Device Type already exists:', DeviceType);
      } else {
        console.log('Add Device Type:', DeviceType);
        this.DeviceTypes.push({DeviceType: DeviceType, DeviceName: '', isBind: false, isSelected: false, selectedDeviceIndex: null });
      }
    },

    DeviceToBeAllocated(a, b, c) {
      // 兼容两种调用：
      // - 新：DeviceToBeAllocated(DeviceType, DeviceIndex, DeviceName)
      // - 旧：DeviceToBeAllocated(DeviceIndex, DeviceName)
      let deviceType, index, name;
      if (typeof a === 'string' && typeof c !== 'undefined') {
        deviceType = a;
        index = b;
        name = c;
      } else {
        deviceType = 'Device'; // 旧协议没有类型信息，统一归类
        index = a;
        name = b;
      }

      if (!name || String(name).trim() === '') return;

      // 关键：必须区分设备类型，否则同名/同端口会造成错绑（例如电调/赤道仪）
      const key = `${deviceType}:${index}`;
      const exists1 = this.DeviceList.some(item => `${item.DeviceType}:${item.DeviceIndex}` === key);
      // 占用规则：
      // - CCD：全局占用（主相机/导星镜不能同时绑定同一台相机）
      // - 其他：按角色占用（例如同一设备可同时作为 Mount+Focuser：OnStep 常见）
      const occupied =
        (deviceType === 'CCD')
          ? this.DeviceTypes.some(item => item && item.DeviceName === name)
          : this.DeviceTypes.some(item => item && item.DeviceType === deviceType && item.DeviceName === name);
      console.log('this.DeviceList:', this.DeviceList);
      if (exists1) {
        console.log('Device already exists:', name);
        this.$bus.$emit('SendConsoleLogMsg', 'Device already exists:' + index + ':' + name, 'info');
      } else {
        if (occupied) {
          this.$bus.$emit('SendConsoleLogMsg', 'Device already exists:' + index + ':' + name, 'info');
          this.DeviceList.push({DeviceType: deviceType, DeviceName: name, DeviceIndex: index, isBind: true });
        } else {
          this.$bus.$emit('SendConsoleLogMsg', 'Add Device To Be Allocated:' + index + ':' + name, 'info');
          console.log('Add Device To Be Allocated:', index, name);
          this.DeviceList.push({DeviceType: deviceType, DeviceName: name, DeviceIndex: index, isBind: false });
        }
      }
    },

    DeviceConnectSuccess(type, DeviceName, DriverName, isBind = true) {
      if (type == '' || type == "undefined" || type == null || DriverName == '' || DriverName == "undefined" || DriverName == null){
        return;
      }

      let found = false;
      for (let i = 0; i < this.DeviceTypes.length; i++) {
        if (this.DeviceTypes[i].DeviceType === type) {
          this.DeviceTypes[i].DeviceName = DeviceName;
          this.DeviceTypes[i].isBind = isBind;
          this.DeviceTypes[i].isSelected = false;
          found = true; // 标记已找到匹配项
          break; // 找到后可以跳出循环，优化性能
        }
      }

      // 如果没有找到匹配项，添加新的设备对象
      if (!found) {
        this.DeviceTypes.push({
          DeviceType: type,
          DeviceName: DeviceName,
          isBind: isBind,
          isSelected: false,
          selectedDeviceIndex: null,
        });
      }
      const indexToRemove = this.DeviceList.findIndex(item => item.DeviceName === DeviceName);
      if (indexToRemove !== -1) {
        this.DeviceList[indexToRemove].isBind = isBind;
        this.$bus.$emit('SendConsoleLogMsg', ' Binding Device Success:' + type + ':' + this.DeviceList[indexToRemove].DeviceIndex+': '+ this.DeviceList[indexToRemove].isBind, 'info');
      }
      // 同名设备在列表中可能出现多次：
      // - CCD：同名全局互斥，所以同名全部标记
      // - 其他：只标记同类型，避免 Mount/Focuser 共享设备时互相“误占用”
      if (DeviceName) {
        const markType = (type === 'MainCamera' || type === 'Guider' || type === 'PoleCamera') ? 'CCD' : type;
        this.DeviceList.forEach((d) => {
          if (!d) return;
          if (markType === 'CCD') {
            if (d.DeviceName === DeviceName) d.isBind = isBind;
          } else {
            if (d.DeviceType === markType && d.DeviceName === DeviceName) d.isBind = isBind;
          }
        });
      }
    },

    BindingDevice(index) {
      const type = this.DeviceTypes[index].DeviceType;
      const selectedIndex = this.DeviceTypes[index].selectedDeviceIndex;
      if (selectedIndex === null || typeof selectedIndex === 'undefined') {
        this.$bus.$emit('SendConsoleLogMsg', 'Please select a device first', 'warning');
        return;
      }
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'BindingDevice:' + type + ':' + selectedIndex);
      this.$bus.$emit('SendConsoleLogMsg', 'Binding Device:' + type + ':' + selectedIndex, 'info');
    },

    UnBindingDevice(index) {
      const type = this.DeviceTypes[index].DeviceType;
      const name = this.DeviceTypes[index].DeviceName;


      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'UnBindingDevice:' + type);
      this.$bus.$emit('SendConsoleLogMsg', 'UnBinding Device:' + type, 'info');

      this.DeviceTypes[index].isBind = false;
      this.DeviceTypes[index].DeviceName = '';
      const indexToRemove = this.DeviceList.findIndex(item => item.DeviceName === name);
      if (indexToRemove !== -1) {
        this.DeviceList[indexToRemove].isBind = false;
      }
      // 同名设备恢复为“未绑定”：
      // - CCD：同名全局互斥，所以同名全部恢复
      // - 其他：只恢复同类型
      if (name) {
        const markType = (type === 'MainCamera' || type === 'Guider' || type === 'PoleCamera') ? 'CCD' : type;
        this.DeviceList.forEach((d) => {
          if (!d) return;
          if (markType === 'CCD') {
            if (d.DeviceName === name) d.isBind = false;
          } else {
            if (d.DeviceType === markType && d.DeviceName === name) d.isBind = false;
          }
        });
      }
      // 解绑后由 App.vue 从当前 devices 状态中读取 driverName，避免传入 undefined 污染 driverName
      this.$bus.$emit('UnBindingDevice', type, name);
    },

    ClosePanel() {
      this.$bus.$emit('toggleDeviceAllocationPanel');
    },

    clearDeviceAllocationList() {
      this.DeviceTypes = [];
      this.DeviceList = [];
    },
    deleteDeviceTypeAllocationList(type) {

      if (type == "all"){
        this.clearDeviceAllocationList()
        this.$bus.$emit('SendConsoleLogMsg', 'All driverType has removed', 'info');
        return;
      }

      for (let i = this.DeviceTypes.length - 1; i >= 0; i--) {
        if (this.DeviceTypes[i].DeviceType === type) {
          for (let j = this.DeviceList.length - 1; j >= 0; j--) {
            if (this.DeviceList[j].DeviceName === this.DeviceTypes[i].DeviceName) {
              this.DeviceList[j].isBind = false;
              break
            }
          }
          this.DeviceTypes.splice(i, 1);
          break
        }
      }
      this.$bus.$emit('SendConsoleLogMsg', type + " driverType has removed", 'info');
    },
    deleteDeviceAllocationList(deviceName) {
      for (let i = this.DeviceList.length - 1; i >= 0; i--) {
        if (this.DeviceList[i].DeviceName === deviceName) {
          this.DeviceList.splice(i, 1);
        }
      }
      this.$bus.$emit('SendConsoleLogMsg', 'Device(' + deviceName + ') has removed', 'info');
    },


    GetConnectedDevices() {
      this.$bus.$emit('GetConnectedDevices');
    },

    loadBindDeviceList(deviceObject) {
      // 兼容两种入参：
      // - 旧：[{ [name]: index }, ...]
      // - 新：[{ DeviceType, DeviceName, DeviceIndex }, ...]
      (deviceObject || []).forEach((device) => {
        if (!device) return;
        if (typeof device.DeviceType !== 'undefined') {
          this.DeviceToBeAllocated(device.DeviceType, device.DeviceIndex, device.DeviceName);
          return;
        }
        for (const [deviceName, deviceIndex] of Object.entries(device)) {
          // 旧协议没有类型信息
          this.DeviceToBeAllocated(deviceIndex, deviceName);
        }
      });
    },

    loadBindDeviceTypeList(deviceTypeObject) {
      deviceTypeObject.forEach(deviceType => {
        const { type, DeviceName, DriverName, isbind } = deviceType;
        this.DeviceConnectSuccess(type, DeviceName, DriverName, isbind);
      });
    }
    
  },
  components: {
    DevicePicker,
  },
  computed: {
    selectedDeviceType() {
      const selected = (this.DeviceTypes || []).find(t => t && t.isSelected);
      return selected ? selected.DeviceType : '';
    },
    unboundDeviceList() {
      return (this.DeviceList || []).filter(d => d && !d.isBind);
    },
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
