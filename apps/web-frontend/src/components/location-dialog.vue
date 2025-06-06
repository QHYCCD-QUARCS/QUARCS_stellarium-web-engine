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
        <v-text-field v-model="manualLatitude" label="Latitude" placeholder="Enter latitude"></v-text-field>
      </v-col>
      <v-col cols="4">
        <v-text-field v-model="manualLongitude" label="Longitude" placeholder="Enter longitude"></v-text-field>
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
    
  </v-container>
</v-dialog>
</template>

<script>
import LocationMgr from '@/components/location-mgr.vue'

export default {
  data: function () {
    return {
      useAutoLocation: true,
      manualLatitude: '',
      manualLongitude: '',
      locationLat: '',
      locationLon: '',
    }

  },
  computed: {
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
  },
  created() {
    this.$bus.$on('resetLocation', this.resetLocation);
    this.$bus.$on('setLocationLatAndLon', this.setLocationLatAndLon);
  },
  methods: {
    resetLocation: function (lat, lng) {
      lat = Number(lat);
      lng = Number(lng);
      if (isNaN(lat) || isNaN(lng)) {
        this.manualLatitude = '';
        this.manualLongitude = '';
        this.useAutoLocation = true;
      } else {
        this.manualLatitude = String(lat);
        this.manualLongitude = String(lng);
        this.useAutoLocation = false;
      }
      this.saveManualCoordinates();
    },
    setLocationLatAndLon: function (lat, lng) {
      this.$bus.$emit('SendConsoleLogMsg', 'setLocationLatAndLon:' + lat + ',' + lng, 'info')
      this.locationLat = lat;
      this.locationLon = lng;
      if (this.useAutoLocation) {
        this.manualLatitude = lat;
        this.manualLongitude = lng;
        // this.saveManualCoordinates();
      }
    },
    setLocation: function (loc) {
      this.$store.commit('setCurrentLocation', loc)
    },
    saveManualCoordinates: function () {
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
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'saveToConfigFile:Coordinates:'+ lat + ',' + lng);
      this.$bus.$emit('ShowPositionInfo', lat, lng);
      if (this.useAutoLocation) {
        this.useAutoLocation = false;
      }

    },
    handleAutoLocationChange: function (newVal) {
      this.$bus.$emit('SendConsoleLogMsg', 'handleAutoLocationChange:' + newVal, 'info')
      if (newVal) {
        this.$bus.$emit('SendConsoleLogMsg', '当前位置:' + this.locationLat + ',' + this.locationLon, 'info')
        let lat = parseFloat(this.locationLat.trim());
        let lng = parseFloat(this.locationLon.trim());
        this.$bus.$emit('SendConsoleLogMsg', '当前位置:' + lat + ',' + lng, 'info')
        // 执行你想要的操作
        if (isNaN(lat) || isNaN(lng)) {
          this.$bus.$emit('showMsgBox', 'Location information not obtained, please check location permissions', 'error')
          this.$bus.$emit('SendConsoleLogMsg', 'Location information not obtained, please check location permissions', 'error')
          this.useAutoLocation = false;
        }else{
          this.manualLatitude = this.locationLat;
          this.manualLongitude = this.locationLon;
          lat = parseFloat(this.manualLatitude.trim());
          lng = parseFloat(this.manualLongitude.trim());
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
          // this.$bus.$emit('AppSendMessage', 'Vue_Command', 'saveToConfigFile:Coordinates:'+ lat + ',' + lng);
          this.$bus.$emit('ShowPositionInfo', lat, lng);
          this.$bus.$emit('SendConsoleLogMsg', 'Set Current Location:' + lat + ',' + lng, 'info')
        }
      }
    },
  },
  components: { LocationMgr },
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
