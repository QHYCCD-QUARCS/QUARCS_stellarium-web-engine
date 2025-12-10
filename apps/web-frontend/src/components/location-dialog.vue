// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

<template>
<v-dialog max-width="600" v-model="$store.state.showLocationDialog">
  <v-container v-if="$store.state.showLocationDialog" class="secondary white--text">
    <v-row>
      <v-col cols="4">
        <v-text-field 
          :value="isMobile && currentKeyboardItem === 'manualLatitude' ? keyboardInputValue : manualLatitude"
          label="Latitude" 
          placeholder="Enter latitude"
          :type="isDesktop ? 'number' : 'text'"
          :inputmode="isMobile ? 'none' : ''"
          :readonly="isMobile"
          @input="!isMobile ? (manualLatitude = $event) : null"
          @focus="isMobile ? openNumberKeyboard('manualLatitude', $event) : null"
          @click="isMobile ? openNumberKeyboard('manualLatitude', $event) : null"
          @blur="isMobile ? handleNumberBlur('manualLatitude') : null"
        ></v-text-field>
      </v-col>
      <v-col cols="4">
        <v-text-field 
          :value="isMobile && currentKeyboardItem === 'manualLongitude' ? keyboardInputValue : manualLongitude"
          label="Longitude" 
          placeholder="Enter longitude"
          :type="isDesktop ? 'number' : 'text'"
          :inputmode="isMobile ? 'none' : ''"
          :readonly="isMobile"
          @input="!isMobile ? (manualLongitude = $event) : null"
          @focus="isMobile ? openNumberKeyboard('manualLongitude', $event) : null"
          @click="isMobile ? openNumberKeyboard('manualLongitude', $event) : null"
          @blur="isMobile ? handleNumberBlur('manualLongitude') : null"
        ></v-text-field>
      </v-col>
      <v-col cols="4">
        <v-spacer></v-spacer>
        <v-btn @click="saveManualCoordinates" color="primary">Save Manual Coordinates</v-btn>
      </v-col>
    </v-row>
    <v-card color="secondary" flat>
      <v-switch :label="$t('Use Autolocation')" v-model="useAutoLocation" @change="handleAutoLocationChange"></v-switch>
    </v-card>
    <location-mgr v-on:locationSelected="setLocation" :knownLocations="[]" :startLocation="$store.state.currentLocation" :realLocation="$store.state.autoDetectedLocation"></location-mgr>
    
    <!-- 数字键盘组件 -->
    <NumberKeyboard
      :visible="showNumberKeyboard"
      :allow-decimal="true"
      :allow-negative="true"
      :title="getKeyboardTitle()"
      :current-value="keyboardInputValue"
      @input="handleKeyboardInput"
      @backspace="handleKeyboardBackspace"
      @confirm="handleKeyboardConfirm"
      @close="closeNumberKeyboard"
    />
  </v-container>
</v-dialog>
</template>

<script>
import LocationMgr from '@/components/location-mgr.vue'
import NumberKeyboard from '@/components/NumberKeyboard.vue'

