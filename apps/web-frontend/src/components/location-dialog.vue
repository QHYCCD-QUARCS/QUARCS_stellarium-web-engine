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
    <v-card color="secondary" flat>
      <v-switch :label="$t('Use Autolocation')" v-model="useAutoLocation"></v-switch>
    </v-card>
    <location-mgr v-on:locationSelected="setLocation" :knownLocations="[]" :startLocation="$store.state.currentLocation" :realLocation="$store.state.autoDetectedLocation"></location-mgr>
    <v-row>
      <v-col cols="6">
        <v-text-field v-model="manualLatitude" label="Latitude" placeholder="Enter latitude"></v-text-field>
      </v-col>
      <v-col cols="6">
        <v-text-field v-model="manualLongitude" label="Longitude" placeholder="Enter longitude"></v-text-field>
      </v-col>
    </v-row>
    <v-btn @click="saveManualCoordinates" color="primary">Save Manual Coordinates</v-btn>
  </v-container>
</v-dialog>
</template>

<script>
import LocationMgr from '@/components/location-mgr.vue'

export default {
  data: function () {
    return {
      manualLatitude: '',
      manualLongitude: ''
    }

  },
  computed: {
    useAutoLocation: {
      get: function () {
        return this.$store.state.useAutoLocation
      },
      set: function (b) {
        this.$store.commit('setUseAutoLocation', b)
      }
    }
  },
  mounted: function () {

  },
  created() {
    this.$bus.$on('resetLocation', this.resetLocation);
  },
  methods: {
    resetLocation: function (lat, lng) {
      this.manualLatitude = lat;
      this.manualLongitude = lng;
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
    },

  },
  components: { LocationMgr }
}
</script>

<style>
</style>
