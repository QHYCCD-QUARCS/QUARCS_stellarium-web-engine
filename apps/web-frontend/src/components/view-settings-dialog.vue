// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

<template>
<v-dialog max-width='300' v-model="$store.state.showViewSettingsDialog">
<v-card v-if="$store.state.showViewSettingsDialog" style="backdrop-filter: blur(5px); background-color: rgba(64, 64, 64, 0.5);">
  <v-card-title><div class="text-h5">{{ $t('View settings') }}</div></v-card-title>
  <v-card-text>
    <v-checkbox hide-details :label="$t('Milky Way')" v-model="milkyWayOn"></v-checkbox>
    <v-checkbox hide-details :label="$t('DSS')" v-model="dssOn"></v-checkbox>
    <v-checkbox hide-details :label="$t('Meridian Line')" v-model="meridianOn"></v-checkbox>
    <v-checkbox hide-details :label="$t('Ecliptic Line')" v-model="eclipticOn"></v-checkbox>
    <v-checkbox hide-details :label="$t('High FPS')" v-model="highfpsOn"></v-checkbox>
    <v-select v-model="selectedLanguage" :items="languages" :label="$t('Select Language')" @change="switchLanguage"></v-select>

  </v-card-text>
  <v-card-actions>
    <v-spacer></v-spacer><v-btn class="blue--text darken-1" text @click.native="$store.state.showViewSettingsDialog = false">Close</v-btn>
  </v-card-actions>
</v-card>
</v-dialog>
</template>

<script>

export default {
  data: function () {
    return {
      HighFPSMode: false,
      selectedLanguage: this.$i18n.locale,
      languages: [
        { text: 'English', value: 'en' },
        { text: 'Simplified Chinese', value: 'cn' }
      ]
    }
  },
  created() { 
    this.$bus.$on('ClientLanguage', this.switchLanguage);
    this.$bus.$on('HighFPSMode', this.switchHighFPSMode);
  },
  methods: {
    // 切换语言的方法
    switchLanguage(lang) {
      // this.$bus.$emit('SendConsoleLogMsg', "当前语言:" + lang, 'info');
      this.$i18n.locale = lang;
      this.selectedLanguage = this.$i18n.locale;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'saveToConfigFile:ClientLanguage:'+ lang);
    },
    switchHighFPSMode(Value) {
      if(Value === 'true'){
        window.setHighFrameRate(true);
        this.HighFPSMode = true;
      } else {
        window.setHighFrameRate(false);
        this.HighFPSMode = false;
      }
      console.log('setHighFPSMode:', this.HighFPSMode);
    }
  },
  computed: {
    dssOn: {
      get: function () {
        return this.$store.state.stel.dss.visible
      },
      set: function (newValue) {
        this.$stel.core.dss.visible = newValue
      }
    },
    milkyWayOn: {
      get: function () {
        return this.$store.state.stel.milkyway.visible
      },
      set: function (newValue) {
        this.$stel.core.milkyway.visible = newValue
      }
    },
    meridianOn: {
      get: function () {
        return this.$store.state.stel.lines.meridian.visible
      },
      set: function (newValue) {
        this.$stel.core.lines.meridian.visible = newValue
      }
    },
    eclipticOn: {
      get: function () {
        return this.$store.state.stel.lines.ecliptic.visible
      },
      set: function (newValue) {
        this.$stel.core.lines.ecliptic.visible = newValue
      }
    },
    highfpsOn: {
      get: function () {
        return this.HighFPSMode
      },
      set: function (newValue) {
        window.setHighFrameRate(newValue)
        this.HighFPSMode = newValue
        console.log('Set High FPS:', this.HighFPSMode)
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'saveToConfigFile:HighFPSMode:'+ newValue)
      }
    }
  }
}
</script>

<style>
.input-group {
  margin: 0px;
}
</style>
