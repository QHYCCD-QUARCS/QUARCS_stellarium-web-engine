<template>
  <div :class="{ 'DevicePicker': true, 'DevicePicker-select': PickerSelect, 'DevicePicker-bind': DeviceBind }"
       @click="togglePicker"
       data-testid="dp-picker"
       :data-state="DeviceBind ? 'bound' : (PickerSelect ? 'selected' : 'normal')"
       :data-index="PickerIndex">
    <div class="picker-top">
      <span class="device-type" data-testid="dp-device-type">{{ DeviceType }}</span>
      <span class="device-state">{{ DeviceBind ? $t('DevicePicker_State_Bound') : (PickerSelect ? $t('DevicePicker_State_Selected') : $t('DevicePicker_State_Idle')) }}</span>
    </div>
    <span class="device-name" data-testid="dp-device-name">
      {{ DeviceName || $t('DevicePicker_NoDeviceBound') }}
    </span>
  </div>
</template>

<script>
export default {
  name: 'DevicePicker',
  props: {
    DeviceType: {
      type: String,
      default: ''
    },
    DeviceName: {
      type: String,
      default: ''
    },
    PickerSelect: {
      type: Boolean,
      default: false
    },
    PickerIndex: {
      type: Number,
      default: 0
    },
    DeviceBind: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    togglePicker() {
      console.log('PickerIndex:', this.PickerIndex);
      this.$bus.$emit('SelectPickerIndex', this.PickerIndex);
    }
  }
}
</script>

<style scoped>
.DevicePicker {
  pointer-events: auto;
  position: relative;
  min-height: 86px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: linear-gradient(145deg, rgba(17, 26, 42, 0.88), rgba(36, 48, 71, 0.62));
  backdrop-filter: blur(8px);
  box-sizing: border-box;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.DevicePicker-select {
  border-color: rgba(102, 225, 255, 0.95);
  box-shadow: 0 0 0 1px rgba(102, 225, 255, 0.25), 0 8px 24px rgba(26, 42, 88, 0.35);
  transform: translateY(-1px);
}

.DevicePicker-bind {
  border-color: rgba(122, 243, 168, 0.95);
  background: linear-gradient(145deg, rgba(18, 43, 38, 0.88), rgba(29, 81, 71, 0.66));
}

.DevicePicker:hover {
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-1px);
}

.picker-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.device-type {
  color: rgba(255, 255, 255, 0.92);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.device-state {
  color: rgba(198, 217, 255, 0.95);
  font-size: 11px;
  padding: 2px 8px;
  border: 1px solid rgba(198, 217, 255, 0.35);
  border-radius: 999px;
  white-space: nowrap;
}

.device-name {
  color: rgba(224, 236, 255, 0.8);
  font-size: 12px;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

</style>
