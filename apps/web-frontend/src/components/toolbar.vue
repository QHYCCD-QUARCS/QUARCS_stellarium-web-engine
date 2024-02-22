// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

<template>
  <div id="toolbar-image">
    <v-toolbar class="transparent" dense>
      <v-app-bar-nav-icon @click="toggleNavigationDrawer"></v-app-bar-nav-icon>
      <img class="tbtitle hidden-xs-only" id="stellarium-web-toolbar-logo" src="@/assets/images/logo.svg" width="30" height="30" alt="Stellarium Web Logo"/>
      <span class="tbtitle">Q.U.A.R.C.S</span>
      <v-spacer></v-spacer>
      <target-search></target-search>
      <v-spacer></v-spacer>
      <div v-if="$store.state.showFPS" class="subheader grey--text pr-2" style="user-select: none;">FPS {{ $store.state.stel ? $store.state.stel.fps.toFixed(1) : '?' }}</div>
      <div class="subheader grey--text" style="user-select: none;">FOV {{ fov }}</div>
      <!-- <v-btn class="transparent" v-if="!$store.state.showSidePanel" to="/p">{{ $t('Observe') }}<v-icon>mdi-chevron-down</v-icon></v-btn> -->
      <v-menu v-if="$store.state.showTimeButtons" :close-on-content-click="false" transition="v-slide-y-transition" offset-y top left>
        <template v-slot:activator="{ on }">
          <!-- <v-btn large class="tmenubt" color="secondary" v-on="on"> -->
          <button class="TimerPickBtn" v-on="on">
            <v-icon class="hidden-sm-and-up">mdi-clock-outline</v-icon>
            <span class="hidden-xs-only">
              <div class="text-subtitle-2">{{ time }}</div>
              <div class="text-caption">{{ date }}</div>
            </span>
          </button>
        </template>
        <date-time-picker v-model="pickerDate" :location="$store.state.currentLocation"></date-time-picker>
      </v-menu>
    </v-toolbar>
  </div>
</template>

<script>

import TargetSearch from '@/components/target-search'
import DateTimePicker from '@/components/date-time-picker.vue'
import Moment from 'moment'

export default {
  data: function () {
    return {
    }
  },
  computed: {
    fov: function () {
      if (!this.$store.state.stel) return '-'
      const fov = this.$store.state.stel.fov * 180 / Math.PI
      return fov.toPrecision(3) + '°'
    },

    time: {
      get: function () {
        return this.getLocalTime().format('HH:mm:ss')
      }
    },
    date: {
      get: function () {
        return this.getLocalTime().format('YYYY-MM-DD')
      }
    },
    pickerDate: {
      get: function () {
        const t = this.getLocalTime()
        t.milliseconds(0)
        return t.format()
      },
      set: function (v) {
        const m = Moment(v)
        m.local()
        m.milliseconds(this.getLocalTime().milliseconds())
        this.$stel.core.observer.utc = m.toDate().getMJD()
      }
    }
  },
  methods: {
    toggleNavigationDrawer: function () {
      this.$store.commit('toggleBool', 'showNavigationDrawer')
    },

    getLocalTime: function () {
      var d = new Date()
      d.setMJD(this.$store.state.stel.observer.utc)
      const m = Moment(d)
      m.local()
      return m
    },

  },
  components: { TargetSearch, DateTimePicker }
}
</script>

<style>
#toolbar-image {
  background: url("../assets/images/header.png") center;
  background-position-x: 55px;
  background-position-y: 0px;
  height: 48px;
  z-index: 1;
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  backdrop-filter: blur(5px); /* 添加毛玻璃效果 */
  background-color: rgba(0, 0, 0, 0.1);
}

#stellarium-web-toolbar-logo {
  margin-right: 10px;
  margin-left: 30px;
}

@media all and (max-width: 600px) {
  .tmenubt {
    min-width: 30px;
  }
}

.tbtitle {
  font-size: 20px;
  font-weight: 500;
  user-select: none;
}

.TimerPickBtn {
    /* margin: 0.2rem; */
    padding: 0.2rem 0.6rem;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s ease;

    font-size: 14px;

    backdrop-filter: blur(5px); /* 添加毛玻璃效果 */
    background-color: rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(200, 200, 200, 0.8);
    text-align: center; /* 文本水平居中对齐 */
}

</style>
