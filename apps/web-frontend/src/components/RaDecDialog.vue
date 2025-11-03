<!-- src/components/RaDecDialog.vue -->
<template>
    <v-dialog
      v-model="innerOpen"
      max-width="420px"
      persistent
      :attach="true"
      content-class="radec-dialog"
      eager
    >
      <v-card>
        <v-card-title class="text-h5">{{ this.$t('Input Target Coordinates') }}</v-card-title>
  
        <v-card-text>
          <v-form v-model="valid" ref="form" lazy-validation>
            <!-- RA：输入框 + 单位切换（小时 / 度） -->
            <div class="d-flex align-center mb-2">
              <v-text-field
                v-model="raStr"
                :label="raLabel"
                :type="isDesktop ? 'number' : 'text'"
                :step="anyStep"
                :min="minRAc"
                :max="maxRAc"
                :rules="[requiredRule, numberRule, raRangeRuleDynamic]"
                clearable
                dense
                class="flex-grow-1"
                @keydown.native="filterKeysRA"
                @wheel.native.prevent
                :inputmode="isMobile ? 'decimal' : null"
                :pattern="mobilePatternRA"
              />
  
              <v-btn-toggle
                v-model="raMode"
                dense
                mandatory
                class="ml-2"
              >
                <v-btn value="h">h</v-btn>
                <v-btn value="deg">°</v-btn>
              </v-btn-toggle>
            </div>
  
            <!-- DEC -->
            <v-text-field
              v-model="decStr"
              :label="this.$t('DEC(°)')"
              :type="isDesktop ? 'number' : 'text'"
              :step="anyStep"
              :min="minDEC"
              :max="maxDEC"
              :rules="[requiredRule, numberRule, decRangeRule]"
              clearable
              dense
              @keydown.native="filterKeysDEC"
              @wheel.native.prevent
              :inputmode="isMobile ? 'decimal' : null"
              pattern="-?[0-9]*[.,]?[0-9]*"
            />
          </v-form>
  
          <div class="text-caption mt-2" style="opacity:.7">
            {{ this.$t('RA supports hours (0-24h) or degrees (0-360°) input; DEC defaults to degrees (0°-90°).') }}
          </div>
        </v-card-text>
  
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="onCancel">{{ this.$t('Cancel') }}</v-btn>
          <v-btn color="primary" :disabled="!valid" @click="onOK">{{ this.$t('Confirm') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </template>
  
  <script>
  export default {
    name: 'RaDecDialog',
    props: {
      // v-model (Vue 2)
      value: { type: Boolean, default: false },
  
      // 初始值
      defaultRA: { type: Number, default: null },   // 小时制
      defaultDEC: { type: Number, default: null },  // 度制
  
      // 范围（小时与度的 RA 会根据模式自动切换校验）
      minRA: { type: Number, default: 0 },          // 小时制 0..24
      maxRA: { type: Number, default: 24 },
      minDEC: { type: Number, default: -90 },
      maxDEC: { type: Number, default: 90 },
  
      // 是否在切换 h/° 时自动换算当前 RA 文本
      autoConvertOnToggle: { type: Boolean, default: true },
    },
    data () {
      return {
        innerOpen: this.value,
        valid: false,
  
        // 输入框字符串（便于处理中间态）
        raStr: this.defaultRA === null ? '' : String(this.defaultRA),
        decStr: this.defaultDEC === null ? '' : String(this.defaultDEC),
  
        // RA 输入模式：'h'（小时）或 'deg'（度）
        raMode: 'h',
  
        anyStep: 'any',
      }
    },
    watch: {
      value (v) { this.innerOpen = v },
      innerOpen (v) {
        this.$emit('input', v)   // 同步 v-model
      },
      // 切换单位时可自动把当前输入值换算到新单位
      raMode (newMode, oldMode) {
        if (!this.autoConvertOnToggle) return
        const n = this.toNumber(this.raStr)
        if (Number.isNaN(n)) return
        if (oldMode === 'h' && newMode === 'deg') {
          this.raStr = String(this.hoursToDeg(n))   // 0..24h -> 0..360°
        } else if (oldMode === 'deg' && newMode === 'h') {
          this.raStr = String(this.degToHours(n))   // 0..360° -> 0..24h
        }
      },
    },
    computed: {
      isMobile () {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )
      },
      isDesktop () { return !this.isMobile },
  
      // RA 标签与范围（随模式切换）
      raLabel () {
        return this.raMode === 'h' ? this.$t('RA(h)') : this.$t('RA(°)')
      },
      minRAc () {
        return this.raMode === 'h' ? this.minRA : 0
      },
      maxRAc () {
        return this.raMode === 'h' ? this.maxRA : 360
      },
      mobilePatternRA () {
        // 小数允许 . 或 ,，RA 不需要负号
        return '[0-9]*[.,]?[0-9]*'
      },
    },
    methods: {
      // -------- 工具 --------
      toNumber (v) {
        if (v === '' || v === null || v === undefined) return NaN
        return Number(String(v).replace(',', '.'))
      },
      hoursToDeg (h) { return h * 15 },
      degToHours (d) { return d / 15 },
  
      // -------- 校验规则 --------
      requiredRule (v) {
        return (v !== '' && v !== null && v !== undefined) || this.$t('Required')
      },
      numberRule (v) {
        return !Number.isNaN(this.toNumber(v)) || this.$t('Please enter a number')
      },
      raRangeRuleDynamic (v) {
        const n = this.toNumber(v)
        if (this.raMode === 'h') {
          return (n >= this.minRA && n <= this.maxRA) || this.$t('RA range {0} ~ {1} hours', [this.minRA, this.maxRA])
        }
        return (n >= 0 && n <= 360) || 'RA 范围 0 ~ 360 度'
      },
      decRangeRule (v) {
        const n = this.toNumber(v)
        return (n >= this.minDEC && n <= this.maxDEC) || this.$t('DEC range {0} ~ {1} degrees', [this.minDEC, this.maxDEC])
      },
  
      // -------- 键盘过滤 --------
      // RA：只允许数字/小数点/逗号及控制键；不允许负号
      filterKeysRA (e) {
        const allowed = [
          'Backspace','Delete','Tab','Enter','Escape',
          'ArrowLeft','ArrowRight','Home','End','.'
        ]
        const isCtrlCmd = e.ctrlKey || e.metaKey
        const isNumber = e.key >= '0' && e.key <= '9'
        if (isCtrlCmd || allowed.includes(e.key) || isNumber) return
        // 允许逗号作为小数点
        if (e.key === ',') return
        // 禁止负号
        if (e.key === '-') return e.preventDefault()
        e.preventDefault()
      },
      // DEC：允许负号
      filterKeysDEC (e) {
        const allowed = [
          'Backspace','Delete','Tab','Enter','Escape',
          'ArrowLeft','ArrowRight','Home','End','.'
        ]
        const isCtrlCmd = e.ctrlKey || e.metaKey
        const isNumber = e.key >= '0' && e.key <= '9'
        const isMinus = e.key === '-'
        if (isCtrlCmd || allowed.includes(e.key) || isNumber || isMinus) return
        if (e.key === ',') return
        e.preventDefault()
      },
  
      // -------- 交互 --------
      onCancel () {
        this.innerOpen = false
        this.$emit('cancel')
      },
      onOK () {
        if (!this.$refs.form || !this.$refs.form.validate()) return
  
        // 读取并校验
        let raIn = this.toNumber(this.raStr)
        const dec = this.toNumber(this.decStr)
        if (Number.isNaN(raIn) || Number.isNaN(dec)) return
  
        // 统一以“小时制”向外传递 RA
        const ra = (this.raMode === 'deg') ? this.degToHours(raIn) : raIn
  
        this.$emit('confirm', { ra, dec, raMode: this.raMode })
        this.innerOpen = false
      },
    },
  }
  </script>
  
  <style>
  /* 让弹窗层级比其他元素高（attach 到 body 后这里是全局样式） */
  .v-dialog__content.radec-dialog {
    z-index: 1800 !important;
  }
  
  /* 可选：遮罩透明度 */
  .v-dialog__content.radec-dialog .v-overlay__scrim {
    opacity: 0.6;
  }
  </style>
  