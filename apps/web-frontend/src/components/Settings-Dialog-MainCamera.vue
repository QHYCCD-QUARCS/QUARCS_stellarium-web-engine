<template>
  <v-dialog max-width='300' v-model="$store.state.showDeviceSettingsDialog_MainCamera"> <!-- showDeviceSettingsDialog_Mount -->
    <v-card v-if="$store.state.showDeviceSettingsDialog_MainCamera" class="secondary white--text">
      <v-card-title>
        <div class="text-h5">{{ $t('MainCamera Settings') }}</div>
        <div class="button-container">
          <v-btn @click="SwitchPage" class="button-container">切换页面</v-btn>
        </div>
      </v-card-title>
      <v-card-text>
        <!-- 设备连接的菜单内容 -->
        <div v-if="activeMenu === 'connection'">
          <v-select label="选择驱动" :items="drivers" item-text="label" item-value="value" v-model="selectedDriver"></v-select>
          <v-spacer></v-spacer>
          <v-btn @click="confirmDriver">确定</v-btn>
          <!-- <v-btn @click="connectIndiServer">连接indiServer</v-btn> -->
          <v-select label="选择设备" :items="devices" item-text="label" item-value="value" v-model="selectedDevice"></v-select>
          <v-spacer></v-spacer>
          <v-btn @click="confirmDevice">确定</v-btn>
        </div>
        <!-- 设备配置的菜单内容 -->
        <div v-if="activeMenu === 'configuration'">
          <!-- 设备配置的内容，您可以根据需要添加表单元素 -->
          <div v-for="(item, index) in configurationItems" :key="index">
           <v-text-field v-model="item.value" :label="item.label"></v-text-field>
           <v-btn @click="confirmConfiguration(item)">确定</v-btn>
          </div>
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

        configurationItems: [
          { label: 'Chip Width (mm)' , value: '' },
          { label: 'Chip Height (mm)' , value: '' },
          { label: 'Focal Length (mm)' , value: '' },
          { label: 'ImageGainR' , value: '' },
          { label: 'ImageGainB' , value: '' },
          { label: 'Offset' , value: '' },
          { label: 'ExpTime [1]' , value: '' },
          { label: 'ExpTime [2]' , value: '' },
          { label: 'ExpTime [3]' , value: '' },
          { label: 'ExpTime [4]' , value: '' },
          { label: 'ExpTime [5]' , value: '' },
          { label: 'ExpTime [6]' , value: '' },
          { label: 'ExpTime [7]' , value: '' },
          { label: 'ExpTime [8]' , value: '' },
          { label: 'ExpTime [9]' , value: '' },
          // 在这里添加更多的配置项
        ],

      }
    },
    created() {
      this.$bus.$on('CurrentExpTimeList', this.CurrentExpTimeList);
    },
    methods: {
      AddDrivers(option) {
        this.drivers.push(option);
      },
      AddDevices(option) {
        this.devices.push(option);
      },
      confirmDriver() {
        // 确定驱动的逻辑
        console.log("QHYCCD | confirmDriver: ", this.selectedDriver);
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ConfirmIndiDriver:'+this.selectedDriver);
      },
      connectIndiServer() {
        // 连接indiServer的逻辑

      },
      confirmDevice() {
        // 确定设备的逻辑
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ConfirmIndiDevice:'+this.selectedDevice);
        this.$bus.$emit('AppUpdateDevices', 'MainCamera', this.selectedDevice);
      },
      closeDialog() {
        this.$store.state.showDeviceSettingsDialog_MainCamera = false;
      },
      confirmConfiguration(item) {
        // 在这里处理确认按钮的逻辑，可以访问item.value来获取输入框的值
        console.log(`QHYCCD | confirmConfiguration: `, item.label, item.value);
        // this.$bus.$emit('AppSendMessage', 'Vue_Command', item.label+':'+item.value);
        this.$bus.$emit(item.label, item.label+':'+item.value);
      },
      SwitchPage() {
        if (this.activeMenu === 'connection') { this.activeMenu = 'configuration'; }
        else { this.activeMenu = 'connection'; }
      },
      CurrentExpTimeList(index, value) {
        const expTimeIndex = this.configurationItems.findIndex(item => item.label === 'ExpTime [' + (index + 1) + ']');
        if (expTimeIndex !== -1) { // 确保找到了对应的配置项
          // 更新 ExpTime1 配置项的值
          this.configurationItems[expTimeIndex].value = value;
        } else {
          console.error('ExpTime [' + index + '] configuration item not found.');
        }
      }

    },
    // 计算属性和其他选项保持不变
  }
  </script>
  
  <style>
  /* 您的CSS样式 */
  </style>
  