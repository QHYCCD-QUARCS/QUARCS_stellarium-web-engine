import Vue from 'vue'

const initialDevices = () => ({
  MainCamera: { connected: false, running: false, features: [] },
  GuiderCamera: { connected: false, running: false, features: [] },
  Focuser: { connected: false, running: false, features: [] },
  Mount: { connected: false, running: false, features: [] },
  PoleCamera: { connected: false, running: false, features: [] },
  CFW: { connected: false, running: false, features: [] },
})

// 功能分组：用于跨设备互斥检测
const FeatureGroups = {
  AutoPolarAlignment: 'camera',
  Capture: 'camera',
  CaptureLoop: 'camera',
  ScheduleCapture: 'camera',
  AutoFocus: 'camera',
  FocuserROILoop: 'camera',
}

function ensureDevice(state, device) {
  if (!state.devices[device]) {
    Vue.set(state.devices, device, { connected: false, running: false, features: [] })
  }
}

export default {
  namespaced: true,
  state: () => ({
    devices: initialDevices()
  }),
  getters: {
    getDevice: (state) => (device) => {
      return state.devices[device] || { connected: false, running: false, features: [] }
    },
    getDeviceFeatures: (state, getters) => (device) => {
      return (getters.getDevice(device).features || []).slice()
    },
    canUseDevice: (state, getters) => (device, feature) => {
      const d = getters.getDevice(device)
      const features = new Set(d.features || [])
      // 先做跨设备分组互斥检测（相机类互斥）
      const group = FeatureGroups[feature]
      if (group) {
        const busyFeatures = []
        for (const devName of Object.keys(state.devices)) {
          const dev = state.devices[devName]
          if (!dev || !Array.isArray(dev.features)) continue
          for (const f of dev.features) {
            if (f !== feature && FeatureGroups[f] === group) {
              busyFeatures.push(f)
            }
          }
        }
        if (busyFeatures.length > 0) {
          return {
            allowed: false,
            reasonKey: 'CameraOpsBusy',
            reasonParams: { featureKeys: Array.from(new Set(busyFeatures)) }
          }
        }
      }
      // 再做同设备上的互斥检测
      if (features.size > 0 && !features.has(feature)) {
        return { 
          allowed: false, 
          reasonKey: 'DeviceBusyWithFeatures',
          reasonParams: { deviceKey: device, featureKeys: Array.from(features) }
        }
      }
      return { allowed: true }
    },
  },
  mutations: {
    SET_DEVICE_CONNECTED(state, { device, connected }) {
      ensureDevice(state, device)
      state.devices[device].connected = !!connected
    },
    SET_DEVICE_RUNNING(state, { device, running }) {
      ensureDevice(state, device)
      state.devices[device].running = !!running
    },
    ADD_FEATURE(state, { device, feature }) {
      ensureDevice(state, device)
      const list = state.devices[device].features
      if (!list.includes(feature)) {
        list.push(feature)
      }
      state.devices[device].running = true
    },
    REMOVE_FEATURE(state, { device, feature }) {
      ensureDevice(state, device)
      const list = state.devices[device].features
      const idx = list.indexOf(feature)
      if (idx !== -1) list.splice(idx, 1)
      if (list.length === 0) {
        state.devices[device].running = false
      }
    },
    CLEAR_FEATURES(state, { device }) {
      ensureDevice(state, device)
      state.devices[device].features = []
      state.devices[device].running = false
    },
  },
  actions: {
    startFeature({ commit }, { devices, feature }) {
      (devices || []).forEach((d) => {
        commit('ADD_FEATURE', { device: d, feature })
      })
    },
    stopFeature({ commit }, { devices, feature }) {
      (devices || []).forEach((d) => {
        commit('REMOVE_FEATURE', { device: d, feature })
      })
    },
  }
}


