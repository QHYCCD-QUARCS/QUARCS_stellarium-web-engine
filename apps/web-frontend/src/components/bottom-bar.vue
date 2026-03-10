// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

<template>
  <div
    class="btn-bar"
    style="position: absolute; display:flex; align-items: flex-end;"
    data-testid="bb-btnbar"
  >
    <!-- left spacer -->
    <v-spacer data-testid="bb-spacer-left"></v-spacer>

    <bottom-button
      data-testid="bb-btn-constellations-lines"
      :data-state="$store.state.stel.constellations.lines_visible ? 'on' : 'off'"
      :label="$t('Constellations')"
      v-if="$store.state.showConstellationsLinesButton !== false"
      :img="require('@/assets/images/btn-cst-lines.svg')"
      img_alt="Constellations Button"
      :toggled="$store.state.stel.constellations.lines_visible"
      @clicked="(b) => { $stel.core.constellations.lines_visible = b; $stel.core.constellations.labels_visible = b }"
    >
    </bottom-button>

    <bottom-button
      data-testid="bb-btn-constellations-art"
      :data-state="$store.state.stel.constellations.images_visible ? 'on' : 'off'"
      :label="$t('Constellations Art')"
      v-if="$store.state.showConstellationsArtButton !== false"
      :img="require('@/assets/images/btn-cst-art.svg')"
      img_alt="Constellations Art Button"
      :toggled="$store.state.stel.constellations.images_visible"
      @clicked="(b) => { $stel.core.constellations.images_visible = b }"
    >
    </bottom-button>

    <bottom-button
      data-testid="bb-btn-atmosphere"
      :data-state="$store.state.stel.atmosphere.visible ? 'on' : 'off'"
      :label="$t('Atmosphere')"
      v-if="$store.state.showAtmosphereButton !== false"
      :img="require('@/assets/images/btn-atmosphere.svg')"
      img_alt="Atmosphere Button"
      :toggled="$store.state.stel.atmosphere.visible"
      @clicked="(b) => { $stel.core.atmosphere.visible = b }"
    >
    </bottom-button>

    <bottom-button
      data-testid="bb-btn-landscape"
      :data-state="$store.state.stel.landscapes.visible ? 'on' : 'off'"
      :label="$t('Landscape')"
      v-if="$store.state.showLandscapeButton !== false"
      :img="require('@/assets/images/btn-landscape.svg')"
      img_alt="Landscape Button"
      :toggled="$store.state.stel.landscapes.visible"
      @clicked="(b) => { $stel.core.landscapes.visible = b }"
    >
    </bottom-button>

    <bottom-button
      data-testid="bb-btn-grid-azimuthal"
      :data-state="$store.state.stel.lines.azimuthal.visible ? 'on' : 'off'"
      :label="$t('Azimuthal Grid')"
      v-if="$store.state.showAzimuthalGridButton !== false"
      :img="require('@/assets/images/btn-azimuthal-grid.svg')"
      img_alt="Azimuthal Button"
      :toggled="$store.state.stel.lines.azimuthal.visible"
      @clicked="(b) => { $stel.core.lines.azimuthal.visible = b }"
    >
    </bottom-button>

    <bottom-button
      data-testid="bb-btn-grid-equatorial-jnow"
      :data-state="$store.state.stel.lines.equatorial_jnow.visible ? 'on' : 'off'"
      :label="$t('Equatorial Grid')"
      v-if="$store.state.showEquatorialGridButton !== false"
      :img="require('@/assets/images/btn-equatorial-grid.svg')"
      img_alt="Equatorial Grid Button"
      :toggled="$store.state.stel.lines.equatorial_jnow.visible"
      @clicked="(b) => { $stel.core.lines.equatorial_jnow.visible = b }"
    >
    </bottom-button>

    <bottom-button
      data-testid="bb-btn-grid-equatorial-j2000"
      :data-state="$store.state.stel.lines.equatorial.visible ? 'on' : 'off'"
      :label="$t('Equatorial J2000 Grid')"
      v-if="$store.state.showEquatorialJ2000GridButton !== false"
      :img="require('@/assets/images/btn-equatorial-grid.svg')"
      img_alt="Equatorial J2000 Grid Button"
      :toggled="$store.state.stel.lines.equatorial.visible"
      @clicked="(b) => { $stel.core.lines.equatorial.visible = b }"
    >
    </bottom-button>

    <bottom-button
      data-testid="bb-btn-dsos"
      :data-state="$store.state.stel.dsos.visible ? 'on' : 'off'"
      :label="$t('Deep Sky Objects')"
      :img="require('@/assets/images/btn-nebulae.svg')"
      img_alt="Deep Sky Objects Button"
      class="mr-auto"
      :toggled="$store.state.stel.dsos.visible"
      @clicked="(b) => { $stel.core.dsos.visible = b }"
    >
    </bottom-button>

    <!-- right spacer -->
    <v-spacer data-testid="bb-spacer-right"></v-spacer>
  </div>
</template>


<script>

import BottomButton from '@/components/bottom-button.vue'
// import DateTimePicker from '@/components/date-time-picker.vue'
// import Moment from 'moment'

export default {
  components: { BottomButton },
  data: function () {
    return {
    }
  },
  computed: {
    // time: {
    //   get: function () {
    //     return this.getLocalTime().format('HH:mm:ss')
    //   }
    // },
    // date: {
    //   get: function () {
    //     return this.getLocalTime().format('YYYY-MM-DD')
    //   }
    // },
    fullscreenBtnImage: function () {
      return this.$store.state.fullscreen ? require('@/assets/images/svg/ui/fullscreen_exit.svg') : require('@/assets/images/svg/ui/fullscreen.svg')
    },
    // pickerDate: {
    //   get: function () {
    //     const t = this.getLocalTime()
    //     t.milliseconds(0)
    //     return t.format()
    //   },
    //   set: function (v) {
    //     const m = Moment(v)
    //     m.local()
    //     m.milliseconds(this.getLocalTime().milliseconds())
    //     this.$stel.core.observer.utc = m.toDate().getMJD()
    //   }
    // }
  },
  methods: {
    // The MomentJS time in local time
    // getLocalTime: function () {
    //   var d = new Date()
    //   d.setMJD(this.$store.state.stel.observer.utc)
    //   const m = Moment(d)
    //   m.local()
    //   return m
    // },
    // locationClicked: function () {
    //   this.$store.commit('toggleBool', 'showLocationDialog')
    // },
    setFullscreen: function (b) {
      this.$fullscreen.toggle(document.body, {
        wrap: false,
        callback: this.onFullscreenChange
      })
    },
    setNightMode: function (b) {
      this.$store.commit('toggleBool', 'nightmode')
      if (window.navigator.userAgent.indexOf('Edge') > -1) {
        document.getElementById('nightmode').style.opacity = b ? '0.5' : '0'
      }
      document.getElementById('nightmode').style.visibility = b ? 'visible' : 'hidden'
    },
    onFullscreenChange: function (b) {
      if (this.$store.state.fullscreen === b) return
      this.$store.commit('toggleBool', 'fullscreen')
    }
  }
}
</script>

<style>
@media all and (max-width: 600px) {
  .tmenubt {
    min-width: 30px;
  }
}
@media all and (min-width: 600px) {
  .tbtcontainer {
    width: 300px;
  }
}

/* .btn-bar {
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  backdrop-filter: blur(5px);
  background-color: rgba(0, 0, 0, 0.1);

  padding: 0.2rem;
} */

</style>
