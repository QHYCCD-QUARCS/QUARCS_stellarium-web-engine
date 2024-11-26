<template>
  <div :class="{ 'DevicePicker': !PickerSelect, 'DevicePicker-select': PickerSelect, 'DevicePicker-bind': DeviceBind }"
       :style="{ width: width + 'px', height: height + 'px' }"
       @click="togglePicker">

    <span class="device-type" style="position: absolute; top: 10px; left: 8px; color: rgba(255, 255, 255, 0.7); user-select: none;"> {{ DeviceType }}</span>

    <span class="device-name" style="position: absolute; bottom: 8px; left: 8px; color: rgba(255, 255, 255, 0.7); user-select: none;"> {{ DeviceName }}</span>
  
    <button v-show="!OnCamera" @click="DeviceSwitch" class="btn-Connect"> {{ DeviceBind ? '[Unbind]' : '[Bind]' }} </button>
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
  data() {
    return {
      width: 150,
      height: 60,
      OnCamera: false,
    };
  },
  mounted() {
    // 检查 DeviceName 是否包含 "on camera"
    if (this.DeviceName.toLowerCase().includes("on camera")) {
      this.OnCamera = true;
    }
  },
  methods: {
    togglePicker() {
      if(!this.DeviceBind) {
        console.log('PickerIndex:', this.PickerIndex);
        this.$bus.$emit('SelectPickerIndex', this.PickerIndex);
      }
    },
    DeviceSwitch() {
      console.log('Device Connect:', this.DeviceBind);
      if(!this.DeviceBind) {
        this.$bus.$emit('BindDeviceIndex', this.PickerIndex);
      } else {
        this.$bus.$emit('UnBindDeviceIndex', this.PickerIndex);
      }
    }
  }
}
</script>

<style scoped>
.DevicePicker {
  pointer-events: auto;
  position: fixed;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 5px;
  box-sizing: border-box;
  /* transition: background-color 0.1s ease; */
  
}


.DevicePicker-select {
  pointer-events: auto;
  position: fixed;
  background-color: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 5px;
  box-sizing: border-box;
  /* transition: background-color 0.1s ease; */
}

.DevicePicker-bind {
  pointer-events: auto;
  position: fixed;
  background-color: rgba(0, 255, 0, 0.3);
  /* background: linear-gradient(to right, rgba(255, 0, 0, 0.5) 30%, rgba(75, 155, 250, 0.5) 70%); */
  backdrop-filter: blur(5px);
  border-radius: 5px;
  box-sizing: border-box;
  /* transition: background-color 0.3s ease; */
}

.device-type {
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.device-name {
  font-size: 10px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.btn-Connect {
  position: absolute;
  width: 50px;
  height: 30px;
  top: 7px;
  right: 7px;

  user-select: none;
  backdrop-filter: blur(5px);
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.8);
}
</style>
