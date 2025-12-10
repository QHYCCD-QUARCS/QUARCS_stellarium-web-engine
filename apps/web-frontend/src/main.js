// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import 'roboto-fontface/css/roboto/roboto-fontface.css'
import '@mdi/font/css/materialdesignicons.css'
import store from './store'
import Router from 'vue-router'
import fullscreen from 'vue-fullscreen'
import VueJsonp from 'vue-jsonp'
import VueCookie from 'vue-cookie'
import _ from 'lodash'

import { Icon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-control-geocoder/dist/Control.Geocoder.css'
import VueI18n from 'vue-i18n'
import Moment from 'moment'

Vue.config.productionTip = false

// this part resolve an issue where the markers would not appear
delete Icon.Default.prototype._getIconUrl

Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
})

Vue.use(VueCookie)
Vue.use(fullscreen)
Vue.use(VueJsonp)
Vue.use(VueI18n)

// Load all plugins JS modules found in the plugins directory
var plugins = []
const ctx = require.context('./plugins/', true, /\.\/\w+\/index\.js$/)
for (const i in ctx.keys()) {
  const key = ctx.keys()[i]
  console.log('Loading plugin: ' + key)
  const mod = ctx(key)
  plugins.push(mod.default)
}
Vue.SWPlugins = plugins

// Loads all GUI translations found in the src/locales/ directory
var messages = {}
const guiLocales = require.context('./locales', true, /[A-Za-z0-9-_,\s]+\.json$/i)
guiLocales.keys().forEach(key => {
  const matched = key.match(/([A-Za-z0-9-_]+)\./i)
  if (matched && matched.length > 1) {
    const locale = matched[1]
    messages[locale] = guiLocales(key)
  }
})

// Loads all GUI translations found in the src/plugins/xxx/locales directories
const pluginsLocales = require.context('./plugins/', true, /\.\/\w+\/locales\/([A-Za-z0-9-_]+)\.json$/i)
pluginsLocales.keys().forEach(key => {
  const matched = key.match(/\.\/\w+\/locales\/([A-Za-z0-9-_]+)\.json/i)
  if (matched && matched.length > 1) {
    const locale = matched[1]
    if (messages[locale] === undefined) {
      messages[locale] = pluginsLocales(key)
    } else {
      _.merge(messages[locale], pluginsLocales(key))
    }
  }
})

// -----------------------------
// 语言与国际化初始化
// -----------------------------
// 语言来源优先级（数值越小优先级越高）
// 1: 用户手动选择
// 2: App 发送
// 3: 后端发送
// 4: 浏览器默认
const LANGUAGE_PRIORITY = {
  user: 1,
  app: 2,
  backend: 3,
  browser: 4
}

// 默认使用浏览器语言作为初始语言（来源：browser）
let loc = 'en'
let currentLanguageSource = 'browser'

try {
  if (typeof navigator !== 'undefined') {
    const navLang = (navigator.language || navigator.userLanguage || 'en').split('-')[0] || 'en'
    loc = navLang === 'zh' ? 'cn' : navLang
  }
} catch (e) {
  // 容错：无法读取浏览器语言时保持 'en'
}

// 设置 moment 的语言（cn -> zh-cn，其它直接使用）
const momentLocale = (loc === 'cn') ? 'zh-cn' : loc
Moment.locale(momentLocale)

var i18n = new VueI18n({
  locale: loc,
  messages: messages,
  formatFallbackMessages: true,
  fallbackLocale: 'en',
  silentTranslationWarn: true
})

