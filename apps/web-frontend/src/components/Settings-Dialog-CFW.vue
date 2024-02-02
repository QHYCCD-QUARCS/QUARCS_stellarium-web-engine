<template>
  <v-dialog max-width='300' v-model="$store.state.showDeviceSettingsDialog_CFW"> <!-- showDeviceSettingsDialog_Mount -->
    <v-card v-if="$store.state.showDeviceSettingsDialog_CFW" class="secondary white--text">
      <v-card-title>
        <div class="text-h5">{{ $t('CFW Settings') }}</div>
      </v-card-title>
      <v-card-text>
        <!-- 设备连接的菜单内容 -->
        <div v-if="activeMenu === 'connection'">
          <v-select label="选择驱动" :items="drivers" item-text="label" item-value="value" v-model="selectedDriver"></v-select>
          <v-spacer></v-spacer>
          <v-btn @click="confirmDriver">确定</v-btn>
          <v-btn @click="connectIndiServer">连接indiServer</v-btn>
          <v-select label="选择设备" :items="devices" v-model="selectedDevice"></v-select>
          <v-spacer></v-spacer>
          <v-btn @click="confirmDevice">确定</v-btn>
        </div>
        <!-- 设备配置的菜单内容 -->
        <div v-if="activeMenu === 'configuration'">
          <!-- 设备配置的内容，您可以根据需要添加表单元素 -->
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn class="blue--text darken-1" text @click.native="closeDialog">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
  
  <script>
  export default {
    data: function () {
      return {
        activeMenu: 'connection', // 默认显示'设备连接'菜单内容
        // 添加您的数据模型
        drivers: [], // 驱动选项数组
        selectedDriver: null, // 选中的驱动
        devices: [], // 设备选项数组
        selectedDevice: null, // 选中的设备
      }
    },
    methods: {
      AddDrivers(option) {
        this.drivers.push(option);
      },
      confirmDriver() {
        // 确定驱动的逻辑
      },
      connectIndiServer() {
        // 连接indiServer的逻辑
      },
      confirmDevice() {
        // 确定设备的逻辑
      },
      closeDialog() {
        this.$store.state.showDeviceSettingsDialog_CFW = false;
      }
    },
    // 计算属性和其他选项保持不变
  }
  </script>
  
  <style>
  /* 您的CSS样式 */
  </style>
  