export default {
  components: {
    LocationMgr,
    NumberKeyboard
  },
  data: function () {
    return {
      useAutoLocation: true,
      manualLatitude: '',
      manualLongitude: '',
      locationLat: '',
      locationLon: '',
      // 数字键盘相关
      showNumberKeyboard: false,
      currentKeyboardItem: null,
      keyboardInputValue: ''
    }
  },
  computed: {
    isMobile() {
      var ua = navigator.userAgent || '';
      var touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      var uaDataMobile = null;
      if (navigator.userAgentData && typeof navigator.userAgentData.mobile !== 'undefined') {
        uaDataMobile = navigator.userAgentData.mobile;
      }
      var mobileLike = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
      return (uaDataMobile !== null ? uaDataMobile : mobileLike) && !!touch;
    },
    isDesktop() {
      return !this.isMobile;
    }
    // useAutoLocation: {
    //   get: function () {
    //     return this.$store.state.useAutoLocation
    //   },
    //   set: function (b) {
    //     this.$store.commit('setUseAutoLocation', b)
    //   }
    // }
  },
  mounted: function () {
    this.$bus.$emit('Vue_Command', 'localMessage'); // 获取位置信息
    // 检查 qtObj 是否可用
    const checkQtObjAvailability = () => {
      if (window.qtObj) {
        this.$bus.$emit('SendConsoleLogMsg', 'qtObj 已可用', 'info');
        // alert('qtObj 已可用');
        // 可以在这里做一些初始化
        this.callQt();
      } else {
        // this.$bus.$emit('SendConsoleLogMsg', 'qtObj 不可用，将在1秒后重试', 'warning');
        setTimeout(checkQtObjAvailability, 1000);
      }
    };
    
    // 延迟检查，确保页面完全加载
    setTimeout(checkQtObjAvailability, 2000);
  },
  created() {
    this.$bus.$on('resetLocation', this.resetLocation);
    this.$bus.$on('setLocationLatAndLon', this.setLocationLatAndLon);
    this.$bus.$on('isAutoLocation', this.handleAutoLocationChange);
    this.$bus.$on('sendGetLocation', this.sendGetLocation);
  },
  methods: {
    callQt() {
      try {
        if (window.qtObj) {
          const jsonStr = window.qtObj.getMyValue();
          const data = JSON.parse(jsonStr); // 解析 JSON
          this.$bus.$emit('SendConsoleLogMsg', "data:" +`Time: ${data.time},lat:${data.lat},long:${data.lon}, language: ${data.language}, WiFi: ${data.wifiname},appversion: ${data.appversion}`, 'info');  
          this.sendGetLocation(data.lat, data.lon);
          if (data.language == 'zh' || data.language == "zh") {
            // 来自 App 的语言更新（优先级：app = 2）
            this.$bus.$emit('ClientLanguage', 'cn', 'app');
            this.$bus.$emit('SendConsoleLogMsg', 'ClientLanguage(app): cn', 'info');
          } else {
            this.$bus.$emit('ClientLanguage', 'en', 'app');
            this.$bus.$emit('SendConsoleLogMsg', 'ClientLanguage(app): en', 'info');
          }
          this.$bus.$emit('appVersion', data.appversion);
          this.$bus.$emit('AppSendMessage', 'Vue_Command', 'localMessage:'+ data.lat + ':' + data.lon+':'+data.language +':'+data.wifiname);
        } else {
          this.$bus.$emit('SendConsoleLogMsg', 'qtObj 不可用', 'error');
        }
      } catch (error) {
        this.$bus.$emit('SendConsoleLogMsg', `错误信息: ${error.message}`, 'error');
        this.$bus.$emit('SendConsoleLogMsg', `错误堆栈: ${error.stack}`, 'error');
      }
    },
 
    resetLocation: function (lat, lng,isAuto) {    // 手动修正位置
      if (isAuto) return;
      lat = Number(lat);
      lng = Number(lng);
      // console.log('触发位置更新resetLocation:', lat, lng)
      if (isNaN(lat) || isNaN(lng)) {
        this.manualLatitude = '';
        this.manualLongitude = '';
      } else {
        this.manualLatitude = String(lat);
        this.manualLongitude = String(lng);
      }
      this.saveManualCoordinates();
 
    },
    setLocationLatAndLon: function (lat, lng) {    // 自动修正位置
      // this.$bus.$emit('SendConsoleLogMsg', 'setLocationLatAndLon:' + lat + ',' + lng, 'info')
      this.locationLat = lat;
      this.locationLon = lng;
      if (this.useAutoLocation) {
        this.manualLatitude = lat;
        this.manualLongitude = lng;
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'currectLocation:'+ lat + ':' + lng);
      }
      // this.$bus.$emit('SendConsoleLogMsg', '3------------修改当前本地位置:'+ lat + ':' + lng);
    },
    setLocation: function (loc) {
      this.$store.commit('setCurrentLocation', loc)
    },
    saveManualCoordinates: function () {
      if (this.useAutoLocation) {
        this.useAutoLocation = false;
      }
      const lat = parseFloat(this.manualLatitude.trim());
      const lng = parseFloat(this.manualLongitude.trim());
      this.$bus.$emit('PolarPointAltitude', lat)
      this.$bus.$emit('SendConsoleLogMsg', 'Set Current Location:' + lat + ',' + lng, 'info')
      const loc = {
        short_name: 'Unknown',
        country: 'Unknown',
        lng: lng,
        lat: lat,
        alt: 0, 
        accuracy: 0, 
        street_address: ''
      }
      this.setLocation(loc)
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'saveToConfigFile:Coordinates:'+ lat + ',' + lng + ',' + this.useAutoLocation);
      this.$bus.$emit('ShowPositionInfo', lat, lng);
      this.$bus.$emit('updateMapPosition', lat,lng)


    },
    handleAutoLocationChange: function (newVal) {
      // this.$bus.$emit('SendConsoleLogMsg', 'handleAutoLocationChange:' + newVal, 'info')
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'saveToConfigFile:isAutoLocation:' + newVal)
      if (newVal) {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'reGetLocation');
        // this.$bus.$emit('SendConsoleLogMsg', '当前位置:' + this.locationLat + ',' + this.locationLon, 'info')
        
      }
      const ConfigLat = parseFloat(this.manualLatitude.trim());
      const ConfigLng = parseFloat(this.manualLongitude.trim());
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'saveToConfigFile:Coordinates:'+ ConfigLat + ',' + ConfigLng + ',' + this.useAutoLocation);
      
    },
    sendGetLocation: function (newlat, newlng) {
      try {
        this.locationLat = String(newlat || '');
        this.locationLon = String(newlng || '');
        // 确保转换为字符串后再使用trim()
        let lat = parseFloat(String(this.locationLat || '').trim());
        let lng = parseFloat(String(this.locationLon || '').trim());
        this.$bus.$emit('SendConsoleLogMsg', 'sendGetLocation:' + lat + ',' + lng, 'info')
        
        if (isNaN(lat) || isNaN(lng)) {
          this.$bus.$emit('showMsgBox', 'Location information not obtained, please check location permissions', 'error')
          this.$bus.$emit('SendConsoleLogMsg', 'Location information not obtained, please check location permissions', 'error')
        } else {
          this.manualLatitude = String(this.locationLat);
          this.manualLongitude = String(this.locationLon);
          lat = parseFloat(String(this.manualLatitude).trim());
          lng = parseFloat(String(this.manualLongitude).trim());
          this.$bus.$emit('PolarPointAltitude', lat)
          
          const loc = {
            short_name: 'Unknown',
            country: 'Unknown',
            lng: lng,
            lat: lat,
            alt: 0, 
            accuracy: 0, 
            street_address: ''
          }
          this.setLocation(loc)
          this.$bus.$emit('ShowPositionInfo', lat, lng);
          this.$bus.$emit('AppSendMessage', 'Vue_Command', 'currectLocation:'+ lat + ':' + lng);
          this.$bus.$emit('SendConsoleLogMsg', 'Set Current Location:' + lat + ',' + lng, 'info')
        }
      } catch (error) {
        this.$bus.$emit('SendConsoleLogMsg', `位置处理错误: ${error.message}`, 'error');
      }
    },
    // 数字键盘相关方法
    getKeyboardTitle() {
      if (this.currentKeyboardItem === 'manualLatitude') {
        return this.$t('latitude') || 'Latitude';
      } else if (this.currentKeyboardItem === 'manualLongitude') {
        return this.$t('longitude') || 'Longitude';
      }
      return '';
    },
    openNumberKeyboard(item, event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      // 如果点击的是同一个输入框，且键盘已打开，不处理
      if (this.currentKeyboardItem === item && this.showNumberKeyboard) {
        return;
      }
      
      // 如果点击的是不同的输入框，直接切换
      if (this.currentKeyboardItem !== item && this.showNumberKeyboard) {
        this.closeNumberKeyboard();
        this.$nextTick(() => {
          this.currentKeyboardItem = item;
          this.keyboardInputValue = String(this[item] || '');
          this.showNumberKeyboard = true;
        });
        return;
      }
      
      if (event && event.target) {
        event.target.blur();
        setTimeout(() => {
          this.currentKeyboardItem = item;
          this.keyboardInputValue = String(this[item] || '');
          this.showNumberKeyboard = true;
        }, 30);
      } else {
        this.currentKeyboardItem = item;
        this.keyboardInputValue = String(this[item] || '');
        this.showNumberKeyboard = true;
      }
    },
    closeNumberKeyboard() {
      if (this.currentKeyboardItem) {
        const item = this.currentKeyboardItem;
        if (this.keyboardInputValue !== String(this[item] || '')) {
          const value = parseFloat(this.keyboardInputValue);
          if (!isNaN(value)) {
            this[item] = value;
          }
        }
      }
      this.showNumberKeyboard = false;
      setTimeout(() => {
        this.currentKeyboardItem = null;
        this.keyboardInputValue = '';
      }, 150);
    },
    handleKeyboardInput(key) {
      if (!this.currentKeyboardItem) return;
      let current = this.keyboardInputValue || '';
      
      if (key === '-') {
        if (current.startsWith('-')) {
          current = current.substring(1);
        } else {
          current = '-' + current;
        }
        this.keyboardInputValue = current;
        return;
      }
      
      if (key === '.') {
        if (current.includes('.')) return;
        if (current === '' || current === '-') {
          current = current + '0.';
        } else {
          current = current + '.';
        }
        this.keyboardInputValue = current;
        return;
      }
      
      if (/[0-9]/.test(key)) {
        if (current === '0') {
          current = key;
        } else {
          current = current + key;
        }
        this.keyboardInputValue = current;
      }
    },
    handleKeyboardBackspace() {
      if (!this.currentKeyboardItem) return;
      let current = this.keyboardInputValue || '';
      if (current.length > 0) {
        this.keyboardInputValue = current.substring(0, current.length - 1);
      }
    },
    handleKeyboardConfirm() {
      if (!this.currentKeyboardItem) return;
      const item = this.currentKeyboardItem;
      let value = this.keyboardInputValue;
      
      if (value === '' || value === '-') {
        value = this[item] || 0;
      } else {
        value = parseFloat(value);
        if (isNaN(value)) {
          value = this[item] || 0;
        }
      }
      
      this[item] = value;
      this.closeNumberKeyboard();
    },
    handleNumberBlur(item) {
      setTimeout(() => {
        if (this.currentKeyboardItem === item && !this.showNumberKeyboard) {
          // 可以在这里添加验证逻辑
        }
      }, 200);
    }
  },
  watch: {
    useAutoLocation: function (newVal, oldVal) {
      // 这个函数将在 useAutoLocation 改变时被调用
      // newVal 是 useAutoLocation 的新值
      // oldVal 是 useAutoLocation 的旧值
      console.log('useAutoLocation changed from', oldVal, 'to', newVal);
    }
  }
}
</script>

<style>
</style>