// 全局语言更新助手：根据来源和优先级更新语言
// 使用方式：
// this.$setLanguageWithSource('user' | 'app' | 'backend' | 'browser', 'cn' | 'en' | ...)
Vue.prototype.$setLanguageWithSource = function (source, lang) {
  const src = source || 'backend'
  const newPri = LANGUAGE_PRIORITY[src] || LANGUAGE_PRIORITY.browser
  const curPri = LANGUAGE_PRIORITY[currentLanguageSource] || LANGUAGE_PRIORITY.browser

  // 如果新来源优先级不高于当前来源，则忽略（例如：当前为 user 时，app/backend/browser 一律不生效）
  if (newPri > curPri) {
    if (this && this.$bus) {
      this.$bus.$emit(
        'SendConsoleLogMsg',
        `Ignore language update from ${src}(${newPri}) -> ${lang}, current=${currentLanguageSource}(${curPri})`,
        'info'
      )
    }
    return
  }

  // 执行语言切换
  i18n.locale = lang
  const mLoc = (lang === 'cn') ? 'zh-cn' : lang
  Moment.locale(mLoc)
  currentLanguageSource = src

  if (this && this.$bus) {
    this.$bus.$emit(
      'SendConsoleLogMsg',
      `Set language to ${lang} from ${src} (priority ${newPri})`,
      'info'
    )
    this.$bus.$emit('LanguageSourceChanged', src, lang)
  }
}

// 获取当前语言来源
Vue.prototype.$getLanguageSource = function () {
  return currentLanguageSource
}

// Setup routes for the app
Vue.use(Router)
// Base routes
let routes = [
  {
    // The main page
    path: '/',
    name: 'App',
    component: App,
    children: []
  },
  {
    // Main page, but centered on the passed sky source name
    path: '/skysource/:name',
    component: App,
    alias: '/'
  }
]
// Routes exposed by plugins
let defaultObservingRoute = {
  path: '/p/calendar',
  meta: { prio: 2 }
}
for (const i in Vue.SWPlugins) {
  const plugin = Vue.SWPlugins[i]
  if (plugin.routes) {
    routes = routes.concat(plugin.routes)
  }
  if (plugin.panelRoutes) {
    routes[0].children = routes[0].children.concat(plugin.panelRoutes)
    for (const j in plugin.panelRoutes) {
      const r = plugin.panelRoutes[j]
      if (r.meta && r.meta.prio && r.meta.prio < defaultObservingRoute.meta.prio) {
        defaultObservingRoute = r
      }
    }
  }
  if (plugin.vuePlugin) {
    Vue.use(plugin.vuePlugin)
  }
}
routes[0].children.push({ path: '/p', redirect: defaultObservingRoute.path })
var router = new Router({
  mode: 'history',
  base: '/',
  routes: routes
})

// Expose plugins singleton to all Vue instances
Vue.prototype.$stellariumWebPlugins = function () {
  return Vue.SWPlugins
}

// 创建一个事件总线
Vue.prototype.$bus = new Vue();

// 全局设备使用检查与功能登记助手（统一 i18n 提示）
Vue.prototype.$canUseDevice = function (device, feature) {
  try {
    const res = this.$store.getters['device/canUseDevice'](device, feature)
    if (!res.allowed) {
      // 友好化翻译 features 与 device
      const params = Object.assign({}, res.reasonParams || {})
      if (params && Array.isArray(params.featureKeys)) {
        const featureNames = params.featureKeys.map(k => this.$t(`FeatureNames.${k}`))
        params.features = featureNames.join('、')
      }
      if (params && params.deviceKey) {
        params.device = this.$t(params.deviceKey)
      }
      const msg = this.$t(res.reasonKey, params)
      this.$bus.$emit('showMsgBox', msg, 'warning')
    }
    return res
  } catch (e) {
    return { allowed: true }
  }
}
Vue.prototype.$startFeature = function (devices, feature) {
  try {
    this.$store.dispatch('device/startFeature', { devices, feature })
  } catch (e) {}
}
Vue.prototype.$stopFeature = function (devices, feature) {
  try {
    this.$store.dispatch('device/stopFeature', { devices, feature })
  } catch (e) {}
}

/* eslint-disable no-new */
new Vue({
  router,
  store,
  i18n,
  vuetify
}).$mount('#app')
