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
      <div class="panel-header">
        <div class="panel-title-wrap">
          <span class="panel-title">{{ $t('Device Allocation') }}</span>
          <span class="panel-subtitle">
            {{ selectedDeviceType ? $t('DeviceAllocation_SelectedSlot', { slot: selectedDeviceType }) : $t('DeviceAllocation_StepHint') }}
          </span>
        </div>
        <span class="panel-close"
              @click.stop="ClosePanel"
              data-testid="dap-act-close-panel">
          {{ $t('CLOSE') }}
        </span>
      </div>

      <div class="panel-body">
        <div class="slot-column">
          <div class="column-title">{{ $t('DeviceAllocation_Slots') }}</div>
          <div class="slot-list">
            <DevicePicker
              v-for="(deviceType, index) in DeviceTypes"
              :key="index"
              :DeviceType="deviceType.DeviceType"
              :DeviceName="deviceType.DeviceName"
              :DeviceBind="deviceType.isBind"
              :PickerIndex="index"
              :PickerSelect="deviceType.isSelected"
            />
          </div>
        </div>

        <div class="candidate-column">
          <div class="column-title">{{ $t('DeviceAllocation_CandidateDevices') }}</div>
          <div class="list-hint">
            {{ selectedDeviceType ? $t('DeviceAllocation_ListHint_Selected') : $t('DeviceAllocation_ListHint_Unselected') }}
          </div>

          <ul class="device-list">
            <li
              v-for="(device, index) in candidateDeviceList"
              :key="device.DeviceType + ':' + device.DeviceIndex"
              @click="SelectedDeviceName(device)"
              data-testid="dap-act-selected-device-name-2"
              :data-index="index"
              :class="{
                selected: isSelectedCandidate(device),
                occupied: !!getDeviceOccupant(device),
                swappable: canSwapWithSelectedRole(device),
              }"
            >
              <div class="device-main-row">
                <span class="device-type-tag">{{ device.DeviceType || $t('Device') }}</span>
                <span class="device-name-text">{{ device.DeviceName }}</span>
              </div>
              <span v-if="getDeviceOccupant(device)" class="device-meta">
                {{ canSwapWithSelectedRole(device) ? $t('DeviceAllocation_SwappableWith') : $t('DeviceAllocation_BoundTo') }} {{ getDeviceOccupant(device) }}
              </span>
            </li>
            <li v-if="candidateDeviceList.length === 0" class="device-empty">
              {{ $t('DeviceAllocation_NoAvailableCandidateDevice') }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import DevicePicker from './DevicePicker.vue';

const CAMERA_DEVICE_TYPES = ['MainCamera', 'Guider', 'PoleCamera'];
const ALLOCATABLE_DEVICE_TYPES = ['CCD'];
const SWAPPABLE_ROLE_GROUPS = [
  ['MainCamera', 'Guider', 'PoleCamera'],
];

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

      selectedCandidateKey: '',
    };
  },
  created() {
    this.$bus.$on('SelectPickerIndex', this.SelectPickerIndex);
    this.$bus.$on('AddDeviceType',this.AddDeviceType);
    this.$bus.$on('DeviceToBeAllocated',this.DeviceToBeAllocated);
    this.$bus.$on('DeviceConnectSuccess', this.DeviceConnectSuccess);
    this.$bus.$on('clearDeviceAllocationList',this.clearDeviceAllocationList);
    this.$bus.$on('deleteDeviceTypeAllocationList',this.deleteDeviceTypeAllocationList);
    this.$bus.$on('deleteDeviceAllocationList',this.deleteDeviceAllocationList);
    this.$bus.$on('loadBindDeviceList',this.loadBindDeviceList);
    this.$bus.$on('loadBindDeviceTypeList',this.loadBindDeviceTypeList);
  },
  methods: {
    isCameraDeviceType(deviceType) {
      return CAMERA_DEVICE_TYPES.includes(deviceType);
    },
    isAllocatableDeviceType(deviceType) {
      return ALLOCATABLE_DEVICE_TYPES.includes(deviceType);
    },
    SelectPickerIndex(num) {
      for(let i = 0; i < this.DeviceTypes.length; i++) {
        this.DeviceTypes[i].isSelected = false;
      }
      console.log('Select Picker Index:', num);
      if(this.DeviceTypes[num]){
        this.DeviceTypes[num].isSelected = true;
        this.syncSelectedCandidateByType(this.DeviceTypes[num].DeviceType);
      }
    },

    SelectedDeviceName(device) {
      if (!device || !this.isAllocatableDeviceType(device.DeviceType)) return;
      // 若当前没有选中任何角色卡片，直接忽略（避免把选择写到未知槽位）
      const selectedRole = (this.DeviceTypes || []).find(t => t && t.isSelected);
      if (!selectedRole) return;

      // 绑定安全校验：即使右侧列表不过滤，也不允许跨类型误选导致错绑
      const role = selectedRole.DeviceType;
      const expectedCandidateType = (role === 'MainCamera' || role === 'Guider' || role === 'PoleCamera') ? 'CCD' : role;
      if (device && device.DeviceType && expectedCandidateType && device.DeviceType !== expectedCandidateType) {
        this.$bus.$emit('SendConsoleLogMsg', this.$t('DeviceAllocation_DeviceTypeMismatch', { role, expected: expectedCandidateType, selected: device.DeviceType }), 'warning');
        return;
      }
      const occupant = this.getDeviceOccupant(device);
      if (occupant && occupant !== role && !this.canSwapBetweenRoles(role, occupant)) {
        this.$bus.$emit('SendConsoleLogMsg', this.$t('DeviceAllocation_SelectedDeviceAlreadyBoundNoSwap', { role: occupant }), 'warning');
        return;
      }
      this.selectedCandidateKey = this.getDeviceKey(device);
      const selectedRoleIndex = (this.DeviceTypes || []).findIndex(item => item && item.isSelected);
      if (selectedRoleIndex < 0) return;
      const selectedRoleObj = this.DeviceTypes[selectedRoleIndex];
      if (selectedRoleObj.isBind && selectedRoleObj.selectedDeviceIndex === device.DeviceIndex) {
        this.$bus.$emit('SendConsoleLogMsg', this.$t('DeviceAllocation_RoleAlreadyBoundToThisDevice', { role }), 'info');
        return;
      }
      // 两步操作：先选槽位，再点右侧设备。点击后立即提交绑定/换绑。
      selectedRoleObj.DeviceName = device.DeviceName;
      selectedRoleObj.selectedDeviceIndex = device.DeviceIndex;
      this.BindingDevice(selectedRoleIndex);
    },

    AddDeviceType(DeviceType) {
      if (!this.isCameraDeviceType(DeviceType)) return;
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

      if (!this.isAllocatableDeviceType(deviceType)) return;
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
      this.syncRoleIndexesByDeviceName(deviceType, name, index);
    },

    DeviceConnectSuccess(type, DeviceName, DriverName, isBind = true) {
      if (!this.isCameraDeviceType(type)) return;
      if (type == '' || type == "undefined" || type == null || DriverName == '' || DriverName == "undefined" || DriverName == null){
        return;
      }

      let found = false;
      for (let i = 0; i < this.DeviceTypes.length; i++) {
        if (this.DeviceTypes[i].DeviceType === type) {
          this.DeviceTypes[i].DeviceName = DeviceName;
          this.DeviceTypes[i].isBind = isBind;
          this.DeviceTypes[i].isSelected = false;
          this.DeviceTypes[i].selectedDeviceIndex = this.resolveDeviceIndexForRole(type, DeviceName);
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
          selectedDeviceIndex: this.resolveDeviceIndexForRole(type, DeviceName),
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
      this.syncSelectedCandidateByType(type);
    },

    BindingDevice(index) {
      if (!this.DeviceTypes[index] || !this.isCameraDeviceType(this.DeviceTypes[index].DeviceType)) return;
      const type = this.DeviceTypes[index].DeviceType;
      const selectedIndex = this.DeviceTypes[index].selectedDeviceIndex;
      if (selectedIndex === null || typeof selectedIndex === 'undefined') {
        this.$bus.$emit('SendConsoleLogMsg', this.$t('DeviceAllocation_PleaseSelectDeviceFirst'), 'warning');
        return;
      }
      const selectedDevice = this.findDeviceByIndexAndType(selectedIndex, this.roleCandidateType(type));
      const occupant = this.getDeviceOccupant(selectedDevice);
      if (occupant && occupant !== type && !this.canSwapBetweenRoles(type, occupant)) {
        this.$bus.$emit('SendConsoleLogMsg', this.$t('DeviceAllocation_SelectedDeviceAlreadyBoundNoSwap', { role: occupant }), 'warning');
        return;
      }
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'BindingDevice:' + type + ':' + selectedIndex);
      const action = occupant && occupant !== type ? this.$t('DeviceAllocation_Action_Swap') : this.$t('DeviceAllocation_Action_Binding');
      this.$bus.$emit('SendConsoleLogMsg', `${action} Device:` + type + ':' + selectedIndex, 'info');
    },

    UnBindingDevice(index) {
      if (!this.DeviceTypes[index] || !this.isCameraDeviceType(this.DeviceTypes[index].DeviceType)) return;
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
      this.syncSelectedCandidateByType(type);
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
      if (type !== "all" && !this.isCameraDeviceType(type)) return;

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
    getDeviceKey(device) {
      if (!device) return '';
      return `${device.DeviceType}:${device.DeviceIndex}`;
    },
    isSelectedCandidate(device) {
      return this.selectedCandidateKey !== '' && this.selectedCandidateKey === this.getDeviceKey(device);
    },
    getSelectedRole() {
      return (this.DeviceTypes || []).find(t => t && t.isSelected) || null;
    },
    roleCandidateType(role) {
      return this.isCameraDeviceType(role) ? 'CCD' : role;
    },
    isCompatibleCandidateType(actualType, expectedType) {
      if (actualType === expectedType) return true;
      // 某些后端路径会把 CCD 设备类型回传为 Device，这里做兼容映射。
      return expectedType === 'CCD' && actualType === 'Device';
    },
    normalizeCandidateType(actualType, expectedType) {
      if (this.isCompatibleCandidateType(actualType, expectedType)) return expectedType;
      return actualType;
    },
    resolveDeviceIndexByNameLoose(deviceName) {
      if (!deviceName) return null;
      const matches = (this.DeviceList || []).filter(item => item && item.DeviceName === deviceName);
      if (matches.length === 1) return matches[0].DeviceIndex;
      return null;
    },
    resolveDeviceIndexForRole(role, deviceName) {
      if (!deviceName) return null;
      const candidateType = this.roleCandidateType(role);
      const matched = (this.DeviceList || []).find(item => item && this.isCompatibleCandidateType(item.DeviceType, candidateType) && item.DeviceName === deviceName);
      if (matched) return matched.DeviceIndex;
      // 严格匹配失败时，尝试按名称唯一匹配，兼容旧列表或类型漂移。
      return this.resolveDeviceIndexByNameLoose(deviceName);
    },
    findDeviceByIndexAndType(deviceIndex, deviceType) {
      return (this.DeviceList || []).find(item => item && item.DeviceIndex === deviceIndex && item.DeviceType === deviceType) || null;
    },
    getDeviceOccupant(device) {
      if (!device) return '';
      const matched = (this.DeviceTypes || []).find((item) => {
        if (!item || !item.isBind) return false;
        return item.selectedDeviceIndex === device.DeviceIndex && this.roleCandidateType(item.DeviceType) === device.DeviceType;
      });
      return matched ? matched.DeviceType : '';
    },
    canSwapBetweenRoles(targetRole, occupantRole) {
      if (!targetRole || !occupantRole || targetRole === occupantRole) return false;
      return SWAPPABLE_ROLE_GROUPS.some(group => group.includes(targetRole) && group.includes(occupantRole));
    },
    canSwapWithSelectedRole(device) {
      const selectedRole = this.getSelectedRole();
      const occupant = this.getDeviceOccupant(device);
      return !!(selectedRole && occupant && occupant !== selectedRole.DeviceType && this.canSwapBetweenRoles(selectedRole.DeviceType, occupant));
    },
    syncSelectedCandidateByType(type) {
      const role = (this.DeviceTypes || []).find(item => item && item.DeviceType === type);
      if (!role || role.selectedDeviceIndex === null || typeof role.selectedDeviceIndex === 'undefined') return;
      const candidate = this.findDeviceByIndexAndType(role.selectedDeviceIndex, this.roleCandidateType(type));
      if (candidate) {
        this.selectedCandidateKey = this.getDeviceKey(candidate);
      }
    },
    syncRoleIndexesByDeviceName(deviceType, deviceName, deviceIndex) {
      if (!deviceName) return;
      (this.DeviceTypes || []).forEach((role) => {
        if (!role || !this.isCameraDeviceType(role.DeviceType)) return;
        if (this.roleCandidateType(role.DeviceType) !== deviceType) return;
        if (role.DeviceName === deviceName && (role.selectedDeviceIndex === null || typeof role.selectedDeviceIndex === 'undefined')) {
          role.selectedDeviceIndex = deviceIndex;
        }
      });
    },
    collectExpectedTypeCandidates(expectedType) {
      const merged = new Map();
      (this.DeviceList || []).forEach((device) => {
        if (!device) return;
        if (!this.isCompatibleCandidateType(device.DeviceType, expectedType)) return;
        const normalized = {
          ...device,
          DeviceType: this.normalizeCandidateType(device.DeviceType, expectedType),
        };
        merged.set(this.getDeviceKey(normalized), normalized);
      });

      // 兜底：如果绑定中的设备未出现在 DeviceList，仍将其补进候选，保证可见并可交换。
      (this.DeviceTypes || []).forEach((role) => {
        if (!role || !this.isCameraDeviceType(role.DeviceType)) return;
        if (this.roleCandidateType(role.DeviceType) !== expectedType) return;
        let roleIndex = role.selectedDeviceIndex;
        if (roleIndex === null || typeof roleIndex === 'undefined') {
          roleIndex = this.resolveDeviceIndexForRole(role.DeviceType, role.DeviceName);
        }
        if (roleIndex === null || typeof roleIndex === 'undefined') return;
        const fallbackDevice = {
          DeviceType: expectedType,
          DeviceIndex: roleIndex,
          DeviceName: role.DeviceName || role.DeviceType,
          isBind: !!role.isBind,
        };
        const key = this.getDeviceKey(fallbackDevice);
        if (!merged.has(key)) {
          merged.set(key, fallbackDevice);
        }
      });

      return Array.from(merged.values());
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
        const type = deviceType.Type || deviceType.type;
        const { DeviceName, DriverName, isbind } = deviceType;
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
    candidateDeviceList() {
      const selectedRole = this.getSelectedRole();
      if (!selectedRole) {
        return (this.DeviceList || []).filter(d => d && this.isAllocatableDeviceType(d.DeviceType) && !d.isBind);
      }
      const expectedType = this.roleCandidateType(selectedRole.DeviceType);
      const allCandidates = this.collectExpectedTypeCandidates(expectedType);
      return allCandidates.filter((d) => {
        if (!d || !this.isAllocatableDeviceType(d.DeviceType)) return false;
        if (d.DeviceType !== expectedType) return false;
        const occupant = this.getDeviceOccupant(d);
        if (!occupant) return true;
        // 前端显示策略：候选设备不显示“当前角色自身已绑定”的设备。
        if (occupant === selectedRole.DeviceType) return false;
        return this.canSwapBetweenRoles(selectedRole.DeviceType, occupant);
      });
    },
    panelWidth() {
      return this.DeviceTypes.length <= 3 ? '760px' : '860px';
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
  background: linear-gradient(155deg, rgba(9, 15, 30, 0.9), rgba(17, 28, 50, 0.82));
  backdrop-filter: blur(12px);
  box-sizing: border-box;
  overflow: hidden;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 14px;
  border: 1px solid rgba(153, 187, 255, 0.35);
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  padding: 14px;
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

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.panel-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.panel-title {
  color: rgba(244, 249, 255, 0.96);
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.panel-subtitle {
  color: rgba(169, 197, 255, 0.85);
  font-size: 12px;
}

.panel-close {
  color: rgba(143, 188, 255, 0.95);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(143, 188, 255, 0.4);
  background-color: rgba(143, 188, 255, 0.1);
  user-select: none;
  cursor: pointer;
}

.panel-close:hover {
  background-color: rgba(143, 188, 255, 0.18);
}

.panel-body {
  display: flex;
  gap: 14px;
  min-height: 250px;
  flex: 1;
}

.slot-column {
  width: 36%;
  min-width: 250px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.candidate-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column-title {
  color: rgba(212, 229, 255, 0.95);
  font-size: 12px;
  letter-spacing: 0.9px;
  text-transform: uppercase;
  font-weight: 700;
}

.slot-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding-right: 2px;
}

.list-hint {
  color: rgba(170, 194, 235, 0.86);
  font-size: 12px;
}

.device-list {
  list-style: none;
  margin: 0;
  padding: 4px;
  border: 1px solid rgba(125, 154, 211, 0.35);
  border-radius: 10px;
  background: rgba(7, 14, 27, 0.42);
  flex: 1;
  overflow-y: auto;
}

.device-list li {
  color: white;
  padding: 9px 10px;
  border-radius: 8px;
  margin-bottom: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
}

.device-list li:last-child {
  margin-bottom: 0;
}

.device-list li:hover {
  background-color: rgba(113, 159, 235, 0.16);
  border-color: rgba(145, 183, 241, 0.45);
}

.device-main-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.device-type-tag {
  color: rgba(193, 219, 255, 0.96);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(193, 219, 255, 0.38);
  white-space: nowrap;
}

.device-name-text {
  font-size: 13px;
  color: rgba(244, 249, 255, 0.95);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.device-empty {
  color: rgba(169, 197, 255, 0.8) !important;
  text-align: center;
  cursor: default !important;
  background: rgba(255, 255, 255, 0.02) !important;
}

.device-list li.selected {
  background-color: rgba(77, 159, 255, 0.26);
  border-color: rgba(99, 184, 255, 0.82);
}

.device-list li.occupied {
  background-color: rgba(219, 160, 74, 0.16);
  border-color: rgba(219, 160, 74, 0.38);
}

.device-list li.swappable {
  border-left: 3px solid rgba(255, 203, 124, 0.95);
}

.device-meta {
  display: inline-block;
  margin-top: 6px;
  color: rgba(221, 230, 245, 0.72);
  font-size: 12px;
}

.device-list::-webkit-scrollbar,
.slot-list::-webkit-scrollbar {
  width: 6px;
}

.device-list::-webkit-scrollbar-thumb,
.slot-list::-webkit-scrollbar-thumb {
  background: rgba(153, 187, 255, 0.35);
  border-radius: 999px;
}

@media (max-width: 820px) {
  .panel-body {
    flex-direction: column;
  }
  .slot-column {
    width: 100%;
    min-width: 0;
  }
}
</style>
