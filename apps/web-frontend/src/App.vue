// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

<template>
  <v-app :class="{ 'no-backdrop-blur': disableBackdropBlur }" data-testid="ui-app-root">
    <!--
      E2E 探针（隐藏）：
      - 设备连接状态：来自 data().devices[*].isConnected
      - 出图成功信号：每次收到 TileGPM 时自增 e2eTileGpmSeq
      目的：让 Playwright 不必“盲等超时”，而是等待真实状态变化。
    -->
    <div
      data-testid="e2e-probes"
      style="position: fixed; left: -99999px; top: -99999px; width: 1px; height: 1px; overflow: hidden;"
      aria-hidden="true"
    >
      <div
        v-for="d in devices"
        :key="`e2e-device-${d && d.driverType ? d.driverType : UNKNOWN_DRIVER_TYPE}`"
        :data-testid="`e2e-device-${d && d.driverType ? d.driverType : UNKNOWN_DRIVER_TYPE}-conn`"
        :data-state="d && d.isConnected ? 'connected' : 'disconnected'"
        :data-connection-mode="String((d && d.connectionMode) || '')"
        :data-driver-name="String((d && d.driverName) || '')"
        :data-device="String((d && d.device) || '')"
      ></div>
      <div
        data-testid="e2e-tilegpm"
        :data-seq="String(e2eTileGpmSeq)"
        :data-session="String(tileSessionId || '')"
      ></div>
    </div>

    <v-navigation-drawer v-model="drawer_2" ref="Drawer_2" app absolute temporary :width="submenuDrawerWidth"
      class="submenu-navigation-drawer"
      data-testid="ui-app-submenu-drawer"
      :data-state="drawer_2 ? 'open' : 'closed'"
      :style="{ left: submenuLeft }">

      <div v-show="isOpenDevicePage" class="submenu-page" data-testid="ui-app-submenu-device-page" :data-state="isOpenDevicePage ? 'open' : 'closed'">
        <span class="submenu-page-title">
          {{ $t(CurrentDriverType) }}
          <v-divider style="margin-top: 2px;"></v-divider>
        </span>

        <div :style="submenuParamsStyle"
          class="params-container"
          data-testid="ui-app-submenu-params-container">
          <!-- 内容包装：用 key 控制子菜单“内部重新挂载”，避免必须关开抽屉才能刷新 -->
          <div :key="submenuContentKey">

          <!-- 设备未连接状态 -->
          <div
            v-show="!DeviceIsConnected"
            class="submenu-center"
            data-testid="ui-app-device-connection-panel"
            :data-state="drawer_2 && isOpenDevicePage ? 'ready' : 'closed'"
          >
            <span class="submenu-section-title">
              {{ $t('Device Connection') }}
            </span>

            <!-- 驱动选择下拉框，添加@change事件 -->
            <v-select :label="$t('Select Driver')" :items="drivers" item-text="label" item-value="value"
              v-model="selectedDriver" @change="confirmDriver" class="config-input" data-testid="ui-app-select-confirm-driver">
              <template v-slot:item="{ item, on, attrs }">
                <v-list-item
                  v-on="on"
                  v-bind="attrs"
                  :data-testid="
                    'ui-app-select-confirm-driver-option-'
                    + String((item && item.value) || item || 'unknown').replace(/[^A-Za-z0-9]+/g, '')
                  "
                >
                  <v-list-item-content>
                    <v-list-item-title>{{ item && item.label ? item.label : item }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </template>
            </v-select>

            <!-- SDK/INDI 模式切换：仅在所选驱动支持 SDK 时显示 -->
            <v-expand-transition>
              <div v-if="showConnectionModeSelector" class="submenu-connection-mode">
                <v-select
                  :label="$t('Connection Mode')"
                  :items="connectionModeItemsForCurrentDevice"
                  item-text="label"
                  item-value="value"
                  item-disabled="disabled"
                  v-model="selectedConnectionMode"
                  :disabled="isSettingConnectionMode"
                  @change="onConnectionModeChange"
                  class="config-input" data-testid="ui-app-select-on-connection-mode-change">
                  <template v-slot:item="{ item, on, attrs }">
                    <v-list-item
                      v-on="on"
                      v-bind="attrs"
                      :data-testid="
                        'ui-app-select-connection-mode-option-'
                        + String((item && item.value) || item || 'unknown').replace(/[^A-Za-z0-9]+/g, '')
                      "
                    >
                      <v-list-item-content>
                        <v-list-item-title>{{ item && item.label ? item.label : item }}</v-list-item-title>
                      </v-list-item-content>
                    </v-list-item>
                  </template>
                </v-select>
              </div>
            </v-expand-transition>

            <!-- 波特率下拉框，添加@change事件 -->
            <v-select v-if="CurrentDriverType === 'Mount' || CurrentDriverType === 'Focuser'" :label="$t('Baud Rate')"
              :items="BaudRateItems" item-text="label" item-value="value" v-model="BaudRateSelected"
              @change="confirmDriver" class="config-input" data-testid="ui-app-select-confirm-driver-2">
            </v-select>

          <!-- 串口下拉框：在波特率下方，仅对 Mount / Focuser 显示 -->
          <v-select
            v-if="CurrentDriverType === 'Mount' && mountSerialPortItems.length"
            data-testid="ui-app-select-auto"
            :label="$t('Serial Port')"
            :items="mountSerialPortItems"
            item-text="label"
            item-value="value"
            v-model="mountSerialPortSelected"
            @change="onSerialPortSelect('Mount', $event)"
            class="config-input submenu-serial-select">
          </v-select>
          <v-select
            v-if="CurrentDriverType === 'Focuser' && focuserSerialPortItems.length"
            data-testid="ui-app-select-auto-2"
            :label="$t('Serial Port')"
            :items="focuserSerialPortItems"
            item-text="label"
            item-value="value"
            v-model="focuserSerialPortSelected"
            @change="onSerialPortSelect('Focuser', $event)"
            class="config-input submenu-serial-select">
          </v-select>

            <v-row no-gutters>
              <v-col cols="6">
                <button type="button" @click="clearDriver" class="btn-confirm" aria-label="Clear driver" data-testid="ui-app-btn-clear-driver">
                  <div style="display: flex; justify-content: center; align-items: center;">
                    <img src="@/assets/images/svg/ui/delete.svg" height="20px"
                      style="min-height: 20px; pointer-events: none;"></img>
                  </div>
                </button>
              </v-col>
              <v-col cols="6">
                <button v-if="!isConnecting" type="button" @click="connectDriver(selectedDriver)" class="btn-confirm btn-confirm--green"
                  aria-label="Connect" data-testid="ui-app-btn-connect-driver">
                  <div style="display: flex; justify-content: center; align-items: center;">
                    <v-icon color="white">mdi-link</v-icon>
                  </div>
                </button>
                <v-progress-circular v-else indeterminate color="green" size="24"></v-progress-circular>
              </v-col>
            </v-row>
          </div>
          <!-- 设备未连接状态 -->

          <!-- 设备连接状态 -->
          <div
            v-show="DeviceIsConnected"
            v-for="(item, index) in CurrentConfigItems()"
            :key="(item.driverType || '') + ':' + (item.label || '') + ':' + index"
            class="config-item"
            :data-testid="
              'ui-app-config-item-'
              + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
              + '-'
              + String(item.label || 'Field').replace(/[^A-Za-z0-9]+/g, '')
              + '-'
              + index
            "
          >
            <!-- 标题，仅在第一个项目显示 -->
            <span v-if="index === 0" class="config-title">
              {{ $t('Device Config Items') }}
            </span>

            <!-- 配置项卡片内容 -->
            <v-card-text>
              <!-- 文本输入类型 -->
              <v-text-field
                v-if="item.inputType === 'text'"
                v-model="item.value"
                :label="$t(item.label)"
                :disabled="isCurrentDeviceUnbound"
                @input="handleConfigChange(item.label, item.value, item.driverType)"
                class="config-input"
                :data-testid="
                  'ui-config-'
                  + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
                  + '-'
                  + String(item.label || 'Field').replace(/[^A-Za-z0-9]+/g, '')
                  + '-text-'
                  + index
                "
              />

              <!-- 数字输入类型 -->
              <v-text-field v-if="item.inputType === 'number'" 
                :value="isMobile && currentKeyboardItem === item ? keyboardInputValue : item.value"
                :label="$t(item.label)"
                :type="isDesktop ? 'number' : 'text'" :min="item.min" :max="item.max"
                :step="item.step !== undefined && item.step !== null ? item.step : 1" :rules="numberRules(item)"
                :inputmode="isMobile ? 'none' : ''" :readonly="isMobile"
                :disabled="isCurrentDeviceUnbound"
                enterkeyhint="done" 
                @blur="isMobile ? handleNumberBlur(item) : onNumberCommit(item)" 
                @keydown.enter.prevent="onNumberCommit(item)"
                @focus="isMobile ? openNumberKeyboard(item, $event) : null"
                @click="isMobile ? openNumberKeyboard(item, $event) : null"
                @input="!isMobile ? (item.value = $event) : null"
                class="config-input"
                :data-testid="
                  'ui-config-'
                  + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
                  + '-' 
                  + String(item.label || 'Field').replace(/[^A-Za-z0-9]+/g, '')
                  + '-number-'
                  + index
                " />

              <!-- 滑动条类型 -->
              <div v-if="item.inputType === 'slider'" class="slider-container">
                <span
                  class="slider-label"
                  :data-testid="
                    'ui-config-'
                    + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
                    + '-'
                    + String(item.label || 'Field').replace(/[^A-Za-z0-9]+/g, '')
                    + '-slider-label-'
                    + index
                  "
                >
                  {{ $t(item.label) }}: {{ item.value }}
                </span>
                <div>
                  <!-- 减小按钮 -->
                  <button
                    type="button"
                    :disabled="isCurrentDeviceUnbound"
                    @click="decrementAndNotify(item)"
                    class="get-click btn-slider btn-minus"
                    :data-testid="
                      'ui-config-'
                      + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
                      + '-'
                      + String(item.label || 'Field').replace(/[^A-Za-z0-9]+/g, '')
                      + '-slider-dec-'
                      + index
                    "
                  >
                    <div class="btn-content">
                      <img src="@/assets/images/svg/ui/Minus.svg" height="10px" class="btn-icon">
                    </div>
                  </button>

                  <!-- 滑动条 -->
                  <v-slider
                    v-model="item.value"
                    :step="item.inputStep"
                    :max="item.inputMax"
                    :min="item.inputMin"
                    :disabled="isCurrentDeviceUnbound"
                    @change="handleConfigChange(item.label, item.value, item.driverType)"
                    color="white"
                    class="align-center slider-control"
                    :data-testid="
                      'ui-config-'
                      + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
                      + '-'
                      + String(item.label || 'Field').replace(/[^A-Za-z0-9]+/g, '')
                      + '-slider-'
                      + index
                    "
                  />

                  <!-- 增加按钮 -->
                  <button
                    type="button"
                    :disabled="isCurrentDeviceUnbound"
                    @click="incrementAndNotify(item)"
                    class="get-click btn-slider btn-plus"
                    :data-testid="
                      'ui-config-'
                      + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
                      + '-'
                      + String(item.label || 'Field').replace(/[^A-Za-z0-9]+/g, '')
                      + '-slider-inc-'
                      + index
                    "
                  >
                    <div class="btn-content">
                      <img src="@/assets/images/svg/ui/Plus.svg" height="10px" class="btn-icon">
                    </div>
                  </button>
                </div>
              </div>

              <!-- 选择框类型 -->
              <v-select
                v-if="item.inputType === 'select'"
                v-model="item.value"
                :label="$t(item.label)"
                :disabled="isCurrentDeviceUnbound"
                @change="handleConfigChange(item.label, item.value, item.driverType)"
                :items="item.selectValue"
                class="config-input"
                :data-testid="
                  'ui-config-'
                  + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
                  + '-'
                  + String(item.label || 'Field').replace(/[^A-Za-z0-9]+/g, '')
                  + '-select-'
                  + index
                "
              />

              <!-- 开关类型 -->
              <v-switch
                v-if="item.inputType === 'switch'"
                v-model="item.value"
                :label="$t(item.label)"
                :disabled="isCurrentDeviceUnbound"
                @change="handleConfigChange(item.label, item.value, item.driverType)"
                class="config-switch"
                :data-testid="
                  'ui-config-'
                  + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
                  + '-'
                  + String(item.label || 'Field').replace(/[^A-Za-z0-9]+/g, '')
                  + '-switch-'
                  + index
                "
              />

              <!-- 提示信息类型（只读） -->
              <div v-if="item.inputType === 'tip'" class="tip-field">
                <div class="tip-label">{{ $t(item.label) }}</div>
                <div class="tip-value" :title="formatTipTitle(item)">
                  {{ formatTipValue(item) }}
                </div>
              </div>

              <!-- 按钮类型 -->
              <div v-if="item.inputType === 'button'" class="button-field">
                <v-btn
                  class="config-btn"
                  color="primary"
                  variant="tonal"
                  rounded="xl"
                  size="large"
                  density="comfortable"
                  block
                  :loading="!!item._disabled"
                  :disabled="isCurrentDeviceUnbound || !!item._disabled"
                  @click="onButtonPress(item)"
                  :data-testid="
                    'ui-config-'
                    + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
                    + '-'
                    + String(item.label || item.buttonText || 'Button').replace(/[^A-Za-z0-9]+/g, '')
                    + '-button-'
                    + index
                  "
                >
                  <template v-if="item._disabled" #loader>
                    <v-progress-circular indeterminate size="18" width="2" />
                  </template>
                  {{ item._disabled
                      ? (item.buttonTextWhenDisabled ? $t(item.buttonTextWhenDisabled) : (item.buttonText ? $t(item.buttonText) : $t(item.label)))
                      : (item.buttonText ? $t(item.buttonText) : $t(item.label)) }}
                </v-btn>
              </div>


            </v-card-text>
          </div>
          <!-- 设备连接状态 -->
          
          <!-- 底部占位，确保最后一个参数可以完全显示 -->
          <div v-show="DeviceIsConnected" class="submenu-footer-spacer"></div>

          </div>
        </div>

        <!-- 断开按钮 - 固定在底部，不受滚动影响 -->
        <div v-show="DeviceIsConnected" class="submenu-bottom-actions">
          <button
            type="button"
            @click="disconnectDriver"
            class="btn-confirm btn-confirm--red"
            aria-label="Disconnect"
            data-testid="ui-app-btn-disconnect-driver"
          >
            <div style="display: flex; justify-content: center; align-items: center;">
              <v-icon color="white">mdi-link-off</v-icon>
            </div>
          </button>
        </div>
      
      </div>

      <!-- 电源管理页面 -->
      <div
        v-show="isOpenPowerPage"
        data-testid="ui-power-manager-root"
        :data-state="isOpenPowerPage ? 'open' : 'closed'"
      >
        <button
          type="button"
          @click="isOpenPowerPage = false"
          data-testid="ui-power-manager-btn-close"
          style="position: absolute; top: 10px; right: 10px; z-index: 2; color: rgba(255,255,255,0.7);"
        >
          <v-icon small>mdi-close</v-icon>
        </button>
        <span
          style="position: absolute; top: 0px; left: 50%; transform: translateX(-50%); font-size: 26px; color: rgba(255, 255, 255, 0.5); user-select: none; white-space: nowrap; ">
          {{ $t('Power Management') }}
          <v-divider></v-divider>
        </span>

        <div style="position: absolute; top: 50px; max-height: calc(100% - 50px); width: 200px; overflow-y: auto;">
          <v-list dense>
            <v-list-item @click.stop="SwitchOutPutPower(1, OutPutPower_1_ON)"
              :style="{ height: '36px', marginBottom: '10px' }" data-testid="ui-app-power-page-output-power-1">
              <v-list-item-icon style="margin-right: 10px;">
                <div style="display: flex; justify-content: center; align-items: center;">
                  <img src="@/assets/images/svg/ui/OutPutPower.svg" height="30px"
                    style="min-height: 30px; pointer-events: none;"></img>
                </div>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>
                  <span>
                    <div :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('OutPut Power 1') }}
                    </div>
                    <div :style="{ fontSize: '7px' }" :class="{ 'connected-device': OutPutPower_1_ON }">{{OutPutPower_1_ON ? '[ON]' : '[OFF]' }}</div>
                  </span>
                </v-list-item-title>

              </v-list-item-content>
            </v-list-item>

            <v-list-item @click.stop="SwitchOutPutPower(2, OutPutPower_2_ON)"
              :style="{ height: '36px', marginBottom: '10px' }" data-testid="ui-app-power-page-output-power-2">
              <v-list-item-icon style="margin-right: 10px;">
                <div style="display: flex; justify-content: center; align-items: center;">
                  <img src="@/assets/images/svg/ui/OutPutPower.svg" height="30px"
                    style="min-height: 30px; pointer-events: none;"></img>
                </div>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>
                  <span>
                    <div :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('OutPut Power 2') }}
                    </div>
                    <div :style="{ fontSize: '7px' }" :class="{ 'connected-device': OutPutPower_2_ON }">{{OutPutPower_2_ON ?'[ON]' : '[OFF]' }}</div>
                  </span>
                </v-list-item-title>

              </v-list-item-content>
            </v-list-item>

            <v-divider :style="{ marginBottom: '10px' }"></v-divider>

            <v-list-item @click.stop="RestartRaspberryPi()" :style="{ height: '36px', marginBottom: '10px' }" data-testid="ui-app-power-page-restart">
              <v-list-item-icon style="margin-right: 10px;">
                <div style="display: flex; justify-content: center; align-items: center;">
                  <img src="@/assets/images/svg/ui/Reboot.svg" height="30px"
                    style="min-height: 30px; pointer-events: none;"></img>
                </div>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('Restart')}}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>

            <v-list-item @click.stop="ShutdownRaspberryPi()" :style="{ height: '36px', marginBottom: '10px' }" data-testid="ui-app-power-page-shutdown">
              <v-list-item-icon style="margin-right: 10px;">
                <div style="display: flex; justify-content: center; align-items: center;">
                  <img src="@/assets/images/svg/ui/PowerOFF.svg" height="30px"
                    style="min-height: 30px; pointer-events: none;"></img>
                </div>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('Shut Down')}}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
            <!-- 强制更新 -->
            <v-list-item @click.stop="ForceUpdate()" :style="{ height: '36px', marginBottom: '10px' }" data-testid="ui-app-power-page-force-update">
              <v-list-item-icon style="margin-right: 10px;">
                <div style="display: flex; justify-content: center; align-items: center;">
                  <img src="@/assets/images/svg/ui/PowerOFF.svg" height="30px"
                    style="min-height: 30px; pointer-events: none;"></img>
                </div>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('Force Update')}}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>

          </v-list>
        </div>

      </div>
      <!-- 电源管理页面 -->


    </v-navigation-drawer>

    <v-navigation-drawer
      v-model="nav"
      app
      :stateless="drawer_2"
      temporary
      :width="menuDrawerWidth"
      class="menu-navigation-drawer"
      data-testid="ui-app-menu-drawer"
      :data-state="nav ? 'open' : 'closed'"
    >
      <v-layout column fill-height>
        <v-list dense>
          <!-- 客户端版本和服务器版本信息 -->
          <template>
            <!-- <div style="display: flex; justify-content: center; align-items: center;">
              <span style="font-size: 10px; color: rgba(255, 255, 255, 0.7); user-select: none; white-space: nowrap;">
                Total Version: {{ TotalVersion }}
              </span>
            </div> -->
            <div style="display: flex; justify-content: center; align-items: center;">
              <span style="font-size: 10px; color: rgba(255, 255, 255, 0.5); user-select: none; white-space: nowrap;">
                Client Version: {{ VueClientVersion }}
              </span>
            </div>
            <div style="display: flex; justify-content: center; align-items: center;">
              <!-- <span style="font-size: 10px; color: getQTClientVersionColor,rgba(255, 255, 255, 0.5); user-select: none; white-space: nowrap;">
                Server Version: {{ QTClientVersion }}
              </span> -->
              <span :style="{
                fontSize: '10px',
                color: getQTClientVersionColor,
                userSelect: 'none',
                whiteSpace: 'nowrap'
              }">
                Server Version: {{ QTClientVersion }}
              </span>
            </div>
            <v-divider></v-divider>
          </template>

          <!-- 退出(Quit) -->
          <v-list-item @click.stop="QuitToMainApp()" :style="{ height: '36px' }" data-testid="ui-app-menu-quit">
            <v-list-item-icon style="margin-right: 10px;">
              <div style="display: flex; justify-content: center; align-items: center;">
                <img src="@/assets/images/svg/ui/Quit.svg" height="30px"
                  style="min-height: 30px; pointer-events: none;"></img>
              </div>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('Quit')
              }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <!-- 视图设置(View Settings) -->
          <v-list-item @click.stop="toggleStoreValue('showViewSettingsDialog')" :style="{ height: '36px' }" data-testid="ui-app-menu-general-settings">
            <v-list-item-icon style="margin-right: 10px;">
              <div style="display: flex; justify-content: center; align-items: center;">
                <img src="@/assets/images/svg/ui/Setting.svg" height="30px"
                  style="min-height: 30px; pointer-events: none;"></img>
              </div>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('General Settings')
              }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <!-- 电源管理(Power Management) -->
          <v-list-item @click.stop="openPowerManagerPage()" :style="{ height: '36px' }" data-testid="ui-app-menu-open-power-manager">
            <v-list-item-icon style="margin-right: 10px;">
              <div style="display: flex; justify-content: center; align-items: center;">
                <img src="@/assets/images/svg/ui/Power.svg" height="30px"
                  style="min-height: 30px; pointer-events: none;"></img>
              </div>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('Power Management')
              }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <v-divider></v-divider>

          <!-- 设备列表(动态生成) -->
          <v-list-item
            v-for="(device, index) in devices"
            :key="device.driverType || index"
            @click.stop="selectDevice(device)"
            :style="{ height: '36px' }"
            :data-testid="`ui-app-menu-device-${device && device.driverType ? device.driverType : UNKNOWN_DRIVER_TYPE}`"
            :data-driver-type="device && device.driverType ? device.driverType : UNKNOWN_DRIVER_TYPE"
            :data-device-name="device && device.device ? device.device : ''"
            :data-selected="CurrentDriverType === (device && device.driverType ? device.driverType : UNKNOWN_DRIVER_TYPE) ? 'true' : 'false'"
            :data-state="(device && device.isConnected) || (device && device.driverType === 'Telescopes') ? 'connected' : 'disconnected'"
          >
              <v-list-item-icon style="margin-right: 10px;">
                <div style="display: flex; justify-content: center; align-items: center;">
                <img :src="require(`@/assets/images/svg/ui/${device.driverType}.svg`)" height="30px"
                  style="min-height: 30px"></img>
                </div>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>
                  <span>
                  <div :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t(device.driverType) }}</div>
                  <div
                    :style="{ fontSize: '7px' }"
                    :class="{
                      'connected-device': device.isConnected,
                      'not-bind-device': device.isConnected && isNotBindDevice(device.device)
                    }"
                  >{{ device.device }}</div>
                  </span>
                </v-list-item-title>
              </v-list-item-content>
            </v-list-item>

          <v-divider></v-divider>

          <!-- 连接所有(Connect All) -->
          <v-list-item :disabled="loadingConnectAllDevice" @touchstart.stop.prevent="startConnectBtnPress"
            @touchend.stop.prevent="endConnectBtnPress" @mousedown.stop="startConnectBtnPress" @mouseup.stop="endConnectBtnPress"
            :style="{ height: '36px' }"
            data-testid="ui-app-menu-connect-all"
            :data-state="loadingConnectAllDevice ? 'busy' : 'idle'"
            :aria-disabled="loadingConnectAllDevice ? 'true' : 'false'">
            <v-list-item-icon style="margin-right: 10px;">
              <div style="display: flex; justify-content: center; align-items: center;">
                <img src="@/assets/images/svg/ui/Connect.svg" height="30px"
                  style="min-height: 30px; pointer-events: none;">
              </div>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px', userSelect: 'none' }">
                {{ $t('Connect All') }}
              </v-list-item-title>
              <v-progress-linear v-if="loadingConnectAllDevice" indeterminate color="white"
                height="5"></v-progress-linear>
            </v-list-item-content>
          </v-list-item>

          <!-- 断开所有连接(Disconnect All) -->
          <v-list-item @click.stop="disconnectAllDevice(false)" :style="{ height: '36px' }" data-testid="ui-app-menu-disconnect-all">
            <v-list-item-icon style="margin-right: 10px;">
              <div style="display: flex; justify-content: center; align-items: center;">
                <img src="@/assets/images/svg/ui/DisConnect.svg" height="30px"
                  style="min-height: 30px; pointer-events: none;"></img>
              </div>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px', userSelect: 'none' }">{{
                $t('Disconnect All') }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <!-- 设备分配(Device Allocation) -->
          <v-list-item @click.stop="DeviceAllocation()" :style="{ height: '36px' }" data-testid="ui-app-menu-device-allocation">
            <v-list-item-icon style="margin-right: 10px;">
              <div style="display: flex; justify-content: center; align-items: center;">
                <img src="@/assets/images/svg/ui/Allocation.svg" height="30px"
                  style="min-height: 30px; pointer-events: none;"></img>
              </div>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{
                $t('Device Allocation') }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <!-- 校准极轴(Calibrate Polar Axis) -->
          <v-list-item @click.stop="CalibratePolarAxis()" :style="{ height: '36px' }" data-testid="ui-app-menu-calibrate-polar-axis">
            <v-list-item-icon style="margin-right: 10px;">
              <div style="display: flex; justify-content: center; align-items: center;">
                <img src="@/assets/images/svg/ui/PoleAxis.svg" height="30px"
                  style="min-height: 30px; pointer-events: none;"></img>
              </div>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{
                $t('Calibrate Polar Axis') }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <!-- 图像文件(Image Files) -->
          <v-list-item @click.stop="OpenIamgeFolder()" :style="{ height: '36px' }" data-testid="ui-app-menu-open-image-manager">
            <v-list-item-icon style="margin-right: 10px;">
              <div style="display: flex; justify-content: center; align-items: center;">
                <img src="@/assets/images/svg/ui/FolderSwitch.svg" height="30px"
                  style="min-height: 30px; pointer-events: none;"></img>
              </div>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('Image Files')
              }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <!-- 日志(Logs) -->
          <v-list-item @click.stop="OpenDebugLog()" :style="{ height: '36px' }" data-testid="ui-app-menu-open-debug-log">
            <v-list-item-icon style="margin-right: 10px;">
              <div style="display: flex; justify-content: center; align-items: center;">
                <img src="@/assets/images/svg/ui/DebugLog.svg" height="30px"
                  style="min-height: 30px; pointer-events: none;"></img>
              </div>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('Logs')
              }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <v-divider></v-divider>

          <!-- 纬度和经度(Lat & Long) -->
          <v-list-item @click.stop="locationClicked()" :style="{ height: '36px' }" data-testid="ui-app-menu-location">
            <v-list-item-icon style="margin-right: 10px;">
              <div style="display: flex; justify-content: center; align-items: center;">
                <img :src="require(`@/assets/images/svg/ui/Location.svg`)" height="30px" style="min-height: 30px"></img>
              </div>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>
                <span>
                  <div :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('Lat & Long') }}</div>
                  <div :style="{ fontSize: '7px' }">{{ '(' + $store.state.currentLocation.lat + ', ' +
                    $store.state.currentLocation.lng + ')' }}</div>
                </span>
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <!-- 刷新页面(Refresh Page) -->
          <v-list-item @click.stop="ShowConfirmDialog('Confirm', $t('Are you sure you need to refresh?'), 'Refresh')"
            :style="{ height: '36px' }" data-testid="ui-app-menu-refresh-page">
            <v-list-item-icon style="margin-right: 10px;">
              <div style="display: flex; justify-content: center; align-items: center;">
                <img :src="require(`@/assets/images/svg/ui/Refresh.svg`)" height="30px" style="min-height: 30px"></img>
              </div>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>
                <span>
                  <div :style="{ fontSize: '10px' }">{{ $t('Refresh Page') }}</div>
                </span>
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <!-- 数据版权(Data Credits) -->
          <v-list-item @click.stop="toggleStoreValue('showDataCreditsDialog')" :style="{ height: '36px' }" data-testid="ui-app-menu-data-credits">
            <v-list-item-icon style="margin-right: 10px;">
              <div style="display: flex; justify-content: center; align-items: center;">
                <img src="@/assets/images/svg/ui/DataCredits.svg" height="30px"
                  style="min-height: 30px; pointer-events: none;"></img>
              </div>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('Data Credits')
              }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

        </v-list>
      </v-layout>
    </v-navigation-drawer>




    <v-main>

      <canvas v-show=false id="TestCanvas" width="1920" height="1080"></canvas>

      <v-container class="fill-height" fluid style="padding: 0">
        <div id="stel" v-bind:class="{ right_panel: $store.state.showSidePanel }">
          <div style="position: relative; width: 100%; height: 100%">
            <component v-bind:is="guiComponent"></component>
            <canvas id="stel-canvas" ref='stelCanvas' :style="{ zIndex: canvasZIndexStel }"></canvas>
            <canvas ref="mainCanvas" id="mainCamera-canvas" :style="{ zIndex: canvasZIndexMainCamera }"
              @click="handleMainCanvasClick" @touchstart="handleTouchStart" @touchmove="handleTouchMove"
              @touchend="handleTouchEnd" @touchcancel="handleTouchEnd"
              @mousedown="handleMouseDown" @mouseup="handleMouseUp" @mouseleave="handleMouseUp"
              @mousemove="handleMouseMove" @wheel="handleWheel">
            </canvas>
            <canvas ref="guiderCanvas" id="guiderCamera-canvas" :style="{ zIndex: canvasZIndexGuiderCamera }"
              @click="handleGuiderCanvasClick"></canvas>
            <!-- <img id="imageSrc" alt="Source" :src="imageSrc" crossOrigin = "" /> -->
            <ProgressBar :progress="progressValue" :description="progressDescription" :showDescription="true"
              :isShow="currentcanvas === 'MainCamera'" />
            <!-- <MeridianFlipNotifier
              :remaining-seconds="flipEtaSeconds"
              :menu-offset-px="56"
              :is-mount-connected="isMountConnected"
            /> -->
          </div>
        </div>


      </v-container>
    </v-main>

    <!-- 主菜单打开时显示在遮罩之上的菜单按钮，便于点击关闭主菜单 -->
    <div
      v-if="nav"
      class="menu-button-above-overlay"
      @click.stop="$store.commit('toggleBool', 'showNavigationDrawer')"
    >
      <v-btn
        icon
        dark
        data-testid="tb-act-toggle-navigation-drawer-overlay"
        aria-label="Close menu"
      >
        <v-icon>mdi-menu</v-icon>
      </v-btn>
    </div>

    <v-dialog v-model="showDisconnectDialog" persistent max-width="290">
      <v-card
        :data-state="showDisconnectDialog ? 'open' : 'closed'"
        data-testid="ui-app-disconnect-driver-dialog-root"
      >
        <v-card-title class="text-h5">Confirm Action</v-card-title>
        <v-card-text>Are you sure you want to disconnect the driver {{ currentDisconnectDriverName }}?</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="red darken-1" text @click="showDisconnectDialog = false" data-testid="ui-app-disconnect-driver-dialog-btn-cancel">Cancel</v-btn>
          <v-btn color="green darken-1" text @click="confirmDisconnect" data-testid="ui-app-disconnect-driver-dialog-btn-confirm">Confirm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 校准信息显示框 -->
    <div v-if="calibrationInfo.isCalibrating || calibrationInfo.calibrationState === 'complete'"
      class="calibration-info-box">
      <div class="calibration-content">
        <div class="calibration-title">{{ $t('Focuser Travel Calibration') }}</div>
        <div class="calibration-message">{{ $t(calibrationInfo.calibrationMessage) }}</div>
        <div class="calibration-progress">{{ $t('Step') }} {{ calibrationInfo.calibrationStep }}/3</div>
      </div>
    </div>

    <!-- 自动对焦信息显示框 - [AUTO_FOCUS_UI_ENHANCEMENT] -->
    <div v-if="(autoFocusInfo.isRunning || autoFocusInfo.state === 'complete') && currentcanvas === 'MainCamera'"
      class="calibration-info-box auto-focus-info-box">
      <div class="calibration-content">
        <div class="calibration-title">{{ $t('Auto Focus') }}</div>
        <div class="calibration-message">{{ $t(autoFocusInfo.message) }}</div>
        <div
          v-if="autoFocusInfo.mode !== 'fine'"
          class="calibration-progress"
        >
          {{ $t('Step') }} {{ autoFocusInfo.step }}/4
        </div>
        <div
          v-if="autoFocusInfo.totalShots > 0 && autoFocusInfo.currentShot > 0 && autoFocusStageLabel"
          class="calibration-shot-info"
        >
          {{ $t('Auto Focus Capture Progress', [autoFocusStageLabel, autoFocusInfo.currentShot, autoFocusInfo.totalShots]) }}
        </div>
        <div v-if="autoFocusInfo.isRunning" class="calibration-running-indicator">
          <span class="calibration-running-dot"></span>
          <span class="calibration-running-text">{{ $t('Running') }}</span>
        </div>
      </div>
    </div>

    <RaDecDialog
      v-model="showRaDecDialog"
      :defaultRA="12"
      :defaultDEC="-30"
      :minRA="0" :maxRA="24"
      :minDEC="0" :maxDEC="90"
      @confirm="onRaDecDialogConfirm"
      @cancel="onRaDecDialogCancel" 
    />

    <!-- 数字键盘组件 -->
    <NumberKeyboard
      :visible="showNumberKeyboard"
      :allow-decimal="currentKeyboardItem ? allowsDecimal(currentKeyboardItem) : false"
      :allow-negative="currentKeyboardItem ? allowsNegative(currentKeyboardItem) : false"
      :title="currentKeyboardItem ? $t(currentKeyboardItem.label) : ''"
      :current-value="keyboardInputValue"
      @input="handleKeyboardInput"
      @backspace="handleKeyboardBackspace"
      @confirm="handleKeyboardConfirm"
      @close="closeNumberKeyboard"
    />

  </v-app>
</template>
<script>
import _ from 'lodash'
import Gui from '@/components/gui.vue'
import GuiLoader from '@/components/gui-loader.vue'
import swh from '@/assets/sw_helpers.js'
import Moment from 'moment'
import BackgroundImage from '@/assets/images/svg/ui/Background.svg';
import ErrorImage from '@/assets/images/svg/ui/errorImage.svg';
import ProgressBar from '@/components/ProgressBar.vue';
import MeridianFlipNotifier from '@/components/MeridianFlipNotifier.vue';
import RaDecDialog from '@/components/RaDecDialog.vue';
import NumberKeyboard from '@/components/NumberKeyboard.vue';

let glTestCircle;
let glLayer;
let glStel;

// 固定表格/规则：用于在"驱动列表"未携带 supportSDK 信息时做前端兜底判断
// 规则按 deviceType 区分，匹配 QT 端定义的驱动名称（driverName/value 和 driverLabel/label）
// 匹配逻辑：driverName 或 driverLabel 任一匹配即可
// 
// 注意：这些规则需要与后端 mainwindow.cpp 中的匹配逻辑保持一致
// 后端匹配规则（indi_Driver_Confirm）：
//   - QHY相机：indi_qhy_ccd, indi_qhy_ccd2, libqhyccd
//   - QHY电调：indi_qhy_focuser, qhy_focuser, 或包含 "qhy" 和 "focus"
const FIXED_SDK_SUPPORT_RULES = {
  // 主相机/导星相机/极轴相机：匹配 QHYCCD 驱动
  // QT端定义：SDK_DRIVER_NAME_INDI_QHY_CCD="indi_qhy_ccd", SDK_DRIVER_NAME_QHYCCD="QHYCCD"
  // 后端匹配：indi_qhy_ccd, indi_qhy_ccd2, libqhyccd
  // 前端可能显示为：driverName="indi_qhy_ccd", driverLabel="QHY CCD" 或 "QHYCCD"
  MainCamera: [
    /^indi_qhy_ccd$/i,        // 精确匹配驱动名称
    /^indi_qhy_ccd2$/i,       // 匹配 indi_qhy_ccd2（后端支持的变体）
    /^libqhyccd$/i,           // 匹配 libqhyccd（后端支持的变体）
    /^qhyccd$/i,              // 精确匹配 QHYCCD（SDK驱动名）
    /^qhy\s+ccd$/i,           // 匹配 "QHY CCD" (带空格，显示标签)
    /^qhy\s+ccd2$/i,          // 匹配 "QHY CCD2" (显示标签)
  ],
  Guider: [
    /^indi_qhy_ccd$/i,        // 精确匹配驱动名称
    /^indi_qhy_ccd2$/i,       // 匹配 indi_qhy_ccd2（后端支持的变体）
    /^libqhyccd$/i,           // 匹配 libqhyccd（后端支持的变体）
    /^qhyccd$/i,              // 精确匹配 QHYCCD（SDK驱动名）
    /^qhy\s+ccd$/i,           // 匹配 "QHY CCD" (带空格，显示标签)
    /^qhy\s+ccd2$/i,          // 匹配 "QHY CCD2" (显示标签)
  ],
  PoleCamera: [

  ],
  // 电调：匹配 QHYFocuser 驱动
  // QT端定义：SDK_DRIVER_NAME_INDI_QHY_CCD="indi_qhy_focuser", SDK_DRIVER_NAME_QHYCCD="QFocuser"
  // 后端匹配：indi_qhy_focuser, qhy_focuser, 或包含 "qhy" 和 "focus"
  // 前端可能显示为：driverName="indi_qhy_focuser", driverLabel="QFocuser"
  Focuser: [
    /^indi_qhy_focuser$/i,    // 精确匹配驱动名称
    /^qhy_focuser$/i,         // 匹配 qhy_focuser（后端支持的变体）
    /^qfocuser$/i,            // 精确匹配 QFocuser（SDK驱动名，显示标签）
    // 注意：后端的包含匹配（"qhy" 和 "focus"）在前端使用精确匹配，避免误判
    // 如果需要支持更多变体，可以添加更宽松的规则，但要小心误判
  ],
  // 如果后续要扩展更多 SDK（例如 ZWO），可在这里加规则
};

export default {
  data(context) {
    return {
      UNKNOWN_DRIVER_TYPE: 'unknown',
      menuItems: [
        { title: this.$t('View Settings'), icon: 'mdi-settings', store_var_name: 'showViewSettingsDialog', store_show_menu_item: 'showViewSettingsMenuItem' },
        { title: this.$t('Planets Tonight'), icon: 'mdi-panorama-fisheye', store_var_name: 'showPlanetsVisibilityDialog', store_show_menu_item: 'showPlanetsVisibilityMenuItem' },
        { divider: true }
      ].concat(this.getPluginsMenuItems()).concat([
        { title: this.$t('Data Credits'), footer: true, icon: 'mdi-copyright', store_var_name: 'showDataCreditsDialog' }
      ]),
      menuComponents: [].concat(this.getPluginsMenuComponents()),
      guiComponent: 'GuiLoader',
      startTimeIsSet: false,
      initDone: false,
      dataSourceInitDone: false,
      imageSrc: 'https://i.imgur.com/egA5FIv.jpeg', // 替换为你的图像路径
      cvReady: false,

      // 关闭“模糊化”：
      // - UI 毛玻璃：backdrop-filter: blur(...)
      // - 图像缩放平滑：canvas image smoothing（会让细节发糊）
      disableBackdropBlur: true,
      // 插值平滑动态策略：
      // - 'auto'：按放大倍率/瓦片层级自动开关（推荐）
      // - 'always'：始终开启
      // - 'never'：始终关闭
      imageSmoothingMode: 'auto',
      // 当主画布“放大倍率” >= 该值时，自动关闭插值平滑（更锐利）
      // 放大倍率 = 目标画布尺寸 / 当前可见区域尺寸
      imageSmoothingDisableAtUpscale: 1.25,
      canvasZIndexStel: -10,
      canvasZIndexMainCamera: -11,
      canvasZIndexGuiderCamera: -12,
      currentcanvas: 'Stel',

      WebSocketUrl: '',

      websocket: null,
      message: '',
      receivedMessages: [],// 存储接收到的消息
      sentMessages: [], // 存储已发送的消息
      messageCounter: 0, // 用于生成唯一的消息ID
      websocketState: 'disconnected', // 添加WebSocket连接状态
      networkDisconnected: false, // 添加网络连接状态

      QTClientVersion: 'Not connected',
      // VueClientVersion: process.env.VUE_APP_VERSION,
      VueClientVersion: '20260310', // 手动指定版本号

      // 全局总版本号（由 Qt 通过 WebSocket 从环境变量 QUARCS_TOTAL_VERSION 读取并发送）
      TotalVersion: '0.0.0',

      // 校准信息对象
      calibrationInfo: {
        isCalibrating: false,
        calibrationState: 'idle',
        calibrationStep: 0,
        calibrationMessage: ''
      },

      // 自动对焦信息对象 - [AUTO_FOCUS_UI_ENHANCEMENT]
      autoFocusInfo: {
        isRunning: false,
        state: 'idle',
        step: 0,
        message: '',
        // 当前自动对焦模式：full=完整自动对焦；fine=仅精调
        mode: 'full',
        // 当前阶段（coarse / fine / super_fine）
        stage: '',
        // 当前阶段拍摄进度：当前第几张 / 总张数
        currentShot: 0,
        totalShots: 0
      },
      // FitResult 结果只弹一次的开关，防止对焦失败时频繁刷提示框
      fitResultShown: false,

      // 最近一次从客户端(QT)获取的 App 版本号（通过 bus 信号统一缓存）
      AppVersion: '—',

      // Live模式下相机出图帧率（由后端SDK统计并发送）
      liveCameraFps: null,
      // 后端处理帧率（由后端处理链路统计并发送）
      liveProcessFps: null,

      // UI 刷新 FPS 统计：用于衡量浏览器端实际看到的画面刷新率
      uiFrameCount: 0,
      uiFpsLastTs: 0,

      // isMessageBoxShow: false,

      CurrentDriverType: '',
      DeviceIsConnected: null,
      confirmDriverType: '',

      MainCameraOffsetMin: 0,
      MainCameraOffsetMax: 0,

      MainCameraGainMin: 0,
      MainCameraGainMax: 0,

      GuiderOffsetMin: 0,
      GuiderOffsetMax: 0,

      GuiderGainMin: 0,
      GuiderGainMax: 0,

      devices: [
        { name: '导星镜', driverType: 'Guider', type: 'CCDs', ListNum: "1", isget: false, device: '', BaudRate: 9600, driverName: '', usbSerialPath: '', sdkVersion: '', supportSDK: false, connectionMode: 'INDI', isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_Guider' },
        { name: '主相机', driverType: 'MainCamera', type: 'CCDs', ListNum: "20", isget: false, device: '', BaudRate: 9600, driverName: '', usbSerialPath: '', sdkVersion: '', supportSDK: false, connectionMode: 'INDI', isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_MainCamera' },
        { name: '赤道仪', driverType: 'Mount', type: 'Telescopes', ListNum: "0", isget: false, device: '', BaudRate: 9600, driverName: '', usbSerialPath: '', sdkVersion: '', supportSDK: false, connectionMode: 'INDI', isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_Mount' },
        { name: '望远镜', driverType: 'Telescopes', device: '', isConnected: true },
        { name: '电动调焦器', driverType: 'Focuser', type: 'Focusers', ListNum: "22", isget: false, device: '', BaudRate: 9600, driverName: '', usbSerialPath: '', sdkVersion: '', supportSDK: false, connectionMode: 'INDI', isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_Focuser' },
        { name: '电子极轴镜', driverType: 'PoleCamera', type: 'CCDs', ListNum: "2", isget: false, device: '', BaudRate: 9600, driverName: '', usbSerialPath: '', sdkVersion: '', supportSDK: false, connectionMode: 'INDI', isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_PoleCamera' },
        { name: '滤镜轮', driverType: 'CFW', type: 'Filter Wheels', ListNum: "21", isget: false, device: '', BaudRate: 9600, driverName: '', usbSerialPath: '', sdkVersion: '', supportSDK: false, connectionMode: 'INDI', isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_CFW' },
      ],

      // Changing the label name also requires changing the emit signal name
      GuiderConfigItems: [
        { driverType: 'Guider', label: 'Guider Focal Length (mm)', value: '', inputType: 'text' },
        { driverType: 'Guider', label: 'Multi Star Guider', value: false, inputType: 'switch' },
        { driverType: 'Guider', label: 'RA Single Guide Direction', value: 'AUTO', inputType: 'select', selectValue: ['AUTO', 'WEST', 'EAST'] },
        { driverType: 'Guider', label: 'DEC Single Guide Direction', value: 'AUTO', inputType: 'select', selectValue: ['AUTO', 'NORTH', 'SOUTH'] },
        { driverType: 'Guider', label: 'Gain', value: 0, inputType: 'slider', inputMin: 0, inputMax: 0, inputStep: 1 },
        { driverType: 'Guider', label: 'Offset', value: 0, inputType: 'slider', inputMin: 0, inputMax: 0, inputStep: 1 },
        // { driverType: 'Guider', label: 'Guider Pixel size', value: '', inputType: 'text'},
        // { driverType: 'Guider', label: 'Guider Gain', value: '', inputType: 'slider', inputMin: 0, inputMax: 100, inputStep: 1 },
        // { driverType: 'Guider', label: 'Calibration step (ms)', value: '', inputType: 'text' },
        // { driverType: 'Guider', label: 'Ra Aggression', value: '', inputType: 'slider', inputMin: 0, inputMax: 100, inputStep: 1 },
        // { driverType: 'Guider', label: 'Dec Aggression', value: '', inputType: 'slider', inputMin: 0, inputMax: 100, inputStep: 1 },

      ],

      MainCameraConfigItems: [
        // vue处理参数
        { driverType: 'MainCamera', label: 'ImageCFA', value: 'null', inputType: 'select', selectValue: ['GR', 'GB', 'BG', 'RGGB', 'null'] },
        // 硬件处理参数
        { driverType: 'MainCamera', label: 'Binning', value: '', inputType: 'slider', inputMin: 1, inputMax: 16, inputStep: 1 },
        { driverType: 'MainCamera', label: 'Temperature', value: '-5', inputType: 'select', selectValue: [5, 0, -5, -10, -15, -20, -25] },
        { driverType: 'MainCamera', label: 'Gain', value: '', inputType: 'slider', inputMin: 0, inputMax: 0, inputStep: 1 },
        { driverType: 'MainCamera', label: 'Offset', value: '', inputType: 'slider', inputMin: 0, inputMax: 0, inputStep: 1 },

        { driverType: 'MainCamera', label: 'LoopCaptureNum', value: 0, inputType: 'number', min: 0,max: 1000, step: 1 },  // 循环拍摄次数

        // QHYCCD SDK 专用：主相机三态采集模式（Single / Live / Burst）
        { driverType: 'MainCamera', label: 'Capture Mode', value: 'Single', inputType: 'select', selectValue: ['Single', 'Live', 'Burst'], qhyOnly: true },
        { driverType: 'MainCamera', label: 'Burst Frames', value: 20, inputType: 'number', min: 1, max: 1024, step: 1, qhyOnly: true },

        { driverType: 'MainCamera', num: 1, label: 'Self Exposure Time (ms)', value: 0, inputType: 'number' }, // 自曝光时间
        
        { driverType: 'MainCamera', label: 'Auto Save', value: false, inputType: 'switch' }, // 自动保存
        { driverType: 'MainCamera', label: 'Save Failed Parse', value: false, inputType: 'switch' }, // 保存解析失败图片
        { driverType: 'MainCamera', label: 'Save Folder', value: 'local', inputType: 'select' ,selectValue: ['local']}, // 保存文件夹
        { driverType: 'MainCamera', label: 'Tile Build Mode', value: 'pyramid', inputType: 'select', selectValue: ['pyramid', 'merged_single_level'] }, // 瓦片构建模式
        // 循环拍摄
        // { driverType: 'MainCamera', label: 'Exposuer delay', value: 0, inputType: 'number' }, // 循环拍摄间隔时间
        // { driverType: 'MainCamera', label: 'Loop Capture', value: false, inputType: 'switch' },  // 循环拍摄

      ],

      MountConfigItems: [
        { driverType: 'Mount', label: 'Flip ETA', value: '00:00:00', displayValue: '00:00:00', inputType: 'tip' },
        { driverType: 'Mount', label: 'GotoThenSolve', value: false, inputType: 'switch' },
        { driverType: 'Mount', label: 'SolveCurrentPosition', inputType: 'button', buttonText: 'SolveCurrentPosition', buttonTextWhenDisabled: 'Solving...', isDisabled: false },
        {driverType: 'Mount',label: 'Goto', inputType: 'button', buttonText: 'Goto', buttonTextWhenDisabled: 'Goto (Busy)', _disabled: false,},
      ],


      TelescopesConfigItems: [
        { driverType: 'Telescopes', num: 1, label: 'Focal Length (mm)', value: '', inputType: 'number' },
      ],

      FocuserConfigItems: [
        { driverType: 'Focuser', num: 2, label: 'Min Limit', value: '', inputType: 'tip' },
        { driverType: 'Focuser', num: 2, label: 'Max Limit', value: '', inputType: 'tip' },
        { driverType: 'Focuser', num: 2, label: 'Sync Focuser Step', value: '', inputType: 'number' , min: 0, step: 1 },
        { driverType: 'Focuser', num: 2, label: 'Steps per Click', value: 50, inputType: 'number', min: 1, step: 1 },
        { driverType: 'Focuser', num: 2, label: 'Backlash', value: '', inputType: 'number' },
        { driverType: 'Focuser', num: 2, label: 'Coarse Step Divisions', value: 10, inputType: 'number', min: 1, step: 1 },
        { driverType: 'Focuser', num: 2, label: 'AutoFocus Exposure Time (ms)', value: 1000, inputType: 'number', min: 1, step: 1 },
      ],

      PoleCameraConfigItems: [

      ],

      CFWConfigItems: [
        { driverType: 'CFW', label: 'CFW Prev', inputType: 'button', buttonText: 'CFW Prev', buttonTextWhenDisabled: 'Moving...', _disabled: false, isCfwMenuControl: true, cfwDirection: 'minus' },
        { driverType: 'CFW', label: 'CFW Current', inputType: 'tip', value: '-', isCfwMenuDisplay: true },
        { driverType: 'CFW', label: 'CFW Next', inputType: 'button', buttonText: 'CFW Next', buttonTextWhenDisabled: 'Moving...', _disabled: false, isCfwMenuControl: true, cfwDirection: 'plus' },
      ],
      cfwMenuButtonsDisabled: false,
      cfwMenuCurrentIndex: 0,
      cfwMenuLastConfirmedIndex: 0,

      BeforeChangeConfigItems: [],



      imageData: null,

      histogramImage: null,
      histogram_min: 0,    // 直方图自动拉伸的最小值
      histogram_max: 255,  // 直方图自动拉伸的最大值

      currentHistogramMin: 0,
      currentHistogramMax: 255,

      ImageGainR: 1,
      ImageGainB: 1,

      ImageOffset: 0,

      ImageCFA: 'BG',

      cameraBin: 1,   // 当前相机binning

      CanvasWidth: 1920,  // 主画布宽度
      CanvasHeight: 1080, // 主画布高度

      scale: 1, // 缩放比例
      translateX: 0, // 平移x坐标
      translateY: 0, // 平移y坐标
      bufferCanvas: null, // 存储画布
      bufferCtx: null, // 存储画布上下文
      tempCanvas: null, // 临时画布
      tempCtx: null, // 临时画布上下文

      visibleWidth: 0, // 可见区域宽度
      visibleHeight: 0, // 可见区域高度
      visibleX: 0, // 可见区域x坐标
      visibleY: 0, // 可见区域y坐标
      isDragging: false, // 标记画布是否正在拖动
      pendingScaleChange: false, // 标记画布是否正在缩放

      touchStartX: 0, // 触摸开始x坐标
      touchStartY: 0, // 触摸开始y坐标
      startDistance: 0, // 触摸开始距离

      moveIntervalId: null, // 拖动定时器
      zoomIntervalId: null, // 缩放定时器


      imageWidth: 0, // 图像宽度
      imageHeight: 0, // 图像高度
      drawImgData: null,
      OriginalImage: null,
      detectStarsImg: null,

      isNotDrawStars: true,

      mainCameraSizeX: 0,
      mainCameraSizeY: 0,

      showImageSizeX: 0,
      showImageSizeY: 0,

      // ========================= 瓦片金字塔相关 =========================
      TILE_PATH_SUFFIX: 'img/capture-tiles',  // 与 nginx location /img/capture-tiles/ 对应
      TILE_DEBUG: true,   // 瓦片调试：true 时在控制台打印加载/渲染诊断，定位“局部瓦片不对”等问题
      tileGPM: null,              // 全局处理元数据
      tileSessionId: null,        // 当前瓦片会话ID
      tileFrameId: null,          // 当前瓦片帧ID（用于丢弃旧帧瓦片/防错帧拉伸）
      // E2E：出图成功信号（每次收到 TileGPM 自增；用于 Playwright 等待真实状态变化）
      e2eTileGpmSeq: 0,
      tileCache: null,            // 瓦片缓存 Map<"z/x/y", ImageData> (在initCanvas中初始化)
      tileRawDataCache: null,     // 原始瓦片数据缓存 Map<"z/x/y", {width, height, type, data}> (在initCanvas中初始化)
      tilePendingLoads: null,     // 正在加载的瓦片集合 (在initCanvas中初始化)
      tileAbortControllers: null, // 瓦片加载取消控制器 Map<"z/x/y", AbortController> (在initCanvas中初始化)
      tileLoadQueue: [],          // 瓦片加载队列
      maxConcurrentTileLoads: 4,  // 最大并发加载数（live 覆盖写时过高会放大请求风暴/失败率）
      currentTileLoads: 0,        // 当前加载数
      tileLoadBatchSeq: 0,        // 可见瓦片加载批次号（用于“全齐再显示”屏障）
      activeTileLoadBatchId: 0,   // 当前有效批次ID（视窗变化/新帧会覆盖旧批次）
      tileLoadWaiters: null,      // 等待某瓦片完成的回调 Map<"z/x/y", Function[]>
      tileBatchMaxWaitMs: 1200,   // 单批次最长等待时长（避免网络异常导致无限等待）
      tileAllowIncrementalRender: false, // 首次批量渲染完成后，允许晚到瓦片增量补绘
      tileRetryTimers: null,      // 后端尚未生成完成时的重试定时器 Map<"z/x/y", Timeout>
      tileRetryCounts: null,      // 瓦片重试次数 Map<"z/x/y", number>
      tileRenderRaf: null,        // 合并晚到瓦片的重绘请求，避免每片都立即重绘
      tileCanvas: null,           // 瓦片合成画布
      tileCtx: null,              // 瓦片合成画布上下文
      viewportChangeTimer: null,  // 视窗变化防抖定时器
      currentVisibleTiles: null,  // 当前可见的瓦片集合 Set<"z/x/y">
      tileHistogram: null,        // 当前会话直方图 { sessionId, bins, total, counts }
      autoStretchBlackLevel: null, // 保存初始自动拉伸的黑点参数
      autoStretchWhiteLevel: null, // 保存初始自动拉伸的白点参数
      // Live 模式 TileGPM 节流：避免高帧率下每条 TileGPM 都清缓存/abort，导致“永远拉不齐一帧”
      liveTileGpmThrottleMs: 250,   // 建议 200~400ms（对应 5~2.5fps）
      liveTileGpmLastHandledAt: 0,
      pendingLiveTileGpm: null,
      pendingLiveTileGpmTimer: null,
      // ========================= 瓦片金字塔相关结束 =========================

      // 记忆瓦片层级：当再次拍摄（新 TileGPM 会话）时，若 maxZoomLevel 未变化则保持在此前层级
      preferredTileZ: null,
      preferredTileMaxZoomLevel: null,
      // 记忆瓦片缩放比例（连续值），用于精确恢复缩放程度（不仅是离散层级）
      preferredTileScale: null,
      // 记忆瓦片视野中心（归一化到 0..1），用于新拍摄时恢复位置（尺寸变化也能复用）
      preferredTileCenterNormX: null,
      preferredTileCenterNormY: null,

      ImageProportion: 0,

      DetectedStarsList: [],
      DetectedStarsFinish: false,

      CartesianList: [],

      PolarPoint_Altitude: 0,

      LastPoint_AzAlt: null,

      MarkCircleNum: 0,

      LastCircle_RaDec: null,
      LastCircle_AzAlt: null,

      Circles: [],

      // 极轴校准相关数组
      calibrationCircles: [],  // 校准点圆圈数组
      adjustmentCircles: [],   // 调整点圆圈数组
      targetPointCircle: null, // 目标点圆形对象
      fakePolarAxisCircle: null, // 假极点圆形对象
      lastPosition: null,      // 上一次位置
      fieldUpdateTimer: null,  // 视场更新定时器
      fieldOfViewPolygons: [], // 存储视场多边形对象

      drawer_2: null,    // 设置侧边栏的显示与隐藏
      // 子菜单内容刷新 nonce：用于在不关闭 drawer 的情况下强制重建子菜单内容区
      submenuRenderNonce: 0,

      drivers: [], // 驱动选项数组
      selectedDriver: null, // 选中的驱动

      // 连接模式（INDI/SDK）相关：仅当驱动支持 SDK 时显示
      selectedConnectionMode: 'INDI',
      isSettingConnectionMode: false,
      // 下拉框选项（使用 $t 做本地化）
      connectionModeItems: [
        { label: this.$t('INDI'), value: 'INDI' },
        { label: this.$t('SDK'), value: 'SDK' },
      ],
      // 后端下发的能力缓存：优先使用；格式 { [deviceType]: { [driverName]: boolean } }
      sdkSupportCache: {},
      // 模式设置请求的待处理缓存：{ [deviceType]: { prev: 'INDI'|'SDK', next: 'INDI'|'SDK' } }
      pendingConnectionModeByDevice: {},

      devicesList: [], // 设备选项数组
      selectedDevice: null, // 选中的设备
      ToBeConnectDevice: [],

      loadingSelectDriver: false,
      loadingConnectAllDevice: false,

      CurrentLocationLng: 0,
      CurrentLocationLat: 0,

      histogramData: [],

      ImageArrayBuffer: null,

      isOpenDevicePage: false, // 设置设备页面是否打开
      isOpenPowerPage: false, // 设置电源页面是否打开

      OutPutPower_1_ON: true,
      OutPutPower_2_ON: false,

      isPolarAxisMode: false,

      isTouching: false, // 标记是否正在处理触摸事件
      ConnectBtnPressTimer: null,
      ConnectBtnlongPressThreshold: 1000,
      isConnectBtnLongPress: false, // 标记是否为长按
      ConnectBtnCanClick: true,
      // 触摸后浏览器可能会额外触发一组合成鼠标事件（mousedown/mouseup），用这个窗口期屏蔽掉
      ignoreMouseEventsUntil: 0,


      haveDeviceConnect: false,
      isConnecting: false, // 添加连接状态

      disconnectTimeoutTriggered: false,
      disconnectTimeout: null,

      isDownloadingImage: false,
      isDownloadingImageName: '',
      isWaitingLogged: false, // 添加等待日志标志

      showDisconnectDialog: false,
      currentDisconnectDriverName: '',

      enableMainCanvasClick: false, // 控制画布是否可以点击，用来移动调焦选择框和选星

      lastImageProcessParams: { // 最后处理图像的参数
        blackLevel: 0,
        whiteLevel: 65535,
        CFA: 'null',
        analysis: null,
        isColorCamera: false,
      },
      focuserPictureFileName: '',  // 焦距图片文件名
      isProcessingImage: false,   // 控制是否正在处理图像
      isFocusLoopShooting: false,  // 控制是否进行ROi循环拍摄
      focuserROIStarsList: [],  // 用来保存ROI区域的星点列表，分别保存x,y,HFR
      selectStarX: -1,
      selectStarY: -1,
      DrawSelectStarX: -1,
      DrawSelectStarY: -1,
      DrawSelectStarHFR: -1,
      ROI_x: -1,    // 用来保存ROI区域的x坐标,在vue中计算
      ROI_y: -1,    // 用来保存ROI区域的y坐标,在vue中计算
      ROI_x_qt: -1,    // 用来保存ROI区域的x坐标,在qt中计算
      ROI_y_qt: -1,    // 用来保存ROI区域的y坐标,在qt中计算
      ROI_length: 300, // 用来保存ROI区域的长度
      // ROI 循环帧叠加层（用于瓦片模式下的 ROI 更新，避免被 renderTiles 覆盖）
      roiOverlayImageData: null, // ImageData
      roiOverlayX: 0,
      roiOverlayY: 0,
      showSelectStar: false,

      isOneTouch: false,
      currentTouchX: [0, 0],
      currentTouchY: [0, 0],
      startTouchX: [0, 0],
      startTouchY: [0, 0],
      startTouchDistance: 0,

      // 定义波特率选项
      BaudRateItems: [
        { label: '9600', value: 9600 },
        { label: '19200', value: 19200 },
        { label: '38400', value: 38400 },
        { label: '57600', value: 57600 },
        { label: '115200', value: 115200 },
        { label: '230400', value: 230400 },
      ],
      BaudRateSelected: 9600, // 波特率选择

      // 串口选择（在连接面板中，位于波特率下方）
      mountSerialPortItems: [],
      // v-model 保存真实串口路径，或 'default' 表示自动匹配
      mountSerialPortSelected: 'default',
      focuserSerialPortItems: [],
      focuserSerialPortSelected: 'default',
      cpuTemp: null,  // CPU温度
      cpuUsage: null, // CPU使用率

      progressValue: 0,// 控制图像处理进度条的变量
      progressDescription: '', // 控制进度条显示内容

      calculateGain: true, // 控制是否计算白平衡增益
      lutCache: {
        lastParams: null, // 用于存储上次的参数
        lutR: null,
        lutG: null,
        lutB: null
      },

      showRaDecDialog: false, // 控制是否显示设置GOTO目标对话框

      // 数字键盘相关状态
      showNumberKeyboard: false,
      currentKeyboardItem: null, // 当前正在编辑的配置项
      keyboardInputValue: '', // 键盘输入的值
    }
  },
  components: {
    Gui,
    GuiLoader,
    ProgressBar,
    MeridianFlipNotifier,
    RaDecDialog,
    NumberKeyboard,
    // MessageBox,
  },
  created() {
    this.$bus.$on('AppSendMessage', this.sendMessage);
    this.$bus.$on('AppUpdateDevices', this.updateDevices);
    this.$bus.$on('Switch-MainPage', this.handleButtonTestClick);
    this.$bus.$on('HandleHistogramNum', this.applyHistStretch);
    this.$bus.$on('ImageGainR', this.ImageGainSet);
    this.$bus.$on('ImageGainB', this.ImageGainSet);
    // this.$bus.$on('Offset', this.ImageOffsetSet);
    // this.$bus.$on('Binning', this.BinningSet);
    // this.$bus.$on('Gain', this.GainSet);
    // this.$bus.$on('Offset', this.OffsetSet);
    // this.$bus.$on('ImageCFA', this.ImageCFASet);
    // this.$bus.$on('Self Exposure Time (ms)', this.SelfExposureTimeSet);
    this.$bus.$on('getSelfExposureTime', this.getSelfExposureTime);
    // this.$bus.$on('MainCameraCFA', this.ImageCFASet);
    // this.$bus.$on('Temperature', this.CameraTemperatureSet);
    this.$bus.$on('Focal Length (mm)', this.FocalLengthSet);
    this.$bus.$on('Guider Focal Length (mm)', this.GuiderFocalLengthSet);
    this.$bus.$on('Multi Star Guider', this.MultiStarGuiderSet);
    this.$bus.$on('RA Single Guide Direction', this.GuiderRaSingleGuideDirSet);
    this.$bus.$on('DEC Single Guide Direction', this.GuiderDecSingleGuideDirSet);
    this.$bus.$on('Guider Pixel size', this.GuiderPixelSizeSet);
    this.$bus.$on('Guider Gain', this.GuiderGainSet);
    this.$bus.$on('Calibration step (ms)', this.CalibrationDurationSet);
    this.$bus.$on('Ra Aggression', this.RaAggressionSet);
    this.$bus.$on('Dec Aggression', this.DecAggressionSet);
    this.$bus.$on('Sync Focuser Step', this.SyncFocuserStep);
    this.$bus.$on('Steps per Click', this.StepsPerClickSet);
    this.$bus.$on('Min Limit', this.MinLimitSet);
    this.$bus.$on('Max Limit', this.MaxLimitSet);
    this.$bus.$on('Backlash', this.BacklashSet);
    this.$bus.$on('Coarse Step Divisions', this.CoarseStepDivisionsSet);
    this.$bus.$on('AutoFocus Exposure Time (ms)', this.AutoFocusExposureTimeSet);
    this.$bus.$on('GotoThenSolve', this.GotoThenSolve);    // 切换GOTO后是否解析的信号
    this.$bus.$on('SolveCurrentPosition', this.SolveCurrentPosition);  // 实现解析当前位置的信号
    this.$bus.$on('Loop Capture', this.LoopCapture);
    this.$bus.$on('Goto', this.Goto);
    // this.$bus.$on('Auto Save', this.AutoSave);
    // this.$bus.$on('Save Folder', this.SaveFolderSet);
    this.$bus.$on('AutoFlip', this.AutoFlipSet);
    this.$bus.$on('WestMinutesPastMeridian', this.WestMinutesPastMeridianSet);
    this.$bus.$on('EastMinutesPastMeridian', this.EastMinutesPastMeridianSet);
    this.$bus.$on('ImageProportion', this.setImageProportion);
    this.$bus.$on('MountGoto', this.lookatcircle);
    this.$bus.$on('SwitchImageToShow', this.SwitchImageToShow);
    this.$bus.$on('PolarPointAltitude', this.setPolarPointAltitude);
    this.$bus.$on('showStelCanvas', this.showStelCanvas);
    this.$bus.$on('RecalibratePolarAxis', this.RecalibratePolarAxis);
    // 统一缓存 appVersion，便于后续任意组件读取
    this.$bus.$on('appVersion', (ver) => {
      this.AppVersion = ver || '—';
      // app 版本变更时，同步发出一次 SystemVersion，保证 System Version 区块能立即显示
      this.$bus.$emit('SystemVersion', this.TotalVersion, this.QTClientVersion, this.VueClientVersion);
    });
    this.$bus.$on('CurrentExpTimeList', this.CurrentExpTimeList);
    this.$bus.$on('disconnectAllDevice', this.disconnectAllDevice);
    this.$bus.$on('GetConnectedDevices', this.ReturnConnectedDevices);
    this.$bus.$on('GetCurrentConnectedDevices', this.ReturnCurrentConnectedDevices);
    this.$bus.$on('CurrentCFWList', this.CurrentCFWList);
    this.$bus.$on('calcWhiteBalanceGains', this.calcWhiteBalanceGains);
    this.$bus.$on('SwitchOutPutPower', this.SwitchOutPutPower);
    this.$bus.$on('PolarAxisMode', this.PolarAxisMode);
    this.$bus.$on('SendConsoleLogMsg', this.SendConsoleLogMsg);
    // this.$bus.$on('DisconnectDriverSuccess', this.disconnectDriversuccess);
    this.$bus.$on('UnBindingDevice', this.UnBindingDevice);
    this.$bus.$on('CloseWebView', this.QuitToMainApp)
    this.$bus.$on('RedBoxSizeChange', this.RedBoxSizeChange);
    this.$bus.$on('setFocuserState', this.setFocuserState);  // 设置调焦状态和进度
    this.$bus.$on('setShowSelectStar', this.setShowSelectStar);  // 设置是否显示选择星点
    this.$bus.$on('ScaleChange', this.ScaleChange);
    this.$bus.$on('showCanvas', this.showCanvas);
    this.$bus.$on('getMountAutoFlip', this.sendMountAutoFlip);  // 子组件获取赤道仪自动翻转模式
    // 极轴校准绘制相关监听器
    this.$bus.$on('DrawCalibrationPointPolygon', this.drawCalibrationPointPolygon);
    this.$bus.$on('ClearCalibrationPoints', this.clearCalibrationPoints);
    this.$bus.$on('DrawAdjustmentPointsPolygon', this.drawAdjustmentPointsPolygon);
    this.$bus.$on('DrawTargetPointCircle', this.drawTargetPointCircle);
    this.$bus.$on('DrawFakePolarAxisCircle', this.DrawFakePolarAxisCircle)

    // 校准相关事件监听器
    this.$bus.$on('StartCalibration', this.startCalibrationProcess);
    this.$bus.$on('UpdateCalibrationInfo', this.updateCalibrationInfo);
    this.$bus.$on('EndCalibration', this.endCalibration);

    // 自动对焦相关事件监听器 - [AUTO_FOCUS_UI_ENHANCEMENT]
    this.$bus.$on('StartAutoFocus', this.startAutoFocusProcess);
    this.$bus.$on('UpdateAutoFocusStep', this.updateAutoFocusStep);
    this.$bus.$on('EndAutoFocus', this.endAutoFocus);

    // 曝光状态（页面刷新后由后端通知同步）
    this.$bus.$on('CameraInExposuring', (state) => {
      if (state === 'True') {
        this.$startFeature(['MainCamera'], 'Capture');
      } else {
        this.$stopFeature(['MainCamera'], 'Capture');
      }
    });

    // 设备连接状态同步到全局设备管理
    this.$bus.$on('MainCameraConnected', (num) => {
      const connected = num === 1;
      this.$store.commit('device/SET_DEVICE_CONNECTED', { device: 'MainCamera', connected });
      // 断开连接时，将 bound 重置为 true（默认不限制）；实际绑定状态会在连接成功时由 updateDevicesConnect 再同步
      if (!connected) this.$store.commit('device/SET_DEVICE_BOUND', { device: 'MainCamera', bound: true });
      if (!connected) this.$store.commit('device/CLEAR_FEATURES', { device: 'MainCamera' });
    });
    this.$bus.$on('MountConnected', (num) => {
      const connected = num === 1;
      this.$store.commit('device/SET_DEVICE_CONNECTED', { device: 'Mount', connected });
      if (!connected) this.$store.commit('device/CLEAR_FEATURES', { device: 'Mount' });
    });
    this.$bus.$on('FocuserConnected', (num) => {
      const connected = num === 1;
      this.$store.commit('device/SET_DEVICE_CONNECTED', { device: 'Focuser', connected });
      if (!connected) this.$store.commit('device/CLEAR_FEATURES', { device: 'Focuser' });
    });
    this.$bus.$on('GuiderConnected', (num) => {
      const connected = num === 1;
      this.$store.commit('device/SET_DEVICE_CONNECTED', { device: 'GuiderCamera', connected });
      if (!connected) this.$store.commit('device/CLEAR_FEATURES', { device: 'GuiderCamera' });
    });
    this.$bus.$on('CFWConnected', (num) => {
      const connected = num === 1;
      this.$store.commit('device/SET_DEVICE_CONNECTED', { device: 'CFW', connected });
      if (!connected) this.$store.commit('device/CLEAR_FEATURES', { device: 'CFW' });
    });

    this.memoryCheckInterval = setInterval(this.checkMemoryUsage, 30000);


  },
  methods: {
    // 每当“UI完成一帧刷新”的信号到来时调用，用于统计 UI 刷新 FPS
    // 说明：后端使用 ExposureCompleted 作为“刷新一帧”的信号，因此这里以 ExposureCompleted 作为 UI FPS 的统计触发。
    onLiveFramePresented () {
      const now = (typeof performance !== 'undefined' && performance.now)
        ? performance.now()
        : Date.now()

      if (!this.uiFpsLastTs) {
        this.uiFpsLastTs = now
        this.uiFrameCount = 0
        return
      }

      this.uiFrameCount += 1
      const elapsed = now - this.uiFpsLastTs

      if (elapsed >= 1000) {
        const fps = this.uiFrameCount * 1000.0 / elapsed
        if (Number.isFinite(fps)) {
          this.$bus.$emit('UIFPS', fps)
        }
        this.uiFrameCount = 0
        this.uiFpsLastTs = now
      }
    },
    // =========================
    // MainCamera / Guider 模式联动与锁定逻辑
    // =========================
    normalizeDriverKey(name) {
      const n = String(name || '').trim();
      if (!n) return '';
      const u = n.toUpperCase();
      // 防护：避免将占位符当作驱动
      if (u === 'SDK' || u === 'INDI') return '';
      return n.toLowerCase();
    },
    getDeviceByType(deviceType) {
      return (this.devices || []).find(d => d.driverType === deviceType) || null;
    },
    isMainGuiderSameDriver() {
      const main = this.getDeviceByType('MainCamera');
      const guider = this.getDeviceByType('Guider');
      const mk = this.normalizeDriverKey(main && main.driverName);
      const gk = this.normalizeDriverKey(guider && guider.driverName);
      return !!(mk && gk && mk === gk);
    },
    anySdkConnectedInMainGuider() {
      const main = this.getDeviceByType('MainCamera');
      const guider = this.getDeviceByType('Guider');
      const mainSdkConnected = !!(main && main.isConnected && String(main.connectionMode || '').toUpperCase() === 'SDK');
      const guiderSdkConnected = !!(guider && guider.isConnected && String(guider.connectionMode || '').toUpperCase() === 'SDK');
      return mainSdkConnected || guiderSdkConnected;
    },
    anyIndiConnectedInMainGuider() {
      const main = this.getDeviceByType('MainCamera');
      const guider = this.getDeviceByType('Guider');
      const mainIndiConnected = !!(main && main.isConnected && String(main.connectionMode || 'INDI').toUpperCase() !== 'SDK');
      const guiderIndiConnected = !!(guider && guider.isConnected && String(guider.connectionMode || 'INDI').toUpperCase() !== 'SDK');
      return mainIndiConnected || guiderIndiConnected;
    },
    ensureMainGuiderModeConsistency(preferDeviceType = '') {
      // 仅在同驱动时要求一致
      if (!this.isMainGuiderSameDriver()) return;

      const main = this.getDeviceByType('MainCamera');
      const guider = this.getDeviceByType('Guider');
      if (!main || !guider) return;

      const mainMode = (String(main.connectionMode || 'INDI').toUpperCase() === 'SDK') ? 'SDK' : 'INDI';
      const guiderMode = (String(guider.connectionMode || 'INDI').toUpperCase() === 'SDK') ? 'SDK' : 'INDI';

      // 若已存在 SDK 连接，则强制双方都锁到 SDK（并阻止切回 INDI）
      if (this.anySdkConnectedInMainGuider()) {
        if (mainMode !== 'SDK') this.requestSetConnectionMode('MainCamera', 'SDK', { silent: true, fromPeer: true });
        if (guiderMode !== 'SDK') this.requestSetConnectionMode('Guider', 'SDK', { silent: true, fromPeer: true });
        return;
      }

      // 若已存在 INDI 连接，则强制双方都锁到 INDI（并阻止切到 SDK）
      if (this.anyIndiConnectedInMainGuider()) {
        if (mainMode !== 'INDI') this.requestSetConnectionMode('MainCamera', 'INDI', { silent: true, fromPeer: true });
        if (guiderMode !== 'INDI') this.requestSetConnectionMode('Guider', 'INDI', { silent: true, fromPeer: true });
        return;
      }

      // 无锁：若不一致，则以触发方（或当前 UI 选中值）为准同步另一方
      if (mainMode !== guiderMode) {
        let desired = 'INDI';
        if (preferDeviceType === 'MainCamera') desired = mainMode;
        else if (preferDeviceType === 'Guider') desired = guiderMode;
        else desired = (String(this.selectedConnectionMode || '').toUpperCase() === 'SDK') ? 'SDK' : 'INDI';

        if (mainMode !== desired) this.requestSetConnectionMode('MainCamera', desired, { silent: true, fromPeer: true });
        if (guiderMode !== desired) this.requestSetConnectionMode('Guider', desired, { silent: true, fromPeer: true });
      }
    },
    // 确保主相机的“USB Traffic”配置项存在；若不存在则动态插入到 Offset 后面
    // 返回该 item（若无法插入则返回 null）
    ensureMainCameraUsbTrafficItem() {
      if (!this.MainCameraConfigItems) return null;

      let item = this.MainCameraConfigItems.find(it => it && it.label === 'USB Traffic');
      if (item) return item;

      const offsetIndex = this.MainCameraConfigItems.findIndex(it => it && it.label === 'Offset');
      if (offsetIndex === -1) return null;

      item = {
        driverType: 'MainCamera',
        label: 'USB Traffic',
        value: 0,
        inputType: 'slider',
        inputMin: 0,
        inputMax: 0,
        inputStep: 1,
      };
      this.MainCameraConfigItems.splice(offsetIndex + 1, 0, item);
      return item;
    },
    bumpSubmenuRender() {
      // 仅在子菜单打开时再刷新，避免无意义的重建
      if (this.drawer_2) {
        this.submenuRenderNonce += 1;
      }
    },
    isNotBindDevice(name) {
      return (name || '').trim() === 'Not Bind Device';
    },
    // 串口选择变更：在连接面板中（波特率下方）选择串口
    onSerialPortSelect(driverType, value) {
      // 'default' 表示使用自动匹配逻辑，不强制指定串口
      if (!value || value === 'default') {
        this.SendConsoleLogMsg(driverType + ' Serial Port: default(auto-detect)', 'info');
        this.sendMessage('Vue_Command', 'SetSerialPort:' + driverType + ':default');
        return;
      }
      this.SendConsoleLogMsg(driverType + ' Serial Port:' + value, 'info');
      this.sendMessage('Vue_Command', 'SetSerialPort:' + driverType + ':' + value);
    },
    onButtonPress(item) {
      // 未绑定时：所有参数设置不可操作
      if (this.isCurrentDeviceUnbound) return;
      if (item && item.driverType === 'CFW' && item.isCfwMenuControl) {
        this.handleCfwMenuButtonClick(item);
        return;
      }
      // 禁用按钮
      this.$set(item, '_disabled', true);

      // 可选：更新文字或发送事件
      this.handleConfigChange(item.label, true, item.driverType);
    },

    reEnableButton(label) {
      const item = this.MountConfigItems.find(item => item.label === label);
      if (item) {
        this.$set(item, '_disabled', false);
      }
      // this.handleConfigChange(item.label, false);
    },
    getCfwPositionCount() {
      return this.CFWConfigItems.filter(item => /^CFW \[\d+\]$/.test(String(item.label || ''))).length;
    },
    getCfwMenuDisplayItem() {
      return this.CFWConfigItems.find(item => item && item.isCfwMenuDisplay);
    },
    getCfwLabelValueByIndex(index) {
      const cfwItem = this.CFWConfigItems.find(item => item && item.label === `CFW [${index + 1}]`);
      if (cfwItem && cfwItem.value !== '' && cfwItem.value != null) {
        return String(cfwItem.value);
      }
      return String(index + 1);
    },
    updateCfwMenuCurrentDisplay() {
      const displayItem = this.getCfwMenuDisplayItem();
      if (!displayItem) return;
      const total = this.getCfwPositionCount();
      if (total <= 0) {
        this.$set(displayItem, 'value', '-');
        return;
      }
      let index = parseInt(this.cfwMenuCurrentIndex, 10);
      if (!Number.isFinite(index) || index < 0) index = 0;
      if (index >= total) index = total - 1;
      this.cfwMenuCurrentIndex = index;
      this.$set(displayItem, 'value', this.getCfwLabelValueByIndex(index));
    },
    setCfwMenuButtonsDisabled(disabled) {
      this.cfwMenuButtonsDisabled = disabled;
      this.CFWConfigItems.forEach(item => {
        if (item && item.isCfwMenuControl) {
          this.$set(item, '_disabled', disabled);
        }
      });
    },
    handleCfwMenuButtonClick(item) {
      if (this.cfwMenuButtonsDisabled) return;
      const cfwDevice = this.getDeviceByType('CFW');
      if (!(cfwDevice && cfwDevice.isConnected)) {
        this.callShowMessageBox('Please connect the Filter Wheels first.', 'error');
        return;
      }
      const total = this.getCfwPositionCount();
      if (total <= 0) {
        this.callShowMessageBox('No filter wheel slots found.', 'error');
        return;
      }
      const direction = item.cfwDirection === 'plus' ? 'plus' : 'minus';
      let nextIndex = this.cfwMenuCurrentIndex;
      if (direction === 'plus') {
        nextIndex = nextIndex < total - 1 ? nextIndex + 1 : 0;
      } else {
        nextIndex = nextIndex > 0 ? nextIndex - 1 : total - 1;
      }
      this.cfwMenuCurrentIndex = nextIndex;
      this.updateCfwMenuCurrentDisplay();
      this.setCfwMenuButtonsDisabled(true);
      this.SendConsoleLogMsg('SetCFWPosition:' + (nextIndex + 1), 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'SetCFWPosition:' + (nextIndex + 1));
    },
    // 是否允许小数：step 不是整数，或显式允许
    allowsDecimal(item) {
      const step = item.step ?? 1;
      return item.allowDecimal === true || !Number.isInteger(step) || String(step).includes('.');
    },
    // 是否允许负数：根据配置或 min<0 猜测
    allowsNegative(item) {
      return item.allowNegative === true || (typeof item.min === 'number' && item.min < 0);
    },
    // 移动端键盘类型
    getInputMode(item) {
      // 仅移动端生效；桌面忽略
      if (!this.isMobile) return undefined;
      // 需要小数或负数，用 decimal（更容易出现小数点/负号）
      return this.allowsDecimal(item) || this.allowsNegative(item) ? 'decimal' : 'numeric';
    },
    // 配合 iOS：pattern 可影响弹出键盘与校验
    getPattern(item) {
      const neg = this.allowsNegative(item);
      if (this.allowsDecimal(item)) {
        // 允许 . 或 , 作为小数点，便于不同语言键盘
        return neg ? '^[-]?[0-9]*([.,][0-9]*)?$' : '^[0-9]*([.,][0-9]*)?$';
      }
      // 整数
      return neg ? '^[-]?[0-9]*$' : '^[0-9]*$';
    },

    numberRules(item) {
      return [
        v => v === '' || v === null || !isNaN(this._toNumber(v)) || '请输入数字',
        v => item.min === undefined || this._toNumber(v) >= item.min || `最小值 ${item.min}`,
        v => item.max === undefined || this._toNumber(v) <= item.max || `最大值 ${item.max}`,
      ];
    },

    // 统一把逗号小数转为点，去掉多余空白
    _toNumber(v) {
      if (v === '' || v === null || v === undefined) return NaN;
      if (typeof v === 'number') return v;
      const s = String(v).trim().replace(',', '.');
      return Number(s);
    },

    onNumberCommit(item) {
      let v = this._toNumber(item.value);
      if (!Number.isFinite(v)) return;

      // 1) 夹取到 min/max
      if (item.min !== undefined && v < item.min) v = item.min;
      if (item.max !== undefined && v > item.max) v = item.max;

      // 2) 按 step 对齐（以 min 或 0 为基准）
      // 对“AutoFocus Exposure Time (ms)”不做步长对齐，避免 2000 -> 2001 这类问题
      const needSnap =
        item.label !== 'AutoFocus Exposure Time (ms)' &&
        item.label !== this.$t('AutoFocus Exposure Time (ms)');
      const step = needSnap ? (item.step ?? 1) : 0;
      if (step > 0) {
        const base = (item.min !== undefined ? item.min : 0);
        v = base + Math.round((v - base) / step) * step;
        if (item.min !== undefined && v < item.min) v = item.min;
        if (item.max !== undefined && v > item.max) v = item.max;
        v = Number(v.toFixed(12)); // 去浮点误差
      }

      // 回写并通知
      item.value = v;
      this.handleConfigChange(item.label, v, item.driverType);
    },

    // 数字键盘相关方法
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
        // 先关闭当前键盘，应用当前输入的值
        this.closeNumberKeyboard();
        // 立即打开新键盘（不等待关闭动画）
        this.$nextTick(() => {
          this.currentKeyboardItem = item;
          this.keyboardInputValue = String(item.value || '');
          this.showNumberKeyboard = true;
        });
        return;
      }
      
      // 阻止系统键盘弹出
      if (event && event.target) {
        event.target.blur();
        // 减少延迟，加快响应速度
        setTimeout(() => {
          this.currentKeyboardItem = item;
          this.keyboardInputValue = String(item.value || '');
          this.showNumberKeyboard = true;
        }, 30);
      } else {
        this.currentKeyboardItem = item;
        this.keyboardInputValue = String(item.value || '');
        this.showNumberKeyboard = true;
      }
    },

    handleNumberBlur(item) {
      // 在移动设备上，blur 事件可能由点击键盘外部触发
      // 延迟处理，避免与键盘点击冲突
      setTimeout(() => {
        if (this.currentKeyboardItem === item && !this.showNumberKeyboard) {
          // 键盘已关闭，应用输入的值
          this.onNumberCommit(item);
        }
      }, 200);
    },

    closeNumberKeyboard() {
      if (this.currentKeyboardItem) {
        // 如果关闭时没有确认，应用输入的值
        const item = this.currentKeyboardItem;
        if (this.keyboardInputValue !== String(item.value || '')) {
          const value = this._toNumber(this.keyboardInputValue);
          if (Number.isFinite(value)) {
            item.value = value;
            this.onNumberCommit(item);
          }
        }
      }
      this.showNumberKeyboard = false;
      // 减少延迟，加快响应
      setTimeout(() => {
        this.currentKeyboardItem = null;
        this.keyboardInputValue = '';
      }, 150);
    },

    handleKeyboardInput(key) {
      if (!this.currentKeyboardItem) return;

      let current = this.keyboardInputValue || '';

      // 处理负号
      if (key === '-') {
        if (current.startsWith('-')) {
          current = current.substring(1);
        } else {
          current = '-' + current;
        }
        this.keyboardInputValue = current;
        return;
      }

      // 处理小数点
      if (key === '.') {
        if (current.includes('.')) {
          return; // 已有小数点，不添加
        }
        if (current === '' || current === '-') {
          current = current + '0.';
        } else {
          current = current + '.';
        }
        this.keyboardInputValue = current;
        return;
      }

      // 处理数字
      if (/[0-9]/.test(key)) {
        // 如果当前是 '0'，替换为新数字
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

      // 如果为空，保持原值或设为0
      if (value === '' || value === '-') {
        value = item.value || 0;
      } else {
        value = this._toNumber(value);
        if (!Number.isFinite(value)) {
          value = item.value || 0;
        }
      }

      // 应用验证和限制
      item.value = value;
      this.onNumberCommit(item);

      // 关闭键盘
      this.closeNumberKeyboard();
    },
    checkMemoryUsage() {
      if (window.performance && window.performance.memory) {
        const memoryInfo = window.performance.memory;
        const used = Math.round(memoryInfo.usedJSHeapSize / 1048576);
        const limit = Math.round(memoryInfo.jsHeapSizeLimit / 1048576);

        // console.log(`内存使用: ${used}MB / ${limit}MB`);

        if (memoryInfo.usedJSHeapSize > memoryInfo.jsHeapSizeLimit * 0.7) {
          this.$bus.$emit('showWarning', this.$i18n.locale === 'cn' ?
            '内存使用接近限制，请保存工作后刷新页面' :
            'Memory usage is approaching limit. Please save your work and refresh the page.');

          // 可选：尝试手动触发垃圾回收
          if (window.gc) {
            try { window.gc(); } catch (e) { }
          }
        }
      }
    },

    formatTipValue(item) {
      return (item && item.displayValue != null)
        ? String(item.displayValue)
        : (item && item.value != null ? String(item.value) : '-');
    },
    formatTipTitle(item) {
      if (item && item.tooltip != null) return String(item.tooltip);
      if (item && item.value != null) return String(item.value);
      return '';
    },
    copyTip(item) {
      const text = (item && item.value != null) ? String(item.value) : '';
      if (!text) return;
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      }
    },

    preventDefault(event) {
      event.preventDefault();
    },
    getLocationHostName() {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const port = window.location.protocol === 'https:' ? '8601' : '8600';
      this.SendConsoleLogMsg('location hostname:' + hostname, 'info');
      this.WebSocketUrl = `${protocol}//${hostname}:${port}`;
      console.log('WebSocketUrl:', this.WebSocketUrl);
    },
    getQTClientVersion() {
      this.sendMessage('Vue_Command', 'getQTClientVersion');
    },
    // 请求全局总版本号（Qt 将从环境变量 QUARCS_TOTAL_VERSION 读取并返回）
    getTotalVersion() {
      this.sendMessage('Vue_Command', 'getTotalVersion');
    },
    // 主动向所有订阅者广播当前的系统版本信息（用于组件刚创建时立即拿到一次）
    broadcastSystemVersion() {
      this.$bus.$emit('SystemVersion', this.TotalVersion, this.QTClientVersion, this.VueClientVersion);
    },
    connect() {
      // 替换为你的 WebSocket 服务器地址
      // this.websocket = new WebSocket('ws://192.168.2.31:8600');  // process.env.VUE_APP_WEBSOCKET
      // this.websocket = new WebSocket(process.env.VUE_APP_WEBSOCKET);
      const wsOptions = {
        rejectUnauthorized: false  // 禁用证书验证
      };
      this.websocket = new WebSocket(this.WebSocketUrl, [], wsOptions);

      this.websocket.onopen = () => {
        this.websocketState = 'connected';
        this.networkDisconnected = false; // WebSocket连接成功时重置网络连接状态
        if (this.disconnectTimeoutTriggered) {
          this.callShowMessageBox('WebSocket connected', 'success');
        }
        this.$bus.$emit('ShowNetStatus', 'true');
        this.StatusRecovery();
        console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
      };

      this.websocket.onmessage = (message) => {
        // console.log('QHYCCD | Received message:', message.data);

        const data = JSON.parse(message.data);

        if (data.type === 'QT_Return') {
          const parts = data.message.split(':');
          let messageType;
          if (parts.length > 0) {
            messageType = parts[0];
            // console.log('QHYCCD | 获得信息('+messageType+'):', parts);
          }
          else {
            console.error('消息格式错误，无法分割:', data.message);
            return;
          }
          let acceptMessage = false;
          if (data.message.startsWith('StagingScheduleData:')) {
            console.log('------------------------------');
            acceptMessage = true;
            const parts = data.message.split('[');

            if (parts.length > 0) {
              console.log('parts.length: ', parts.length);
              this.$bus.$emit('StagingScheduleData', data.message);
            }
            console.log('------------------------------');
          }

          if (data.message.startsWith('SendDebugMessage|')) {
            acceptMessage = true;
            const parts = data.message.split('|');
            if (parts.length === 3) {
              const type = parts[1];
              const message = parts[2];
              this.$bus.$emit('SendDebugMessage', type, message);
            }
          }

          // 下载清单（JSON 可能包含 ':'，必须用“首个冒号”截取）
          if (data.message.startsWith('DownloadManifest:')) {
            acceptMessage = true;
            try {
              const colonIndex = data.message.indexOf(':');
              if (colonIndex === -1 || colonIndex >= data.message.length - 1) {
                this.$bus.$emit('DownloadManifest', { error: 'Invalid message format', totalBytes: 0, files: [] });
              } else {
                const jsonString = data.message.substring(colonIndex + 1);
                const jsonData = JSON.parse(jsonString);
                this.$bus.$emit('DownloadManifest', jsonData);
              }
            } catch (e) {
              this.$bus.$emit('DownloadManifest', { error: 'Failed to parse manifest: ' + e.message, totalBytes: 0, files: [] });
            }
          }

          if (!acceptMessage) {
            switch (messageType) {
              case 'AddDriver':
                if (parts.length === 3) {
                  const label = parts[1];
                  const value = parts[2];
                  const type = this.CurrentDriverType;
                  // 创建一个驱动对象
                  const driver = { type, label, value };

                  // if (type === 'MainCamera' && label === "QHY CCD2") {
                  //   break;
                  // }
                  // if (type === 'Guider' && label === "QHY CCD") {
                  //   break;
                  // }

                  // 检查label是否为"QHY CCD"或"QFocuser"，如果是，则插入到数组首位
                  if (label === "QHY CCD" || label === "QFocuser" || label === "QHY CCD2") {
                    this.drivers.unshift(driver); // 将新驱动添加到数组的开始位置
                  } else {
                    this.drivers.push(driver); // 将新驱动添加到数组的末尾
                  }
                }
                break;

              case 'AddDevice':
                if (parts.length === 2) {
                  const label = parts[1];
                  console.log('QHYCCD | AddDevice: ', label);
                  // const value = parts[2];
                  const type = this.confirmDriverType;
                  // 创建一个驱动对象
                  const device = { type, label, label };
                  console.log('QHYCCD | AddDevice: ', device);
                  // this.$bus.$emit('add-device', device);
                  this.devicesList.push(device);

                  this.ToBeConnectDevice = [];
                  this.devicesList.forEach(devicesList => {
                    if (devicesList.type === this.CurrentDriverType) {
                      this.ToBeConnectDevice.push(devicesList);
                    }
                  });

                  this.loadingSelectDriver = false;
                }
                break;

              case 'updateDevices_':
                if (parts.length === 3) {
                  const ListNum = parts[1];
                  const name = parts[2];
                  this.updateDevices_(ListNum, name);
                }
                break;

              case 'ConnectSuccess':
                if (parts.length === 4) {
                  const type = parts[1];
                  const deviceName = parts[2];
                  const driverName = parts[3];

                  if (deviceName != '') {
                    this.updateDevicesConnect(type, deviceName, driverName, true);
                  } else {
                    this.updateDevicesConnect(type, deviceName, driverName, false);
                  }
                }
                break;

              case 'ConnectFailed':
                if (parts.length === 2) {
                  const reason = parts[1];
                  this.callShowMessageBox(reason, 'error');
                  this.loadingConnectAllDevice = false;
                }
                break;

              case 'ConnectAllDeviceComplete':
                // 全部连接完成，关闭进度条
                this.loadingConnectAllDevice = false;
                break;

              case 'ScanFailed':
                if (parts.length === 2) {
                  const reason = parts[1];
                  this.callShowMessageBox(reason, 'error');
                  this.loadingSelectDriver = false;
                }
                break;

              case 'AddDeviceType':
                if (parts.length === 2) {
                  const DeviceType = parts[1];
                  this.$bus.$emit('AddDeviceType', DeviceType);
                }
                break;

              case 'DeviceToBeAllocated':
                if (parts.length === 4) {
                  const DeviceType = parts[1];
                  const DeviceIndex = parts[2];
                  const DeviceName = parts[3];
                  // 关键：必须携带 DeviceType，否则分配列表会混淆（例如电调/赤道仪错绑）
                  const idxNum = Number(DeviceIndex);
                  this.$bus.$emit('DeviceToBeAllocated', DeviceType, Number.isFinite(idxNum) ? idxNum : DeviceIndex, DeviceName);
                }
                break;

              case 'ShowDeviceAllocationWindow':
                this.$bus.$emit('toggleDeviceAllocationPanel');
                this.nav = false;
                break;

              case 'ExposureCompleted':
                this.$bus.$emit('ExposureCompleted');
                // 以 ExposureCompleted 作为“UI刷新一帧”的信号，统计前端显示帧率
                this.onLiveFramePresented();
                break;

              case 'LiveFPS':
                if (parts.length >= 2) {
                  const fps = parseFloat(parts[1]);
                  if (!isNaN(fps) && isFinite(fps)) {
                    this.liveCameraFps = fps;
                    this.$bus.$emit('LiveFPS', fps);
                  }
                }
                break;

              case 'LiveProcessFPS':
                if (parts.length >= 2) {
                  const fps = parseFloat(parts[1]);
                  if (!isNaN(fps) && isFinite(fps)) {
                    this.liveProcessFps = fps;
                    this.$bus.$emit('LiveProcessFPS', fps);
                  }
                }
                break;

              case 'ExposureFailed':
                if (parts.length >= 2) {
                  // 失败原因里可能包含 ':'，这里做兼容拼回完整字符串
                  const reason = parts.slice(1).join(':');
                  this.$bus.$emit('ExposureFailed', reason);
                  this.callShowMessageBox(reason, 'error');
                } else {
                  const reason = 'Exposure failed';
                  this.$bus.$emit('ExposureFailed', reason);
                  this.callShowMessageBox(reason, 'error');
                }
                break;

              case 'SaveJpgSuccess':
                if (parts.length === 4) {
                  const fileName = parts[1];
                  const roi_x = parseInt(parts[2]);
                  const roi_y = parseInt(parts[3]);
                  this.ROI_x = roi_x;
                  this.ROI_y = roi_y;

                  // this.$bus.$emit('showRoiImage', fileName);
                  this.showRoiImage(fileName, roi_x, roi_y);
                }
                break;

              case 'SaveBinSuccess':
                // 已废弃：不再使用传统bin文件方式，完全使用瓦片金字塔模式
                // 后端应该发送 TileGPM 消息而不是 SaveBinSuccess
                if (parts.length === 4) {
                  const fileName = parts[1];
                  const showImageSizeX = parseInt(parts[2]);
                  const showImageSizeY = parseInt(parts[3]);
                  this.showImageSizeX = showImageSizeX;
                  this.showImageSizeY = showImageSizeY;
                  // this.readBinFile('img/' + fileName);
                  this.DetectedStarsFinish = false;
                  
                  this.SendConsoleLogMsg(`收到SaveBinSuccess消息，等待TileGPM消息以启动瓦片模式: ${fileName}`, 'info');
                  // 不再处理bin文件，等待瓦片数据
                }
                break;

              case 'TileGPM':
                // 瓦片金字塔GPM消息处理
                // 格式:
                // - v1: TileGPM:{sessionId}:{imageWidth}:{imageHeight}:{tileSize}:{maxZoomLevel}:{blackLevel}:{whiteLevel}:{cfa}:{gainR}:{gainB}
                // - v2(追加): ...:{previewWidth}:{previewHeight}:{previewBinningFactor}
                // - v3(追加): ...:{frameId}
                // - v4(追加): ...:{buildMode}
                if (parts.length >= 11) {
                  const gpm = {
                    sessionId: parts[1],
                    imageWidth: parseInt(parts[2]),
                    imageHeight: parseInt(parts[3]),
                    tileSize: parseInt(parts[4]),
                    maxZoomLevel: parseInt(parts[5]),
                    blackLevel: parseInt(parts[6]),
                    whiteLevel: parseInt(parts[7]),
                    cfa: parts[8],
                    gainR: parseFloat(parts[9]),
                    gainB: parseFloat(parts[10]),
                    // 兼容字段（可能不存在）
                    previewWidth: (parts.length >= 14) ? parseInt(parts[11]) : null,
                    previewHeight: (parts.length >= 14) ? parseInt(parts[12]) : null,
                    previewBinningFactor: (parts.length >= 14) ? parseInt(parts[13]) : null,
                    frameId: (parts.length >= 15) ? parseInt(parts[14]) : null,
                    buildMode: (parts.length >= 16) ? parts[15] : 'pyramid',
                  };
                  this.handleTileGPM(gpm);
                }
                break;

              case 'TileHistogramFile':
                // 新方案：直方图保存为文件，通过HTTPS下载
                // 格式: TileHistogramFile:{sessionId}:{bins}:{total}:{url}
                if (parts.length >= 5) {
                  const sessionId = parts[1];
                  const bins = parseInt(parts[2]);
                  const total = parseInt(parts[3]);
                  const url = parts.slice(4).join(':'); // URL可能包含':'

                  // 仅处理当前会话的直方图
                  if (!this.tileSessionId || this.tileSessionId === sessionId) {
                    this.SendConsoleLogMsg(`Downloading histogram: session=${sessionId}, url=${url}`, 'info');
                    
                    // 异步下载并解析直方图文件
                    this.loadHistogramFromFile(sessionId, bins, total, url);
                  }
                }
                break;

              case 'WhiteBalanceGains':
                // 白平衡增益计算结果
                // 格式: WhiteBalanceGains:{gainR}:{gainB}
                if (parts.length >= 3) {
                  const gainR = parseFloat(parts[1]);
                  const gainB = parseFloat(parts[2]);
                  
                  console.log(`[WhiteBalanceGains] 收到白平衡增益: R=${gainR}, B=${gainB}`);
                  this.SendConsoleLogMsg(`白平衡计算完成: R增益=${gainR.toFixed(3)}, B增益=${gainB.toFixed(3)}`, 'info');
                  
                  // 更新增益值
                  const oldGainR = this.ImageGainR;
                  const oldGainB = this.ImageGainB;
                  this.ImageGainR = gainR;
                  this.ImageGainB = gainB;
                  
                  // 更新配置面板显示
                  const GainRIndex = this.MainCameraConfigItems.findIndex(item => item.label === 'ImageGainR');
                  if (GainRIndex !== -1) {
                    this.MainCameraConfigItems[GainRIndex].value = gainR;
                  }
                  
                  const GainBIndex = this.MainCameraConfigItems.findIndex(item => item.label === 'ImageGainB');
                  if (GainBIndex !== -1) {
                    this.MainCameraConfigItems[GainBIndex].value = gainB;
                  }
                  
                  // 如果在瓦片模式下，更新GPM并重新处理瓦片（不重新下载）
                  if (this.tileGPM) {
                    // 检查是否是灰度图且增益值没有实际变化
                    const isGrayImage = !this.ImageCFA || this.ImageCFA === 'null';
                    const gainsUnchanged = (gainR === oldGainR || (gainR === 1 && oldGainR === 1)) && 
                                          (gainB === oldGainB || (gainB === 1 && oldGainB === 1));
                    
                    if (isGrayImage && gainsUnchanged) {
                      console.log('[WhiteBalanceGains] 灰度图模式且增益值未变化，跳过重新处理瓦片');
                      this.SendConsoleLogMsg('灰度图模式下白平衡增益保持不变', 'info');
                    } else {
                      this.tileGPM.gainR = gainR;
                      this.tileGPM.gainB = gainB;
                      console.log('[WhiteBalanceGains] 更新瓦片GPM增益参数，使用新增益重新处理已缓存瓦片');
                      this.reprocessTilesWithNewGains();
                    }
                  }
                }
                break;

              case 'SaveGuiderImageSuccess':
                if (parts.length === 2) {
                  const fileName = parts[1];
                  this.loadAndDisplayImage('img/' + fileName);
                }
                break;
              case 'GuideSize':
                if (parts.length === 3) {
                  const col = parts[1];
                  const row = parts[2];
                  this.$bus.$emit("GuideSize", col, row);
                }
                break;

              case 'AddScatterChartData':
                if (parts.length === 3) {
                  const Data_x = Number(parts[1]);
                  const Data_y = Number(parts[2]);
                  if (!Number.isFinite(Data_x) || !Number.isFinite(Data_y)) break;
                  const newDataPoint = [Data_x, Data_y];
                  this.$bus.$emit('AddScatterChartData', newDataPoint);
                }
                break;

              case 'AddLineChartData':
                if (parts.length === 4) {
                  const Data_x = Number(parts[1]);
                  const Data_Ra = Number(parts[2]);
                  const Data_Dec = Number(parts[3]);
                  if (!Number.isFinite(Data_x) || !Number.isFinite(Data_Ra) || !Number.isFinite(Data_Dec)) break;
                  const newDataPoint_Ra = [Data_x, Data_Ra];
                  const newDataPoint_Dec = [Data_x, Data_Dec];
                  this.$bus.$emit('AddLineChartData', newDataPoint_Ra, newDataPoint_Dec);
                }
                break;

              // RMS（与 PHD2 一致：RA/DEC/Total）
              // Qt 端格式：AddRMSErrorData:<raRms>:<decRms>:<totalRms>
              case 'AddRMSErrorData':
                if (parts.length === 4) {
                  const ra = Number(parts[1]);
                  const dec = Number(parts[2]);
                  const total = Number(parts[3]);
                  if (!Number.isFinite(ra) || !Number.isFinite(dec) || !Number.isFinite(total)) break;
                  this.$bus.$emit('AddRMSErrorData', ra, dec, total);
                }
                break;

              case 'SetLineChartRange':
                if (parts.length === 3) {
                  const min = parts[1];
                  const max = parts[2];
                  this.$bus.$emit('SetLineChartRange', min, max);
                }
                break;

              case 'GuiderStatus':
                if (parts.length === 2) {
                  const status = parts[1];
                  this.$bus.$emit('GuiderStatus', status);
                }
                break;

              case 'FocusChangeSpeedSuccess':
                if (parts.length === 2) {
                  const Speed = parts[1];
                  this.$bus.$emit('FocusChangeSpeedSuccess', Speed);
                }
                break;


              case 'FocusPosition':
                if (parts.length === 3) {
                  const CurrentPosition = parts[1];
                  const TargetPosition = parts[2];
                  this.$bus.$emit('FocusPosition', CurrentPosition, TargetPosition);
                }
                break;

              case 'FocusMoveDone':
                if (parts.length === 3) {
                  const CurrentPosition = parts[1];
                  const FWHM = parts[2];
                  this.$bus.$emit('UpdateFWHM', CurrentPosition, FWHM);
                  this.$bus.$emit('addData_Point', CurrentPosition, FWHM);
                }
                break;
              case 'FitResult':
                if (parts.length === 3) {
                  // 只在每次自动对焦流程中弹出一次水平线拟合结果，避免连续刷屏
                  if (!this.fitResultShown) {
                    this.fitResultShown = true;
                    // 使用国际化文案，并在消息末尾追加“对焦失败”的英文说明
                    const msg =
                      this.$t('AutoFocusFitResultFlatLine') +
                      ' ' +
                      this.$t('AutoFocusFailed');
                    this.callShowMessageBox(msg, 'warning');
                  }
                }
                break;
              case 'StarDetectionResult':
                if (parts.length === 3) {
                  const detected = parts[1] === 'true';
                  const hfr = parseFloat(parts[2]);
                  // 仅在自动对焦第 4 步（更精细精调）时弹出 HFR 提示，
                  // 粗调 / 精调阶段不再弹出，以免把 SNR 当成 HFR 显示。
                  const step = this.autoFocusInfo && this.autoFocusInfo.step;
                  if (step === 4) {
                    if (detected) {
                      this.callShowMessageBox(`星点的HFR为：${hfr}`, 'info');
                    } else {
                      this.callShowMessageBox('未识别到星点', 'warning');
                    }
                  }
                }
                break;

              case 'AutoFocusModeChanged':
                if (parts.length === 3) {
                  const mode = parts[1];
                  const hfr = parseFloat(parts[2]);
                  if (mode === 'coarse') {
                    this.callShowMessageBox('进入粗调模式', 'info');
                  } else if (mode === 'fine') {
                    this.callShowMessageBox('进入精调模式', 'info');
                  }
                }
                break;

            

              case 'addMinPointData_Point':
                if (parts.length === 3) {
                  const x = parseInt(parts[1]);
                  const y = parseFloat(parts[2]);
                  this.$bus.$emit('addMinPointData_Point', x, y);
                }
                break;
              case 'addLineData_Point':
                if (parts.length === 4) {
                  const a = parseFloat(parts[1]);
                  const b = parseFloat(parts[2]);
                  const c = parseFloat(parts[3]);
                  console.log('addLineData_Point:', a, b, c);
                  this.$bus.$emit('addLineData_Point', a, b, c);
                }
                break;
              case 'MainCameraSize':
                if (parts.length === 3) {
                  const SizeX = parts[1];
                  const SizeY = parts[2];
                  this.$bus.$emit('MainCameraSize', SizeX, SizeY);
                  this.mainCameraSizeX = SizeX;
                  this.mainCameraSizeY = SizeY;
                }
                break;

              case 'MainCameraBinning':
                if (parts.length === 2) {
                  this.cameraBin = parseInt(parts[1]);
                  this.MainCameraConfigItems.find(item => item.label === 'Binning').value = this.cameraBin;
                  this.$bus.$emit('MainCameraBinning', this.cameraBin);
                }
                break;

              // -------------- 特殊处理,内部解析数据
              case 'fitQuadraticCurve':
                // 新的数据格式: "fitQuadraticCurve:a:b:c:bestPosition:minHFR"
                console.log('App.vue | 接收到fitQuadraticCurve消息:', data.message);
                // 使用setTimeout确保清除操作在添加数据之前完成
                this.$bus.$emit('ClearfitQuadraticCurve');
                setTimeout(() => {
                  this.$bus.$emit('fitQuadraticCurve', data.message);
                }, 10);
                break;

              case 'fitQuadraticCurve_minPoint':
                // 新的数据格式: "fitQuadraticCurve_minPoint:bestPosition:minHFR"
                console.log('App.vue | 接收到fitQuadraticCurve_minPoint消息:', data.message);
                this.$bus.$emit('fitQuadraticCurve_minPoint', data.message);
                break;

              // --------------------------------------

              case 'TelescopePark':
                if (parts.length === 2) {
                  const Switch = parts[1];
                  this.$bus.$emit('MountParkSwitch', Switch);
                }
                break;

              case 'TelescopeTrack':
                if (parts.length === 2) {
                  const Switch = parts[1];
                  this.$bus.$emit('MountTrackSwitch', Switch);
                }
                break;

              case 'MountSetSpeedSuccess':
                if (parts.length === 2) {
                  const num = parts[1];
                  this.$bus.$emit('newMountSlewRate', num);
                }
                break;


              case 'TelescopePierSide':
                if (parts.length === 2) {
                  const Side = parts[1];
                  this.$bus.$emit('updateMountPierSide', Side);
                }
                break;

              case 'TelescopeTotalSlewRate':
                if (parts.length === 2) {
                  const num = parts[1];
                  this.$bus.$emit('MountTotalSlewRate', num);
                }
                break;


              case 'UpdateScheduleProcess':
                if (parts.length === 3) {
                  const RowNum = parts[1];
                  const Process = parts[2];
                  this.$bus.$emit('UpdateScheduleProcess', RowNum, Process);
                }
                break;

              case 'ScheduleComplete':
                // 计划任务完成，通知前端重置按钮状态
                this.$bus.$emit('ScheduleComplete');
                break;

              case 'ExpTimeList':
                if (parts.length === 2) {
                  this.$bus.$emit('initExpTimeList', parts[1]);
                }
                break;


              case 'CameraInExposuring':
                if (parts.length === 2) {
                  const status = parts[1];
                  this.$bus.$emit('CameraInExposuring', status);
                }
                break;

              case 'AutoFocusOver':
                if (parts.length >= 4) {
                  // 新格式: AutoFocusOver:success:bestPosition:minHFR
                  const success = parts[1] === 'true';
                  const bestPosition = parseFloat(parts[2]);
                  const minHFR = parseFloat(parts[3]);
                  this.$bus.$emit('AutoFocusOver', success, bestPosition, minHFR);
                } else {
                  // 兼容旧格式: AutoFocusOver
                  this.$bus.$emit('AutoFocusOver');
                }
                break;

              case 'CFWPositionMax':
                if (parts.length === 2) {
                  this.$bus.$emit('SetCFWPositionMax', parts[1]);
                  const cfwCount = parseInt(parts[1], 10) || 0;
                  this.CFWConfigItems = this.CFWConfigItems.filter(item => !/^CFW \[\d+\]$/.test(String(item.label || '')));
                  for (let i = 1; i <= cfwCount; i++) {
                    this.CFWConfigItems.push({ driverType: 'CFW', label: `CFW [${i}]`, value: '', inputType: 'text' });
                  }
                  this.cfwMenuCurrentIndex = 0;
                  this.cfwMenuLastConfirmedIndex = 0;
                  this.setCfwMenuButtonsDisabled(false);
                  this.updateCfwMenuCurrentDisplay();
                  this.$bus.$emit('AppSendMessage', 'Vue_Command', 'getCFWList');
                }
                break;


              case 'SetCFWPositionSuccess':
                if (parts.length === 2) {
                  const pos1 = parseInt(parts[1], 10);
                  if (!isNaN(pos1) && pos1 > 0) {
                    this.cfwMenuCurrentIndex = pos1 - 1;
                  }
                  this.cfwMenuLastConfirmedIndex = this.cfwMenuCurrentIndex;
                  this.setCfwMenuButtonsDisabled(false);
                  this.updateCfwMenuCurrentDisplay();
                  this.$bus.$emit('SetCFWPositionSuccess', parts[1]);
                }
                break;

              case 'SetCFWPositionFailed':
                if (parts.length >= 2) {
                  // 失败原因里可能包含 ':'，这里做兼容拼回完整字符串
                  const reason = parts.slice(1).join(':');
                  this.cfwMenuCurrentIndex = this.cfwMenuLastConfirmedIndex;
                  this.setCfwMenuButtonsDisabled(false);
                  this.updateCfwMenuCurrentDisplay();
                  this.$bus.$emit('SetCFWPositionFailed', reason);
                }
                break;

              case 'getCFWList':
                if (parts.length === 2) {
                  this.$bus.$emit('initCFWList', parts[1]);
                }
                break;

              case 'GuiderSwitchStatus':
                if (parts.length === 2) {
                  this.$bus.$emit('GuiderSwitchStatus', parts[1]);
                }
                break;

              case 'GuiderLoopExpStatus':
                if (parts.length === 2) {
                  this.$bus.$emit('GuiderLoopExpStatus', parts[1]);
                }
                break;

              case 'TelescopeRADEC':
                if (parts.length === 3) {
                  this.UpdateCirclePos(parts[1], parts[2]);
                  this.$bus.$emit('updateCurrentLocation', parts[1], parts[2]);
                }
                break;


              case 'TelescopeStatus':
                if (parts.length === 2) {
                  this.UpdateTelescopeStatus(parts[1]);
                }
                break;

              case 'MainCameraStatus':
                if (parts.length === 2) {
                  this.UpdateMainCameraStatus(parts[1]);
                }
                break;


              case 'MainCameraTemperature':
                if (parts.length === 2) {
                  this.UpdateMainCameraTemperature(parts[1]);
                }
                break;


              case 'ShowAllImageFolder':
                if (parts.length >= 3) {
                  // parts[1] = CaptureImage{...}
                  // parts[2] = ScheduleImage{...}
                  // parts[3] = SolveFailedImage{...} (如果存在)
                  const solveFailedImageString = parts.length >= 4 ? parts[3] : 'SolveFailedImage{}';
                  this.$bus.$emit('ShowAllImageFolder', parts[1], parts[2], solveFailedImageString);
                }
                break;


              case 'ImageFilesName':
                if (parts.length === 2) {
                  this.$bus.$emit('ImageFilesName', parts[1]);
                }
                break;


              case 'USBCheck':
                // 首先发送清空信号
                this.$bus.$emit('ClearUSBList');
                const item = this.MainCameraConfigItems.find(item => item.label === 'Save Folder');
                item.selectValue = ['local'];
                
                // 处理U盘信息：单个或多个U盘都通过相同方式处理
                // parts[0] = 'USBCheck'
                // parts[1] 如果是 'Multiple'，则 parts[2] 开始是U盘列表，格式为 'Name1,Space1:Name2,Space2:...'
                // 否则 parts[1] 是单个U盘信息，格式为 'Name,Space'
                if (parts.length === 2) {
                  // 单个U盘
                  const USBdata = parts[1].split(',');
                  if (USBdata.length >= 2 && USBdata[0] !== 'Null' && USBdata[0] !== 'Multiple') {
                    console.log('USB name: ', USBdata[0]);
                    console.log('USB space: ', USBdata[1]);
                    this.SendConsoleLogMsg('USB name:' + USBdata[0], 'info');
                    this.SendConsoleLogMsg('USB space:' + USBdata[1], 'info');

                    this.$bus.$emit('USB_Name_Sapce', USBdata[0], USBdata[1]);
                    const item = this.MainCameraConfigItems.find(item => item.label === 'Save Folder');
                    if (item && !item.selectValue.includes(USBdata[0])) {
                      item.selectValue.push(USBdata[0]);
                    }
                  }
                } else if (parts.length >= 3) {
                  // 多个U盘：从 parts[1] 开始（如果是 Multiple，则从 parts[2] 开始）
                  let startIndex = 1;
                  if (parts[1] === 'Multiple') {
                    startIndex = 2;
                  }
                  for(let i = startIndex; i < parts.length; i++) {
                    const USBdata = parts[i].split(',');
                    if (USBdata.length >= 2 && USBdata[0] !== 'Null') {
                      console.log('USB name: ', USBdata[0]);
                      console.log('USB space: ', USBdata[1]);
                      this.SendConsoleLogMsg('USB name:' + USBdata[0], 'info');
                      this.SendConsoleLogMsg('USB space:' + USBdata[1], 'info');

                      this.$bus.$emit('USB_Name_Sapce', USBdata[0], USBdata[1]);
                      const item = this.MainCameraConfigItems.find(item => item.label === 'Save Folder');
                      if (item && !item.selectValue.includes(USBdata[0])) {
                        item.selectValue.push(USBdata[0]);
                      }
                    }
                  }
                }
                this.bumpSubmenuRender();
                break;

              case 'USBFilesList':
                try {
                  // 从消息中提取JSON部分（跳过 "USBFilesList:" 前缀）
                  const colonIndex = data.message.indexOf(':');
                  if (colonIndex === -1 || colonIndex >= data.message.length - 1) {
                    console.error('USBFilesList: no JSON data found, message:', data.message);
                    this.$bus.$emit('USBFilesList', { error: 'Invalid message format', path: '', files: [] });
                  } else {
                    const jsonString = data.message.substring(colonIndex + 1);
                    console.log('USBFilesList jsonString:', jsonString);
                    const jsonData = JSON.parse(jsonString);
                    this.$bus.$emit('USBFilesList', jsonData);
                  }
                } catch (e) {
                  console.error('USBFilesList parse error:', e);
                  console.error('USBFilesList full message:', data.message);
                  this.$bus.$emit('USBFilesList', { error: 'Failed to parse file list: ' + e.message, path: '', files: [] });
                }
                break;

              case 'ImageSaveErroe':
                if (parts.length === 2) {
                  const Erroe = parts[1];
                  if (Erroe === 'USB-Null') {
                    this.callShowMessageBox('No USB Drive Detected.', 'error');
                  } else if (Erroe === 'USB-Multiple') {
                    this.callShowMessageBox('Multiple USB drives detected, please remove excess USB drives.', 'error');
                  }
                }
                break;

              case 'DetectedStars':
                console.log('Detected', parts.length, 'stars.');
                this.SendConsoleLogMsg('Detected ' + parts.length + ' stars.', 'info');
                this.DetectedStarsList = [];
                for (let i = 0; i < parts.length; i++) {
                  const a = parts[i];
                  const b = a.split('|');
                  if (b.length === 3) {
                    const x = b[0];
                    const y = b[1];
                    const hfr = b[2];
                    // console.log('Stars at(', x, ',', y, ') with HFR:', hfr);
                    this.DetectedStarsList.push({ x: x, y: y, hfr: hfr });
                  }
                }
                this.DetectedStarsFinish = true;
                break;

              case 'SolveImageResult':
                if (parts.length === 5) {
                  // this.UpdateCirclePos(parts[1], parts[2]);
                  console.log('Solve Image Result(RA_Degree, DEC_Degree, Azimuth, Altitude):', parts[1], ',', parts[2], ',', parts[3], ',', parts[4]);
                  this.SendConsoleLogMsg('Solve Image Result(RA_Degree, DEC_Degree, Azimuth, Altitude):' + parts[1] + ',' + parts[2] + ',' + parts[3] + ',' + parts[4], 'info');
                  this.SolveResultMark(parts[1], parts[2], parts[3], parts[4]);
                  this.$bus.$emit("ImageSolveFinished", true);
                  this.$bus.$emit('setParsingProgress', false);
                }
                break;

              case 'SolveFovResult':
                if (parts.length === 9) {
                  const RaDec = [
                    { Ra: parts[1], Dec: parts[2] },
                    { Ra: parts[3], Dec: parts[4] },
                    { Ra: parts[5], Dec: parts[6] },
                    { Ra: parts[7], Dec: parts[8] },
                  ];
                  this.SolveFovMark(RaDec);
                }
                break;

              case 'RealTimeSolveImageResult':
                if (parts.length === 5) {
                  console.log('Solve Image Result(RA_Degree, DEC_Degree, Azimuth, Altitude):', parts[1], ',', parts[2], ',', parts[3], ',', parts[4]);
                  this.SendConsoleLogMsg('Solve Image Result(RA_Degree, DEC_Degree, Azimuth, Altitude):' + parts[1] + ',' + parts[2] + ',' + parts[3] + ',' + parts[4], 'info');
                  const result = this.SolveResultMark_RealTime(parts[1], parts[2], parts[3], parts[4])
                }
                break;

              case 'SolveImageSucceeded':
                console.log('解析同步成功');
                this.$bus.$emit("handleOperationComplete", "solve");
                this.$bus.$emit('showMsgBox', 'Solve image succeed!', 'success');
                break;

              case 'SolveImagefailed':
                this.callShowMessageBox('Solve image faild...', 'error');
                this.$bus.$emit("ImageSolveFinished", false);
                this.$bus.$emit('setParsingProgress', false);
                this.$bus.$emit('MountOperationComplete', 'solve');
                break;

              case 'FocalLengthError':
                this.callShowMessageBox('焦距未设置，请先设置焦距后再进行解析同步', 'error');
                this.$bus.$emit('MountOperationComplete', 'solve');
                break;

              case 'MainCameraOffsetRange':
                if (parts.length === 4) {
                  console.log('MainCameraOffsetRange:', parts[1], ',', parts[2]);
                  this.SendConsoleLogMsg('MainCameraOffsetRange:' + parts[1] + ',' + parts[2], 'info');
                  this.MainCameraOffsetMin = parts[1];
                  this.MainCameraOffsetMax = parts[2];
                  let MainCameraOffsetValue = parts[3];

                  const OffsetItem = this.MainCameraConfigItems.find(item => item.label === 'Offset');
                  if (OffsetItem) {
                    console.log('MainCameraOffsetRange:', parseInt(this.MainCameraOffsetMin, 10), ',', parseInt(this.MainCameraOffsetMax, 10));
                    OffsetItem.inputMin = parseInt(this.MainCameraOffsetMin, 10);
                    OffsetItem.inputMax = parseInt(this.MainCameraOffsetMax, 10);
                    OffsetItem.value = parseInt(MainCameraOffsetValue, 10);
                  }
                  this.bumpSubmenuRender();
                }
                break;

              case 'GuiderOffsetRange':
                if (parts.length === 4) {
                  this.GuiderOffsetMin = parts[1];
                  this.GuiderOffsetMax = parts[2];
                  const guiderOffsetValue = parts[3];

                  const offsetItem = this.GuiderConfigItems.find(item => item.label === 'Offset');
                  if (offsetItem) {
                    offsetItem.inputMin = parseInt(this.GuiderOffsetMin, 10);
                    offsetItem.inputMax = parseInt(this.GuiderOffsetMax, 10);
                    offsetItem.value = parseInt(guiderOffsetValue, 10);
                  }
                  this.bumpSubmenuRender();
                }
                break;

              case 'MainCameraUsbTrafficRange':
                // MainCameraUsbTrafficRange:min:max:value:step(可选)
                if (parts.length >= 4) {
                  const min = parseInt(parts[1], 10);
                  const max = parseInt(parts[2], 10);
                  const value = parseInt(parts[3], 10);
                  const step = (parts.length >= 5) ? Math.max(1, parseInt(parts[4], 10) || 1) : 1;

                  const usbItem = this.ensureMainCameraUsbTrafficItem();
                  if (usbItem) {
                    usbItem.inputMin = min;
                    usbItem.inputMax = max;
                    usbItem.inputStep = step;
                    usbItem.value = value;
                  }
                  this.bumpSubmenuRender();
                }
                break;

              case 'MainCameraGainRange':
                if (parts.length === 4) {
                  console.log('MainCameraGainRange:', parts[1], ',', parts[2], ',', parts[3]);
                  this.SendConsoleLogMsg('MainCameraGainRange:' + parts[1] + ',' + parts[2] + ',' + parts[3], 'info');
                  this.MainCameraGainMin = parts[1];
                  this.MainCameraGainMax = parts[2];
                  let MainCameraGainValue = parts[3];

                  const gainItem = this.MainCameraConfigItems.find(item => item.label === 'Gain');
                  if (gainItem) {
                    console.log('MainCameraGainRange:', parseInt(this.MainCameraGainMin, 10), ',', parseInt(this.MainCameraGainMax, 10));
                    gainItem.inputMin = parseInt(this.MainCameraGainMin, 10);
                    gainItem.inputMax = parseInt(this.MainCameraGainMax, 10);
                    gainItem.value = parseInt(MainCameraGainValue, 10);
                  }
                  this.bumpSubmenuRender();
                }
                break;

              case 'GuiderGainRange':
                if (parts.length === 4) {
                  this.GuiderGainMin = parts[1];
                  this.GuiderGainMax = parts[2];
                  const guiderGainValue = parts[3];

                  const gainItem = this.GuiderConfigItems.find(item => item.label === 'Gain');
                  if (gainItem) {
                    gainItem.inputMin = parseInt(this.GuiderGainMin, 10);
                    gainItem.inputMax = parseInt(this.GuiderGainMax, 10);
                    gainItem.value = parseInt(guiderGainValue, 10);
                  }
                  this.bumpSubmenuRender();
                }
                break;

              case 'OutputPowerStatus':
                if (parts.length === 3) {
                  const index = parseInt(parts[1], 10);
                  const value = parseInt(parts[2], 10);

                  if (index === 1) {
                    this.OutPutPower_1_ON = value === 1;
                  } else if (index === 2) {
                    this.OutPutPower_2_ON = value === 1;
                  }
                }
                break;

              case 'PHD2StarBoxView':
                if (parts.length === 2) {
                  const view = parts[1];
                  this.$bus.$emit('PHD2StarBoxView', view);
                }
                break;

              case 'PHD2StarCrossView':
                if (parts.length === 2) {
                  const view = parts[1];
                  this.$bus.$emit('PHD2StarCrossView', view);
                }
                break;

              case 'PHD2StarBoxPosition':
                if (parts.length === 5) {
                  const PHD2ImageSize_X = parseInt(parts[1], 10);
                  const PHD2ImageSize_Y = parseInt(parts[2], 10);
                  const Box_X = parseInt(parts[3], 10);
                  const Box_Y = parseInt(parts[4], 10);
                  this.DrawPHD2Box(PHD2ImageSize_X, PHD2ImageSize_Y, Box_X, Box_Y);
                  // 同步把“锁定星点”的原始像素坐标广播给 UI（用于显示导星的是哪颗星）
                  this.$bus.$emit('GuiderLockStar', PHD2ImageSize_X, PHD2ImageSize_Y, Box_X, Box_Y);
                }
                break;

              case 'PHD2MultiStarsPosition':
                if (parts.length === 5) {
                  const PHD2ImageSize_X = parseInt(parts[1], 10);
                  const PHD2ImageSize_Y = parseInt(parts[2], 10);
                  const Box_X = parseInt(parts[3], 10);
                  const Box_Y = parseInt(parts[4], 10);
                  this.DrawPHD2MultiStars(PHD2ImageSize_X, PHD2ImageSize_Y, Box_X, Box_Y);
                }
                break;

              case 'ClearPHD2MultiStars':
                this.$bus.$emit('ClearPHD2MultiStars');
                break;

              case 'PHD2StarCrossPosition':
                if (parts.length === 5) {
                  const PHD2ImageSize_X = parseInt(parts[1], 10);
                  const PHD2ImageSize_Y = parseInt(parts[2], 10);
                  const Cross_X = parseInt(parts[3], 10);
                  const Cross_Y = parseInt(parts[4], 10);
                  this.DrawPHD2Cross(PHD2ImageSize_X, PHD2ImageSize_Y, Cross_X, Cross_Y);
                }
                break;

              // 内置导星（GuiderCore）消息
              case 'GuiderCoreState':
                if (parts.length === 2) {
                  const state = parseInt(parts[1], 10);
                  this.$bus.$emit('GuiderCoreState', state);
                }
                break;
              case 'GuiderCalibration':
                // 形如：GuiderCalibration:cameraAngleDeg=...:orthoErrDeg=...:...
                this.$bus.$emit('GuiderCalibration', data.message);
                break;
              case 'GuiderPulse':
                // 形如：GuiderPulse:NORTH:110:raErrPx=...:decErrPx=...
                this.$bus.$emit('GuiderPulse', data.message);
                break;
              case 'GuiderStarSelected':
                // 形如：GuiderStarSelected:x=885.00:y=366.00:snr=806.3:hfd=4.47
                this.$bus.$emit('GuiderStarSelected', data.message);
                break;

              case 'QTClientVersion':
                if (parts.length === 2) {
                  this.QTClientVersion = parts[1];
                  // 通过全局事件总线向其他组件广播当前系统版本信息
                  this.$bus.$emit('SystemVersion', this.TotalVersion, this.QTClientVersion, this.VueClientVersion);
                }
                break;

              case 'TotalVersion':
                if (parts.length === 2) {
                  this.TotalVersion = parts[1];
                  // 版本号更新时，同步通过信号发送给需要显示版本信息的组件
                  this.$bus.$emit('SystemVersion', this.TotalVersion, this.QTClientVersion, this.VueClientVersion);
                }
                break;

              case 'CaptureImageSaveStatus':
                if (parts.length === 2) {
                  const status = parts[1];
                  if (status === 'Repeat') {
                    this.callShowMessageBox(this.$t('There is no need to save it again'), 'error');
                  } else if (status === 'Success') {
                    this.callShowMessageBox(this.$t('Image saved successfully'), 'success');
                  } else if (status === 'Null') {
                    this.callShowMessageBox(this.$t('No images to save'), 'error');
                  } else if (status === 'USB-NoSpace'){
                    this.callShowMessageBox(this.$t('There is not enough space on the USB drive. Please clean up the USB drive or replace it. The current save failed.'), 'error');
                  } else if (status === 'NoSpace'){
                    this.callShowMessageBox(this.$t('There is not enough space on the local storage. Please clean up the storage or free up space.'), 'error');
                  } else if (status === 'USB-ReadOnly'){
                    this.callShowMessageBox(this.$t('USB drive is read-only. Please check the USB drive.'), 'error');
                  } else if (status === 'Failed'){
                    this.callShowMessageBox(this.$t('Failed to save image.'), 'error');
                  } else if (status === 'USB-NotAvailable'){
                    this.callShowMessageBox(this.$t('USB not available. Please check the USB drive.'), 'error');
                    // 当前不可利用,重置为默认路径
                    const item = this.MainCameraConfigItems.find(item => item.label === 'Save Folder');
                    if (item) {
                      item.selectValue = ['local'];
                      item.value = 'local';
                    }
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'SetMainCameraSaveFolder:local');
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'USBCheck');
                  }
                }
                break;

              case 'getUSBFail':
                if (parts.length >= 2) {
                  const errorMsg = parts.slice(1).join(':'); // 获取完整的错误消息
                  
                  // 处理包含动态内容的消息
                  let translatedMsg = errorMsg;
                  
                  // 匹配 "Failed to get filesystem information for X, error: Y"
                  const fsInfoMatch = errorMsg.match(/^Failed to get filesystem information for (.+), error: (.+)$/);
                  if (fsInfoMatch) {
                    translatedMsg = this.$t('Failed to get filesystem information for {0}, error: {1}', [fsInfoMatch[1], fsInfoMatch[2]]);
                  }
                  // 匹配 "Not enough storage space! Required: X MB, Available: Y MB"
                  else {
                    const spaceMatch = errorMsg.match(/^Not enough storage space! Required: (.+?) MB, Available: (.+?) MB$/);
                    if (spaceMatch) {
                      translatedMsg = this.$t('Not enough storage space! Required: {0} MB, Available: {1} MB', [spaceMatch[1], spaceMatch[2]]);
                    }
                    // 尝试直接翻译
                    else {
                      const translation = this.$t(errorMsg);
                      // 如果翻译结果和原消息相同，说明没有找到翻译，使用原消息
                      translatedMsg = translation !== errorMsg ? translation : errorMsg;
                    }
                  }
                  
                  this.callShowMessageBox(translatedMsg, 'error');
                }
                break;

              case 'INDIServerDebug':
                if (parts.length === 2) {
                  const message = parts[1];
                  this.$bus.$emit('INDIServerDebug', message);
                }
                break;

              case 'HotspotName':
                if (parts.length === 2) {
                  const Name = parts[1];
                  this.$bus.$emit('HotspotName', Name);
                }
                break;
              case 'EditHotspotNameSuccess':
                this.$bus.$emit('EditHotspotNameSuccess');
                break;

              case 'DSLRsSetup':
                if (parts.length === 2) {
                  const Name = parts[1];
                  this.$bus.$emit('ShowDSLRsSetup', Name);
                }
                if (parts.length === 5) {
                  const Name = parts[1];
                  const SizeX = parts[2];
                  const SizeY = parts[3];
                  const PixelSize = parts[4];
                  this.$bus.$emit('ReloadShowDSLRsSetup', Name, SizeX, SizeY, PixelSize);
                }
                break;

              case 'ConfigureRecovery':
                if (parts.length === 3) {
                  const ConfigName = parts[1];
                  const ConfigValue = parts[2];
                  console.log('Configure:', ConfigName, ',', ConfigValue);
                  this.SendConsoleLogMsg('Configure Recovery:' + parts[1] + ',' + parts[2], 'info');
                  this.$bus.$emit(ConfigName, ConfigValue);

                  if (parts[1] === 'FocalLength') {
                    this.TelescopesConfigItems[0].value = parts[2];
                    for (const device of this.devices) {
                      if (device.driverType === 'Telescopes') {
                        if (parts[2] === '' || parts[2] === NaN) {
                          device.device = '';
                          device.isConnected = false;
                        } else {
                          device.device = parts[2] + ' mm';
                          device.isConnected = true;
                        }
                      }
                    }
                  }

                  if (parts[1] === 'GuiderFocalLength') {
                    setGuiderItemValue('Guider Focal Length (mm)', parts[2]);
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderFocalLength:' + parts[2]);
                  }

                  if (parts[1] === 'Coordinates') {
                    const [latStr, lngStr, isAutoStr] = parts[2].split(',').map(item => item.trim());
                    const lat = parseFloat(latStr);
                    const lng = parseFloat(lngStr);
                    const isAuto = isAutoStr === 'true' || isAutoStr === '1';
                    this.SetCurrentLocation(lat, lng, isAuto);
                  }

                  if (parts[1] === 'MultiStarGuider') {
                    setGuiderItemValue('Multi Star Guider', (parts[2] === 'true'));
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MultiStarGuider:' + parts[2]);
                  }

                  if (parts[1] === 'GuiderGain') {
                    setGuiderItemValue('Gain', parts[2]);
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'SetGuiderGain:' + parts[2]);
                  }

                  if (parts[1] === 'GuiderOffset') {
                    setGuiderItemValue('Offset', parts[2]);
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'SetGuiderOffset:' + parts[2]);
                  }

                  if (parts[1] === 'CalibrationDuration') {
                    setGuiderItemValue('Calibration step (ms)', parts[2]);
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'CalibrationDuration:' + parts[2]);
                  }

                  if (parts[1] === 'RaAggression') {
                    setGuiderItemValue('Ra Aggression', parts[2]);
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'RaAggression:' + parts[2]);
                  }

                  if (parts[1] === 'DecAggression') {
                    setGuiderItemValue('Dec Aggression', parts[2]);
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'DecAggression:' + parts[2]);
                  }

                  // 新增：单向导星方向（内置导星）
                  if (parts[1] === 'GuiderRaGuideDir') {
                    setGuiderItemValue('RA Single Guide Direction', parts[2]);
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderRaGuideDir:' + parts[2]);
                  }
                  if (parts[1] === 'GuiderDecGuideDir') {
                    setGuiderItemValue('DEC Single Guide Direction', parts[2]);
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderDecGuideDir:' + parts[2]);
                  }
                }
                break;


              case 'ConnectDriverSuccess':
                if (parts.length === 2) {
                  const device = parts[1];
                  this.connectDriverSuccess(device);
                }
                break;

              case 'getDevicePort':
                if (parts.length === 3) {
                  const driverType = parts[1];
                  const usbSerialPath = parts[2];
                  const target = this.devices.find(dev => dev.driverType === driverType);
                  if (target) {
                    target.usbSerialPath = usbSerialPath;
                    this.$bus.$emit('sendCurrentConnectedDevices', this.devices);
                  } else {
                    console.warn('getUSBSerialPath | device not found for type:', driverType);
                  }
                }
                break;

              case 'getSDKVersion':
                if (parts.length === 3) {
                  const driverType = parts[1];
                  const sdkVersion = parts[2];
                  console.log('getSDKVersion:', driverType, ',', sdkVersion);
                  const target = this.devices.find(dev => dev.driverType === driverType);
                  if (target) {
                    target.sdkVersion = sdkVersion;
                    this.$bus.$emit('sendCurrentConnectedDevices', this.devices);
                  } else {
                    console.warn('getSDKVersion | device not found for type:', driverType);
                  }
                  console.log('New devices:', this.devices);
                }
                break;

              case 'ConnectDriverFailed':
                // 支持两种格式：
                // 1. ConnectDriverFailed:message (旧格式，兼容)
                // 2. ConnectDriverFailed:DeviceType:ErrorMessage (新格式，包含设备类型)
                if (parts.length >= 2) {
                  let errorMessage;
                  let deviceType = '';
                  
                  if (parts.length >= 3) {
                    // 新格式：ConnectDriverFailed:DeviceType:ErrorMessage
                    deviceType = parts[1];
                    errorMessage = parts.slice(2).join(':'); // 兼容错误信息里包含 ':'
                  } else {
                    // 旧格式：ConnectDriverFailed:message
                    errorMessage = parts[1];
                  }
                  
                  this.connectDriverFailed(errorMessage, deviceType);
                }
                break;

              case 'SetConnectionModeSuccess':
                // 格式：SetConnectionModeSuccess:DeviceDescription:Mode
                if (parts.length === 3) {
                  const deviceType = (parts[1] || '').trim();
                  const mode = (parts[2] || '').trim().toUpperCase() === 'SDK' ? 'SDK' : 'INDI';
                  this.onSetConnectionModeSuccess(deviceType, mode);
                }
                break;

              case 'SetConnectionModeFailed':
                // 格式：SetConnectionModeFailed:DeviceDescription:ErrorMessage
                if (parts.length >= 3) {
                  const deviceType = (parts[1] || '').trim();
                  const errorMsg = parts.slice(2).join(':'); // 兼容错误信息里包含 ':'
                  this.onSetConnectionModeFailed(deviceType, errorMsg);
                }
                break;

              case 'DisconnectDriverSuccess':
                if (parts.length === 2) {
                  const device = parts[1];
                  this.disconnectDriversuccess(device);
                }
                break;

              case 'DisconnectDriverFail':
                if (parts.length === 2) {
                  const driver = parts[1];
                  this.disconnectDriverFail(driver)
                }

              case 'SelectedDriverList':
                // 兼容旧格式(Desc:Driver)与新格式(Desc:Driver:SDKSupport:Mode)
                if (parts.length >= 3) {
                  this.loadSelectedDriverListFromParts(parts);
                }
                break;


              case 'BindDeviceList':
                // 兼容两种格式：
                // - 旧：BindDeviceList:Name1:Index1:Name2:Index2:...
                // - 新：BindDeviceList:Type1:Name1:Index1:Type2:Name2:Index2:...
                if (parts.length > 1) {
                  const payload = parts.slice(1);
                  if (payload.length % 3 === 0) {
                    const list = [];
                    for (let i = 0; i < payload.length; i += 3) {
                      list.push({
                        DeviceType: (payload[i] || '').trim(),
                        DeviceName: (payload[i + 1] || '').trim(),
                        DeviceIndex: payload[i + 2],
                      });
                    }
                    this.loadBindDeviceList(list);
                  } else if (payload.length % 2 === 0) {
                    const deviceObjects = payload.reduce((acc, part, index, array) => {
                      if (index % 2 === 0) {
                        acc.push({ [array[index]]: array[index + 1] });
                      }
                      return acc;
                    }, []);
                    this.loadBindDeviceList(deviceObjects);
                  } else {
                    console.warn('BindDeviceList | invalid payload:', data.message);
                  }
                }
                break;

              case 'SDKVersionAndUSBSerialPath':
                // 固定格式：SDKVersionAndUSBSerialPath:Type1:SDK1:USB1:Type2:SDK2:USB2:...
                if (parts.length > 1 && ((parts.length - 1) % 3 === 0)) {
                  for (let i = 1; i < parts.length; i += 3) {
                    const Type = (parts[i] || '').trim();
                    const SDK = (parts[i + 1] || '').trim();
                    const USB = (parts[i + 2] || '').trim();
                    const target = this.devices.find(dev => dev.driverType === Type);
                    if (target) {
                      // 非空才赋值；空或 "null" 则清空
                      if (SDK && SDK.toLowerCase() !== 'null') target.sdkVersion = SDK; else target.sdkVersion = '';
                      if (USB && USB.toLowerCase() !== 'null') target.usbSerialPath = USB; else target.usbSerialPath = '';
                    } else {
                      console.warn('SDKVersionAndUSBSerialPath | device not found for type:', Type);
                    }
                  }
                  this.$bus.$emit('sendCurrentConnectedDevices', this.devices);
                } else {
                  console.warn('SDKVersionAndUSBSerialPath | invalid payload:', data.message);
                }
                break;


              case 'BindDeviceTypeList':
                if (parts.length >= 5) { // 确保至少有五个参数加上前缀
                  const deviceTypeObjects = [];
                  for (let i = 1; i < parts.length; i += 4) {
                    const deviceTypeObject = {
                      Type: parts[i],
                      DeviceName: parts[i + 1],
                      DriverName: parts[i + 2],
                      isbind: parts[i + 3] == "true" ? true : false,
                    };
                    deviceTypeObjects.push(deviceTypeObject);
                  }
                  this.loadBindDeviceTypeList(deviceTypeObjects);
                }
                break;

              case 'deleteDeviceAllocationList':
                if (parts.length === 2) {
                  const deviceName = parts[1];
                  this.deleteDeviceAllocationList(deviceName);
                }
                break;

              case 'deleteDeviceTypeAllocationList':
                if (parts.length === 2) {
                  const deviceType = parts[1];
                  if (deviceType != '') {
                    this.$bus.$emit('deleteDeviceTypeAllocationList', deviceType);
                  }
                  if (deviceType == 'CFW') {
                    for (let i = 0; i < this.devices.length; i++) {
                      if (this.devices[i].driverType == 'CFW') {
                        this.devices[i].isConnected = false;
                        this.devices[i].device = '';
                        this.devices[i].driverName = '';
                        this.devices[i].BaudRate = 9600;
                        this.$bus.$emit('CFWConnected', 0);
                      }
                    }
                  }
                }
                break;

              case 'ParseInfoEmitted':
                if (parts.length === 2) {
                  const progress = parts[1];
                  this.$bus.$emit('ParseInfoEmitted', progress);
                }
                break;

              case 'GuiderUpdateStatus':
                if (parts.length === 2) {
                  const status = parts[1];
                  this.$bus.$emit('GuiderUpdateStatus', parseInt(status, 10));
                }
                break;

              // case 'LoopSolveImageFinished':
              //   this.$bus.$emit('LoopSolveImageFinished');
              //   break;

              case 'disconnectDevicehasortherdevice':
                if (parts.length === 2) {
                  const drivername = parts[1];
                  this.showSelectdisconnectDriver(drivername);
                }
                break;

              case 'getFocuserMoveState':
                this.$bus.$emit('getFocuserMoveState');
                break;

              case 'FocusMoveToLimit':
                if (parts.length === 2) {
                  const errorlog = parts[1];
                  this.callShowMessageBox(errorlog, 'error');
                }
                break;

              case 'startFocusLoopFailed':
                if (parts.length === 2) {
                  const message = parts[1];
                  this.$bus.$emit('startFocusLoopFailed', message);
                }
                break;

              case 'setFocuserLoopingState':
                if (parts.length === 2) {
                  const message = parts[1];
                  this.$bus.$emit('setFocuserLoopingState', message);
                  if (message == 'true') {
                    this.isFocusLoopShooting = true;
                  } else {
                    this.isFocusLoopShooting = false;
                    // 停止 ROI 循环时，清空 ROI 叠加层，避免画面残留
                    this.roiOverlayImageData = null;
                  }
                }
                break;

              case 'focuserROIStarsList':
                if (parts.length === 4) {
                  const x = parts[1];
                  const y = parts[2];
                  const HFR = parts[3];
                  this.focuserROIStarsList.push({ x, y, HFR });
                }
                break;

              // case 'clearFocuserROIStarsList':
              //   this.focuserROIStarsList = [];
              //   break;

              case 'setSelectStarPosition':
                if (parts.length === 4) {
                  this.DrawSelectStarX = parseFloat(parts[1]);
                  this.DrawSelectStarY = parseFloat(parts[2]);
                  this.DrawSelectStarHFR = parseFloat(parts[3]);
                }
                break;

              case 'SetRedBoxState':
                if (parts.length === 4) {
                  const length = parseInt(parts[1]);
                  this.ROI_x = parseFloat(parts[2]);
                  this.ROI_y = parseFloat(parts[3]);

                  this.setRedBoxState(length, this.ROI_x, this.ROI_y);
                  console.log('设置红色ROI框: ', length, this.ROI_x, this.ROI_y);
                }
                break;

              case 'SetVisibleArea':
                if (parts.length === 4) {
                  this.visibleX = parseFloat(parts[1]);
                  this.visibleY = parseFloat(parts[2]);
                  this.scale = parseFloat(parts[3]);
                  this.$bus.$emit('setScale', this.scale);
                  this.emitTileLevelInfo();
                  // SetVisibleArea 也代表一次视窗变化，记录位置以便下次拍摄恢复
                  this.rememberTileViewportState();
                  console.log('设置可见区域: ', this.visibleX, this.visibleY, this.scale);
                  this.SendConsoleLogMsg('update VisibleArea x=' + this.visibleX + ', y=' + this.visibleY + ', scale=' + this.scale, 'info');
                }
                break;

              case 'SetSelectStars':
                if (parts.length === 3) {
                  this.selectStarX = parseFloat(parts[1]);
                  this.selectStarY = parseFloat(parts[2]);
                  this.SendConsoleLogMsg('update SelectStars x=' + this.selectStarX + ', y=' + this.selectStarY, 'info');
                }
                break;

              case 'updateCPUInfo':
                if (parts.length === 3) {
                  let cpuTemp = parseFloat(parts[1]);
                  let cpuUsage = parseFloat(parts[2]);
                  this.cpuTemp = isNaN(cpuTemp) ? null : (cpuTemp % 1 === 0 ? cpuTemp : cpuTemp.toFixed(1));  // 如果 cpuTemp 是 NaN，设置为 null，否则如果 cpuTemp 是整数，就不保留小数，否则保留一位小数
                  this.cpuUsage = isNaN(cpuUsage) ? null : (cpuUsage % 1 === 0 ? cpuUsage : cpuUsage.toFixed(1));  // 如果 cpuUsage 是 NaN，设置为 null，否则如果 cpuUsage 是整数，就不保留小数，否则保留一位小数
                  this.$bus.$emit('updateCPUInfo', this.cpuTemp, this.cpuUsage);
                }
                break;

              case 'SchedulePresetList':
                // 任务计划表预设名称列表：SchedulePresetList:name1;name2;name3
                if (parts.length === 2) {
                  const raw = parts[1] || '';
                  const names = raw ? raw.split(';') : [];
                  this.$bus.$emit('SchedulePresetList', names);
                }
                break;

              case 'ScheduleStepState':
                // 任务计划表细粒度步骤状态：
                // ScheduleStepState:row:currentStep:loopDone:loopTotal:stepProgress
                if (parts.length === 6) {
                  const row = parseInt(parts[1]);
                  const payload = {
                    currentStep: parts[2],
                    loopDone: parseInt(parts[3]),
                    loopTotal: parseInt(parts[4]),
                    stepProgress: parseInt(parts[5])
                  };
                  this.$bus.$emit('ScheduleStepState', row, payload);
                }
                break;

              case 'ScheduleLoopState':
                // 任务计划表循环次数专用状态：
                // ScheduleLoopState:row:loopDone:loopTotal:progress
                if (parts.length === 5) {
                  const row = parseInt(parts[1]);
                  const payload = {
                    loopDone: parseInt(parts[2]),
                    loopTotal: parseInt(parts[3]),
                    progress: parseInt(parts[4])
                  };
                  this.$bus.$emit('ScheduleLoopState', row, payload);
                }
                break;

              case 'ScheduleRunning':
                // ScheduleRunning:true/false —— 后端显式告知当前任务计划运行状态
                if (parts.length === 2) {
                  const running = parts[1] === 'true';
                  this.$bus.$emit('ScheduleRunning', running);
                }
                break;

              case 'TianWen':
                if (parts.length === 4) {
                  const notice_type = parts[1];
                  const ra = parts[2];
                  const dec = parts[3];
                  this.$bus.$emit('TianWen', notice_type, ra, dec);
                }
                break;

              case 'setMainCameraParameters':
                if (parts.length >= 3) {
                  let parameters = {};
                  for (let i = 1; i < parts.length; i += 2) {
                    const parameter = parts[i];
                    const value = parts[i + 1];
                    parameters[parameter] = value;
                  }
                  this.setMainCameraParameters(parameters);
                }
                break;

              // 后端下发串口候选列表与当前使用/覆盖的串口：
              //   SerialPortOptions:<driverType>:<currentPort>:<port1>:<port2>:...
              case 'SerialPortOptions': {
                if (parts.length >= 3) {
                  const driverType = parts[1];
                  const currentPort = parts[2] || '';
                  const rawPorts = parts.slice(3);

                  // 解析 "<portPath>-><displayName>" 为 { label, value }
                  const parsedItems = rawPorts
                    .map(p => {
                      const [path, name] = p.split('->');
                      const value = (path || '').trim();
                      if (!value) return null;
                      const display = (name || '').trim();
                      const label = display ? `${value} -> ${display}` : value;
                      return { label, value };
                    })
                    .filter(Boolean);

                  // 第一个选项为“默认”（自动匹配）
                  const defaultItem = {
                    label: this.$t ? this.$t('Default') : 'Default',
                    value: 'default',
                  };

                  if (driverType === 'Mount') {
                    this.mountSerialPortItems = [defaultItem, ...parsedItems];
                    if (currentPort && parsedItems.some(it => it.value === currentPort)) {
                      this.mountSerialPortSelected = currentPort;
                    } else {
                      this.mountSerialPortSelected = 'default';
                    }
                  } else if (driverType === 'Focuser') {
                    this.focuserSerialPortItems = [defaultItem, ...parsedItems];
                    if (currentPort && parsedItems.some(it => it.value === currentPort)) {
                      this.focuserSerialPortSelected = currentPort;
                    } else {
                      this.focuserSerialPortSelected = 'default';
                    }
                  }
                }
                break;
              }

              // 后端请求前端弹出指定设备类型的串口选择界面：
              //   RequestSerialPortSelection:<driverType>
              case 'RequestSerialPortSelection': {
                if (parts.length >= 2) {
                  const driverType = parts[1];
                  // 切换到对应驱动类型，使连接面板中显示该设备的串口/波特率设置
                  this.CurrentDriverType = driverType;
                  // 可选：给用户一个提示
                  this.callShowMessageBox(this.$t('Please select serial port for ') + driverType, 'info');
                }
                break;
              }

              case 'localMessage':
                if (parts.length === 4) {
                  const lat = parts[1];
                  const lon = parts[2];
                  const language = parts[3];
                  this.SendConsoleLogMsg('2------------获得参数设置localMessage: ' + lat + ',' + lon + ',' + language, 'info');
                  if (language == 'zh') {
                    // 来自后端的语言更新（优先级：backend = 3）
                    this.$bus.$emit('ClientLanguage', 'cn', 'backend');
                  } else {
                    this.$bus.$emit('ClientLanguage', 'en', 'backend');
                  }
                  this.$bus.$emit('setLocationLatAndLon', lat, lon);
                }
                break;

              case 'isAutoLocation':
                if (parts.length === 2) {
                  const isAutoLocation = parts[1];
                  this.$bus.$emit('isAutoLocation', isAutoLocation);
                }
                break;

              case 'sendGetLocation':
                if (parts.length === 3) {
                  const lat = parts[1];
                  const lon = parts[2];
                  this.SendConsoleLogMsg('sendGetLocation: ' + lat + ',' + lon, 'info');
                  this.$bus.$emit('sendGetLocation', lat, lon);
                }
                break;

              case 'MainCameraCFA':
                if (parts.length === 2) {
                  let value = parts[1];
                  if (value === '') {
                    value = 'null';
                  } else if (value === 'GRBG') {
                    value = 'GR';
                  } else if (value === 'GBRG') {
                    value = 'GB';
                  } else if (value === 'BGGR') {
                    value = 'BG';
                  } else if (value === 'RG') {
                    value = 'RGGB';
                  }
                  this.ImageCFA = value;
                  console.log("获取到的主相机参数  MainCameraCFA: ", this.ImageCFA);
                  this.MainCameraConfigItems.find(item => item.label === 'ImageCFA').value = this.ImageCFA;
                }
                break;

              case 'CameraNotIdle':
                this.callShowMessageBox('Camera is not idle', 'error');
                this.$bus.$emit('MountOperationComplete', 'solve');
                break;

              case 'MainCameraNotConnect':
                this.callShowMessageBox('Main Camera is not connect', 'error');
                this.$bus.$emit('MountOperationComplete', 'solve');
                break;
              case 'MountNotConnect':
                this.callShowMessageBox('Mount is not connect', 'error');
                this.$bus.$emit('MountOperationComplete', 'solve');
                break;
              case 'ServerInitSuccess':
                this.callShowMessageBox('Server init success', 'success');
                window.location.reload();
                break;
              case 'PolarAlignmentState':
                if (parts.length === 5) {
                  const isRunning = parts[1] == 'true';
                  const state = parts[2];
                  const message = parts[3];
                  const percentage = parts[4];
                  console.log('PolarAlignmentState: ', isRunning, state, message, percentage);
                  this.$bus.$emit('PolarAlignmentIsRunning', isRunning);
                  this.$bus.$emit('PolarAlignmentState', state, message, percentage);
                }
                break;
              case 'PolarAlignmentAdjustmentGuideData':
                if (parts.length === 21) {  // 从17改为21
                  const ra = parseFloat(parts[1]);
                  const dec = parseFloat(parts[2]);
                  // 新增：四个角点
                  const ra0 = parseFloat(parts[3]);
                  const dec0 = parseFloat(parts[4]);
                  const ra1 = parseFloat(parts[5]);
                  const dec1 = parseFloat(parts[6]);
                  const ra2 = parseFloat(parts[7]);
                  const dec2 = parseFloat(parts[8]);
                  const ra3 = parseFloat(parts[9]);
                  const dec3 = parseFloat(parts[10]);

                  const targetra = parseFloat(parts[11]);
                  const targetdec = parseFloat(parts[12]);
                  const offsetra = parseFloat(parts[13]);
                  const offsetdec = parseFloat(parts[14]);
                  const adjustmentra = parts[15];
                  const adjustmentdec = parts[16];
                  const fakePolarRA = parseFloat(parts[17]);
                  const fakePolarDEC = parseFloat(parts[18]);
                  const realPolarRA = parseFloat(parts[19]);
                  const realPolarDEC = parseFloat(parts[20]);


                  // console.log('自动对焦绘制数据: ', ra, dec, targetra, targetdec, fakePolarRA, fakePolarDEC, realPolarRA, realPolarDEC);
                  console.log('四角点数据: ', ra0, dec0, ra1, dec1, ra2, dec2, ra3, dec3);

                  // 现有事件保持不变（使用计算的max/min值兼容）
                  this.$bus.$emit('FieldDataUpdate', [ra, dec, ra0, dec0, ra1, dec1, ra2, dec2, ra3, dec3, targetra, targetdec, fakePolarRA, fakePolarDEC, realPolarRA, realPolarDEC]);

                  // console.log('自动对焦显示更新数据: ', offsetra, offsetdec, adjustmentra, adjustmentdec);
                  this.$bus.$emit('updateCardInfo', ra, dec, targetra, targetdec, offsetra, offsetdec, adjustmentra, adjustmentdec, "deg");

                }
                break;
              case 'PolarAlignmentGuidanceStepProgress':
                if (parts.length === 4) {
                  const step = parseInt(parts[1]);
                  const message = parts[2];
                  const starCount = parseInt(parts[3]);
                  console.log('PolarAlignmentGuidanceStepProgress: ', step, message, starCount);
                  this.$bus.$emit('PolarAlignmentGuidanceStepProgress', step, message, starCount);
                }
                break;

              case 'focusMoveFailed':
                if (parts.length === 2) {
                  const message = parts[1];
                  this.callShowMessageBox(message, 'error');
                  this.$bus.$emit('focusMoveFailed', message);
                }

              case 'focusMoveFailed':
                if (parts.length === 2) {
                  const message = parts[1];
                  this.callShowMessageBox(message, 'error');
                  this.$bus.$emit('focusMoveFailed', message);
                }
                break;

              case 'MeridianETA_hms': {
                if (parts.length >= 4) {
                  const h = parts[1];
                  const m = parts[2];
                  const s = parts[3];

                  const hms = `${h}:${m}:${s}`;
                  const item = this.MountConfigItems.find(i => i.label === 'Flip ETA');
                  if (item) {
                    item.value = hms;
                    item.displayValue = hms;
                  }
                }
                break;
              }

              case 'AutoFlip':
                if (parts.length >= 2) {
                  // TODO::自动翻转功能暂时关闭，需要时再打开
                  console.log('当前AutoFlip命令未启用: ', parts[1]);
                  break;
                  const isAutoFlip = parts[1];
                  // 查找是否已存在 "AutoFlip" 项
                  let item = this.MountConfigItems.find(i => i.label === 'AutoFlip');
                  if (item) {
                    // 已存在 → 更新
                    item.value = isAutoFlip == 'true';
                  } else {
                    // 不存在 → 新增
                    this.MountConfigItems.push({ driverType: 'Mount', label: 'AutoFlip', value: isAutoFlip == 'true', inputType: 'switch' },);
                  }
                  // 同步子组件模式（无需重建组件）
                  const next = (isAutoFlip == 'true') ? 'auto' : 'manual';
                  if (this.$bus && this.$bus.$emit) {
                    this.$bus.$emit('SetFlipMode', next);
                  }
                }
                break;

              case 'FlipStatus':
                if (parts.length === 2) {
                  if (this.$bus && this.$bus.$emit) {
                    this.$bus.$emit('FlipStatus', parts[1]);
                  }
                }
                break;
              // case 'MinutesPastMeridian':
              //   if (parts.length >= 3) {
              //     const EastMinutesPastMeridian = parts[1];
              //     const WestMinutesPastMeridian = parts[2];
              //     let item = this.MountConfigItems.find(i => i.label === 'EastMinutesPastMeridian');
              //     if (item) {
              //       item.value = EastMinutesPastMeridian;
              //     } else {
              //       this.MountConfigItems.push({ driverType: 'Mount', label: 'EastMinutesPastMeridian', value: EastMinutesPastMeridian,min:-180,max:180, inputType: 'number' },);
              //     }
              //     item = this.MountConfigItems.find(i => i.label === 'WestMinutesPastMeridian');
              //     if (item) {
              //       item.value = WestMinutesPastMeridian;
              //     } else {
              //       this.MountConfigItems.push({ driverType: 'Mount', label: 'WestMinutesPastMeridian', value: WestMinutesPastMeridian,min:-180,max:180, inputType: 'number' },);
              //     }
              //   }
              //   break;
              case 'EastMinutesPastMeridian':
                if (parts.length === 2) {
                  const EastMinutesPastMeridian = parts[1];
                  let item = this.MountConfigItems.find(i => i.label === 'EastMinutesPastMeridian');
                  if (item) {
                    item.value = EastMinutesPastMeridian;
                  } else {
                    this.MountConfigItems.push({ driverType: 'Mount', label: 'EastMinutesPastMeridian', value: EastMinutesPastMeridian, min: -180, max: 180, inputType: 'number' },);
                  }
                }
                break;
              case 'WestMinutesPastMeridian':
                if (parts.length === 2) {
                  const WestMinutesPastMeridian = parts[1];
                  let item = this.MountConfigItems.find(i => i.label === 'WestMinutesPastMeridian');
                  if (item) {
                    item.value = WestMinutesPastMeridian;
                  } else {
                    this.MountConfigItems.push({ driverType: 'Mount', label: 'WestMinutesPastMeridian', value: WestMinutesPastMeridian, min: -180, max: 180, inputType: 'number' },);
                  }
                }
                break;
              case 'GotoThenSolve':
                if (parts.length === 2) {
                  const GotoThenSolve = parts[1];
                  let item = this.MountConfigItems.find(i => i.label === 'GotoThenSolve');
                  if (item) {
                    item.value = GotoThenSolve;
                  }
                }
                break;

              case 'SolveCurrentPosition':
                if (parts.length >= 2) {
                  this.MountConfigItems.find(i => i.label === 'SolveCurrentPosition').value = false;
                  if (parts[1] === 'succeeded') {
                    const RA_Degree = parts[2];
                    const DEC_Degree = parts[3];
                    const RA_0 = parts[4];
                    const DEC_0 = parts[5];
                    const RA_1 = parts[6];
                    const DEC_1 = parts[7];
                    const RA_2 = parts[8];
                    const DEC_2 = parts[9];
                    const RA_3 = parts[10];
                    const DEC_3 = parts[11];
                    this.SolveCurrentPositionSuccess(RA_Degree, DEC_Degree, RA_0, DEC_0, RA_1, DEC_1, RA_2, DEC_2, RA_3, DEC_3);
                    this.reEnableButton('SolveCurrentPosition');
                  }
                  else if (parts[1] === 'failed') {
                    this.callShowMessageBox('Solve Current Position failed', 'error');
                    this.reEnableButton('SolveCurrentPosition');
                  }
                }
                break;

              case 'addFwhmNow':
                if (parts.length >= 2) {
                  const fwhm = parseFloat(parts[1]);
                  console.log('Received addFwhmNow:', fwhm);
                  this.$bus.$emit('addFwhmNow', fwhm);
                }
                break;
              case 'Box_Space':
                // 后端返回盒子可用空间（字节），转发给内存设置面板
                if (parts.length === 2) {
                  const bytes = parts[1];
                  this.$bus.$emit('Box_Space', bytes);
                  if (bytes < 1024 * 1024 * 1024) {
                    this.callShowMessageBox(this.$t('Box space is less than 1GB, please clear the cache'), 'warning');
                  }
                }
                break;
              case 'ClearLogs':
                // 后端清理日志完成回执
                if (parts.length >= 2 && parts[1] === 'Success') {
                  this.SendConsoleLogMsg('Logs cleared successfully', 'info');
                }
                break;
              case 'ClearBoxCache':
                // 后端清理缓存完成回执
                if (parts.length >= 2 && parts[1] === 'Success') {
                  this.SendConsoleLogMsg('Box cache cleared successfully', 'info');
                }
                break;

              case 'FocuserLimit':
                if (parts.length === 3) {
                  const FocuserMinLimit = parts[1];
                  const FocuserMaxLimit = parts[2];
                  let item = this.FocuserConfigItems.find(i => i.label === 'Min Limit');
                  if (item) {
                    item.value = FocuserMinLimit;
                  } else {
                    this.FocuserConfigItems.push({ driverType: 'Focuser', label: 'Min Limit', value: FocuserMinLimit, inputType: 'number' },);
                  }
                  item = this.FocuserConfigItems.find(i => i.label === 'Max Limit');
                  if (item) {
                    item.value = FocuserMaxLimit;
                  } else {
                    this.FocuserConfigItems.push({ driverType: 'Focuser', label: 'Max Limit', value: FocuserMaxLimit, inputType: 'number' },);
                  }
                  this.$bus.$emit('setFocusChartRange', FocuserMinLimit, FocuserMaxLimit);
                }
                break;

              case 'FocuserRangeReset':
                // 电调范围重置警告（当设备初始化时检测到本地保存的范围不合理）
                if (parts.length === 2) {
                  const message = parts[1];
                  // 显示警告消息框
                  this.callShowMessageBox(this.$t('focuser.range_reset_warning', { message }), 'warning');
                  // 同时在控制台输出
                  this.SendConsoleLogMsg(this.$t('focuser.range_reset_warning', { message }), 'warning');
                }
                break;

              case 'FocuserParameters':
                // 后端格式（兼容）:
                // - 旧: FocuserParameters:<minLimit>:<maxLimit>:<backlash>:<coarseDivisions>
                // - 新: FocuserParameters:<minLimit>:<maxLimit>:<backlash>:<coarseDivisions>:<stepsPerClick>
                if (parts.length === 5 || parts.length === 6) {
                  const FocuserMinLimit = parts[1];
                  const FocuserMaxLimit = parts[2];
                  const FocuserBacklash = parts[3];
                  const divisions = parts[4];
                  const stepsPerClick = (parts.length === 6) ? parts[5] : null;

                  // Min/Max Limit
                  let item = this.FocuserConfigItems.find(i => i.label === 'Min Limit');
                  if (item) {
                    item.value = FocuserMinLimit;
                  } else {
                    this.FocuserConfigItems.push({ driverType: 'Focuser', label: 'Min Limit', value: FocuserMinLimit, inputType: 'number' },);
                  }
                  item = this.FocuserConfigItems.find(i => i.label === 'Max Limit');
                  if (item) {
                    item.value = FocuserMaxLimit;
                  } else {
                    this.FocuserConfigItems.push({ driverType: 'Focuser', label: 'Max Limit', value: FocuserMaxLimit, inputType: 'number' },);
                  }
                  this.$bus.$emit('setFocusChartRange', FocuserMinLimit, FocuserMaxLimit);

                  // Backlash
                  item = this.FocuserConfigItems.find(i => i.label === 'Backlash');
                  if (item) {
                    item.value = FocuserBacklash;
                  }

                  // Steps per Click
                  if (stepsPerClick !== null) {
                    item = this.FocuserConfigItems.find(i => i.label === 'Steps per Click');
                    if (item) {
                      item.value = stepsPerClick;
                    }
                    const stepInt = parseInt(stepsPerClick);
                    if (!Number.isNaN(stepInt)) {
                      this.$bus.$emit('focusMoveStep', stepInt);
                    }
                  }

                  // Coarse Step Divisions
                  item = this.FocuserConfigItems.find(i => i.label === 'Coarse Step Divisions');
                  if (item) {
                    item.value = divisions;
                  }
                }
                break;
              // case 'Backlash':
              //   if (parts.length === 2) {
              //     const FocuserBacklash = parts[1];
              //     let item = this.FocuserConfigItems.find(i => i.label === 'Backlash');
              //     if (item) {
              //       item.value = FocuserBacklash;
              //     }
              //   }
              //   break;
              // case 'Coarse Step Divisions':
              //   if (parts.length === 2) {
              //     const divisions = parts[1];
              //     const item = this.FocuserConfigItems.find(i => i.label === 'Coarse Step Divisions');
              //     if (item) {
              //       item.value = divisions;
              //     }
              //   }
              //   break;
              case 'updateAutoFocuserState':
                if (parts.length === 2) {
                  const autoFocusState = parts[1];
                  this.$bus.$emit('updateAutoFocuserState', autoFocusState == 'true'); // 更新自动对焦按钮状态

                }
                break;
              case 'AutoFocusConfirm': // [AUTO_FOCUS_UI_ENHANCEMENT]
                if (parts.length >= 2) {
                  const question = parts[1];
                  console.log('AutoFocusConfirm:', question);
                  this.ShowConfirmDialog('自动对焦', question, 'startAutoFocus');
                }
                break;

              case 'AutoFocusStepChanged': // [AUTO_FOCUS_UI_ENHANCEMENT]
                if (parts.length >= 3) {
                  const step = parts[1];
                  const description = parts[2];
                  console.log('AutoFocusStepChanged:', step, description);
                  this.$bus.$emit('UpdateAutoFocusStep', step, description);
                }
                break;

              case 'AutoFocusCancelled': // [AUTO_FOCUS_UI_ENHANCEMENT]
                if (parts.length >= 2) {
                  const reason = parts[1];
                  console.log('AutoFocusCancelled:', reason);
                  this.callShowMessageBox(reason, 'info');
                }
                break;

              case 'AutoFocusStarted': // [AUTO_FOCUS_UI_ENHANCEMENT]
                if (parts.length >= 2) {
                  // 兼容旧格式：AutoFocusStarted:<message>
                  // 新格式：AutoFocusStarted:<mode>:<message>，mode=full/fine
                  let mode = 'full';
                  let message = '';
                  if (parts.length >= 3) {
                    mode = parts[1] || 'full';
                    message = parts.slice(2).join(':');
                  } else {
                    message = parts[1];
                  }
                  this.autoFocusInfo.mode = mode || 'full';
                  console.log('AutoFocusStarted:', mode, message);
                  // 新的一次自动对焦开始时，重置 FitResult 提示开关
                  this.fitResultShown = false;
                  this.$bus.$emit('StartAutoFocus');
                }
                break;

              case 'AutoFocusEnded': // [AUTO_FOCUS_UI_ENHANCEMENT]
                if (parts.length >= 2) {
                  const message = parts[1];
                  console.log('AutoFocusEnded:', message);
                  this.$bus.$emit('EndAutoFocus');
                }
                break;

              // 自动对焦 SNR 结果（粗调 / 精调） - [AUTO_FOCUS_UI_ENHANCEMENT]
              // 格式: AutoFocusSNR:<stage>:<index>:<position>:<snr>
              case 'AutoFocusSNR':
                if (parts.length >= 5) {
                  const stage = parts[1];   // 'coarse' or 'fine'
                  const index = parseInt(parts[2], 10);
                  const position = parseInt(parts[3], 10);
                  const snr = parseFloat(parts[4]);
                  console.log('AutoFocusSNR:', stage, index, position, snr);
                  this.$bus.$emit('AutoFocusSNR', { stage, index, position, snr });
                }
                break;
              // 自动对焦拍摄进度：各阶段当前张数 / 总张数
              // 格式: AutoFocusCaptureProgress:<stage>:<current>:<total>
              case 'AutoFocusCaptureProgress':
                if (parts.length >= 4) {
                  const stage = parts[1];
                  const current = parseInt(parts[2], 10) || 0;
                  const total = parseInt(parts[3], 10) || 0;
                  this.autoFocusInfo.stage = stage;
                  this.autoFocusInfo.currentShot = current;
                  this.autoFocusInfo.totalShots = total;
                  console.log('AutoFocusCaptureProgress:', stage, current, '/', total);
                  // 将进度信息同步到对焦面板，在自动对焦控制区域旁边显示
                  this.$bus.$emit('AutoFocusCaptureProgressUI', {
                    stage,
                    current,
                    total,
                    mode: this.autoFocusInfo.mode || 'full'
                  });
                }
                break;
              case 'StartAutoPolarAlignmentStatus':
                if (parts.length >= 3) {
                  const status = parts[1];
                  const message = parts[2];
                  this.$bus.$emit('PolarAlignmentIsRunning', status == 'true');
                  console.log('StartAutoPolarAlignmentStatus:', status, message);
                  this.callShowMessageBox(message, status == 'true' ? 'info' : 'error');
                }
                break;
              case 'MountOnlyGotoSuccess':
                this.reEnableButton('Goto');
                this.callShowMessageBox('Mount Only Goto Success', 'info');
                break;
              case 'MountOnlyGotoFailed':
                if (parts.length === 2) {
                  const message = parts[1];
                  this.callShowMessageBox(message, 'error');
                  this.reEnableButton('Goto');
                }
                break;

              // ===== PHD2 异常退出/重启 =====
              case 'PHD2ClosedUnexpectedly':
                // 后端格式: "PHD2ClosedUnexpectedly:是否重新启动PHD2?"
                {
                  const text = parts.length >= 2 ? parts.slice(1).join(':') : this.$t('PHD2 closed unexpectedly. Restart now?');
                  this.ShowConfirmDialog('PHD2', text, 'RestartPHD2');
                }
                break;
              case 'PHD2Restarting':
                this.callShowMessageBox('Restarting PHD2...', 'info');
                break;

              case 'getMountInfo':
                if (parts.length >= 2) {
                  const mountInfo = parts[1];
                  for (const item of this.devices) {
                    if (item.driverType === 'Mount') {
                      item.sdkVersion = mountInfo;
                      break;
                    }
                  }
                  this.$bus.$emit('sendCurrentConnectedDevices', this.devices);
                }
                break;

              // ===== 内置导星（GuiderCore）消息（用于 UI 显示/避免“未处理命令”刷屏） =====
              case 'GuiderCoreState':
                if (parts.length === 2) {
                  const state = parseInt(parts[1], 10);
                  this.$bus.$emit('GuiderCoreState', state);
                }
                break;
              case 'GuiderCoreInfo':
                // 形如：GuiderCoreInfo:任意文本（通常是中文提示/日志）
                {
                  const msg = parts.length >= 2 ? parts.slice(1).join(':') : '';
                  if (msg) {
                    // 进入前端日志（控制台/自定义 console log）
                    this.SendConsoleLogMsg(msg, 'info');
                    // 同步抛给组件（如果后续想在界面上显示导星提示）
                    this.$bus.$emit('GuiderCoreInfo', msg);
                  }
                }
                break;
              case 'GuiderCalibration':
                // 形如：GuiderCalibration:cameraAngleDeg=...:orthoErrDeg=...:...
                this.$bus.$emit('GuiderCalibration', data.message);
                break;
              case 'GuiderPulse':
                // 形如：GuiderPulse:NORTH:110:raErrPx=...:decErrPx=...
                this.$bus.$emit('GuiderPulse', data.message);
                break;
              case 'GuiderStarSelected':
                // 形如：GuiderStarSelected:x=885.00:y=366.00:snr=806.3:hfd=4.47
                this.$bus.$emit('GuiderStarSelected', data.message);
                break;
              default:
                console.warn('未处理命令: ', data.message);
                break;
            }
          }
        }
        else if (data.type === 'QT_Confirm') {
          // 处理确认消息
          const messageId = data.msgid;
          this.handleMessageResponse(messageId);
        } else if (data.type === 'Process_Command') {
          console.log('Process_Command: ', data.message);
          // 处理返回消息
          const parts = data.message.split(':');
          if (parts[0] === 'qtServerIsOver') {
            this.callShowMessageBox('QT Server is over', 'error');
            this.ShowConfirmDialog('restart', 'QT server encountered a segmentation fault or is frozen, please restart or exit!', 'restartQtServer');
          }
          else if (parts[0] === 'checkHasNewUpdatePack') {
            if (parts.length === 2) {
              const version = parts[1];
              this.SendConsoleLogMsg('获取到更新包版本: ' + version, 'info');

              this.ShowConfirmDialog('ForceUpdate', this.$t('checkHasNewUpdatePack') + ': ' + version + '，' + this.$t('updateConfirm'), 'updateCurrentClient:' + version);
            }
          }
          else if (parts[0] === 'No_update_pack_found') {
            this.callShowMessageBox(this.$t('No_update_pack_found'), 'error');
          } else if (parts[0] === 'update_progress') {
            this.$bus.$emit('update_progress', data.message);
          } else if (parts[0] === 'update_error') {
            this.$bus.$emit('update_error', data.message);
          } else if (parts[0] === 'update_success') {
            this.$bus.$emit('update_success', data.message);
          } else if (parts[0] === 'update_sequence_start') {
            this.$bus.$emit('update_sequence_start', data.message);
          } else if (parts[0] === 'update_sequence_step') {
            this.$bus.$emit('update_sequence_step', data.message);
          } else if (parts[0] === 'update_sequence_finished') {
            this.$bus.$emit('update_sequence_finished', data.message);
          } else if (parts[0] === 'update_sequence_failed') {
            this.$bus.$emit('update_sequence_failed', data.message);
          } else if (parts[0] === 'testQtServerProcess') {

          }
          else {
            console.warn('未处理命令: ', data.message);
          }
        }

        this.receivedMessages.push(data.message); // 将接收到的消息添加到数组中
      };

      this.websocket.onerror = (error) => {
        const errorDetails = {
          type: error.type,
          timestamp: new Date().toISOString(),
          url: this.WebSocketUrl,
          readyState: this.websocket.readyState,
          protocol: this.websocket.protocol,
          extensions: this.websocket.extensions
        };
        console.error('WebSocket Error Details:', errorDetails);
        this.SendConsoleLogMsg('WebSocket Error: ' + JSON.stringify(errorDetails), 'error');
        this.websocketState = 'error';
        this.networkDisconnected = true;
      };

      this.websocket.onclose = () => {
        console.log('QHYCCD | WebSocket disconnected');
        this.websocketState = 'disconnected';
        this.networkDisconnected = true; // WebSocket连接关闭时设置网络连接状态
        console.log('QHYCCD | WebSocket disconnected');
        this.$bus.$emit('ShowNetStatus', 'false');

        // 设置一个定时器，1秒后检查网络状态
        this.disconnectTimeout = setTimeout(() => {
          if (this.networkDisconnected) { // 如果1秒后仍然断开
            this.callShowMessageBox('WebSocket disconnected', 'error');
            this.disconnectTimeoutTriggered = true;
          }
        }, 1000); // 1秒后执行

        // 启动自动重连
        this.reconnectWebSocket();
      };
    },

    // 自动重连
    reconnectWebSocket() {
      setTimeout(() => {
        console.log('QHYCCD | WebSocket reconnected');
        this.SendConsoleLogMsg('WebSocket reconnected.', 'info');
        this.connect();
      }, 2000); // 2秒后尝试重新连接
    },
    // 自动重连

    //监听网络连接状态
    setupNetworkStatusListener() {
      window.addEventListener('online', () => {
        // 检查断开连接的定时器是否已经触发
        if (this.disconnectTimeoutTriggered) {
          this.callShowMessageBox('WebSocket connected', 'success');
        }
        clearTimeout(this.disconnectTimeout); // 清除断开连接的定时器
        this.networkDisconnected = false; // 网络恢复时重置网络连接状态
        this.$bus.$emit('ShowNetStatus', 'true');
        this.StatusRecovery();
        this.reconnectWebSocket(); // 网络恢复后自动重连WebSocket
      });

      window.addEventListener('offline', () => {
        this.networkDisconnected = true; // 网络断开时设置网络连接状态
        this.$bus.$emit('ShowNetStatus', 'false');
        this.disconnectTimeoutTriggered = false; // 初始化断开连接定时器触发标志
        // 设置一个定时器，1秒后检查网络状态
        this.disconnectTimeout = setTimeout(() => {
          if (this.networkDisconnected) { // 如果1秒后仍然断开
            this.disconnectTimeoutTriggered = true; // 标记定时器已触发
            this.callShowMessageBox('WebSocket disconnected', 'error');
          }
        }, 1000); // 1秒后执行
      });
    },
    //监听网络连接状态

    sendMessage(type, message) {
      console.log("QHYCCD | sendMessage: ", message);

      const messageId = this.generateMessageId(); // 生成唯一的消息ID
      const messageObj = { type: type, msgid: messageId, message: message }; // 创建包含类型和消息的对象
      const messageJson = JSON.stringify(messageObj); // 将消息对象转换为 JSON 字符串
      const messageState = { msgid: messageId, text: messageJson, success: false }; // 创建包含消息和状态信息的对象

      if (this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(messageJson);
        // messageState.success = true; // 设置消息为成功
      }
      this.sentMessages.push(messageState); // 添加消息对象到已发送的消息数组
    },

    generateMessageId() {
      // 使用时间戳和计数器生成唯一的消息ID
      return Date.now() + "-" + (this.messageCounter++);
    },

    handleMessageResponse(messageId) {
      // 根据返回的消息ID更新消息发送状态
      const lastMessage = this.sentMessages[this.sentMessages.length - 1];
      if (lastMessage && lastMessage.msgid === messageId) {
        lastMessage.success = true;
      }
    },

    // 消息框
    callShowMessageBox(msg, type) {
      console.log('QHYCCD | callShowMessageBox:', msg, type);
      this.SendConsoleLogMsg(msg, type);
      this.$bus.$emit('showMsgBox', msg, type);
    },
    // 消息框

    locationClicked: function () {
      this.$bus.$emit('Vue_Command', 'localMessage'); // 获取位置信息
      this.$store.commit('toggleBool', 'showLocationDialog');

      // 打开地图对话框时，关闭任务计划表和时间控制器
      if (this.$store.state.showLocationDialog) {
        this.$bus.$emit('closeScheduleAndDateTimePicker');
      }

      this.$bus.$emit('ResetTime');
    },

    SetCurrentLocation(lat, lng, isAuto) {
      console.log('SetCurrentLocation:', lat, ',', lng);
      this.$bus.$emit('SendConsoleLogMsg', 'Set Current Location:' + lat + ',' + lng, 'info');
      this.$bus.$emit('PolarPointAltitude', lat);
      this.$bus.$emit('resetLocation', lat, lng, isAuto);
      const loc = {
        short_name: 'Unknown',
        country: 'Unknown',
        lng: lng,
        lat: lat,
        alt: 0,
        accuracy: 0,
        street_address: ''
      }
      this.$store.commit('setCurrentLocation', loc);

      this.$bus.$emit('ShowPositionInfo', lat, lng);

      setTimeout(() => {
        this.$bus.$emit('ResetTime');
      }, 1000);
    },
    // 状态恢复
    StatusRecovery() {
      // this.sendMessage('SendConsoleLogMsg', '网络连接恢复，恢复当前状态!', 'warning');
      this.getQTClientVersion();                // 获取QTClient版本
      this.getTotalVersion();                   // 获取总版本号
      this.sendMessage('Vue_Command', 'getROIInfo'); // 获取ROI信息
      this.sendMessage('Vue_Command', 'localMessage'); // 获取位置信息
      this.sendMessage('Vue_Command', 'getLastSelectDevice'); // 获取上一次选择的设备
      this.sendMessage('Vue_Command', 'getMainCameraParameters'); // 获取主相机参数
      this.sendMessage('Vue_Command', 'getMountParameters'); // 获取赤道仪UI信息
      this.sendMessage('Vue_Command', 'getFocuserParameters'); // 获取焦距器参数
      this.RecalibratePolarAxis(); // 重新校准极轴
      this.sendMessage('Vue_Command', 'getStagingSolveResult'); // 获取定标结果
      // this.sendMessage('Vue_Command', 'getFocuserLoopingState'); // 获取焦距器循环状态,弃用

      this.sendMessage('Vue_Command', 'getStagingScheduleData'); // 获取定标计划数据
      this.sendMessage('Vue_Command', 'getStagingSolveResult'); // 获取定标结果
      this.sendMessage('Vue_Command', 'getGPIOsStatus'); // 获取GPIO状态


      // this.sendMessage('Vue_Command', 'getPolarAlignmentState'); // 获取极轴对齐状态,更换位置
      this.sendMessage('Vue_Command', 'loadSDKVersionAndUSBSerialPath'); // 获取SDK版本和USB序列号路径
      this.sendMessage('Vue_Command', 'USBCheck'); // 检查USB状态


      this.disconnectTimeoutTriggered = false;
    },

    openPowerManagerPage() {
      this.isOpenDevicePage = false;
      this.isOpenPowerPage = true;

      this.drawer_2 = true;
    },

    QuitToMainApp() {
      this.sendMessage('Broadcast_Msg', 'CloseWebView');
    },

    selectDevice(device) {
      if (!this.haveDeviceConnect || (this.haveDeviceConnect) || device.driverType === 'Telescopes') {
        this.isOpenDevicePage = true;
        this.isOpenPowerPage = false;

        if (device.isget === false) {
          // device.isget = true;
          this.sendMessage('Vue_Command', 'SelectIndiDriver:' + device.type + ":" + device.ListNum);
          this.drivers = [];
        }

        this.CurrentDriverType = device.driverType;
        this.DeviceIsConnected = device.isConnected;
        this.BaudRateSelected = device.BaudRate;
        if (device.driverType === 'Telescopes') {
          this.DeviceIsConnected = true;
        }

        this.drawer_2 = true;

        this.ToBeConnectDevice = [];
        this.devicesList.forEach(devicesList => {
          if (devicesList.type === this.CurrentDriverType) {
            this.ToBeConnectDevice.push(devicesList);
          }
        });
      } else {
        this.callShowMessageBox('The device is not connected.', 'error');
      }

    },

    CurrentConfigItems() {
      console.log('CurrentConfigItems: ', this.CurrentDriverType + 'ConfigItems');
      switch (this.CurrentDriverType) {
        case 'Guider':
          return this.GuiderConfigItems;
        case 'MainCamera':
          // 仅当主相机=QHY 且连接模式=SDK 时，才展示 Burst 相关配置
          {
            const dev = (this.devices || []).find(d => d && d.driverType === 'MainCamera') || {};
            const driverName = String(dev.driverName || '');
            const isQhy = driverName.toLowerCase().includes('qhy');
            const isSdk = String(dev.connectionMode || '').toUpperCase() === 'SDK';
            const allowBurst = isQhy && isSdk;
            return (this.MainCameraConfigItems || []).filter(it => !(it && it.qhyOnly) || allowBurst);
          }
        case 'Mount':
          return this.MountConfigItems;
        case 'Telescopes':
          return this.TelescopesConfigItems;
        case 'Focuser':
          return this.FocuserConfigItems;
        case 'PoleCamera':
          return this.PoleCameraConfigItems;
        case 'CFW':
          return this.CFWConfigItems;
        default:
          return [];
      }
    },

    confirmDriver() {
      // 确定驱动的逻辑
      console.log("QHYCCD | confirmDriver: ", this.selectedDriver);

      // 防护：若 selectedDriver 是 SDK/INDI 占位符，拒绝确认并提示用户重新选择
      const upperDriver = String(this.selectedDriver || '').toUpperCase();
      if (upperDriver === 'SDK' || upperDriver === 'INDI') {
        this.SendConsoleLogMsg(`Invalid driver "${this.selectedDriver}". Please select a valid driver from the list.`, 'error');
        this.callShowMessageBox(`Invalid driver "${this.selectedDriver}". Please select a valid driver.`, 'error');
        return;
      }

      if (!this.selectedDriver || this.selectedDriver === '') {
        this.SendConsoleLogMsg('No driver selected', 'warning');
        this.callShowMessageBox('Please select a driver first', 'warning');
        return;
      }

      this.SendConsoleLogMsg('Confirm Indi Driver:' + this.selectedDriver, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ConfirmIndiDriver:' + this.selectedDriver + ':' + this.BaudRateSelected);
      this.confirmDriverType = this.CurrentDriverType;
      this.loadingSelectDriver = true;

      this.devices.forEach(device => {
        if (device.driverType === this.CurrentDriverType) {
          device.device = this.selectedDriver;
          device.driverName = this.selectedDriver;
          device.BaudRate = this.BaudRateSelected;
          // 驱动切换后，刷新该设备是否支持 SDK，并确保模式与能力匹配
          this.refreshSdkSupportAndModeForDevice(device.driverType, device.driverName);
        }
      });

      // 若主相机与导星镜选用了同一驱动：确保二者连接模式保持一致
      if (this.CurrentDriverType === 'MainCamera' || this.CurrentDriverType === 'Guider') {
        this.ensureMainGuiderModeConsistency(this.CurrentDriverType);
      }
    },
    clearDriver() {
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ClearIndiDriver');
      this.SendConsoleLogMsg('Clear Indi Driver', 'info');
      this.devices.forEach(device => {
        if (device.driverType === this.CurrentDriverType) {
          device.device = '';
          device.driverName = '';
          device.BaudRate = 9600;
          device.supportSDK = false;
          device.connectionMode = 'INDI';
        }
      });
      this.selectedDriver = '';
      this.selectedConnectionMode = 'INDI';
      // 更新UI显示，确保清除后的状态正确反映在界面上
      if (this.CurrentDriverType) {
        this.updateSelectedDriver(this.CurrentDriverType);
      }
    },
    confirmDevice() {
      // 确定设备的逻辑
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ConfirmIndiDevice:' + this.selectedDevice + ':' + this.selectedDriver);
      // this.$bus.$emit('AppUpdateDevices', this.CurrentDriverType, this.selectedDevice);
      this.updateDevices(this.CurrentDriverType, this.selectedDevice);
    },

    updateDevices(driverType, newDevice) {    // 手动选择
      this.devices.forEach(device => {
        if (device.driverType === driverType) {
          device.device = newDevice;
        }
      });
    },

    updateDevices_(ListNum, newDevice) {    // 从文件导入
      this.devices.forEach(device => {
        if (device.ListNum === ListNum) {
          device.device = newDevice;
        }
      });
      this.loadingConnectAllDevice = false;
    },

    updateDevicesConnect(type, DeviceName, DriverName, isBind = true, opts = {}) {    // 连接成功
      const silent = !!opts.silent;
      this.SendConsoleLogMsg('updateDevicesConnect' + type + ' ' + DeviceName + ' ' + DriverName + ' ' + isBind, 'info');
      
      // driverName 允许缺省（例如解绑流程只需要改 bound，不应该把 driverName 写成 undefined）
      const hasDriverName = !(DriverName === undefined || DriverName === null || String(DriverName).trim() === '');
      // 防护：过滤掉 SDK/INDI 占位符，避免将连接模式误当作驱动名称
      const upperDriverName = hasDriverName ? String(DriverName).toUpperCase() : '';
      if (hasDriverName && (upperDriverName === 'SDK' || upperDriverName === 'INDI')) {
        console.warn(`updateDevicesConnect: Invalid driver name "${DriverName}" for ${type}, skipping driverName update`);
      }

      this.devices.forEach(device => {
        if (device.driverType === type) {
          device.device = (isBind == true) ? DeviceName : "Not Bind Device";
          // 仅当 driverName 有效时才更新，避免解绑/异常路径污染已有驱动名
          if (hasDriverName && upperDriverName !== 'SDK' && upperDriverName !== 'INDI') {
            device.driverName = DriverName;
          }
          device.isConnected = true;
        }
      });
      if (!silent) {
        const shownName = (isBind && DeviceName) ? DeviceName : 'Not Bind Device';
        this.callShowMessageBox(shownName + ' success connected', 'success');
      }
      this.haveDeviceConnect = true;
      // 注释掉：不再在单个设备连接成功时关闭进度条，等待全部连接完成消息
      // this.loadingConnectAllDevice = false;

      if (type === 'MainCamera') {
        // 连接成功：仍视为已连接（是否绑定由 bound 单独标记，不影响其它功能）
        this.$bus.$emit('MainCameraConnected', 1);
        // 同步“绑定状态”到全局设备管理（用于：拍摄/循环拍摄/自动对焦/极轴校准/计划表/解析等精确拦截）
        this.$store.commit('device/SET_DEVICE_BOUND', { device: 'MainCamera', bound: !!isBind });
        console.log('MainCamera is Connected. bound=', !!isBind);
      } else if (type === 'Mount') {
        this.$bus.$emit('MountConnected', 1);
        console.log('Mount is Connected.');
      } else if (type === 'CFW') {
        this.$bus.$emit('CFWConnected', 1);
        console.log('Mount is Connected.');
      } else if (type === 'Focuser') {
        this.$bus.$emit('FocuserConnected', 1);
        console.log('Focuser is Connected.');
      } else if (type === 'Guider') {
        this.$bus.$emit('GuiderConnected', 1);
        console.log('Guider is Connected.');
      }
      console.log('updateDevicesConnect: ', type, DeviceName, DriverName, isBind);

      this.$bus.$emit('DeviceConnectSuccess', type, DeviceName, DriverName, isBind);
    },
    startConnectBtnPress(event) {
      // 如果是触摸事件，标记并处理
      if (event.type === 'touchstart') {
        this.isTouching = true;
        this.isConnectBtnLongPress = false; // 重置长按标记
        // 触摸后通常会跟随触发合成鼠标事件，设置一个 ignore 窗口期来屏蔽
        this.ignoreMouseEventsUntil = Date.now() + 800;
        clearTimeout(this.ConnectBtnPressTimer);
        this.ConnectBtnPressTimer = setTimeout(() => {
          this.isConnectBtnLongPress = true; // 标记为长按
          this.handleConnectBtnLongPress();
        }, this.ConnectBtnlongPressThreshold);
      }
      // 如果是鼠标事件，且没有正在进行的触摸事件，则处理
      else if (event.type === 'mousedown' && !this.isTouching) {
        if (Date.now() < this.ignoreMouseEventsUntil) return;
        this.isConnectBtnLongPress = false; // 重置长按标记
        clearTimeout(this.ConnectBtnPressTimer);
        this.ConnectBtnPressTimer = setTimeout(() => {
          this.isConnectBtnLongPress = true; // 标记为长按
          this.handleConnectBtnLongPress();
        }, this.ConnectBtnlongPressThreshold);
      }
    },
    endConnectBtnPress(event) {
      // 如果是触摸事件，处理并重置标记
      if (event.type === 'touchend') {
        clearTimeout(this.ConnectBtnPressTimer); // 清除定时器
        if (!this.isConnectBtnLongPress) {
          this.handleConnectBtnClick(); // 如果不是长按，则触发点击事件
        }
        this.ConnectBtnPressTimer = null; // 重置定时器
        this.isTouching = false; // 重置触摸标记
      }
      // 如果是鼠标事件，且没有正在进行的触摸事件，则处理
      else if (event.type === 'mouseup' && !this.isTouching) {
        if (Date.now() < this.ignoreMouseEventsUntil) return;
        clearTimeout(this.ConnectBtnPressTimer); // 清除定时器
        if (!this.isConnectBtnLongPress) {
          this.handleConnectBtnClick(); // 如果不是长按，则触发点击事件
        }
        this.ConnectBtnPressTimer = null; // 重置定时器
      }
    },
    handleConnectBtnClick() {
      if (this.haveDeviceConnect) {
        this.callShowMessageBox('Please disconnect all devices first.', 'error');
        return;
      }
      if (!this.ConnectBtnCanClick) return; // 如果不可点击，直接返回
      this.ConnectBtnCanClick = false; // 设置为不可点击
      console.log("Connect Button clicked");

      this.connectAllDevice();

      // 恢复点击权限
      setTimeout(() => {
        this.ConnectBtnCanClick = true;
      }, 1000); // 1秒后恢复
    },
    handleConnectBtnLongPress() {
      if (this.haveDeviceConnect) {
        this.callShowMessageBox('Please disconnect all devices first.', 'error');
        return;
      }
      // 长按事件的处理
      console.log("Connect Button long pressed");

      this.autoConnectAllDevice();
    },
    connectAllDevice() {
      if (this.QTClientVersion === 'Not connected'){
        this.callShowMessageBox('Please connect the QT client first.', 'error');
        return;
      }
      console.log("QHYCCD | connectAllDevice.");
      this.SendConsoleLogMsg('Connect All Device', 'info');
      this.sendMessage('Vue_Command', 'connectAllDevice');
      this.loadingConnectAllDevice = true;
    },
    autoConnectAllDevice() {
      console.log("QHYCCD | autoConnectAllDevice.");
      this.SendConsoleLogMsg('Auto Connect All Device', 'info');
      this.sendMessage('Vue_Command', 'autoConnectAllDevice');
      this.loadingConnectAllDevice = true;
    },

    disconnectAllDevice(confirm) {
      // 检查是否有设备的 isConnected 属性为 true
      // const hasConnectedDevices = this.devices.some(device => device.isConnected);

      if (this.haveDeviceConnect) {
        if (confirm === false) {
          this.ShowConfirmDialog('Confirm', 'Are you sure you want to disconnect all devices?', 'disconnectAllDevice');
        } else {
          this.sendMessage('Vue_Command', 'disconnectAllDevice');
          this.SendConsoleLogMsg('Disconnect All Device', 'info');
          this.haveDeviceConnect = false;
          // this.devices.forEach(device => {
          //   device.isConnected = false;
          //   // device.device = '';
          // });

          this.$bus.$emit('MainCameraConnected', 0);
          this.$bus.$emit('MountConnected', 0);
          this.$bus.$emit('CFWConnected', 0);
          this.$bus.$emit('FocuserConnected', 0);
          this.$bus.$emit('GuiderConnected', 0);
          this.clearDeviceList();
        }
      } else {
        this.callShowMessageBox('No devices have been connected.', 'error');
      }
      this.selectedDriver = '';
    },

    clearDeviceList() {
      this.devices.forEach(device => {
        device.device = device.driverName;
        device.isConnected = false;
        device.isget = false;
        device.BaudRate = 9600;
      });
      this.ToBeConnectDevice = [];
      this.devicesList = [];
      this.drivers = [];
      this.$bus.$emit('clearDeviceAllocationList');
    },

    SwitchOutPutPower(index, isPowerON) {
      if (isPowerON) {
        this.drawer_2 = false;
        this.ShowConfirmDialog('Output Power:' + index, 'Are you sure you want to turn off this output power?', 'SwitchOutPutPower');
      } else {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'SwitchOutPutPower:' + index);
        this.SendConsoleLogMsg('Switch OutPutPower' + index, 'info');
      }
    },

    RestartRaspberryPi() {
      this.drawer_2 = false;
      this.ShowConfirmDialog('Restart', 'Are you sure you want to restart the Raspberry Pi?', 'RestartRaspberryPi');
    },

    ShutdownRaspberryPi() {
      this.drawer_2 = false;
      this.ShowConfirmDialog('Shut Down', 'Are you sure you want to shut down the Raspberry Pi?', 'ShutdownRaspberryPi');
    },

    ForceUpdate() {
      this.drawer_2 = false;
      this.ShowConfirmDialog('Force Update', 'Are you sure you want to force update the Raspberry Pi?', 'ForceUpdate');
    },

    ReturnConnectedDevices() {
      this.devices.forEach(device => {
        if (device.driverType === 'MainCamera') {
          if (device.isConnected === true) {
            this.$bus.$emit('MainCameraConnected', 1);
            console.log('MainCamera is Connected.');
            this.SendConsoleLogMsg('MainCamera is Connected.', 'info');
          }
        } else if (device.driverType === 'Mount') {
          if (device.isConnected === true) {
            this.$bus.$emit('MountConnected', 1);
            console.log('Mount is Connected.');
            this.SendConsoleLogMsg('Mount is Connected.', 'info');
          }
        }
      });
      this.sendMessage('Vue_Command', 'loadSelectedDriverList');
      this.sendMessage('Vue_Command', 'loadBindDeviceList');
      this.sendMessage('Vue_Command', 'loadBindDeviceTypeList');

    },
    ReturnCurrentConnectedDevices() {
      this.$bus.$emit('sendCurrentConnectedDevices', this.devices);
    },

    OpenIamgeFolder() {
      this.$bus.$emit('ImageManagerPanelOpen');
      this.nav = false;
    },

    OpenDebugLog() {
      this.$bus.$emit('toggleINDIDebugDialog');
      this.nav = false;
    },

    SendConsoleLogMsg(message, type) {
      if (type == 'error') {
        console.error('Error: ' + message);
        this.$bus.$emit('SendConsoleLog', type, message);
      } else if (type == 'info') {
        console.log('Info: ' + message);
        this.$bus.$emit('SendConsoleLog', type, message);
      } else if (type == 'warning') {
        console.warn('Warning: ' + message);
        this.$bus.$emit('SendConsoleLog', type, message);
      } else {
        console.log('Debug: ' + message);
      }
    },

    DeviceAllocation() {
      this.$bus.$emit('toggleDeviceAllocationPanel');
      this.nav = false;
    },

    // CurrentExpTimeList(index, value) {
    //   const expTimeIndex = this.MainCameraConfigItems.findIndex(item => item.label === 'ExpTime [' + (index + 1) + ']');
    //   if (expTimeIndex !== -1) { // 确保找到了对应的配置项
    //     // 更新 ExpTime1 配置项的值
    //     this.MainCameraConfigItems[expTimeIndex].value = value;
    //   } else {
    //     console.error('ExpTime [' + index + '] configuration item not found.');
    //   }
    // },

    CurrentCFWList(index, value) {
      const expTimeIndex = this.CFWConfigItems.findIndex(item => item.label === 'CFW [' + (index + 1) + ']');
      if (expTimeIndex !== -1) { // 确保找到了对应的配置项
        // 更新 ExpTime1 配置项的值
        this.CFWConfigItems[expTimeIndex].value = value;
        if (index === this.cfwMenuCurrentIndex) {
          this.updateCfwMenuCurrentDisplay();
        }
      } else {
        console.error('CFW [' + index + '] configuration item not found.');
      }
    },

    confirmConfiguration(List) {
      List.forEach(item => {
        if (item.value !== '') {
          // console.log(item.label, item.value);
          this.SendConsoleLogMsg(item.label + ':' + item.value, 'info');
          this.$bus.$emit(item.label, item.label + ':' + item.value);
        } else if (item.value == '' && item.label === 'Focal Length (mm)') {
          this.SendConsoleLogMsg(item.label + 'is NULL', 'info');
          this.$bus.$emit(item.label, item.label + ':');
        }
      });
      this.callShowMessageBox('Configuration has been modified!', 'success');
    },

    loadAndDisplayImage(imagePath) {
      const canvas = document.getElementById('guiderCamera-canvas');
      // const canvas = document.getElementById('mainCamera-canvas');
      if (canvas.getContext) {
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          // this.$bus.$emit('showSolveImage', img);
        };

        // 添加错误处理
        img.onerror = (error) => {
          console.log(`加载图像失败: ${imagePath}`);
          this.SendConsoleLogMsg(`加载图像失败: ${imagePath}`, 'error');
        };

        img.src = imagePath;
      }
    },

    /**
     * 从文件加载直方图数据（新方案：通过HTTPS下载.bin文件）
     * @param {string} sessionId - 会话ID
     * @param {number} bins - bin数量
     * @param {number} total - 总像素数
     * @param {string} url - 直方图文件URL
     */
    async loadHistogramFromFile(sessionId, bins, total, url) {
      try {
        // 添加时间戳避免浏览器缓存
        const timestamp = new Date().getTime();
        const fetchUrl = url.includes('?') ? `${url}&_t=${timestamp}` : `${url}?_t=${timestamp}`;
        
        this.SendConsoleLogMsg(`Fetching histogram from: ${fetchUrl}`, 'info');
        
        // 下载二进制文件
        const response = await fetch(fetchUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        this.SendConsoleLogMsg(`Downloaded histogram file: ${arrayBuffer.byteLength} bytes`, 'info');
        
        // 解析二进制格式
        // 文件格式：[bins(4字节)][total(8字节)][histogram数据(bins*4字节)]
        const dataView = new DataView(arrayBuffer);
        let offset = 0;
        
        // 读取bins数量（4字节，uint32，little-endian）
        const fileBins = dataView.getUint32(offset, true);
        offset += 4;
        
        // 读取总像素数（8字节，uint64，little-endian）
        // JavaScript的Number只能精确表示53位整数，但对于像素总数已足够
        const fileTotal = Number(dataView.getBigUint64(offset, true));
        offset += 8;
        
        // 验证文件头数据
        if (fileBins !== bins) {
          this.SendConsoleLogMsg(`Warning: bins mismatch (expected ${bins}, got ${fileBins})`, 'warning');
        }
        
        // 读取直方图数据
        const counts = new Array(fileBins);
        for (let i = 0; i < fileBins; i++) {
          counts[i] = dataView.getUint32(offset, true);
          offset += 4;
        }
        
        // 保存直方图数据
        this.tileHistogram = { sessionId, bins: fileBins, total: fileTotal, counts };
        this.SendConsoleLogMsg(
          `Histogram loaded: session=${sessionId}, bins=${fileBins}, total=${fileTotal}, parsed=${counts.length}`,
          'info'
        );
        
        // 复用既有直方图绘制链路
        if (counts && counts.length > 0) {
          this.$bus.$emit('showHistogram', counts);
          
          // 如果有对应的GPM数据，同步更新拉伸参数
          if (this.tileGPM && this.tileGPM.sessionId === sessionId) {
            const blackLevel = this.tileGPM.blackLevel;
            const whiteLevel = this.tileGPM.whiteLevel;
            console.log(`[TileMode] 同步直方图参数: blackLevel=${blackLevel}, whiteLevel=${whiteLevel}`);
            this.$bus.$emit('ChangeDialPosition', blackLevel, whiteLevel);
            this.$bus.$emit('AutoHistogramNum', blackLevel, whiteLevel);
          } else {
            console.log('[TileMode] 直方图数据已加载，但GPM数据尚未到达，等待GPM数据同步');
          }
        }
        
      } catch (error) {
        this.SendConsoleLogMsg(`Failed to load histogram: ${error.message}`, 'error');
        console.error('Histogram loading error:', error);
      }
    },

    ImageGainSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const doubleValue = parseFloat(value); // 将值转换为 double 类型

      if (signal === 'ImageGainR') {
        // 处理 ImageGainR 信号
        this.ImageGainR = doubleValue;
        this.SendConsoleLogMsg('ImageGainR is set to:' + doubleValue, 'info');
        this.sendMessage('Vue_Command', 'ImageGainR:' + doubleValue);
        
        // 同步更新瓦片GPM参数（不重新下载瓦片，只重新处理显示）
        if (this.tileGPM) {
          this.SendConsoleLogMsg(`更新瓦片ImageGainR参数: ${doubleValue}`, 'info');
          this.tileGPM.gainR = doubleValue;
          this.reprocessTilesWithNewGains();
        }
      } else if (signal === 'ImageGainB') {
        // 处理 ImageGainB 信号
        this.ImageGainB = doubleValue;
        this.SendConsoleLogMsg('ImageGainB is set to:' + doubleValue, 'info');
        this.sendMessage('Vue_Command', 'ImageGainB:' + doubleValue);
        
        // 同步更新瓦片GPM参数（不重新下载瓦片，只重新处理显示）
        if (this.tileGPM) {
          this.SendConsoleLogMsg(`更新瓦片ImageGainB参数: ${doubleValue}`, 'info');
          this.tileGPM.gainB = doubleValue;
          this.reprocessTilesWithNewGains();
        }
      }
    },

    // ImageOffsetSet(payload) {
    //   const [signal, value] = payload.split(':'); // 拆分信号和值
    //   const doubleValue = parseFloat(value); // 将值转换为 double 类型

    //   this.ImageOffset = doubleValue;
    //   console.log('Image Offset is set to:', doubleValue);
    //   this.SendConsoleLogMsg('Image Offset is set to:' + doubleValue, 'info');
    //   this.sendMessage('Vue_Command', 'ImageOffset:' + doubleValue);
    // },

    // BinningSet(payload) {
    //   const [signal, value] = payload.split(':'); // 拆分信号和值
    //   const IntValue = parseInt(value); // 将值转换为 Int 类型
    //   this.cameraBin = IntValue;
    //   console.log('Image Binning is set to:', IntValue);
    //   this.SendConsoleLogMsg('Image Binning is set to:' + IntValue, 'info');
    //   this.sendMessage('Vue_Command', 'SetBinning:' + IntValue);
    //   this.$bus.$emit('SetBinningNum', IntValue);
    // },

    // GainSet(payload) {
    //   const [signal, value] = payload.split(':'); // 拆分信号和值
    //   const IntValue = parseInt(value); // 将值转换为 Int 类型

    //   console.log('Camera Gain is set to:', IntValue);
    //   this.SendConsoleLogMsg('Camera Gain is set to:' + IntValue, 'info');
    //   this.sendMessage('Vue_Command', 'SetCameraGain:' + IntValue);
    // },

    // OffsetSet(payload) {
    //   const [signal, value] = payload.split(':'); // 拆分信号和值
    //   const IntValue = parseInt(value); // 将值转换为 Int 类型

    //   console.log('Camera Offset is set to:', IntValue);
    //   this.SendConsoleLogMsg('Camera Offset is set to:' + IntValue, 'info');
    //   this.sendMessage('Vue_Command', 'SetCameraOffset:' + IntValue);
    // },

    ImageCFASet(value) {

      // if (['GR', 'GB', 'BG', 'RGGB','null'].includes(value)) {
      if (['GR', 'GB', 'BG', 'RG', 'GRBG', 'GBRG', 'BGGR', 'RGGB', 'null', ''].includes(value)) {
        if (value === '') {
          value = 'null';
        } else if (value === 'GRBG') {
          value = 'GR';
        } else if (value === 'GBRG') {
          value = 'GB';
        } else if (value === 'BGGR') {
          value = 'BG';
        } else if (value === 'RG') {
          value = 'RGGB';
        }
        this.ImageCFA = value;
        // console.log('ImageCFA is set to:', value);
        this.SendConsoleLogMsg('ImageCFA is set to:' + value, 'info');
        this.sendMessage('Vue_Command', 'ImageCFA:' + value);
      } else {
        // console.log(`Invalid value for ImageCFA: '${value}'. Please set it to one of 'GR', 'GB', 'BG', 'RGGB'.`);
        this.callShowMessageBox(`Invalid value for ImageCFA: '${value}'. Please set it to one of 'GR', 'GB', 'BG', 'RGGB'.`, 'error');
      }
    },

    // SelfExposureTimeSet(payload) {
    //   const [signal, value] = payload.split(':'); // 拆分信号和值
    //   const IntValue = parseInt(value); // 将值转换为 Int 类型
    //   if (IntValue <= 0) {
    //     this.callShowMessageBox('Self Exposure Time must be greater than 0', 'error');
    //     this.$bus.$emit('setSelfExposureTime', 0);
    //     return;
    //   }
    //   this.SendConsoleLogMsg('Self Exposure Time is set to:' + IntValue, 'info');
    //   this.sendMessage('Vue_Command', 'Self Exposure Time (ms):' + IntValue);
    //   this.$bus.$emit('setSelfExposureTime', IntValue);
    // },
    getSelfExposureTime() {
      const item = this.MainCameraConfigItems.find(item => item.label === 'Self Exposure Time (ms)');
      if (item) {
        this.$bus.$emit('setSelfExposureTime', parseInt(item.value));
      }
    },

    // CameraTemperatureSet(payload) {
    //   const [signal, value] = payload.split(':'); // 拆分信号和值
    //   const IntValue = parseInt(value); // 将值转换为 Int 类型

    //   console.log('Camera Temperature is set to:', IntValue);
    //   this.SendConsoleLogMsg('Camera Temperature is set to:' + IntValue, 'info');
    //   this.sendMessage('Vue_Command', 'SetCameraTemperature:' + IntValue);
    // },

    FocalLengthSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值

      for (const device of this.devices) {
        if (device.driverType === 'Telescopes') {

          if (value === '' || value === NaN) {
            device.device = '';
            this.SendConsoleLogMsg('Focal Length is set to:' + 0, 'info');
            this.$bus.$emit('SetFocalLengthNum', '');
          } else {
            const IntValue = parseInt(value); // 将值转换为 Int 类型
            device.device = value + ' mm';
            this.SendConsoleLogMsg('Focal Length is set to:' + IntValue, 'info');
            this.$bus.$emit('SetFocalLengthNum', IntValue);
          }
        }
      }


    },

    GuiderFocalLengthSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const IntValue = parseInt(value); // 将值转换为 Int 类型


      this.SendConsoleLogMsg('Guider Focal Length is set to:' + IntValue, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderFocalLength:' + IntValue);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'saveToConfigFile:GuiderFocalLength:' + IntValue);
    },

    MultiStarGuiderSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      this.SendConsoleLogMsg('Multi Star Guider is set to:' + value, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MultiStarGuider:' + value);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'saveToConfigFile:MultiStarGuider:' + value);
    },

    // 内置导星：单向导星方向配置（RA/DEC）
    GuiderRaSingleGuideDirSet(payload) {
      const [signal, value] = payload.split(':');
      let dir = String(value || '').trim().toUpperCase();
      // 如果包含括号，提取括号内的方向（用于显示），但发送时只发送 AUTO
      if (dir.startsWith('AUTO')) {
        // 保持 "AUTO" 或 "AUTO (EAST)" 格式
        dir = dir; // 保持原样
      } else if (dir !== 'WEST' && dir !== 'EAST') {
        return;
      }
      this.SendConsoleLogMsg('RA Single Guide Direction is set to:' + dir, 'info');
      // 发送时，如果是 AUTO 格式，只发送 AUTO（不带括号）
      const sendDir = dir.startsWith('AUTO') ? 'AUTO' : dir;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderRaGuideDir:' + sendDir);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'saveToConfigFile:GuiderRaGuideDir:' + sendDir);
    },

    GuiderDecSingleGuideDirSet(payload) {
      const [signal, value] = payload.split(':');
      let dir = String(value || '').trim().toUpperCase();
      // 如果包含括号，提取括号内的方向（用于显示），但发送时只发送 AUTO
      if (dir.startsWith('AUTO')) {
        // 保持 "AUTO" 或 "AUTO (SOUTH)" 格式
        dir = dir; // 保持原样
      } else if (dir !== 'NORTH' && dir !== 'SOUTH') {
        return;
      }
      this.SendConsoleLogMsg('DEC Single Guide Direction is set to:' + dir, 'info');
      // 发送时，如果是 AUTO 格式，只发送 AUTO（不带括号）
      const sendDir = dir.startsWith('AUTO') ? 'AUTO' : dir;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderDecGuideDir:' + sendDir);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'saveToConfigFile:GuiderDecGuideDir:' + sendDir);
    },

    GuiderPixelSizeSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const doubleValue = parseFloat(value);
      this.SendConsoleLogMsg('Guider Pixel size is set to:' + doubleValue, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderPixelSize:' + doubleValue);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'saveToConfigFile:GuiderPixelSize:' + doubleValue);
    },

    GuiderGainSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const IntValue = parseInt(value);
      this.SendConsoleLogMsg('Guider Gain is set to:' + IntValue, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderGain:' + IntValue);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'saveToConfigFile:GuiderGain:' + IntValue);
    },

    CalibrationDurationSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const IntValue = parseInt(value);
      this.SendConsoleLogMsg('Guider Calibration step is set to:' + IntValue, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'CalibrationDuration:' + IntValue);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'saveToConfigFile:CalibrationDuration:' + IntValue);
    },

    RaAggressionSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const IntValue = parseInt(value);
      this.SendConsoleLogMsg('Ra Aggression is set to:' + IntValue, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'RaAggression:' + IntValue);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'saveToConfigFile:RaAggression:' + IntValue);
    },

    DecAggressionSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const IntValue = parseInt(value);
      this.SendConsoleLogMsg('Dec Aggression is set to:' + IntValue, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'DecAggression:' + IntValue);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'saveToConfigFile:DecAggression:' + IntValue);
    },

    SyncFocuserStep(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const IntValue = parseInt(value);
      this.SendConsoleLogMsg('Sync Focuser Step:' + IntValue, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'SyncFocuserStep:' + IntValue);
    },
    StepsPerClickSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const IntValue = parseInt(value);
      this.SendConsoleLogMsg('Steps per Click:' + IntValue, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'StepsPerClick:' + IntValue);
      this.$bus.$emit('focusMoveStep', IntValue);
    },
    MinLimitSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const IntValue = parseInt(value);
      this.SendConsoleLogMsg('Min Limit:' + IntValue, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MinLimit:' + IntValue);
    },
    MaxLimitSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const IntValue = parseInt(value);
      this.SendConsoleLogMsg('Max Limit:' + IntValue, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MaxLimit:' + IntValue);
    },
    BacklashSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const IntValue = parseInt(value);
      this.SendConsoleLogMsg('Backlash:' + IntValue, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'Backlash:' + IntValue);
    },

    AutoFocusExposureTimeSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      let IntValue = parseInt(value);
      if (!Number.isFinite(IntValue) || IntValue <= 0) {
        this.callShowMessageBox('AutoFocus Exposure Time must be greater than 0', 'error');
        IntValue = 1000;
      }
      this.SendConsoleLogMsg('AutoFocus Exposure Time (ms):' + IntValue, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'AutoFocus Exposure Time (ms):' + IntValue);
    },

    CoarseStepDivisionsSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      let IntValue = parseInt(value);
      if (!Number.isFinite(IntValue) || IntValue <= 0) {
        IntValue = 10;
      }
      this.SendConsoleLogMsg('Coarse Step Divisions:' + IntValue, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'Coarse Step Divisions:' + IntValue);
    },

    GotoThenSolve(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const BooleanValue = Boolean(value);
      this.SendConsoleLogMsg('Goto Then Solve:' + BooleanValue, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GotoThenSolve:' + BooleanValue);
    },
    SolveCurrentPosition(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const BooleanValue = Boolean(value);
      // 仅限制：解析当前位置（主相机未绑定时禁止）
      if (!this.$store.getters['device/isDeviceBound']('MainCamera')) {
        this.callShowMessageBox(
          this.$t('MainCameraNotBoundAction', { action: this.$t('Feature_SolveCurrentPosition') }),
          'error'
        );
        return;
      }
      this.SendConsoleLogMsg('Solve Current Position:' + BooleanValue, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'SolveCurrentPosition:' + BooleanValue);
    },

    LoopCapture(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const BooleanValue = Boolean(value);
      this.SendConsoleLogMsg('Loop Capture:' + BooleanValue, 'info');
      // 仅限制：ROI循环拍摄（主相机未绑定时禁止）
      if (!this.$store.getters['device/isDeviceBound']('MainCamera')) {
        this.callShowMessageBox(
          this.$t('MainCameraNotBoundAction', { action: this.$t('Feature_ROILoopCapture') }),
          'error'
        );
        return;
      }
      if (BooleanValue) {
        const check = this.$canUseDevice('MainCamera', 'CaptureLoop');
        if (!check.allowed) return;
        this.$startFeature(['MainCamera'], 'CaptureLoop');
      } else {
        this.$stopFeature(['MainCamera'], 'CaptureLoop');
      }
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'LoopCapture:' + BooleanValue);
    },

    // AutoSave(payload) {
    //   const [signal, value] = payload.split(':'); // 拆分信号和值
    //   const BooleanValue = (value === 'true' || value === true);
    //   this.SendConsoleLogMsg('Auto Save:' + BooleanValue, 'info');
    //   this.$bus.$emit('AppSendMessage', 'Vue_Command', 'SetMainCameraAutoSave:' + BooleanValue);
    // },
    // SaveFolderSet(payload) {
    //   const [signal, value] = payload.split(':'); // 拆分信号和值
    //   const StringValue = String(value);
    //   this.SendConsoleLogMsg('Save Folder:' + StringValue, 'info');
    //   this.$bus.$emit('AppSendMessage', 'Vue_Command', 'SetMainCameraSaveFolder:' + StringValue);
    // },

    Goto(payload) {
      this.showRaDecDialog = true;
      console.log('Goto 显示RA-DEC对话框');
    },
    onRaDecDialogConfirm({ ra, dec, raMode }) {
      this.showRaDecDialog = false;
      const check = this.$canUseDevice('Mount', 'MountGoto');
      if (!check.allowed) {
        this.reEnableButton('Goto');
        return;
      }
      this.SendConsoleLogMsg('Goto:' + ra + ',' + dec, 'info');
      this.$startFeature(['Mount'], 'MountGoto');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'Goto:' + ra + ':' + dec);
    },
    onRaDecDialogCancel() {
      this.showRaDecDialog = false;
      this.reEnableButton('Goto');
    },
    SolveCurrentPositionSuccess(RA_Degree, DEC_Degree, RA_0, DEC_0, RA_1, DEC_1, RA_2, DEC_2, RA_3, DEC_3) {
      this.callShowMessageBox('Solve Current Position Success: RA: ' + RA_Degree + '°, DEC: ' + DEC_Degree + '°', 'info');
      // 绘制当前位置
      const coordinates = [
        { ra: RA_0, dec: DEC_0 },     // 右上角
        { ra: RA_1, dec: DEC_1 },     // 左上角
        { ra: RA_2, dec: DEC_2 },     // 左下角
        { ra: RA_3, dec: DEC_3 },     // 右下角
        { ra: RA_0, dec: DEC_0 }      // 回到右上角（闭合多边形）
      ]
      const currentColor = {
        stroke: "#00BFFF",        // 蓝色边框：当前位置
        strokeOpacity: 1,         // 边框不透明度
        fill: "#00BFFF",          // 蓝色填充：当前位置
        fillOpacity: 0.3          // 填充不透明度（半透明）
      }
      this.$bus.$emit('drawCalibrationPointPolygon', coordinates, currentColor, 'Current_Position');
    },
    AutoFlipSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const BooleanValue = Boolean(value);
      this.SendConsoleLogMsg('Auto Flip:' + BooleanValue, 'info');
      this.$bus.$emit('SetFlipMode', BooleanValue ? 'auto' : 'manual');  // 同步子组件模式
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'AutoFlip:' + BooleanValue); // 同步到后端
    },

    sendMountAutoFlip() {
      const isAutoFlip = this.MountConfigItems.find(item => item.label === 'AutoFlip').value;
      this.$bus.$emit('SetFlipMode', isAutoFlip ? 'auto' : 'manual');
    },

    WestMinutesPastMeridianSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const WestMinutesPastMeridian = parseFloat(value);
      this.SendConsoleLogMsg('Minutes Past Meridian:' + WestMinutesPastMeridian, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'WestMinutesPastMeridian:' + WestMinutesPastMeridian);
    },

    EastMinutesPastMeridianSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const EastMinutesPastMeridian = parseFloat(value);
      this.SendConsoleLogMsg('Minutes Past Meridian:' + EastMinutesPastMeridian, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'EastMinutesPastMeridian:' + EastMinutesPastMeridian);
    },

    /**
     * @deprecated 已废弃：不再使用传统bin文件方式，请使用瓦片金字塔模式
     * 保留此函数仅为了防止后端仍然调用导致错误
     */
    async readBinFile(fileName, retryCount = 1) {
      this.SendConsoleLogMsg(`警告: readBinFile已废弃，请使用瓦片模式。文件: ${fileName}`, 'warning');
      return; // 直接返回，不再处理
      while (this.isDownloadingImage) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!this.isWaitingLogged) {
          this.SendConsoleLogMsg(
            'The image is already being processed. Please wait for the previous process to complete.',
            'warning'
          );
          this.isWaitingLogged = true;
        }
      }

      if (this.isDownloadingImageName === fileName) {
        this.SendConsoleLogMsg('The image(' + fileName + ') is already processed.', 'info');
        return;
      }

      // ===== Watchdog 配置 =====
      const TIMEOUT_MS = 5000;           // 5 秒无数据即判超时
      let watchdog = null;               // 定时器句柄
      const kickWatchdog = (onTimeout) => {
        if (watchdog) clearTimeout(watchdog);
        watchdog = setTimeout(onTimeout, TIMEOUT_MS);
      };
      const clearWatchdog = () => { if (watchdog) { clearTimeout(watchdog); watchdog = null; } };

      this.isDownloadingImage = true;
      this.isWaitingLogged = false;
      this.SendConsoleLogMsg('CaptureTestTime | Read image(' + fileName + ') data start.', 'info');

      const startTime = new Date();
      const controller = new AbortController();

      try {
        if (!fileName || typeof fileName !== 'string') {
          throw new Error('Invalid file name provided');
        }

        // fetch 可被 watchdog 中断
        const response = await fetch(fileName, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Network response was not ok. Status: ${response.status}`);
        }

        const contentLength = response.headers.get('content-length');
        if (!contentLength) {
          throw new Error('Content-Length header is missing');
        }

        const total = parseInt(contentLength, 10);
        if (isNaN(total) || total <= 0) {
          throw new Error('Invalid content-length value');
        }

        let loaded = 0;
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Readable stream is not available on response.body');
        }

        // 首次启动 watchdog：如果 5 秒内拿不到首个 chunk，就中止
        kickWatchdog(() => {
          this.SendConsoleLogMsg('Download stalled for >5s (no data). Aborting...', 'error');
          controller.abort(new DOMException('Inactivity timeout', 'AbortError'));
        });

        const stream = new ReadableStream({
          start: (controllerRS) => {
            const pump = () => {
              reader.read().then(({ done, value }) => {
                if (done) {
                  controllerRS.close();
                  return;
                }
                // 收到数据：重置 watchdog
                kickWatchdog(() => {
                  this.SendConsoleLogMsg('Download stalled for >5s (no progress). Aborting...', 'error');
                  controller.abort(new DOMException('Inactivity timeout', 'AbortError'));
                });

                loaded += value.byteLength;
                const percent = (loaded / total) * 100;
                if (Math.round(percent) % 10 === 0) {
                  this.updateCaptureImageProgress(Math.round(percent));
                }
                controllerRS.enqueue(value);
                pump();
              }).catch(error => {
                console.error('Stream reading error:', error);
                this.SendConsoleLogMsg('Stream reading error: ' + error.message, 'error');
                controllerRS.error(error);
              });
            };
            pump();
          },
          cancel: (reason) => {
            // 取消时也清 watchdog
            clearWatchdog();
          }
        });

        const newResponse = new Response(stream);
        const blob = await newResponse.blob();

        // 下载结束，先清 watchdog
        clearWatchdog();

        // 若实际字节数 < Content-Length，判定为异常提前结束
        if (blob.size < total) {
          throw new Error(`Download ended prematurely: received ${blob.size} / ${total} bytes`);
        }

        // FileReader 路径
        const fileReader = new FileReader();
        const done = await new Promise((resolve, reject) => {
          fileReader.onload = () => resolve(true);
          fileReader.onerror = (e) => reject(new Error('FileReader error: ' + (e?.message || 'Unknown')));
          fileReader.readAsArrayBuffer(blob);
        });

        if (done) {
          this.ImageArrayBuffer = fileReader.result;
          const endTime = new Date();
          const elapsedTime = endTime.getTime() - startTime.getTime();
          this.SendConsoleLogMsg('CaptureTestTime | Read image data end: ' + elapsedTime + ' ms', 'info');
          if (!this.isPolarAxisMode) {
            this.callShowMessageBox(`Read image data end: '${elapsedTime}' ms.`, 'info');
          }
          this.isDownloadingImageName = fileName;
          this.processImage(this.ImageArrayBuffer);
        }
      } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
        this.SendConsoleLogMsg('There was a problem with the fetch operation: ' + error.message, 'error');

        // 失败重试
        if (retryCount > 0) {
          this.SendConsoleLogMsg('Retrying download...', 'warning');
          this.isDownloadingImage = false;
          this.updateCaptureImageProgress(100);
          await this.readBinFile(fileName, retryCount - 1);
          return; // 避免 finally 里再次改状态后继续往下
        } else {
          this.SendConsoleLogMsg('Max retries reached. Download failed.', 'error');
          this.updateCaptureImageProgress(100);
        }
      } finally {
        clearWatchdog();
        this.isDownloadingImage = false; // 无论如何都复位
      }
    },

    // ========================= 瓦片金字塔方法 =========================

    normalizeTileBuildModeValue(value) {
      return String(value || '').trim() === 'merged_single_level' ? 'merged_single_level' : 'pyramid';
    },

    /**
     * 处理后端发送的GPM消息
     * @param {Object} gpm - 全局处理元数据
     */
    async handleTileGPM(gpm) {
      gpm.buildMode = this.normalizeTileBuildModeValue(gpm.buildMode);
      this.SendConsoleLogMsg(`Received TileGPM: session=${gpm.sessionId}, size=${gpm.imageWidth}x${gpm.imageHeight}, maxZoom=${gpm.maxZoomLevel}`, 'info');

      // frameId：用于让“瓦片下载回包/缓存写入”与“当前 GPM”强绑定，避免错帧拉伸（尤其是 live 覆盖写 + 异步 fetch）
      const incomingFrameId = (typeof gpm.frameId === 'number' && isFinite(gpm.frameId)) ? gpm.frameId : null;
      
      // 判定是否是新的瓦片会话（新图/新 session 才需要清空缓存和画布）
      const prevGpm = this.tileGPM || {};
      const prevPreviewBin = Number.isFinite(Number(prevGpm.previewBinningFactor))
        ? Number(prevGpm.previewBinningFactor)
        : null;
      const nextPreviewBin = Number.isFinite(Number(gpm.previewBinningFactor))
        ? Number(gpm.previewBinningFactor)
        : null;
      const prevPreviewWidth = Number.isFinite(Number(prevGpm.previewWidth))
        ? Number(prevGpm.previewWidth)
        : null;
      const nextPreviewWidth = Number.isFinite(Number(gpm.previewWidth))
        ? Number(gpm.previewWidth)
        : null;
      const prevPreviewHeight = Number.isFinite(Number(prevGpm.previewHeight))
        ? Number(prevGpm.previewHeight)
        : null;
      const nextPreviewHeight = Number.isFinite(Number(gpm.previewHeight))
        ? Number(gpm.previewHeight)
        : null;
      const prevMaxZoomLevel = Number.isFinite(Number(prevGpm.maxZoomLevel))
        ? Number(prevGpm.maxZoomLevel)
        : null;
      const nextMaxZoomLevel = Number.isFinite(Number(gpm.maxZoomLevel))
        ? Number(gpm.maxZoomLevel)
        : null;

      const isNewSession =
        this.tileSessionId !== gpm.sessionId ||
        this.showImageSizeX !== gpm.imageWidth ||
        this.showImageSizeY !== gpm.imageHeight ||
        prevPreviewBin !== nextPreviewBin ||
        prevPreviewWidth !== nextPreviewWidth ||
        prevPreviewHeight !== nextPreviewHeight ||
        prevMaxZoomLevel !== nextMaxZoomLevel ||
        (prevGpm.cfa || 'null') !== (gpm.cfa || 'null');

      const sessionIdStr = String(gpm.sessionId || '');
      const isLiveSession = sessionIdStr === 'live' || sessionIdStr.startsWith('live_');

      // live 覆盖写帧节流：高帧率下若每条 TileGPM 都立即清缓存/abort，会导致前端持续“重启加载”，
      // 表现为跳帧、卡顿、瓦片大量失败、缩放后长时间不刷新。
      // 策略：对 isNewSession=false 且 live 会话的 TileGPM 做节流，只处理“最新一条”。
      const isLiveOverwriteFrame = (!isNewSession) && isLiveSession;
      if (isLiveOverwriteFrame) {
        const now = Date.now();
        const throttleMs = Number(this.liveTileGpmThrottleMs) || 250;
        const last = Number(this.liveTileGpmLastHandledAt) || 0;
        if (last > 0 && (now - last) < throttleMs) {
          this.pendingLiveTileGpm = gpm;
          if (!this.pendingLiveTileGpmTimer) {
            const wait = Math.max(0, throttleMs - (now - last));
            this.pendingLiveTileGpmTimer = setTimeout(() => {
              const pg = this.pendingLiveTileGpm;
              this.pendingLiveTileGpm = null;
              this.pendingLiveTileGpmTimer = null;
              if (pg) this.handleTileGPM(pg);
            }, wait);
          }
          return;
        }
        this.liveTileGpmLastHandledAt = now;
      }

      // 即将处理更新的 GPM 时，丢弃此前排队的旧 live GPM，避免定时器晚到后把界面回滚到旧帧。
      if (this.pendingLiveTileGpmTimer) {
        clearTimeout(this.pendingLiveTileGpmTimer);
        this.pendingLiveTileGpmTimer = null;
      }
      this.pendingLiveTileGpm = null;

      // E2E：每次“真正处理”的 TileGPM 视为“出图成功”的关键标志（节流会合并掉中间帧）
      this.e2eTileGpmSeq = (Number(this.e2eTileGpmSeq) || 0) + 1;

      // 保存GPM
      this.tileGPM = gpm;
      this.tileSessionId = gpm.sessionId;
      const tileBuildModeItem = this.MainCameraConfigItems.find(item => item.label === 'Tile Build Mode');
      if (tileBuildModeItem) {
        tileBuildModeItem.value = gpm.buildMode;
      }
      // 注意：后端每张图使用独立 session（live_<epoch>），frameId 仍用于错帧丢弃
      if (incomingFrameId !== null) {
        this.tileFrameId = incomingFrameId;
      } else if (isNewSession || this.tileFrameId == null) {
        // 兼容：后端未提供 frameId 时，新会话必须生成新的本地帧号，避免沿用旧帧ID污染缓存/请求。
        this.tileFrameId = Date.now();
      }
      this.showImageSizeX = gpm.imageWidth;
      this.showImageSizeY = gpm.imageHeight;
      this.ImageCFA = gpm.cfa || 'null';
      this.ImageGainR = gpm.gainR || 1;
      this.ImageGainB = gpm.gainB || 1;
      
      // 确保Map/Set已初始化
      if (!this.tileCache) {
        this.tileCache = new Map();
      }
      if (!this.tileRawDataCache) {
        this.tileRawDataCache = new Map();
      }
      if (!this.tilePendingLoads) {
        this.tilePendingLoads = new Set();
      }
      if (!this.tileAbortControllers) {
        this.tileAbortControllers = new Map();
      }
      if (!this.tileRetryTimers) {
        this.tileRetryTimers = new Map();
      }
      if (!this.tileRetryCounts) {
        this.tileRetryCounts = new Map();
      }
      if (!this.currentVisibleTiles) {
        this.currentVisibleTiles = new Set();
      }
      
      // 重要：后端每张图使用独立目录（sessionId=live_<epoch>），新 GPM 即新会话；保留 isOverwriteLiveFrame 兼容旧后端 sessionId=live 覆盖写
      const isOverwriteLiveFrame = (!isNewSession) && isLiveSession;

      if (isNewSession || isOverwriteLiveFrame) {
        // 新会话或 live 覆盖写帧：清空瓦片缓存与队列，避免旧帧残留/命中缓存导致不刷新
        this.tileCache.clear();
        this.tileRawDataCache.clear();
        this.tilePendingLoads.clear();
        this.currentVisibleTiles.clear();

        // 取消所有进行中的请求
        for (const [key, controller] of this.tileAbortControllers.entries()) {
          controller.abort();
        }
        this.tileAbortControllers.clear();
        for (const timer of this.tileRetryTimers.values()) {
          clearTimeout(timer);
        }
        this.tileRetryTimers.clear();
        this.tileRetryCounts.clear();

        this.tileLoadQueue = [];
        this.currentTileLoads = 0;

        if (isNewSession) {
          // 重置上一次渲染的瓦片层级（避免新会话沿用旧层级状态）
          this._tileLastRenderedZ = undefined;
          
          // 清除旧会话的自动拉伸参数
          this.autoStretchBlackLevel = null;
          this.autoStretchWhiteLevel = null;
        }
      }

      // 初始化瓦片画布
      if (!this.tileCanvas) {
        this.tileCanvas = document.createElement('canvas');
        this.tileCtx = this.tileCanvas.getContext('2d');
      }
      
      // 设置瓦片画布尺寸为原图尺寸
      if (this.tileCanvas.width !== gpm.imageWidth || this.tileCanvas.height !== gpm.imageHeight) {
        this.tileCanvas.width = gpm.imageWidth;
        this.tileCanvas.height = gpm.imageHeight;
      }

      // 新会话时，标记下次渲染前需要清空瓦片画布；但不要在这里立刻清空，避免出现“先透明后补齐”的闪烁
      if (isNewSession) {
        this.tileCanvasNeedsClear = true;
      }
      
      // 计算图像比例
      this.ImageProportion = this.CanvasWidth / this.CanvasHeight;
      
      // 新会话才重置缩放和平移
      if (isNewSession) {
        // 记忆瓦片层级：仅当 maxZoomLevel 变化时才重置，否则保持在上一次的层级
        const maxZ = Number(gpm.maxZoomLevel);
        const canRestore =
          Number.isFinite(maxZ) &&
          this.preferredTileMaxZoomLevel === maxZ &&
          (Number.isFinite(this.preferredTileScale) || Number.isFinite(this.preferredTileZ));
        if (canRestore) {
          // 优先用连续 scale 精确恢复；若没有则退化为按层级恢复
          if (Number.isFinite(this.preferredTileScale)) {
            // 0.01~0.1 是新增“仅缩放”的细分区间（瓦片层级映射仍以 0.1 为最小）
            const MIN_SCALE = 0.01;
            const MAX_SCALE = 1.0;
            const s = Number(this.preferredTileScale);
            this.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
          } else {
            const targetZ = Math.max(0, Math.min(maxZ, Number(this.preferredTileZ)));
            this.scale = this.tileLevelToScale(targetZ, maxZ);
          }
        } else {
          this.scale = 1;
          this.preferredTileMaxZoomLevel = maxZ;
          this.preferredTileZ = this.calculateTileLevel(this.scale, maxZ);
          this.preferredTileScale = this.scale;
          // maxZoomLevel 变化：按需求重置位置记忆（回到中心）
          this.preferredTileCenterNormX = 0.5;
          this.preferredTileCenterNormY = 0.5;
        }
        this.translateX = 0;
        this.translateY = 0;

        // 同步缩放到GUI（瓦片模式下 ImageInfo 需要基于 scale/level 动态显示）
        this.$bus.$emit('setScale', this.scale);

        // 新会话：恢复视野中心点（若 maxZoomLevel 未变化则沿用上次位置；否则回到中心）
        const nx = Number.isFinite(this.preferredTileCenterNormX) ? this.preferredTileCenterNormX : 0.5;
        const ny = Number.isFinite(this.preferredTileCenterNormY) ? this.preferredTileCenterNormY : 0.5;
        const clamp01 = (v) => Math.max(0, Math.min(1, v));
        const cx = clamp01(nx) * gpm.imageWidth;
        const cy = clamp01(ny) * gpm.imageHeight;
        // 可见中心需要在边界内（后续 calculateVisibleTiles 也有钳制，这里先做一次避免“空瓦片”）
        this.visibleX = Math.max(0, Math.min(gpm.imageWidth, cx));
        this.visibleY = Math.max(0, Math.min(gpm.imageHeight, cy));
      }

      // 推送一次当前瓦片层级信息到 GUI（用于显示合并等级/分辨率）
      this.emitTileLevelInfo();

      // 如果后端提供了黑白点，优先同步到直方图面板（复用既有绘制/拨盘逻辑）
      if (Number.isFinite(gpm.blackLevel) && Number.isFinite(gpm.whiteLevel)) {
        console.log(`[TileMode-GPM] 设置直方图区间参数: blackLevel=${gpm.blackLevel}, whiteLevel=${gpm.whiteLevel}`);
        
        // 保存“自动拉伸基准参数”：
        // - 非 live 会话：仅在新会话/首次设置时保存（用于“恢复到本会话的自动拉伸”）
        // - live 覆盖写帧：每帧都会产生新的推荐黑白点；若不刷新，则“自动拉伸”会一直恢复到旧帧参数，表现为用上一帧/更早的拉伸数据
        const isLiveSession = (String(gpm.sessionId) === 'live');
        if (isNewSession || this.autoStretchBlackLevel === null || this.autoStretchWhiteLevel === null || isLiveSession) {
          this.autoStretchBlackLevel = gpm.blackLevel;
          this.autoStretchWhiteLevel = gpm.whiteLevel;
          console.log(`[TileMode-GPM] 保存初始自动拉伸参数: black=${this.autoStretchBlackLevel}, white=${this.autoStretchWhiteLevel}`);
        }
        
        this.$bus.$emit('ChangeDialPosition', gpm.blackLevel, gpm.whiteLevel);
        this.$bus.$emit('AutoHistogramNum', gpm.blackLevel, gpm.whiteLevel);
      } else {
        console.log('[TileMode-GPM] GPM未包含有效的黑白点参数');
      }
      
      // 开始加载可见区域的瓦片
      this.DetectedStarsFinish = false;
      await this.loadVisibleTiles();
    },

    /**
     * 当前瓦片渲染参数的快照 key（用于判断处理后瓦片是否需要重新计算）
     * 参数变化（白平衡/拉伸）不应导致重新下载 raw，仅需要重处理渲染。
     */
    getTileRenderParamsKey() {
      const gpm = this.tileGPM;
      if (!gpm) return 'no-gpm';
      const cfa = gpm.cfa || 'null';
      const gainR = Number.isFinite(gpm.gainR) ? gpm.gainR : 1;
      const gainB = Number.isFinite(gpm.gainB) ? gpm.gainB : 1;
      const black = Number.isFinite(gpm.blackLevel) ? gpm.blackLevel : 0;
      const white = Number.isFinite(gpm.whiteLevel) ? gpm.whiteLevel : 65535;
      return `${cfa}|${gainR}|${gainB}|${black}|${white}`;
    },

    /**
     * 根据缩放比例计算瓦片层级
     * @param {Number} scale - 当前缩放比例
     * @param {Number} maxZoomLevel - 最大层级
     * @returns {Number} 瓦片层级 (0-maxZoomLevel)
     */
    calculateTileLevel(scale, maxZoomLevel) {
      // 缩放范围：0.1 - 1.0，量化为 10 个离散级别进行映射
      // 注意：本项目里 scale 越小表示越“放大”(视野越小)，因此瓦片层级需要反向映射：
      // - scale=0.1 -> z=maxZoomLevel（最高精度，原图）
      // - scale=1.0 -> z=0（最低精度，缩小层）
      const MIN_SCALE = 0.1;
      const MAX_SCALE = 1.0;
      const LEVELS = 10; // 0.1~1.0 共 10 档

      const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Number(scale)));
      const denom = (MAX_SCALE - MIN_SCALE) || 1;
      const t = (clampedScale - MIN_SCALE) / denom; // 0..1

      // 先映射到 10 档的索引，再反向，再投影到实际的 maxZoomLevel
      const idx = Math.round(t * (LEVELS - 1)); // 0..9
      const invIdx = (LEVELS - 1) - idx; // 9..0
      const z = Math.round((invIdx / (LEVELS - 1)) * maxZoomLevel);

      return Math.max(0, Math.min(maxZoomLevel, z));
    },

    /**
     * 将瓦片层级 z 反推为 scale（与 calculateTileLevel 使用同一套 10 档映射）
     * @param {Number} z
     * @param {Number} maxZoomLevel
     * @returns {Number} scale in [0.1, 1.0]
     */
    tileLevelToScale(z, maxZoomLevel) {
      const MIN_SCALE = 0.1;
      const MAX_SCALE = 1.0;
      const LEVELS = 10;
      const maxZ = Math.max(0, Number(maxZoomLevel) || 0);
      if (maxZ === 0) return MAX_SCALE; // 只有一层时，固定为 z=0

      const targetZ = Math.max(0, Math.min(maxZ, Number(z) || 0));
      // 反推 invIdx（0..9），再得到 idx（0..9）
      const invIdx = Math.round((targetZ / maxZ) * (LEVELS - 1)); // 0..9
      const idx = (LEVELS - 1) - invIdx; // 9..0
      const t = idx / (LEVELS - 1); // 0..1
      const scale = MIN_SCALE + t * (MAX_SCALE - MIN_SCALE);
      return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
    },

    /**
     * 向 GUI 广播当前瓦片层级信息（用于显示合并等级与分辨率）
     * - enabled=false：非瓦片模式（或瓦片元数据未就绪）
     * - enabled=true：瓦片模式下包含 z/maxZoom/levelScale/levelWidth/levelHeight
     */
    emitTileLevelInfo() {
      const gpm = this.tileGPM;
      if (!gpm) {
        this.$bus.$emit('TileLevelInfo', { enabled: false });
        return;
      }
      const maxZoomLevel = Number(gpm.maxZoomLevel);
      const z = this.calculateTileLevel(this.scale, maxZoomLevel);
      const levelScale = Math.pow(2, maxZoomLevel - z);
      const levelWidth = Math.ceil(Number(gpm.imageWidth) / levelScale);
      const levelHeight = Math.ceil(Number(gpm.imageHeight) / levelScale);

      // 记忆当前层级（供下一次拍摄复用；仅当 maxZoomLevel 相同才会恢复）
      this.preferredTileZ = z;
      this.preferredTileMaxZoomLevel = maxZoomLevel;
      // 同步记忆当前视野中心（位置）
      this.rememberTileViewportState();

      this.$bus.$emit('TileLevelInfo', {
        enabled: true,
        z,
        maxZoomLevel,
        levelScale,
        levelWidth,
        levelHeight,
        imageWidth: Number(gpm.imageWidth),
        imageHeight: Number(gpm.imageHeight),
        previewWidth: (gpm.previewWidth != null) ? Number(gpm.previewWidth) : null,
        previewHeight: (gpm.previewHeight != null) ? Number(gpm.previewHeight) : null,
        previewBinningFactor: (gpm.previewBinningFactor != null) ? Number(gpm.previewBinningFactor) : null,
      });
    },

    /**
     * 记忆瓦片视窗状态（位置/中心），用于新会话恢复
     */
    rememberTileViewportState() {
      const gpm = this.tileGPM;
      if (!gpm) return;
      const w = Number(gpm.imageWidth);
      const h = Number(gpm.imageHeight);
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
      const cx = Number.isFinite(this.visibleX) ? this.visibleX : (w / 2);
      const cy = Number.isFinite(this.visibleY) ? this.visibleY : (h / 2);
      const clamp01 = (v) => Math.max(0, Math.min(1, v));
      this.preferredTileCenterNormX = clamp01(cx / w);
      this.preferredTileCenterNormY = clamp01(cy / h);

      // 同步记忆缩放（连续值）；同时更新层级缓存，供“按层级恢复”的兜底逻辑使用
      const MIN_SCALE = 0.01;
      const MAX_SCALE = 1.0;
      const s = Number(this.scale);
      if (Number.isFinite(s)) {
        this.preferredTileScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
      }
      const maxZ = Number(gpm.maxZoomLevel);
      if (Number.isFinite(maxZ)) {
        this.preferredTileZ = this.calculateTileLevel(this.scale, maxZ);
        this.preferredTileMaxZoomLevel = maxZ;
      }

      // 关键：每次新帧到来（TileGPM）都主动把当前可视区 + frameId 发给后端，避免“视口不变时 sendVisibleArea 被去抖/不触发”
      // 这能确保后端按最新帧调度视口瓦片生成，减少“看起来还是上一帧”的概率。
      try {
        if (Number.isFinite(this.visibleX) && Number.isFinite(this.visibleY) && Number.isFinite(this.scale)) {
          this.$bus.$emit('AppSendMessage', 'Vue_Command', 'sendVisibleArea:' + this.visibleX + ':' + this.visibleY + ':' + this.scale + ':' + this.tileFrameId);
        }
      } catch (e) {
        // ignore
      }
    },

    getCurrentVisibleRect() {
      if (!this.tileGPM) return null;

      const gpm = this.tileGPM;
      let visibleX = Number.isFinite(this.visibleX) ? this.visibleX : gpm.imageWidth / 2;
      let visibleY = Number.isFinite(this.visibleY) ? this.visibleY : gpm.imageHeight / 2;

      const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
      const clampedX = clamp(visibleX, 0, gpm.imageWidth);
      const clampedY = clamp(visibleY, 0, gpm.imageHeight);
      if (clampedX !== visibleX || clampedY !== visibleY) {
        visibleX = clampedX;
        visibleY = clampedY;
        this.visibleX = clampedX;
        this.visibleY = clampedY;
      }

      const visibleWidth = gpm.imageWidth * this.scale;
      const visibleHeight = visibleWidth / (this.ImageProportion || (this.CanvasWidth / this.CanvasHeight));
      const visibleLeft = Math.max(0, visibleX - visibleWidth / 2);
      const visibleTop = Math.max(0, visibleY - visibleHeight / 2);
      const visibleRight = Math.min(gpm.imageWidth, visibleLeft + visibleWidth);
      const visibleBottom = Math.min(gpm.imageHeight, visibleTop + visibleHeight);

      return {
        centerX: visibleX,
        centerY: visibleY,
        left: visibleLeft,
        top: visibleTop,
        right: visibleRight,
        bottom: visibleBottom,
        width: Math.max(0, visibleRight - visibleLeft),
        height: Math.max(0, visibleBottom - visibleTop),
      };
    },

    calculateVisibleTilesForLevel(z, visibleRect = null) {
      if (!this.tileGPM) return [];

      const gpm = this.tileGPM;
      const rect = visibleRect || this.getCurrentVisibleRect();
      if (!rect) return [];

      const T = gpm.tileSize;
      const levelScale = Math.pow(2, gpm.maxZoomLevel - z);
      const levelWidth = Math.ceil(gpm.imageWidth / levelScale);
      const levelHeight = Math.ceil(gpm.imageHeight / levelScale);
      const levelLeft = rect.left / levelScale;
      const levelTop = rect.top / levelScale;
      const levelRight = rect.right / levelScale;
      const levelBottom = rect.bottom / levelScale;
      const maxTilesX = Math.ceil(levelWidth / T);
      const maxTilesY = Math.ceil(levelHeight / T);
      const tiles = [];

      const startTileX = Math.max(0, Math.floor(levelLeft / T));
      const startTileY = Math.max(0, Math.floor(levelTop / T));
      const endTileX = Math.min(maxTilesX - 1, Math.floor(levelRight / T));
      const endTileY = Math.min(maxTilesY - 1, Math.floor(levelBottom / T));

      for (let ty = startTileY; ty <= endTileY; ty++) {
        for (let tx = startTileX; tx <= endTileX; tx++) {
          tiles.push({ z, x: tx, y: ty });
        }
      }

      return tiles;
    },

    /**
     * 计算当前视窗需要加载的渐进式瓦片
     * @returns {Array} 需要加载的瓦片列表 [{z, x, y}, ...]
     */
    calculateVisibleTiles() {
      if (!this.tileGPM) return [];

      const gpm = this.tileGPM;
      const currentZ = this.calculateTileLevel(this.scale, gpm.maxZoomLevel);
      const requestMaxZ = gpm.maxZoomLevel;
      const buildMode = this.normalizeTileBuildModeValue(gpm.buildMode);
      const visibleRect = this.getCurrentVisibleRect();
      if (!visibleRect) return [];

      const tiles = [];
      const seen = new Set();
      const fullImageRect = {
        centerX: gpm.imageWidth / 2,
        centerY: gpm.imageHeight / 2,
        left: 0,
        top: 0,
        right: gpm.imageWidth,
        bottom: gpm.imageHeight,
        width: gpm.imageWidth,
        height: gpm.imageHeight,
      };
      // merged_single_level：仅两层——z=0 压缩合并整图 + z=maxZ 原图整图，均为 fullImageRect
      const requestLevels = (buildMode === 'merged_single_level')
        ? Array.from(new Set([0, requestMaxZ]))
        : Array.from({ length: requestMaxZ + 1 }, (_, index) => index);

      for (const z of requestLevels) {
        const useFullImage = (buildMode === 'merged_single_level') || (z === 0);
        const levelTiles = this.calculateVisibleTilesForLevel(
          z,
          useFullImage ? fullImageRect : visibleRect
        );
        for (const tile of levelTiles) {
          const key = `${tile.z}/${tile.x}/${tile.y}`;
          if (seen.has(key)) continue;
          seen.add(key);
          tiles.push(tile);
        }
      }

      if (this.TILE_DEBUG && tiles.length > 0) {
        const sample = tiles.slice(0, 6).map(t => `${t.z}/${t.x}/${t.y}`);
        const more = tiles.length > 6 ? ` ... +${tiles.length - 6} more` : '';
        console.log('[Tile] calculateVisibleTiles', {
          visibleRect: `(${Math.round(visibleRect.left)},${Math.round(visibleRect.top)})-${Math.round(visibleRect.width)}x${Math.round(visibleRect.height)}`,
          currentZ,
          requestMaxZ,
          buildMode,
          levels: requestLevels.join(','),
          count: tiles.length,
          sample: sample.join(', ') + more
        });
      }

      if (tiles.length === 0 && gpm.imageWidth > 0 && gpm.imageHeight > 0) {
        this.visibleX = gpm.imageWidth / 2;
        this.visibleY = gpm.imageHeight / 2;
        return this.calculateVisibleTiles();
      }

      return tiles;
    },

    /**
     * 加载可见区域的瓦片（带优先级优化）
     */
    async loadVisibleTiles() {
      if (!this.tileGPM) return;
      if (!this.tileLoadWaiters) {
        this.tileLoadWaiters = new Map();
      }
      
      const tiles = this.calculateVisibleTiles();
      const gpm = this.tileGPM;
      const batchId = ++this.tileLoadBatchSeq;
      this.activeTileLoadBatchId = batchId;
      this.tileAllowIncrementalRender = true;
      
      // 更新当前可见瓦片集合
      const newVisibleTiles = new Set(tiles.map(t => `${t.z}/${t.x}/${t.y}`));
      
      // 取消不在可见范围内的加载请求
      for (const [key, controller] of this.tileAbortControllers.entries()) {
        if (!newVisibleTiles.has(key)) {
          controller.abort();
          this.tileAbortControllers.delete(key);
          this.tilePendingLoads.delete(key);
        }
      }
      for (const [key, timer] of this.tileRetryTimers.entries()) {
        if (!newVisibleTiles.has(key)) {
          clearTimeout(timer);
          this.tileRetryTimers.delete(key);
          this.tileRetryCounts.delete(key);
        }
      }
      
      // 清理加载队列中不可见的瓦片
      this.tileLoadQueue = this.tileLoadQueue.filter(t => {
        const key = `${t.z}/${t.x}/${t.y}`;
        return newVisibleTiles.has(key);
      });
      
      this.currentVisibleTiles = newVisibleTiles;
      
      const paramsKey = this.getTileRenderParamsKey();

      // 先对“已有原始数据”的可见瓦片做一次就地处理：
      // - 若尚未处理过，生成处理后瓦片
      // - 若处理参数已变化，按新参数重处理并覆盖
      for (const t of tiles) {
        const key = `${t.z}/${t.x}/${t.y}`;
        const hasRaw = this.tileRawDataCache && this.tileRawDataCache.has(key);
        if (!hasRaw) continue;
        if (this.tileRetryTimers && this.tileRetryTimers.has(key)) {
          clearTimeout(this.tileRetryTimers.get(key));
          this.tileRetryTimers.delete(key);
        }
        if (this.tileRetryCounts) {
          this.tileRetryCounts.delete(key);
        }

        const cached = this.tileCache && this.tileCache.get(key);
        const needReprocess = !cached || cached.paramsKey !== paramsKey;

        if (needReprocess) {
          try {
            const processedTile = this.processTile(this.tileRawDataCache.get(key));
            this.tileCache.set(key, { imageData: processedTile, paramsKey });
          } catch (e) {
            console.error(`Error processing cached raw tile ${key}:`, e);
          }
        }
      }

      // 过滤需要“下载原始数据”的瓦片：只有 raw 不存在且不在加载中，才发起请求
      const tilesToLoad = tiles.filter(t => {
        const key = `${t.z}/${t.x}/${t.y}`;
        const hasRaw = this.tileRawDataCache && this.tileRawDataCache.has(key);
        return !hasRaw && !this.tilePendingLoads.has(key);
      });

      // 计算视口中心（用于同一层级内排序）
      const visibleRect = this.getCurrentVisibleRect();
      const centerX = (visibleRect ? visibleRect.centerX : (gpm.imageWidth / 2)) / gpm.imageWidth;
      const centerY = (visibleRect ? visibleRect.centerY : (gpm.imageHeight / 2)) / gpm.imageHeight;
      
      tilesToLoad.forEach(tile => {
        const levelScale = Math.pow(2, gpm.maxZoomLevel - tile.z);
        const levelWidth = Math.ceil(gpm.imageWidth / levelScale);
        const levelHeight = Math.ceil(gpm.imageHeight / levelScale);
        
        // 瓦片中心点（归一化坐标）
        const tileCenterX = (tile.x + 0.5) * gpm.tileSize / levelWidth;
        const tileCenterY = (tile.y + 0.5) * gpm.tileSize / levelHeight;
        
        // 计算距离视口中心的距离
        const dx = tileCenterX - centerX;
        const dy = tileCenterY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 渐进式优先级：
        // 1. 先拉最低分辨率层，尽快给出全局粗图
        // 2. 再按层级逐步细化
        // 3. 同层内优先离视口中心更近的瓦片
        tile.priority = tile.z * 1000 + distance;
      });
      
      // 按优先级排序（优先级值越小越优先）
      tilesToLoad.sort((a, b) => a.priority - b.priority);
      
      // 将瓦片添加到加载队列（插入到队列前面）
      this.tileLoadQueue.unshift(...tilesToLoad);
      
      // 先用已缓存的低层/高层瓦片立即重绘一遍，再等待后续下载逐步覆盖
      this.renderTiles();

      // 开始处理加载队列
      this.processLoadQueue();

      // 若当前批次没有新下载任务，主动触发一次收敛渲染，避免仅依赖异步补绘。
      if (tilesToLoad.length === 0 && batchId === this.activeTileLoadBatchId) {
        this.renderTiles();
      }
    },

    /**
     * 处理瓦片加载队列（带优先级）
     */
    async processLoadQueue() {
      while (this.tileLoadQueue.length > 0 && this.currentTileLoads < this.maxConcurrentTileLoads) {
        const tile = this.tileLoadQueue.shift();
        const key = `${tile.z}/${tile.x}/${tile.y}`;
        
        // 跳过已缓存、正在加载或不在可见范围内的瓦片
        // 已有 raw 的瓦片无需再下载（即使处理参数变化，也只需重处理）
        if ((this.tileRawDataCache && this.tileRawDataCache.has(key)) ||
            (this.tileCache && this.tileCache.has(key)) ||
            this.tilePendingLoads.has(key) ||
            !this.currentVisibleTiles.has(key)) {
          continue;
        }
        
        this.tilePendingLoads.add(key);
        this.currentTileLoads++;
        
        this.loadSingleTile(tile).finally(() => {
          this.tilePendingLoads.delete(key);
          this.currentTileLoads--;
          this.processLoadQueue();
        });
      }
    },

    waitForTileSettled(key) {
      if (!this.tileLoadWaiters) {
        this.tileLoadWaiters = new Map();
      }
      return new Promise(resolve => {
        const waiters = this.tileLoadWaiters.get(key) || [];
        waiters.push(resolve);
        this.tileLoadWaiters.set(key, waiters);
      });
    },

    notifyTileSettled(key) {
      if (!this.tileLoadWaiters) return;
      const waiters = this.tileLoadWaiters.get(key);
      if (!waiters || waiters.length === 0) return;
      this.tileLoadWaiters.delete(key);
      for (const fn of waiters) {
        try {
          fn();
        } catch (e) {
          // ignore
        }
      }
    },

    scheduleTileRetry(tile, expectedSessionId, expectedFrameId) {
      if (!tile || !this.currentVisibleTiles) return;
      const key = `${tile.z}/${tile.x}/${tile.y}`;
      if (!this.currentVisibleTiles.has(key)) return;
      if (expectedSessionId !== this.tileSessionId || expectedFrameId !== this.tileFrameId) return;
      if (!this.tileRetryTimers) {
        this.tileRetryTimers = new Map();
      }
      if (!this.tileRetryCounts) {
        this.tileRetryCounts = new Map();
      }
      if (this.tileRetryTimers.has(key)) return;

      const retryCount = (this.tileRetryCounts.get(key) || 0) + 1;
      this.tileRetryCounts.set(key, retryCount);
      const delayMs = Math.min(1500, 120 * Math.pow(1.6, Math.max(0, retryCount - 1)));
      const timer = setTimeout(() => {
        this.tileRetryTimers.delete(key);
        if (expectedSessionId !== this.tileSessionId || expectedFrameId !== this.tileFrameId) return;
        if (!this.currentVisibleTiles || !this.currentVisibleTiles.has(key)) return;
        if ((this.tileRawDataCache && this.tileRawDataCache.has(key)) || this.tilePendingLoads.has(key)) return;

        this.tileLoadQueue.unshift({
          z: tile.z,
          x: tile.x,
          y: tile.y,
          priority: -1,
        });
        this.processLoadQueue();
      }, delayMs);

      this.tileRetryTimers.set(key, timer);
      if (this.TILE_DEBUG) {
        console.log('[Tile] schedule retry', { key, retryCount, delayMs });
      }
    },

    scheduleTileRender() {
      if (this.tileRenderRaf != null) return;
      const flush = () => {
        this.tileRenderRaf = null;
        if (!this.tileGPM || !this.tileCanvas) return;
        this.renderTiles();
      };
      if (typeof requestAnimationFrame === 'function') {
        this.tileRenderRaf = requestAnimationFrame(flush);
      } else {
        this.tileRenderRaf = setTimeout(flush, 0);
      }
    },

    /**
     * 加载单个瓦片（支持取消）
     * @param {Object} tile - 瓦片信息 {z, x, y}
     */
    async loadSingleTile(tile) {
      const { z, x, y } = tile;
      const key = `${z}/${x}/${y}`;
      // 使用 BASE_URL + 常量路径，支持子路径部署；与 nginx location /img/capture-tiles/ 对应
      const base = (process.env.BASE_URL || '/').replace(/\/?$/, '/');
      // 追加 frameId 到 query string：
      // - 避免浏览器/代理把 live 覆盖写的同路径瓦片当作“同一资源”缓存
      // - 允许我们在回包时做“帧一致性校验”，丢弃旧帧的 late response
      const frameQ = (this.tileFrameId != null) ? `?f=${encodeURIComponent(String(this.tileFrameId))}` : '';
      const url = `${base}${this.TILE_PATH_SUFFIX}/${this.tileSessionId}/${z}/${x}/${y}.bin${frameQ}`;
      const expectedSessionId = this.tileSessionId;
      const expectedFrameId = this.tileFrameId;
      
      // 创建AbortController用于取消请求
      const abortController = new AbortController();
      this.tileAbortControllers.set(key, abortController);
      
      if (this.TILE_DEBUG) {
        console.log('[Tile] loadSingleTile start', { key, url: url.replace(/\?.*$/, '') });
      }
      try {
        const response = await fetch(url, { 
          cache: 'no-store',
          signal: abortController.signal 
        });
        
        if (!response.ok) {
          if (this.TILE_DEBUG) {
            console.warn('[Tile] loadSingleTile HTTP error', { key, status: response.status, statusText: response.statusText });
          }
          const httpError = new Error(`Failed to load tile ${key}: ${response.status}`);
          httpError.status = response.status;
          throw httpError;
        }
        
        const buffer = await response.arrayBuffer();

        // 回包时校验：若期间已切换到新帧/新会话，直接丢弃，避免错帧拉伸/错帧缓存污染
        if (expectedSessionId !== this.tileSessionId || expectedFrameId !== this.tileFrameId) {
          if (this.TILE_DEBUG) {
            console.log('[Tile] loadSingleTile discarded (session/frame changed)', {
              key,
              expectedSession: expectedSessionId,
              currentSession: this.tileSessionId,
              expectedFrame: expectedFrameId,
              currentFrame: this.tileFrameId
            });
          }
          this.tileAbortControllers.delete(key);
          return;
        }
        
        // 解析瓦片数据
        const tileData = this.parseTileData(buffer);
        if (tileData) {
          const paramsKey = this.getTileRenderParamsKey();
          // 保存原始瓦片数据（用于白平衡等参数变化时重新处理）
          this.tileRawDataCache.set(key, tileData);
          if (this.tileRetryTimers && this.tileRetryTimers.has(key)) {
            clearTimeout(this.tileRetryTimers.get(key));
            this.tileRetryTimers.delete(key);
          }
          if (this.tileRetryCounts) {
            this.tileRetryCounts.delete(key);
          }
          
          try {
            const processedTile = this.processTile(tileData);
            this.tileCache.set(key, { imageData: processedTile, paramsKey });
            if (this.TILE_DEBUG) {
              console.log('[Tile] loadSingleTile ok', { key, rawSize: `${tileData.width}x${tileData.height}`, outSize: `${processedTile.width}x${processedTile.height}` });
            }

            const shouldPatchRender =
              this.tileAllowIncrementalRender &&
              expectedSessionId === this.tileSessionId &&
              expectedFrameId === this.tileFrameId &&
              this.currentVisibleTiles &&
              this.currentVisibleTiles.has(key);
            if (shouldPatchRender) {
              this.scheduleTileRender();
            }
          } catch (processErr) {
            if (this.TILE_DEBUG) {
              console.error('[Tile] processTile error', { key, err: processErr });
            }
            this.tileRawDataCache.delete(key);
          }
          
          // 清理AbortController
          this.tileAbortControllers.delete(key);
        } else {
          if (this.TILE_DEBUG) {
            console.warn('[Tile] loadSingleTile parseTileData returned null', { key, bufferBytes: buffer.byteLength });
          }
        }
      } catch (error) {
        // 如果是取消请求，不输出错误
        if (error.name === 'AbortError') {
          if (this.TILE_DEBUG) console.log('[Tile] loadSingleTile cancelled', { key });
        } else if (error && error.status === 404) {
          this.scheduleTileRetry(tile, expectedSessionId, expectedFrameId);
          if (this.TILE_DEBUG) {
            console.log('[Tile] loadSingleTile 404, will retry', { key });
          }
        } else {
          console.error('[Tile] loadSingleTile error', { key, error });
        }
        
        // 清理AbortController
        this.tileAbortControllers.delete(key);
      } finally {
        // 无论成功/失败/取消，都要通知等待中的批次，避免“全齐再显示”屏障悬挂
        this.notifyTileSettled(key);
      }
    },

    /**
     * 解析瓦片二进制数据
     * @param {ArrayBuffer} buffer - 瓦片二进制数据
     * @returns {Object} 解析后的瓦片数据 {width, height, data}
     */
    parseTileData(buffer) {
      if (buffer.byteLength < 16) {
        if (this.TILE_DEBUG) {
          console.warn('[Tile] parseTileData: buffer too small', { byteLength: buffer.byteLength, need: 16 });
        }
        return null;
      }
      
      const headerView = new DataView(buffer);
      const width = headerView.getInt32(0, true);
      const height = headerView.getInt32(4, true);
      const type = headerView.getInt32(8, true);  // CV_16UC1 = 2
      const border = headerView.getInt32(12, true) || 0; // 预留字段：瓦片外扩边界像素数（用于局部 Bayer 转换避免接缝）
      
      const expectedPixels = width * height * 2; // 16bit = 2 bytes per pixel
      if (16 + expectedPixels > buffer.byteLength) {
        if (this.TILE_DEBUG) {
          console.warn('[Tile] parseTileData: buffer length mismatch', { width, height, expectedBytes: 16 + expectedPixels, actual: buffer.byteLength });
        }
        return null;
      }
      
      // 提取像素数据
      const pixelData = new Uint16Array(buffer, 16);
      
      return { width, height, type, border, data: pixelData };
    },

    /**
     * 处理单个瓦片数据（应用GPM参数）
     * @param {Object} tileData - 解析后的瓦片数据
     * @returns {ImageData} 处理后的ImageData
     */
    processTile(tileData) {
      const { width, height, data, border = 0 } = tileData;
      const gpm = this.tileGPM;
      
      // 创建OpenCV Mat
      let mat = null;
      let resultImg = null;
      let roiMat = null;
      let finalImg = null;
      
      try {
        mat = new cv.Mat(height, width, cv.CV_16UC1);
        mat.data16U.set(data);
        
        // 应用统一的处理参数
        const isColorCamera = gpm.cfa && gpm.cfa !== '' && gpm.cfa !== 'null';
        
        if (isColorCamera) {
          // applyStretchAndGain() 期望 analysis.whiteBalance.gainR/gainB
          const analysis = { whiteBalance: { gainR: gpm.gainR ?? 1, gainB: gpm.gainB ?? 1 } };
          resultImg = this.applyStretchAndGain(mat, analysis, 'bayer', gpm.cfa, gpm.blackLevel, gpm.whiteLevel);
        } else {
          resultImg = this.applyStretchAndGain(mat, {
            gainR: 1,
            gainB: 1,
            offset: 0
          }, 'gray', gpm.cfa, gpm.blackLevel, gpm.whiteLevel);
        }

        // 如果后端为瓦片附带了边界像素（用于避免局部去马赛克接缝），这里裁掉边界再返回
        if (border > 0 && resultImg && resultImg.cols > 2 * border && resultImg.rows > 2 * border) {
          const rect = new cv.Rect(border, border, resultImg.cols - 2 * border, resultImg.rows - 2 * border);
          roiMat = resultImg.roi(rect);
          finalImg = roiMat.clone();
        } else {
          finalImg = resultImg;
        }
        
        // 转换为ImageData
        const imageData = new ImageData(
          new Uint8ClampedArray(finalImg.data),
          finalImg.cols,
          finalImg.rows
        );
        
        return imageData;
      } finally {
        if (roiMat) roiMat.delete();
        if (finalImg && finalImg !== resultImg) finalImg.delete();
        if (mat) mat.delete();
        if (resultImg) resultImg.delete();
      }
    },

    /**
     * 渲染所有已加载的瓦片到缓冲画布
     */
    renderTiles() {
      if (!this.tileGPM || !this.tileCanvas) return;
      
      const gpm = this.tileGPM;
      const T = gpm.tileSize;
      const ctx = this.tileCtx;
      
      // 只在新会话开始时清空一次；层级切换时不清空，避免“先透明后补齐”的闪烁
      if (this.tileCanvasNeedsClear) {
        ctx.clearRect(0, 0, this.tileCanvas.width, this.tileCanvas.height);
        this.tileCanvasNeedsClear = false;
      }
      
      // 获取当前应该显示的层级（反向金字塔）
      const z = this.calculateTileLevel(this.scale, gpm.maxZoomLevel);
      const buildMode = this.normalizeTileBuildModeValue(gpm.buildMode);
      const isMergedSingleLevel = (buildMode === 'merged_single_level');

      // 若缩放导致瓦片层级切换：清理“当前可视区域”，避免旧层级瓦片残留造成“看起来没有更新”的错觉
      // merged_single_level 模式：不在此处清空视口，因 z=0 全图会先绘制并覆盖旧 currentZ，currentZ 再逐片叠加即可实现渐进覆盖
      // pyramid 模式：需清空视口以移除旧层级瓦片
      if (this._tileLastRenderedZ === undefined) {
        this._tileLastRenderedZ = z;
      } else if (this._tileLastRenderedZ !== z) {
        const prevZ = this._tileLastRenderedZ;
        const cx = Number.isFinite(this.visibleX) ? this.visibleX : (gpm.imageWidth / 2);
        const cy = Number.isFinite(this.visibleY) ? this.visibleY : (gpm.imageHeight / 2);
        const vw = gpm.imageWidth * this.scale;
        const vh = vw / (this.ImageProportion || (this.CanvasWidth / this.CanvasHeight));
        const left = Math.max(0, cx - vw / 2);
        const top = Math.max(0, cy - vh / 2);
        const right = Math.min(gpm.imageWidth, left + vw);
        const bottom = Math.min(gpm.imageHeight, top + vh);
        const w = Math.max(0, right - left);
        const h = Math.max(0, bottom - top);

        // 层级变化日志：用于确认缩放是否触发了新层级瓦片加载
        try {
          const msg = `[TileLevelChange] session=${this.tileSessionId} z:${prevZ} -> ${z} scale=${Number(this.scale).toFixed(3)} center=(${Math.round(cx)},${Math.round(cy)}) visible=(${Math.round(left)},${Math.round(top)})-${Math.round(w)}x${Math.round(h)}`;
          console.log(msg);
          this.SendConsoleLogMsg(msg, 'info');
        } catch (e) {
          // ignore logging errors
        }

        // pyramid 模式：清空视口以移除旧层级；merged_single_level 跳过，由 z=0 全图重绘覆盖
        if (!isMergedSingleLevel && w > 0 && h > 0) {
          ctx.clearRect(left, top, w, h);
        }
        this._tileLastRenderedZ = z;
      }

      const levelScale = Math.pow(2, gpm.maxZoomLevel - z);

      // 动态插值平滑（瓦片模式）：
      // - 使用低层级瓦片（levelScale>1，表示低分辨率瓦片被放大）时开启平滑，观感更顺
      // - 进入最高精度（levelScale≈1，接近原图像素）时关闭平滑，细节更锐利
      let smoothing = true;
      if (this.imageSmoothingMode === 'never') {
        smoothing = false;
      } else if (this.imageSmoothingMode === 'always') {
        smoothing = true;
      } else {
        smoothing = levelScale > 1.0001;
      }
      ctx.imageSmoothingEnabled = smoothing;
      ctx.mozImageSmoothingEnabled = smoothing;
      ctx.webkitImageSmoothingEnabled = smoothing;
      ctx.msImageSmoothingEnabled = smoothing;
      
      // 渲染优化：只绘制当前“可见集合”内的瓦片，避免全缓存遍历；
      // 同时复用一个临时画布，避免每块瓦片都创建 canvas（会非常慢）
      if (!this._tileBlitCanvas) {
        this._tileBlitCanvas = document.createElement('canvas');
        this._tileBlitCtx = this._tileBlitCanvas.getContext('2d');
      }

      // 仅在需要时清空（参数变化/视图切换时由外部设置 tileCanvasNeedsClear），避免每块瓦片加载时“闪白/重置”观感
      if (this.tileCanvasNeedsClear) {
        ctx.clearRect(0, 0, this.tileCanvas.width, this.tileCanvas.height);
        this.tileCanvasNeedsClear = false;
      }

      const keysToDraw =
        (this.currentVisibleTiles && this.currentVisibleTiles.size > 0)
          ? Array.from(this.currentVisibleTiles)
          : Array.from(this.tileCache.keys());
      keysToDraw.sort((a, b) => {
        const [az, ax, ay] = a.split('/').map(Number);
        const [bz, bx, by] = b.split('/').map(Number);
        if (az !== bz) return az - bz;
        if (ay !== by) return ay - by;
        return ax - bx;
      });

      let drawnCount = 0;
      let skipNoCache = 0;
      const drawDetails = this.TILE_DEBUG ? [] : null;

      for (const key of keysToDraw) {
        const cached = this.tileCache.get(key);
        const imageData = cached && cached.imageData;
        if (!imageData) {
          skipNoCache++;
          if (this.TILE_DEBUG) drawDetails.push({ key, reason: 'noCache' });
          continue;
        }

        const [tileZ, tileX, tileY] = key.split('/').map(Number);
        const tileLevelScale = Math.pow(2, gpm.maxZoomLevel - tileZ);

        const destX = tileX * T * tileLevelScale;
        const destY = tileY * T * tileLevelScale;
        const fullTilePx = T * tileLevelScale;
        // 边缘瓦片：层级尺寸不能整除 T 时，最后一列/行只覆盖部分图像，需裁剪到图像边界，避免右侧/下侧拉伸错位
        const destWidth = Math.min(fullTilePx, gpm.imageWidth - destX);
        const destHeight = Math.min(fullTilePx, gpm.imageHeight - destY);
        if (destWidth <= 0 || destHeight <= 0) continue;

        // 若裁剪了目标区域，源图也按比例取对应区域，避免拉伸
        const srcWidth = destWidth < fullTilePx ? (imageData.width * destWidth / fullTilePx) : imageData.width;
        const srcHeight = destHeight < fullTilePx ? (imageData.height * destHeight / fullTilePx) : imageData.height;

        if (this._tileBlitCanvas.width !== imageData.width || this._tileBlitCanvas.height !== imageData.height) {
          this._tileBlitCanvas.width = imageData.width;
          this._tileBlitCanvas.height = imageData.height;
        }
        this._tileBlitCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(this._tileBlitCanvas, 0, 0, srcWidth, srcHeight, destX, destY, destWidth, destHeight);
        drawnCount++;
        if (this.TILE_DEBUG) {
          drawDetails.push({
            key,
            dest: `(${Math.round(destX)},${Math.round(destY)}) ${Math.round(destWidth)}x${Math.round(destHeight)}`,
            srcSize: `${imageData.width}x${imageData.height}`,
            clipped: destWidth < fullTilePx || destHeight < fullTilePx
          });
        }
      }

      if (this.TILE_DEBUG && (drawnCount > 0 || skipNoCache > 0)) {
        console.log('[Tile] renderTiles', {
          canvasSize: `${this.tileCanvas.width}x${this.tileCanvas.height}`,
          z,
          levelScale,
          keysTotal: keysToDraw.length,
          drawn: drawnCount,
          skipNoCache,
          sample: drawDetails.slice(0, 5)
        });
      }
      
      // 将瓦片画布复制到缓冲画布
      if (this.bufferCanvas) {
        // 避免每次 resize 导致 bufferCanvas 被清空（闪烁）；仅在尺寸变化时调整
        if (this.bufferCanvas.width !== this.tileCanvas.width || this.bufferCanvas.height !== this.tileCanvas.height) {
          this.bufferCanvas.width = this.tileCanvas.width;
          this.bufferCanvas.height = this.tileCanvas.height;
        }
        this.bufferCtx.drawImage(this.tileCanvas, 0, 0);

        // 若存在 ROI 叠加层（通常来自对焦 ROI 循环），在瓦片渲染后叠加，避免被瓦片重绘覆盖
        this.applyRoiOverlay();
        
        // 更新显示
        this.drawImgData = true;
        this.drawImageData();
      }
    },

    /**
     * 视窗变化时重新加载瓦片
     */
    onViewportChange() {
      if (this.tileGPM) {
        // 记忆当前位置（拖动/缩放导致视野变化时）
        this.rememberTileViewportState();
        // 使用防抖，避免频繁加载
        if (this.viewportChangeTimer) {
          clearTimeout(this.viewportChangeTimer);
        }
        this.viewportChangeTimer = setTimeout(() => {
          this.loadVisibleTiles();
        }, 100);
      }
    },

    /**
     * 参数变化时重新加载瓦片（清除缓存）
     * 注意：此方法用于直方图拉伸等参数变化，会清除所有缓存并重新下载瓦片
     * 白平衡增益变化应使用 reprocessTilesWithNewGains() 方法
     */
    reloadTilesWithNewParams() {
      if (!this.tileGPM) return;
      
      // 参数变化（直方图拉伸/黑白点等）只影响渲染，不应触发瓦片重新生成或重新下载。
      // 做法：保留 raw 瓦片数据，通过 paramsKey 机制让可见瓦片按需重处理。
      // 标记下次渲染需要重绘（renderTiles 会只清一次，避免闪烁）
      this.tileCanvasNeedsClear = true;

      // 重新处理/补齐当前可见瓦片（raw 缺失的才会触发下载）
      this.loadVisibleTiles();
    },

    /**
     * 仅白平衡增益变化时重新处理瓦片（不重新下载）
     * 使用已缓存的原始瓦片数据，应用新的增益参数重新处理
     */
    reprocessTilesWithNewGains() {
      if (!this.tileGPM || !this.tileRawDataCache) return;
      
      console.log('[reprocessTilesWithNewGains] 使用新的白平衡增益重新处理已缓存的瓦片');
      
      // 白平衡增益变化同样只影响渲染：通过 paramsKey 机制让可见瓦片按需重处理。
      this.tileCanvasNeedsClear = true;
      this.loadVisibleTiles();
    },

    // ========================= 瓦片金字塔方法结束 =========================

    updateCaptureImageProgress(num) {
      this.$bus.$emit('ShowCaptureImageProgress', num);
    },

    setImageProportion(value) {
      this.ImageProportion = value;
    },

    /**
     * @deprecated 已废弃：不再使用传统图像处理方式，请使用瓦片金字塔模式
     * 保留此函数仅为了兼容某些特殊场景（如极轴校准模式）
     */
    async processImage(imgArray, histogramMin = -1, histogramMax = -1, options = {}) {
      let { calculateHistogram = true } = options;
      this.progressValue = 0;
      this.progressDescription = this.$i18n.locale === 'cn' ? '开始处理图像...' : 'Processing image...';
      let mat = null;
      let targetImg8 = null;
      let resizeImg = null;

      // 使用setTimeout和Promise创建非阻塞处理
      const processAsync = (fn) => {
        return new Promise(resolve => {
          setTimeout(() => {
            const result = fn();
            resolve(result);
          }, 0);
        });
      };

      try {
        if (!(imgArray instanceof ArrayBuffer) && !ArrayBuffer.isView(imgArray)) {
          throw new Error("Input must be ArrayBuffer or TypedArray");
        }
        let uintArray = new Uint16Array(imgArray);

        if (uintArray.length != parseInt(this.showImageSizeY) * parseInt(this.showImageSizeX)) {
          throw new Error("Image size mismatch");
        }
        // 创建Mat对象
        await processAsync(() => {
          mat = new cv.Mat(parseInt(this.showImageSizeY), parseInt(this.showImageSizeX), cv.CV_16UC1);
          mat.data16U.set(uintArray);
          this.progressValue = 10;
          this.progressDescription = this.$i18n.locale === 'cn' ? '创建Mat对象...' : 'Creating Mat object...';
          return true;
        });

        // 用户自定义参数
        let CFA = this.ImageCFA;
        let isColorCamera = false;
        let mode = 1;
        let blackLevel, whiteLevel;

        if (histogramMin == -1 && histogramMax == -1) {
          // 获取自动拉伸参数
          const result = await processAsync(() => {
            const res = this.GetAutoStretch(mat, mode);
            this.progressValue = 20;
            this.progressDescription = this.$i18n.locale === 'cn' ? '获取自动拉伸参数...' : 'Getting auto stretch parameters...';
            return res;
          });

          calculateHistogram = true;
          // 从结果中提取值
          blackLevel = result.blackLevel;
          whiteLevel = result.whiteLevel;
        } else {
          blackLevel = histogramMin;  // 现在可以正常工作
          whiteLevel = histogramMax;  // 现在可以正常工作
        }

        // 根据CFA设置颜色转换模式
        if (CFA === 'GR') {
          isColorCamera = true;
        } else if (CFA === 'GB') {
          isColorCamera = true;
        } else if (CFA === 'BG') {
          isColorCamera = true;
        } else if (CFA === 'RGGB') {
          isColorCamera = true;
        } else {
          isColorCamera = false;
        }
        console.log("当前拍摄参数:isColorCamera:", isColorCamera, "CFA:", CFA);
        // 计算直方图
        const analysis = await processAsync(() => {
          const result = isColorCamera
            ? this.analyzeImageStatistics(mat, 'bayer', CFA, { calculateGain: this.calculateGain, calculateHistogram: calculateHistogram })
            : this.analyzeImageStatistics(mat, 'gray', { calculateGain: this.calculateGain, calculateHistogram: calculateHistogram });

          if (this.ImageGainR != 1 || this.ImageGainB != 1 || this.ImageOffset != 0) {
            result.gainR = this.ImageGainR;
            result.gainB = this.ImageGainB;
            result.offset = this.ImageOffset;
          }

          this.progressValue = 40;
          this.progressDescription = this.$i18n.locale === 'cn' ? '计算直方图...' : 'Calculating histogram...';
          return result;
        });

        if (analysis.histogram) {
          // 更新直方图数据
          this.$bus.$emit('showHistogram', analysis.histogram);
          // 更新拨盘窗口位置
          this.$bus.$emit('ChangeDialPosition', blackLevel, whiteLevel);
          // 仅在“自动拉伸”模式下（histogramMin / histogramMax 为 -1）更新“区间模式”的固定显示范围
          if (histogramMin == -1 && histogramMax == -1) {
            this.$bus.$emit('AutoHistogramNum', blackLevel, whiteLevel);
          }
        }

        this.lastImageProcessParams = {
          blackLevel: blackLevel,
          whiteLevel: whiteLevel,
          CFA: CFA,
          analysis: analysis,
          isColorCamera: isColorCamera,
        };

        // 传统模式白平衡：若本次是“计算增益”触发，将 analysis 中的增益写回 ImageGainR/ImageGainB 与配置项，与瓦片模式行为一致
        if (this.calculateGain && analysis && analysis.whiteBalance) {
          const gainR = analysis.whiteBalance.gainR;
          const gainB = analysis.whiteBalance.gainB;
          this.ImageGainR = gainR;
          this.ImageGainB = gainB;
          const GainRIndex = this.MainCameraConfigItems.findIndex(item => item.label === 'ImageGainR');
          if (GainRIndex !== -1) {
            this.MainCameraConfigItems[GainRIndex].value = gainR;
          }
          const GainBIndex = this.MainCameraConfigItems.findIndex(item => item.label === 'ImageGainB');
          if (GainBIndex !== -1) {
            this.MainCameraConfigItems[GainBIndex].value = gainB;
          }
          this.calculateGain = false;
        }

        // 使用增益和拉伸，并转化为8位图像
        targetImg8 = await processAsync(() => {
          const result = isColorCamera
            ? this.applyStretchAndGain(mat, analysis, 'bayer', CFA, blackLevel, whiteLevel)
            : this.applyStretchAndGain(mat, analysis, 'gray', CFA, blackLevel, whiteLevel);

          // 释放mat
          if (mat) {
            mat.delete();
            mat = null;
          }

          this.progressValue = 60;
          this.progressDescription = this.$i18n.locale === 'cn' ? '根据参数处理...' : 'Processing with parameters...';
          return result;
        });

        // 根据模式处理图像
        if (this.isPolarAxisMode) {
          await processAsync(() => {
            resizeImg = new cv.Mat();
            cv.resize(targetImg8, resizeImg, new cv.Size(this.CanvasWidth, this.CanvasHeight), 0, 0, cv.INTER_LINEAR);

            if (targetImg8) {
              targetImg8.delete();
              targetImg8 = null;
            }
            this.progressValue = 0;
            return true;
          });

          this.$bus.$emit('showSolveImage', resizeImg);

          if (resizeImg) {
            resizeImg.delete();
            resizeImg = null;
          }
        } else {
          // 转换为ImageData对象
          const colorData = await processAsync(() => {
            const data = new ImageData(
              new Uint8ClampedArray(targetImg8.data),
              targetImg8.cols,
              targetImg8.rows
            );

            if (targetImg8) {
              targetImg8.delete();
              targetImg8 = null;
            }
            if (resizeImg) {
              resizeImg.delete();
              resizeImg = null;
            }
            this.progressValue = 80;
            this.progressDescription = this.$i18n.locale === 'cn' ? '转换为ImageData对象...' : 'Converting to ImageData object...';
            return data;
          });

          this.drawImgData = true;

          // 设置缓冲画布
          await processAsync(() => {
            this.bufferCanvas.width = colorData.width;
            this.bufferCanvas.height = colorData.height;
            this.bufferCtx.putImageData(colorData, 0, 0);
            this.progressValue = 90;
            this.progressDescription = this.$i18n.locale === 'cn' ? '绘制缓冲画布图像...' : 'Drawing buffer canvas image...';
            return true;
          });

          // 绘制主画布图像
          this.progressValue = 100;
          this.progressDescription = this.$i18n.locale === 'cn' ? '绘制主画布图像...' : 'Drawing main canvas image...';
          this.drawImageData();
        }
      } catch (error) {
        this.handleError('Process image data error', 'processImage', error);
        this.progressValue = 0;
        this.progressDescription = '';
      } finally {
        this.progressValue = 0;
        // 确保所有Mat对象都被释放
        if (mat) {
          mat.delete();
          mat = null;
        }
        if (targetImg8) {
          targetImg8.delete();
          targetImg8 = null;
        }
        if (resizeImg) {
          resizeImg.delete();
          resizeImg = null;
        }
        // 处理后检查内存
        this.checkMemoryUsage();
        // 在处理完大量数据后手动请求垃圾回收
        if (window.gc) {
          try { window.gc(); } catch (e) { }
        }
      }
    },


    /**
     * 归一化拉伸区间，避免异常/过窄窗口把高亮图像压成黑色
     * @param {number} blackLevel
     * @param {number} whiteLevel
     * @param {Object} options
     * @param {boolean} options.highlightSafe - 高亮/过曝场景下扩大窗口
     * @returns {{blackLevel:number, whiteLevel:number}}
     */
    normalizeStretchRange(blackLevel, whiteLevel, options = {}) {
      const { highlightSafe = false } = options;
      const maxValue = 65535;
      const minRange = highlightSafe ? 4096 : 1;

      let normalizedBlack = Number.isFinite(blackLevel) ? Math.round(blackLevel) : 0;
      let normalizedWhite = Number.isFinite(whiteLevel) ? Math.round(whiteLevel) : maxValue;

      normalizedBlack = Math.max(0, Math.min(maxValue - 1, normalizedBlack));
      normalizedWhite = Math.max(1, Math.min(maxValue, normalizedWhite));

      if (highlightSafe && normalizedWhite >= maxValue - 1) {
        normalizedWhite = maxValue;
        normalizedBlack = Math.max(0, Math.min(normalizedBlack, normalizedWhite - minRange));
      }

      if (normalizedWhite <= normalizedBlack) {
        normalizedWhite = Math.min(maxValue, normalizedBlack + minRange);
        normalizedBlack = Math.max(0, normalizedWhite - minRange);
      }

      if ((normalizedWhite - normalizedBlack) < minRange) {
        if (highlightSafe && normalizedWhite >= maxValue - 1) {
          normalizedWhite = maxValue;
          normalizedBlack = Math.max(0, normalizedWhite - minRange);
        } else {
          normalizedWhite = Math.min(maxValue, normalizedBlack + minRange);
          normalizedBlack = Math.max(0, normalizedWhite - minRange);
        }
      }

      return {
        blackLevel: normalizedBlack,
        whiteLevel: normalizedWhite
      };
    },

    /**
     * 获取自动拉伸参数，返回黑色和白色阈值
     * @param {cv.Mat} imgMat 输入的图像Mat对象
     * @param {int} mode 模式
     * @returns {int，int} 黑色和白色阈值
     */
    GetAutoStretch(imgMat, mode) {
      // 仅支持 Mat 类型输入，并假定为16位图像
      // 使用 OpenCV 的 meanStdDev 函数直接计算均值和标准差
      const means = new cv.Mat();
      const stdDevs = new cv.Mat();

      // 高效计算均值和标准差
      cv.meanStdDev(imgMat, means, stdDevs);

      // 获取计算结果
      const mean = means.doubleAt(0, 0);
      const stdDev = stdDevs.doubleAt(0, 0);

      // 释放临时 Mat 对象
      means.delete();
      stdDevs.delete();

      // 根据模式设置标准差倍数
      let a, b;
      switch (mode) {
        case 0: a = 3; b = 5; break;
        case 1: a = 2; b = 5; break;
        case 2: a = 3; b = 8; break;
        default: a = 2; b = 8;
      }

      // 固定为16位图像处理
      const maxValue = 65535;

      // 计算黑白点
      let blackLevel = Math.round(Math.max(0, mean - stdDev * a));
      let whiteLevel = Math.round(Math.min(maxValue, mean + stdDev * b));

      // 边界与退化保护：避免异常或退化窗口
      if (!Number.isFinite(blackLevel) || !Number.isFinite(whiteLevel)) {
        blackLevel = 0; whiteLevel = 1;
      }
      if (stdDev === 0 || whiteLevel <= blackLevel) {
        if (mean <= 0) {               // 全黑
          blackLevel = 0;
          whiteLevel = 1;
        } else if (mean >= maxValue) { // 全白饱和
          blackLevel = maxValue - 1;
          whiteLevel = maxValue;
        } else {                       // 其它退化场景：给一个极小有效窗
          blackLevel = Math.max(0, Math.floor(mean) - 1);
          whiteLevel = Math.min(maxValue, blackLevel + 1);
          if (whiteLevel <= blackLevel) whiteLevel = blackLevel + 1;
        }
      }

      // 过曝/高亮场景下，均值和方差会把窗口压得非常窄，前端显示会被拉成近黑。
      // 这里在接近饱和时强制保留一个更宽的高亮窗口，让过曝图像至少维持“亮”而不是“黑”。
      const isNearSaturation = mean >= maxValue * 0.9 || whiteLevel >= maxValue - 1;
      return this.normalizeStretchRange(blackLevel, whiteLevel, {
        highlightSafe: isNearSaturation
      });
    },

    /**
     * 分析16位图像并计算直方图和白平衡增益
     * @param {cv.Mat} img16 - 输入的16位图像Mat对象
     * @param {string} imageType - 图像类型: 'gray'(灰度图) 或 'bayer'(Bayer格式)
     * @param {string} bayerPattern - Bayer模式，如果imageType为'bayer'则需提供: 'RGGB', 'GR', 'GB', 'BG'
     * @param {Object} options - 可选参数
     * @param {number} options.bins - 直方图箱数，默认256
     * @param {boolean} options.calculateGain - 是否计算白平衡增益参数，默认true
     * @param {boolean} options.usePercentile - 是否使用百分位计算增益，默认true
     * @param {number} options.lowPercentile - 下截断百分位，默认1
     * @param {number} options.highPercentile - 上截断百分位，默认99
     * @returns {Object} 直方图数据和增益参数
     */
    analyzeImageStatistics(img16, imageType, bayerPattern = 'RGGB', options = {}) {
      // 首先检查输入Mat是否有效
      if (!img16 || img16.rows <= 0 || img16.cols <= 0) {
        console.error('无效的图像数据');
        return {};
      }

      const { calculateGain = true, calculateHistogram = true } = options;
      const result = {};


      // 设置直方图参数
      const step = 4;

      // 安全访问函数
      const safeUshortAt = (mat, y, x) => {
        if (y >= 0 && y < mat.rows && x >= 0 && x < mat.cols) {
          try {
            return mat.ushortAt(y, x);
          } catch (e) {
            console.error(`访问位置错误: (${y},${x})`);
            return 0;
          }
        }
        return 0;
      };

      // 安全掩码设置（setter）：OpenCV.js 设置像素需使用 ucharPtr 返回的视图再赋值
      const safeSetMask = (mask, y, x, value) => {
        if (y >= 0 && y < mask.rows && x >= 0 && x < mask.cols) {
          try {
            const ptr = mask.ucharPtr(y, x);
            if (ptr && ptr.length > 0) ptr[0] = value;
          } catch (e) {
            console.error(`设置掩码错误: (${y},${x})`);
          }
        }
      };

      if (imageType === 'gray') {
        if (calculateHistogram) {
          // 计算直方图
          const histData = Array(65536).fill(0);
          for (let i = 0; i < img16.rows; i += step) {
            for (let j = 0; j < img16.cols; j += step) {
              try {
                histData[safeUshortAt(img16, i, j)]++;
              } catch (e) {
                // 忽略错误继续执行
              }
            }
          }
          result.histogram = histData;
        }
      } else if (imageType === 'bayer') {
        // 确保图像大小足够进行Bayer处理
        if (img16.rows < 2 || img16.cols < 2) {
          console.error('图像尺寸过小，无法进行Bayer处理');
          return {};
        }

        const rows = img16.rows;
        const cols = img16.cols;

        // 创建掩码 - 使用稀疏采样
        const maskR = new cv.Mat(rows, cols, cv.CV_8UC1, new cv.Scalar(0));
        const maskG = new cv.Mat(rows, cols, cv.CV_8UC1, new cv.Scalar(0));
        const maskB = new cv.Mat(rows, cols, cv.CV_8UC1, new cv.Scalar(0));

        // 确定采样步长 - 大图像时采用更大步长
        const sampleStep = Math.max(2, Math.floor(Math.min(rows, cols) / 200) * 2);

        // 确定Bayer模式位置
        let rOffsets, gOffsets, bOffsets;
        switch (bayerPattern) {
          case 'RGGB':
            rOffsets = [{ y: 0, x: 0 }];
            gOffsets = [{ y: 0, x: 1 }, { y: 1, x: 0 }];
            bOffsets = [{ y: 1, x: 1 }];
            break;
          case 'GR':
            gOffsets = [{ y: 0, x: 0 }, { y: 1, x: 1 }];
            rOffsets = [{ y: 0, x: 1 }];
            bOffsets = [{ y: 1, x: 0 }];
            break;
          case 'GB':
            gOffsets = [{ y: 0, x: 0 }, { y: 1, x: 1 }];
            bOffsets = [{ y: 0, x: 1 }];
            rOffsets = [{ y: 1, x: 0 }];
            break;
          case 'BG':
            bOffsets = [{ y: 0, x: 0 }];
            gOffsets = [{ y: 0, x: 1 }, { y: 1, x: 0 }];
            rOffsets = [{ y: 1, x: 1 }];
            break;
          default:
            rOffsets = [{ y: 0, x: 0 }];
            gOffsets = [{ y: 0, x: 1 }, { y: 1, x: 0 }];
            bOffsets = [{ y: 1, x: 1 }];
        }

        // 采样数据用于增益计算
        const rValues = [];
        const gValues = [];
        const bValues = [];

        // 采样设置掩码和收集采样数据
        for (let y = 0; y < rows; y += sampleStep) {
          for (let x = 0; x < cols; x += sampleStep) {
            // 处理红色通道
            for (const pos of rOffsets) {
              const py = y + pos.y;
              const px = x + pos.x;
              if (py < rows && px < cols && py >= 0 && px >= 0) {
                try {
                  safeSetMask(maskR, py, px, 255);
                  if (calculateGain && y % (sampleStep * 2) === 0 && x % (sampleStep * 2) === 0) {
                    rValues.push(safeUshortAt(img16, py, px));
                  }
                } catch (e) {
                  console.error(`R通道错误：(${py},${px})`, e);
                }
              }
            }

            // 处理绿色通道
            for (const pos of gOffsets) {
              const py = y + pos.y;
              const px = x + pos.x;
              if (py < rows && px < cols && py >= 0 && px >= 0) {
                try {
                  safeSetMask(maskG, py, px, 255);
                  if (calculateGain && y % (sampleStep * 2) === 0 && x % (sampleStep * 2) === 0) {
                    gValues.push(safeUshortAt(img16, py, px));
                  }
                } catch (e) {
                  console.error(`G通道错误：(${py},${px})`, e);
                }
              }
            }

            // 处理蓝色通道
            for (const pos of bOffsets) {
              const py = y + pos.y;
              const px = x + pos.x;
              if (py < rows && px < cols && py >= 0 && px >= 0) {
                try {
                  safeSetMask(maskB, py, px, 255);
                  if (calculateGain && y % (sampleStep * 2) === 0 && x % (sampleStep * 2) === 0) {
                    bValues.push(safeUshortAt(img16, py, px));
                  }
                } catch (e) {
                  console.error(`B通道错误：(${py},${px})`, e);
                }
              }
            }
          }
        }

        if (calculateHistogram) {
          // 计算三个通道的直方图
          const histDataR = Array(65536).fill(0);
          const histDataG = Array(65536).fill(0);
          const histDataB = Array(65536).fill(0);

          // 确保安全访问
          const maxRows = rows - 1;
          const maxCols = cols - 1;

          for (let i = 0; i < maxRows; i += 2) {
            for (let j = 0; j < maxCols; j += 2) {
              try {
                if (bayerPattern === 'RGGB') {
                  histDataR[safeUshortAt(img16, i, j)]++;
                  const g1 = safeUshortAt(img16, i + 1, j);
                  const g2 = safeUshortAt(img16, i, j + 1);
                  histDataG[Math.floor((g1 + g2) / 2)]++;
                  histDataB[safeUshortAt(img16, i + 1, j + 1)]++;
                } else if (bayerPattern === 'GR') {
                  const g1 = safeUshortAt(img16, i, j);
                  const g2 = safeUshortAt(img16, i + 1, j + 1);
                  histDataG[Math.floor((g1 + g2) / 2)]++;
                  histDataR[safeUshortAt(img16, i + 1, j)]++;
                  histDataB[safeUshortAt(img16, i, j + 1)]++;
                } else if (bayerPattern === 'GB') {
                  const g1 = safeUshortAt(img16, i, j);
                  const g2 = safeUshortAt(img16, i + 1, j + 1);
                  histDataG[Math.floor((g1 + g2) / 2)]++;
                  histDataB[safeUshortAt(img16, i + 1, j)]++;
                  histDataR[safeUshortAt(img16, i, j + 1)]++;
                } else if (bayerPattern === 'BG') {
                  histDataB[safeUshortAt(img16, i, j)]++;
                  const g1 = safeUshortAt(img16, i + 1, j);
                  const g2 = safeUshortAt(img16, i, j + 1);
                  histDataG[Math.floor((g1 + g2) / 2)]++;
                  histDataR[safeUshortAt(img16, i + 1, j + 1)]++;
                }
              } catch (e) {
                console.error(`直方图计算错误：(${i},${j})`, e);
              }
            }
          }
          result.histogram = [histDataR, histDataG, histDataB];
        }

        // 计算白平衡增益参数 - 使用快速中位数近似法
        if (calculateGain && rValues.length > 0 && gValues.length > 0 && bValues.length > 0) {
          try {
            // 快速计算中位数而非排序全部数组
            const rMean = this.truncatedMean(rValues);
            const gMean = this.truncatedMean(gValues);
            const bMean = this.truncatedMean(bValues);

            // 计算增益
            const gainR = Math.min(Math.max(gMean / rMean, 0.1), 2);
            const gainB = Math.min(Math.max(gMean / bMean, 0.1), 2);

            result.whiteBalance = {
              gainR: gainR,
              gainB: gainB
            };
          } catch (e) {
            console.error("白平衡增益计算错误", e);
            result.whiteBalance = { gainR: 1.0, gainB: 1.0 };
          }
        }

        // 释放资源
        try {
          maskR.delete();
          maskG.delete();
          maskB.delete();
        } catch (e) {
          console.error("释放资源错误", e);
        }
      }

      return result;
    },

    /**
     * 使用截断均值计算 - 去除上下一定比例的极值后计算平均值
     * @param {Array} arr - 输入数据数组
     * @param {number} lowerPercent - 下截断百分比，默认5%
     * @param {number} upperPercent - 上截断百分比，默认5%
     * @returns {number} 截断均值
     */
    truncatedMean(arr, lowerPercent = 5, upperPercent = 5) {
      if (arr.length === 0) return 0;

      // 过滤极端黑点和过饱和点
      const filtered = arr.filter(v => v > 100 && v < 65000);
      if (filtered.length === 0) return arr.length > 0 ? arr[0] : 0;

      // 对于特别大的数组，采样处理
      let workingArray = filtered;
      if (filtered.length > 10000) {
        workingArray = [];
        const step = Math.ceil(filtered.length / 5000);
        for (let i = 0; i < filtered.length; i += step) {
          workingArray.push(filtered[i]);
        }
      }

      // 排序数组
      workingArray.sort((a, b) => a - b);

      // 计算截断点
      const lowerCutoff = Math.floor(workingArray.length * (lowerPercent / 100));
      const upperCutoff = Math.floor(workingArray.length * (1 - upperPercent / 100));

      // 获取截断后的子数组
      const truncated = workingArray.slice(lowerCutoff, upperCutoff);

      // 计算平均值
      if (truncated.length === 0) return workingArray[Math.floor(workingArray.length / 2)];

      const sum = truncated.reduce((acc, val) => acc + val, 0);
      return sum / truncated.length;
    },
    /**
     * 快速计算中位数 - 使用随机选择算法
     */
    quickMedian(arr) {
      if (arr.length === 0) return 0;
      if (arr.length < 100) {
        // 小数组直接排序
        const sortedArr = [...arr].sort((a, b) => a - b);
        return sortedArr[Math.floor(sortedArr.length / 2)];
      }

      // 大数组随机采样
      const samples = [];
      for (let i = 0; i < 100; i++) {
        samples.push(arr[Math.floor(Math.random() * arr.length)]);
      }
      samples.sort((a, b) => a - b);
      return samples[50]; // 返回采样的中位数
    },

    /**
     * 应用白平衡和亮度拉伸，将16位图像转换为8位图像
     * @param {cv.Mat} img16 - 输入的16位图像Mat对象
     * @param {Object} analysis - 从analyzeImageStatistics获取的分析结果
     * @param {string} imageType - 图像类型: 'gray'(灰度图) 或 'bayer'(彩色相机)
     * @param {string} bayerPattern - Bayer模式，仅当imageType为'bayer'时需要
     * @param {Object} stretchParams - 手动指定拉伸参数，可选
     * @param {number} stretchParams.blackLevel - 黑点值 
     * @param {number} stretchParams.whiteLevel - 白点值
     * @returns {cv.Mat} 处理后的8位RGBA图像
     */
    applyStretchAndGain(img16, analysis, imageType, bayerPattern = 'RGGB', blackLevel, whiteLevel) {
      const normalizedRange = this.normalizeStretchRange(blackLevel, whiteLevel, {
        highlightSafe: whiteLevel >= 65534
      });
      blackLevel = normalizedRange.blackLevel;
      whiteLevel = normalizedRange.whiteLevel;

      // 计算转换比例和偏移
      const scale = 255.0 / (whiteLevel - blackLevel);
      const offset = -blackLevel * scale;

      if (imageType === 'gray') {
        // 单色相机 - 一步转换到8位RGBA
        const rgbaImg = new cv.Mat();
        const gray8 = new cv.Mat();

        img16.convertTo(gray8, cv.CV_8U, scale, offset);
        cv.cvtColor(gray8, rgbaImg, cv.COLOR_GRAY2RGBA);
        gray8.delete();

        return rgbaImg;
      } else {
        // 彩色相机处理
        let gainR = 1.0, gainB = 1.0;
        if (analysis && analysis.whiteBalance) {
          gainR = analysis.whiteBalance.gainR;
          gainB = analysis.whiteBalance.gainB;
        }

        // 使用LUT优化白平衡和拉伸
        // 1. 创建三个LUT表
        const { lutR, lutG, lutB } = this.getLUT(blackLevel, whiteLevel, gainR, gainB);

        // 3. 创建8位输出图像
        const img8 = new cv.Mat(img16.rows, img16.cols, cv.CV_8UC1);

        // 4. 使用LUT应用白平衡和拉伸
        // 为避免像素遍历，我们使用更高效的方式
        const rows = img16.rows;
        const cols = img16.cols;
        const data8 = img8.data;

        // 确定Bayer模式的位置
        let rOffsets, gOffsets, bOffsets;
        switch (bayerPattern) {
          case 'RGGB':
            rOffsets = [{ y: 0, x: 0 }];
            gOffsets = [{ y: 0, x: 1 }, { y: 1, x: 0 }];
            bOffsets = [{ y: 1, x: 1 }];
            break;
          case 'GR':
            gOffsets = [{ y: 0, x: 0 }, { y: 1, x: 1 }];
            rOffsets = [{ y: 0, x: 1 }];
            bOffsets = [{ y: 1, x: 0 }];
            break;
          case 'GB':
            gOffsets = [{ y: 0, x: 0 }, { y: 1, x: 1 }];
            bOffsets = [{ y: 0, x: 1 }];
            rOffsets = [{ y: 1, x: 0 }];
            break;
          case 'BG':
            bOffsets = [{ y: 0, x: 0 }];
            gOffsets = [{ y: 0, x: 1 }, { y: 1, x: 0 }];
            rOffsets = [{ y: 1, x: 1 }];
            break;
          default:
            rOffsets = [{ y: 0, x: 0 }];
            gOffsets = [{ y: 0, x: 1 }, { y: 1, x: 0 }];
            bOffsets = [{ y: 1, x: 1 }];
        }

        // 使用TypedArray方式处理 - 比逐个像素处理更快
        const data16U = img16.data16U;

        // 使用Bayer掩码创建转换LUT，批量处理
        for (let y = 0; y < rows; y += 2) {
          for (let x = 0; x < cols; x += 2) {
            // 处理2x2块
            // R位置
            for (const pos of rOffsets) {
              const idx = (y + pos.y) * cols + (x + pos.x);
              if (idx < data16U.length) {
                data8[idx] = lutR[data16U[idx]];
              }
            }

            // G位置
            for (const pos of gOffsets) {
              const idx = (y + pos.y) * cols + (x + pos.x);
              if (idx < data16U.length) {
                data8[idx] = lutG[data16U[idx]];
              }
            }

            // B位置
            for (const pos of bOffsets) {
              const idx = (y + pos.y) * cols + (x + pos.x);
              if (idx < data16U.length) {
                data8[idx] = lutB[data16U[idx]];
              }
            }
          }
        }

        // 5. 将8位单通道转为RGBA
        const rgbaImg = new cv.Mat();
        let cvmode;
        switch (bayerPattern) {
          case 'RGGB': cvmode = cv.COLOR_BayerRG2RGBA; break;
          case 'GR': cvmode = cv.COLOR_BayerGR2RGBA; break;
          case 'GB': cvmode = cv.COLOR_BayerGB2RGBA; break;
          case 'BG': cvmode = cv.COLOR_BayerBG2RGBA; break;
          default: cvmode = cv.COLOR_GRAY2RGBA;
        }

        cv.cvtColor(img8, rgbaImg, cvmode);
        img8.delete();

        return rgbaImg;
      }
    },
    /**
     * 获取或计算LUT表
     * @param {number} blackLevel - 黑点值
     * @param {number} whiteLevel - 白点值
     * @param {number} gainR - 红色增益
     * @param {number} gainB - 蓝色增益
     * @returns {Object} 包含LUT表的Object
     */
    getLUT(blackLevel, whiteLevel, gainR, gainB) {
      const normalizedRange = this.normalizeStretchRange(blackLevel, whiteLevel, {
        highlightSafe: whiteLevel >= 65534
      });
      blackLevel = normalizedRange.blackLevel;
      whiteLevel = normalizedRange.whiteLevel;

      // 创建当前参数的快照
      const currentParams = `${blackLevel}_${whiteLevel}_${gainR}_${gainB}`;

      // 如果参数未变化，直接返回缓存的LUT表
      if (this.lutCache.lastParams === currentParams &&
        this.lutCache.lutR && this.lutCache.lutG && this.lutCache.lutB) {
        return {
          lutR: this.lutCache.lutR,
          lutG: this.lutCache.lutG,
          lutB: this.lutCache.lutB
        };
      }

      // 参数变化，需要重新计算LUT表
      console.log('重新计算LUT表');

      // 计算转换比例
      const scale = 255.0 / (whiteLevel - blackLevel);

      // 创建LUT表
      const lutR = this.lutCache.lutR || new Uint8Array(65536);
      const lutG = this.lutCache.lutG || new Uint8Array(65536);
      const lutB = this.lutCache.lutB || new Uint8Array(65536);

      // 计算LUT表
      for (let i = 0; i < 65536; i++) {
        lutR[i] = Math.min(255, Math.max(0, Math.round((i * gainR - blackLevel) * scale)));
        lutG[i] = Math.min(255, Math.max(0, Math.round((i - blackLevel) * scale)));
        lutB[i] = Math.min(255, Math.max(0, Math.round((i * gainB - blackLevel) * scale)));
      }

      // 更新缓存
      this.lutCache.lastParams = currentParams;
      this.lutCache.lutR = lutR;
      this.lutCache.lutG = lutG;
      this.lutCache.lutB = lutB;

      return { lutR, lutG, lutB };
    },

    histogramStretch(imageData, min, max) {
      if (max < min) {
        this.SendConsoleLogMsg('histogramStretch | max < min, return original imageData', 'warning');
        max = min;
      }
      const startTime = new Date();
      // Calculate alpha and beta
      let alpha = 255.0 / (max - min);
      let beta = -min * alpha;

      if (alpha < 0) {
        alpha = 0;
        beta = 0;
      } else if (alpha > 255) {
        alpha = 255;
        beta = 0;
      }

      // Apply histogram stretching directly on ImageData
      for (let i = 0; i < imageData.data.length; i += 4) {
        for (let j = 0; j < 3; j++) { // For each color channel
          let value = imageData.data[i + j];
          value = value * alpha + beta;
          imageData.data[i + j] = Math.max(0, Math.min(255, value));
        }
      }

      const endTime = new Date();
      this.SendConsoleLogMsg('histogramStretch | 总时间: ' + (endTime.getTime() - startTime.getTime()) + ' ms', 'info');
      return imageData;
    },
    localWhiteBalanceAdjustment(imageData, gainR, gainB, offset) {
      // 分离通道
      let value;
      for (let i = 0; i < imageData.data.length; i += 4) {
        for (let j = 0; j < 3; j++) { // For each color channel
          if (j == 0) {
            value = imageData.data[i + j];
            value = value * gainB + offset;
          } else if (j == 2) {
            value = imageData.data[i + j];
            value = value * gainR + offset;
          } else {
            value = imageData.data[i + j];
            value = value * 1 + offset;
          }
          imageData.data[i + j] = Math.max(0, Math.min(255, value));
        }
      }


      return imageData;
    },

    initCanvas() {
      this.bufferCanvas = document.createElement('canvas');
      this.bufferCtx = this.bufferCanvas.getContext('2d');

      this.tempCanvas = document.createElement('canvas');
      this.tempCtx = this.tempCanvas.getContext('2d');

      // 初始化瓦片合成画布
      this.tileCanvas = document.createElement('canvas');
      this.tileCtx = this.tileCanvas.getContext('2d');
      
      // 初始化瓦片缓存 (使用非响应式的Map/Set)
      this.tileCache = new Map();
      this.tileRawDataCache = new Map();
      this.tilePendingLoads = new Set();
      this.tileAbortControllers = new Map();
      this.currentVisibleTiles = new Set();
    },

    //*/*/*/*/*/*/*/*/*/*/*/
    SwitchImageToShow(isOriginal) {
      // console.log('Show Original Image: ', isOriginal);
      this.SendConsoleLogMsg('Show Original Image:' + isOriginal, 'info');
      this.isNotDrawStars = isOriginal;
      if (isOriginal) {
        // document.removeEventListener('click', this.handleTouchOrMouseDown);
        this.enableMainCanvasClick = false;
        this.drawImageData();
      } else {
        // document.addEventListener('click', this.handleTouchOrMouseDown);
        this.enableMainCanvasClick = true;
        // this.drawImageData(this.detectStarsImg);
      }
    },



    drawImageData() {
      if (this.bufferCanvas == null) {
        this.SendConsoleLogMsg('drawImageData error: bufferCanvas is null or undefined.', 'error');
        return;
      }
      if (!this.drawImgData) return;

      // 可用相关参数
      // window.innerWidth; // 窗口宽度
      // window.innerHeight; // 窗口高度
      // this.scale 缩放比例
      // this.translateX 平移x坐标
      // this.translateY 平移y坐标
      // this.CanvasWidth 主画布宽度 1920
      // this.CanvasHeight 主画布高度 1080
      // this.mainCameraSizeX 原始图像宽度
      // this.mainCameraSizeY 原始图像高度
      // this.bufferCanvas.width 缓冲画布宽度
      // this.bufferCanvas.height 缓冲画布高度
      // this.ImageProportion 图像比例
      // this.ROI_x ROI的x坐标
      // this.ROI_y ROI的y坐标
      // this.ROI_length ROI的长度

      // console.log('当前画布参数:\n bufferCanvas.width: ', this.bufferCanvas.width, '\n bufferCanvas.height: ', this.bufferCanvas.height, '\n ImageProportion: ', this.ImageProportion, '\n scale: ', this.scale, '\n visibleX: ', this.visibleX, '\n visibleY: ', this.visibleY, '\n visibleWidth: ', this.visibleWidth, '\n visibleHeight: ', this.visibleHeight, '\n ROI_x: ', this.ROI_x, '\n ROI_y: ', this.ROI_y, '\n ROI_length: ', this.ROI_length);


      // 计算可见区域
      const newVisibleWidth = this.bufferCanvas.width * this.scale;
      const newVisibleHeight = newVisibleWidth / this.ImageProportion;

      // 计算可见区域x坐标
      let newVisibleX = this.visibleX;
      // 计算可见区域y坐标
      let newVisibleY = this.visibleY;

      // 避免图像越界
      if (newVisibleX - newVisibleWidth / 2 < 0) {
        newVisibleX = newVisibleWidth / 2;
      } else if (newVisibleX + newVisibleWidth / 2 > this.bufferCanvas.width) {
        newVisibleX = this.bufferCanvas.width - newVisibleWidth / 2;
      }

      if (newVisibleY - newVisibleHeight / 2 < 0) {
        newVisibleY = newVisibleHeight / 2;
      } else if (newVisibleY + newVisibleHeight / 2 > this.bufferCanvas.height) {
        newVisibleY = this.bufferCanvas.height - newVisibleHeight / 2;
      }

      // 更新ROI区域
      // 计算可见区域的边界
      const visibleLeft = newVisibleX - newVisibleWidth / 2;
      const visibleRight = newVisibleX + newVisibleWidth / 2;
      const visibleTop = newVisibleY - newVisibleHeight / 2;
      const visibleBottom = newVisibleY + newVisibleHeight / 2;

      // ROI 在主画面中的边长应与当前预览倍率保持一致。
      const roiDisplayLength = Math.max(2, Number(this.RedBoxSideLength || 0) / Math.max(1, Number(this.cameraBin) || 1));
      const roiLeft = this.ROI_x;
      const roiRight = this.ROI_x + roiDisplayLength;
      const roiTop = this.ROI_y;
      const roiBottom = this.ROI_y + roiDisplayLength;

      // 判断 ROI 区域是否在可见区域内
      const isRoiInVisible = roiRight >= visibleLeft && roiLeft <= visibleRight && roiBottom >= visibleTop && roiTop <= visibleBottom;

      // 计算 ROI 区域在屏幕上的位置，中心点坐标
      const roiScreenX = (this.ROI_x - visibleLeft) * (window.innerWidth / newVisibleWidth) + roiDisplayLength * window.innerWidth / newVisibleWidth / 2;
      const roiScreenY = (this.ROI_y - visibleTop) * (window.innerHeight / newVisibleHeight) + roiDisplayLength * window.innerHeight / newVisibleHeight / 2;
      this.$bus.$emit('setRedBoxLength', roiDisplayLength * window.innerWidth / newVisibleWidth, roiDisplayLength * window.innerHeight / newVisibleHeight);
      this.$bus.$emit('setRedBoxPosition', roiScreenX, roiScreenY);


      const canvas = this.$refs.mainCanvas;
      const ctx = canvas.getContext('2d');
      canvas.width = this.CanvasWidth;
      canvas.height = this.CanvasHeight;

      // 动态插值平滑：缩小时开启更顺滑；放大到一定倍率后关闭更锐利
      // 注意：scale 越小表示越“放大”（可见区域越小，放大倍率越高）
      let smoothing = true;
      if (this.imageSmoothingMode === 'never') {
        smoothing = false;
      } else if (this.imageSmoothingMode === 'always') {
        smoothing = true;
      } else {
        const upscaleX = canvas.width / (newVisibleWidth || 1);
        const upscaleY = canvas.height / (newVisibleHeight || 1);
        const upscale = Math.max(upscaleX, upscaleY);
        smoothing = upscale < (Number(this.imageSmoothingDisableAtUpscale) || 1.25);
      }
      ctx.imageSmoothingEnabled = smoothing;
      // 兼容旧前缀字段
      ctx.mozImageSmoothingEnabled = smoothing;
      ctx.webkitImageSmoothingEnabled = smoothing;
      ctx.msImageSmoothingEnabled = smoothing;

      ctx.drawImage(this.bufferCanvas, visibleLeft, visibleTop, newVisibleWidth, newVisibleHeight, 0, 0, canvas.width, canvas.height);

      this.visibleX = newVisibleX;
      this.visibleY = newVisibleY;
      this.visibleWidth = newVisibleWidth;
      this.visibleHeight = newVisibleHeight;

      this.$bus.$emit('setCurrentMainCanvasHasImage', true); // 发送给电调，用于判断是否可以进行循环拍摄
      // 发送消息给QT客户端，用于信息图标
      // 统一坐标：发送给 QT 的 ROI 坐标采用传感器像素坐标（不再按 bin 放大），避免在回环中被重复乘以 bin 导致指数级增长
      if (this.tileFrameId != null) {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'sendVisibleArea:' + this.visibleX + ':' + this.visibleY + ':' + this.scale + ':' + this.tileFrameId);
      } else {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'sendVisibleArea:' + this.visibleX + ':' + this.visibleY + ':' + this.scale);
      }

      // 如果选择了星点，则根据选择位置，在ROI区域中绘制一个圆
      if (this.DrawSelectStarX != -1 && this.DrawSelectStarY != -1 && this.showSelectStar) {
        let radius, canvasStarX, canvasStarY, color;
        // 如果有星点
        if (this.DrawSelectStarHFR != -1) {
          radius = this.DrawSelectStarHFR / this.scale * 2;
          if (radius <= 1) radius = 1;
          canvasStarX = (this.DrawSelectStarX / this.cameraBin + this.ROI_x - visibleLeft) * ctx.canvas.width / newVisibleWidth;
          canvasStarY = (this.DrawSelectStarY / this.cameraBin + this.ROI_y - visibleTop) * ctx.canvas.height / newVisibleHeight;
          color = 'green'; // 有星点，绘制绿色的圆
        } else {
          // 否则，在选择的位置绘制一个圆
          radius = 10 / this.scale; // 你可以根据需要调整这个值
          canvasStarX = (this.DrawSelectStarX / this.cameraBin + this.ROI_x - visibleLeft) * ctx.canvas.width / newVisibleWidth;
          canvasStarY = (this.DrawSelectStarY / this.cameraBin + this.ROI_y - visibleTop) * ctx.canvas.height / newVisibleHeight;
          color = 'red'; // 无星点，绘制红色的圆
        }

        // 获取绘制圆的位置的图像数据
        const imageData = ctx.getImageData(canvasStarX - radius, canvasStarY - radius, 2 * radius, 2 * radius);
        // 发送图像数据给显示框
        this.$bus.$emit('selectStarImage', imageData);
        console.log('绘制星点的位置和大小: x =', canvasStarX, 'y =', canvasStarY, 'radius =', radius);
        // 在指定位置开始绘制圆
        ctx.beginPath();
        ctx.arc(canvasStarX, canvasStarY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath();
      }

    },

    addEventListeners() {

    },

    // 节流函数
    throttle(func, delay) {
      let lastExecuted = 0;
      return function (...args) {
        const now = Date.now();
        if (now - lastExecuted >= delay) {
          func.apply(this, args);
          lastExecuted = now;
        }
      };
    },

    Bit16To8_Stretch(img16, B, W) {
      console.log('Bit16To8_Stretch | B = ' + B + ', W = ' + W);
      let img8 = new cv.Mat(img16.rows, img16.cols, cv.CV_8UC4);
      img16.convertTo(img8, cv.CV_8U, 255.0 / (W - B), -B * 255.0 / (W - B));
      return img8;
    },

    DrawDetectStars(image, Stars) {
      console.log('Draw circle on the Capture Image(', image.cols, ',', image.rows, ').');
      if (!(image instanceof cv.Mat)) {
        throw new Error('Invalid image data');
      }
      Stars.forEach(star => {
        let centerX = Math.round(star.x / (this.mainCameraSizeX / image.cols));
        let centerY = Math.round(star.y / (this.mainCameraSizeY / image.rows));
        let radius = Math.round(star.hfr);

        console.log('Draw circle at(', centerX, ',', centerY, ') with radius:', radius);

        let center = new cv.Point(centerX, centerY);
        let color = new cv.Scalar(255, 0, 0, 255);
        let thickness = 2; // 圆圈厚度

        cv.circle(image, center, radius, color, thickness);

        // 添加 hfr 值到圆的上方
        // 确保 star.hfr 是一个数字
        let hfrValue = parseFloat(star.hfr);
        if (isNaN(hfrValue)) {
          hfrValue = 0; // 如果 star.hfr 不能转换为数字，则默认值设为0
        }

        // 保留到小数点后2位
        let text = hfrValue.toFixed(2);
        let fontFace = cv.FONT_HERSHEY_SIMPLEX;
        let fontScale = 1;
        let textColor = new cv.Scalar(255, 0, 0, 255);
        let textThickness = 2;

        // 手动设置文本的位置，假设字体高度大约为10像素
        let textX = centerX - (text.length * 10); // 估算每个字符宽度为5像素
        let textY = centerY - radius - 3; // 圆的上方 3 像素

        // 在图像上绘制文本
        cv.putText(image, text, new cv.Point(textX, textY), fontFace, fontScale, textColor, textThickness);
      });

      const imageData = new ImageData(new Uint8ClampedArray(image.data), image.cols, image.rows);

      return imageData;
    },

    getGuiderCanvasDisplayRect() {
      const canvas = this.$refs.guiderCanvas;
      if (!canvas || typeof canvas.getBoundingClientRect !== 'function') {
        return {
          left: 0,
          top: 0,
          width: Math.max(1, window.innerWidth),
          height: Math.max(1, window.innerHeight)
        };
      }
      const rect = canvas.getBoundingClientRect();
      return {
        left: Number.isFinite(rect.left) ? rect.left : 0,
        top: Number.isFinite(rect.top) ? rect.top : 0,
        width: Math.max(1, rect.width || window.innerWidth),
        height: Math.max(1, rect.height || window.innerHeight)
      };
    },

    mapGuiderImagePointToScreen(PHD2ImageSize_X, PHD2ImageSize_Y, pointX, pointY) {
      const rect = this.getGuiderCanvasDisplayRect();
      const imageW = Math.max(1, PHD2ImageSize_X);
      const imageH = Math.max(1, PHD2ImageSize_Y);
      return {
        rect,
        x: rect.left + (pointX * rect.width / imageW),
        y: rect.top + (pointY * rect.height / imageH)
      };
    },

    DrawPHD2Box(PHD2ImageSize_X, PHD2ImageSize_Y, Box_X, Box_Y) {
      const mapped = this.mapGuiderImagePointToScreen(PHD2ImageSize_X, PHD2ImageSize_Y, Box_X, Box_Y);
      const BoxWidth = 20 * mapped.rect.width / Math.max(1, PHD2ImageSize_X);
      const BoxHeight = 20 * mapped.rect.height / Math.max(1, PHD2ImageSize_Y);

      const BoxStartX = mapped.x - BoxWidth / 2;
      const BoxStartY = mapped.y - BoxHeight / 2;

      this.$bus.$emit('PHD2BoxPosition', BoxStartX, BoxStartY, BoxWidth, BoxHeight);
    },

    DrawPHD2Cross(PHD2ImageSize_X, PHD2ImageSize_Y, Cross_X, Cross_Y) {
      const mapped = this.mapGuiderImagePointToScreen(PHD2ImageSize_X, PHD2ImageSize_Y, Cross_X, Cross_Y);
      this.$bus.$emit('PHD2CrossPosition', mapped.x, mapped.y);
    },

    DrawPHD2MultiStars(PHD2ImageSize_X, PHD2ImageSize_Y, Star_X, Star_Y) {
      const mapped = this.mapGuiderImagePointToScreen(PHD2ImageSize_X, PHD2ImageSize_Y, Star_X, Star_Y);
      const StarWidth = 12 * mapped.rect.width / Math.max(1, PHD2ImageSize_X);
      const StarHeight = 12 * mapped.rect.height / Math.max(1, PHD2ImageSize_Y);

      const StarStartX = mapped.x - StarWidth / 2;
      const StarStartY = mapped.y - StarHeight / 2;

      this.$bus.$emit('PHD2MultiStarsPosition', StarStartX, StarStartY);
    },

    calculateHistogram(imageData) {
      console.log('QHYCCD | calculateHistogram');
      const histogram = [
        Array(256).fill(0), // 存储蓝色通道直方图
        Array(256).fill(0), // 存储绿色通道直方图
        Array(256).fill(0)  // 存储红色通道直方图
      ];

      // 分别计算三个通道的直方图
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];

        // 更新每个通道的直方图
        histogram[0][b]++;
        histogram[1][g]++;
        histogram[2][r]++;
      }

      return histogram;
    },

    applyHistStretch(Min, Max) {
      console.log(`[applyHistStretch] 应用直方图拉伸: Min=${Min}, Max=${Max}`);
      
      // -1, -1 表示自动拉伸模式：使用初始保存的黑白点参数
      if (Min === -1 && Max === -1) {
        console.log('[applyHistStretch] 自动拉伸模式：恢复到初始自动计算的黑白点');
        if (this.tileGPM) {
          // 检查是否有保存的初始自动拉伸参数
          if (Number.isFinite(this.autoStretchBlackLevel) && Number.isFinite(this.autoStretchWhiteLevel) &&
              this.autoStretchBlackLevel >= 0 && this.autoStretchWhiteLevel > this.autoStretchBlackLevel) {
            console.log(`[applyHistStretch] 使用保存的初始自动拉伸参数: black=${this.autoStretchBlackLevel}, white=${this.autoStretchWhiteLevel}`);
            
            // 检查当前参数是否已经是初始参数，避免不必要的重新加载
            if (this.tileGPM.blackLevel === this.autoStretchBlackLevel && 
                this.tileGPM.whiteLevel === this.autoStretchWhiteLevel) {
              console.log('[applyHistStretch] 当前已是自动拉伸参数，无需重新加载');
              this.SendConsoleLogMsg('已处于自动拉伸状态', 'info');
              // 更新拨盘位置
              this.$bus.$emit('ChangeDialPosition', this.autoStretchBlackLevel, this.autoStretchWhiteLevel);
              return;
            }
            
            // 恢复到初始的自动拉伸参数
            this.currentHistogramMin = this.autoStretchBlackLevel;
            this.currentHistogramMax = this.autoStretchWhiteLevel;
            this.tileGPM.blackLevel = this.autoStretchBlackLevel;
            this.tileGPM.whiteLevel = this.autoStretchWhiteLevel;
            
            this.SendConsoleLogMsg(`应用自动拉伸: black=${this.autoStretchBlackLevel}, white=${this.autoStretchWhiteLevel}`, 'info');
            
            // 更新拨盘位置
            this.$bus.$emit('ChangeDialPosition', this.autoStretchBlackLevel, this.autoStretchWhiteLevel);
            
            // 重新加载瓦片以应用新参数
            console.log('[applyHistStretch] 触发瓦片重新加载');
            this.reloadTilesWithNewParams();
            return;
          } else {
            console.log('[applyHistStretch] 没有保存的初始自动拉伸参数');
            this.SendConsoleLogMsg('没有可用的自动拉伸参数', 'warning');
            return;
          }
        } else {
          console.log('[applyHistStretch] 瓦片模式未初始化，跳过自动拉伸');
          return;
        }
      }
      
      // 手动设置的拉伸参数
      this.currentHistogramMin = Min;
      this.currentHistogramMax = Max;
      
      // 更新瓦片GPM参数并重新加载瓦片（完全使用瓦片模式）
      if (this.tileGPM) {
        this.SendConsoleLogMsg(`[瓦片模式] 更新直方图参数: blackLevel=${Min}, whiteLevel=${Max}`, 'info');
        this.tileGPM.blackLevel = Min;
        this.tileGPM.whiteLevel = Max;
        console.log('[applyHistStretch] 触发瓦片重新加载');
        this.reloadTilesWithNewParams();
      } else {
        this.SendConsoleLogMsg('警告: 尚未初始化瓦片模式，无法应用直方图拉伸', 'warning');
        console.log('[applyHistStretch] 警告: tileGPM为空');
      }
      
      // 同步更新拨盘位置（无论是否在瓦片模式）
      this.$bus.$emit('ChangeDialPosition', Min, Max);
    },


    calcWhiteBalanceGains() {
      console.log('[calcWhiteBalanceGains] 开始计算白平衡增益');
      
      // 瓦片模式：向后端请求计算白平衡增益
      if (this.tileGPM) {
        console.log('[calcWhiteBalanceGains] 瓦片模式：向后端请求计算白平衡');
        this.SendConsoleLogMsg('正在计算白平衡增益...', 'info');
        
        // 发送命令到后端，请求计算白平衡
        this.sendMessage('Vue_Command', 'CalcWhiteBalance');
        
        // 后端应该：
        // 1. 接收 CalcWhiteBalance 命令
        // 2. 基于当前原始图像计算 R 和 B 通道的增益值
        // 3. 更新 ImageGainR 和 ImageGainB 变量
        // 4. 发送消息回前端: "WhiteBalanceGains:<gainR>:<gainB>"
        // 5. 前端收到增益值后，使用已缓存的原始瓦片数据重新处理显示（不重新生成瓦片）
        
        console.log('[calcWhiteBalanceGains] 已发送白平衡计算请求到后端');
        return;
      }
      
      // 检查是否有图像数据
      if (!this.ImageArrayBuffer || this.ImageArrayBuffer.byteLength === 0) {
        this.SendConsoleLogMsg('没有可用的图像数据，无法计算白平衡', 'warning');
        console.log('[calcWhiteBalanceGains] ImageArrayBuffer为空');
        return;
      }
      
      // 传统模式：使用 processImage 重新处理图像并计算增益；processImage 内会根据 this.calculateGain 将 analysis.whiteBalance 写回 ImageGainR/ImageGainB 与配置项
      this.calculateGain = true;
      this.processImage(this.ImageArrayBuffer, this.currentHistogramMin, this.currentHistogramMax, { calculateHistogram: false });
      console.log('[calcWhiteBalanceGains] 已触发图像重新处理以计算白平衡');
    },


    calculateWhiteBalanceGains() {
      if (!(this.OriginalImage instanceof ImageData)) {
        throw new Error('Invalid image data');
      }

      // 创建 cv.Mat 对象
      const img8 = cv.matFromImageData(this.OriginalImage);

      // 分割通道
      const channels = new cv.MatVector();
      cv.split(img8, channels);

      // 获取各通道
      const b = channels.get(0);
      const g = channels.get(1);
      const r = channels.get(2);

      // 计算中位数
      const medianB = new cv.Mat();
      const medianG = new cv.Mat();
      const medianR = new cv.Mat();
      cv.medianBlur(b, medianB, 5);
      cv.medianBlur(g, medianG, 5);
      cv.medianBlur(r, medianR, 5);

      // 计算平均亮度
      const avgB = cv.mean(medianB)[0];
      const avgG = cv.mean(medianG)[0];
      const avgR = cv.mean(medianR)[0];

      // 计算增益
      const gainR = Math.min(Math.max(avgG / avgR, 0.1), 3);
      const gainB = Math.min(Math.max(avgG / avgB, 0.1), 3);

      // 释放内存
      b.delete();
      g.delete();
      r.delete();
      medianB.delete();
      medianG.delete();
      medianR.delete();
      channels.delete();
      img8.delete();

      return { GainR: gainR, GainB: gainB };
    },

    loadOpenCv() {
      return new Promise((resolve, reject) => {
        if (typeof cv === 'undefined') {
          // 如果 cv 未定义，尝试加载 OpenCV.js
          const script = document.createElement('script');
          script.src = '/opencv.js'; // 使用 public 文件夹中的路径
          script.async = true;
          script.onload = () => {
            resolve();
          };
          script.onerror = (error) => {
            reject(error);
          };
          document.head.appendChild(script);
        } else {
          // 如果 cv 已定义，直接解析
          resolve();
        }
      });
    },


    onCvReady() {

      // Test if some of opencv method can work.
      if (cv) {
        console.log("QHYCCD | OpenCV.js is ready.");
        this.SendConsoleLogMsg('OpenCV.js is ready.', 'info');
      } else {
        console.log("QHYCCD | Failed to load OpenCV.js");
        this.SendConsoleLogMsg('Failed to load OpenCV.js.', 'error');
      }

      this.cvReady = true;
    },


    loadImageToCanvasMainCamera: function () {
      const canvas = document.getElementById('mainCamera-canvas');
      const ctx = canvas.getContext('2d');
      const image = new Image();
      image.onload = () => {
        // 获取设备像素比
        const devicePixelRatio = window.devicePixelRatio || 1;

        // 调整画布尺寸以适应高清显示
        canvas.width = image.width * devicePixelRatio;
        canvas.height = image.height * devicePixelRatio;
        ctx.scale(devicePixelRatio, devicePixelRatio); // 缩放ctx以适应高清画布

        // 绘制图像
        ctx.drawImage(image, 0, 0);
      };
      image.src = BackgroundImage;
    },
    loadImageToCanvasGuiderCamera: function () {
      const canvas = document.getElementById('guiderCamera-canvas');
      const ctx = canvas.getContext('2d');
      const image = new Image();
      image.onload = () => {
        // 获取设备像素比
        const devicePixelRatio = window.devicePixelRatio || 1;

        // 调整画布尺寸以适应高清显示
        canvas.width = image.width * devicePixelRatio;
        canvas.height = image.height * devicePixelRatio;
        ctx.scale(devicePixelRatio, devicePixelRatio); // 缩放ctx以适应高清画布

        // 绘制图像
        ctx.drawImage(image, 0, 0);
      };
      image.src = BackgroundImage;
    },


    showGuiderCameraCanvas() {
      // 动态更新z-index
      this.canvasZIndexStel = -10;
      this.canvasZIndexMainCamera = -11;
      this.canvasZIndexGuiderCamera = 0;
      this.$bus.$emit('setParsingProgress', false);

      // this.convertToGrayscale();
    },

    showStelCanvas() {
      if (this.isPolarAxisMode) {
        this.$bus.$emit('setParsingProgress', true);
      } else {
        this.$bus.$emit('setParsingProgress', false);
      }
      this.canvasZIndexStel = 0;
      this.canvasZIndexMainCamera = -10;
      this.canvasZIndexGuiderCamera = -11;
    },

    showMainCameraCanvas() {
      this.canvasZIndexStel = -10;
      this.canvasZIndexMainCamera = 0;
      this.canvasZIndexGuiderCamera = -11;

      this.$bus.$emit('setParsingProgress', false);
    },


    handleButtonTestClick() {
      // this.changeOrder();
      if (this.currentcanvas === 'Stel') {
        this.currentcanvas = 'MainCamera';
        this.showMainCameraCanvas();
      }
      else if (this.currentcanvas === 'MainCamera') {
        this.currentcanvas = 'GuiderCamera';
        this.showGuiderCameraCanvas();
      }
      else if (this.currentcanvas === 'GuiderCamera') {
        this.currentcanvas = 'Stel';
        this.showStelCanvas();
      }
    },

    getPluginsMenuItems: function () {
      let res = []
      for (const i in this.$stellariumWebPlugins()) {
        const plugin = this.$stellariumWebPlugins()[i]
        if (plugin.menuItems) {
          res = res.concat(plugin.menuItems)
        }
      }
      return res
    },
    getPluginsMenuComponents: function () {
      let res = []
      for (const i in this.$stellariumWebPlugins()) {
        const plugin = this.$stellariumWebPlugins()[i]
        if (plugin.menuComponents) {
          res = res.concat(plugin.menuComponents)
        }
      }
      return res
    },
    toggleStoreValue: function (storeVarName) {
      this.nav = false;
      this.$store.commit('toggleBool', storeVarName)
    },
    getStoreValue: function (storeVarName) {
      return _.get(this.$store.state, storeVarName)
    },
    setStateFromQueryArgs: function () {
      // Check whether the observing panel must be displayed
      this.$store.commit('setValue', { varName: 'showSidePanel', newValue: this.$route.path.startsWith('/p/') })

      // Set the core's state from URL query arguments such
      // as date, location, view direction & fov
      let that = this

      if (!this.initDone) {
        this.$stel.core.time_speed = 1
        let d = new Date()
        if (this.$route.query.date) {
          d = new Moment(this.$route.query.date).toDate()
          this.$stel.core.observer.utc = d.getMJD()
          this.startTimeIsSet = true
        }

        if (this.$route.query.lng && this.$route.query.lat) {
          const pos = { lat: Number(this.$route.query.lat), lng: Number(this.$route.query.lng), alt: this.$route.query.elev ? Number(this.$route.query.elev) : 0, accuracy: 1 }
          swh.geoCodePosition(pos, that).then((loc) => {
            that.$store.commit('setCurrentLocation', loc)
          }, (error) => { console.log(error) })
        }

        this.$stel.core.observer.yaw = this.$route.query.az ? Number(this.$route.query.az) * Math.PI / 180 : 0
        this.$stel.core.observer.pitch = this.$route.query.alt ? Number(this.$route.query.alt) * Math.PI / 180 : 30 * Math.PI / 180
        this.$stel.core.fov = this.$route.query.fov ? Number(this.$route.query.fov) * Math.PI / 180 : 120 * Math.PI / 180

        this.initDone = true
      }

      if (this.$route.path.startsWith('/skysource/')) {
        const name = decodeURIComponent(this.$route.path.substring(11))
        console.log('Will select object: ' + name)
        this.SendConsoleLogMsg('Will select object: ' + name, 'info');
        return swh.lookupSkySourceByName(name).then(ss => {
          if (!ss) {
            return
          }
          let obj = swh.skySource2SweObj(ss)
          if (!obj) {
            obj = this.$stel.createObj(ss.model, ss)
            this.$selectionLayer.add(obj)
          }
          if (!obj) {
            console.warning("Can't find object in SWE: " + ss.names[0])
          }
          swh.setSweObjAsSelection(obj)
        }, err => {
          console.log(err)
          console.log("Couldn't find skysource for name: " + name)
          this.SendConsoleLogMsg("Couldn't find skysource for name: " + name, 'error');
        })
      }
    },

    lookatcircle() {
      // glStel.core.selection = glTestCircle;
      glStel.pointAndLock(glTestCircle);
    },

    setGloabalStel: function (stel) {
      return stel;
    },

    setGlobalLayer: function (stel) {
      return stel.createLayer({ id: 'testLayerStars', z: 7, visible: true });
    },

    // 坐标验证方法
    isValidCoordinate: function (coord) {
      // 如果是字符串，尝试转换为数字
      if (typeof coord === 'string') {
        coord = parseFloat(coord);
      }

      return typeof coord === 'number' &&
        !isNaN(coord) &&
        isFinite(coord) &&
        coord >= -360 &&
        coord <= 360;
    },

    vec3_from_sphe: function (ra_degree, dec_degree, out) {
      // 确保坐标是数字类型
      let ra = ra_degree;
      let dec = dec_degree;

      if (typeof ra === 'string') {
        ra = parseFloat(ra);
      }
      if (typeof dec === 'string') {
        dec = parseFloat(dec);
      }

      // 添加坐标验证
      if (!this.isValidCoordinate(ra) || !this.isValidCoordinate(dec)) {
        console.error('无效的坐标输入:', { ra_degree, dec_degree, converted: { ra, dec } });
        return;
      }

      try {
        const cp = Math.cos(dec * Math.PI / 180);
        out[0] = Math.cos(ra * Math.PI / 180) * cp;
        out[1] = Math.sin(ra * Math.PI / 180) * cp;
        out[2] = Math.sin(dec * Math.PI / 180);
      } catch (error) {
        console.error('坐标转换出错:', error, { ra_degree, dec_degree, converted: { ra, dec } });
      }
    },

    testAddCircle: function (stel, layer) {
      console.log("Add a circle star near polaris");

      // 为临时对象创建带有名称的配置
      const circleConfig = {
        id: 'test_circle_' + Date.now(),
        model_data: {},
        names: ['Test Circle'],  // 添加名称
        types: ['Temporary'],
        model: 'temporary'
      };

      let circle = stel.createObj('circle', circleConfig);

      circle.update();
      layer.add(circle);

      // 现在可以安全地选择对象，因为它有名称
      stel.core.selection = circle;
      stel.pointAndLock(circle);

      // Circle Property
      let mm = circle.pos;
      this.vec3_from_sphe(2.52971, 89.2641, mm);
      circle.pos = mm;
      console.log("circle pos:" + mm);
      circle.label = "";
      circle.frame = 1;
      circle.size = [0.05, 0.05];
      circle.color = [0, 1, 0, 0.25];
      circle.border_color = [0, 1, 0, 1];

      return circle;
    },

    UpdateCirclePos(Ra_degree, Dec_degree) {
      // 添加安全检查
      if (!glTestCircle || !glTestCircle.pos) {
        console.warn('glTestCircle 未初始化，跳过位置更新');
        return;
      }

      let mm = glTestCircle.pos;
      this.vec3_from_sphe(Ra_degree, Dec_degree, mm);
      glTestCircle.pos = mm;
      // console.log("赤道仪位置更新为:"+Ra_degree+"+"+Dec_degree);
    },

    UpdateTelescopeStatus(status) {
      this.$bus.$emit('MountStatus', status);

      // 添加安全检查
      if (!glTestCircle) {
        console.warn('glTestCircle 未初始化，跳过状态更新');
        return;
      }

      if (status === 'Moving') {
        glTestCircle.color = [1, 0, 0, 0.25];
        glTestCircle.border_color = [1, 0, 0, 1];
      } else {
        glTestCircle.color = [0, 1, 0, 0.25];
        glTestCircle.border_color = [0, 1, 0, 1];
      }
    },

    UpdateMainCameraStatus(status) {
      this.$bus.$emit('MainCameraStatus', status);
    },

    // 绘制视场多边形（基于五个RA/DEC坐标的闭环）
    AddFieldOfViewPolygon: function (stel, layer, coordinates, color, name) {
      console.log(`开始创建视场多边形: ${name}`, { coordinates, color });

      try {
        // 验证输入参数
        if (!coordinates || !Array.isArray(coordinates)) {
          console.error('视场坐标必须是数组');
          return null;
        }

        if (coordinates.length !== 5) {
          console.error(`视场坐标必须是5个点，当前有${coordinates.length}个点`);
          return null;
        }

        // 验证每个坐标点
        for (let i = 0; i < coordinates.length; i++) {
          const coord = coordinates[i];
          if (!coord || typeof coord.ra === 'undefined' || typeof coord.dec === 'undefined') {
            console.error(`坐标点${i}格式错误，需要包含ra和dec属性:`, coord);
            return null;
          }

          // 验证坐标值
          if (!this.isValidCoordinate(coord.ra) || !this.isValidCoordinate(coord.dec)) {
            console.error(`坐标点${i}的值无效:`, coord);
            return null;
          }
        }

        // 设置默认颜色
        const defaultColor = {
          stroke: "#FFFFFF",
          strokeOpacity: 1,
          fill: "#1E90FF",
          fillOpacity: 0.25
        };

        const finalColor = { ...defaultColor, ...color };
        console.log('最终颜色配置:', finalColor);

        // 创建多边形对象
        const polygonConfig = {
          id: 'field_of_view_' + Date.now(),
          model_data: {},
          names: [name || 'Field of View'],
          types: ['FieldOfView'],
          model: 'field_of_view'
        };

        console.log('创建GeoJSON多边形对象');
        let polygon = stel.createObj('geojson', {
          data: {
            "type": "FeatureCollection",
            "features": [
              {
                "type": "Feature",
                "properties": {
                  "stroke": finalColor.stroke,
                  "stroke-opacity": finalColor.strokeOpacity,
                  "fill": finalColor.fill,
                  "fill-opacity": finalColor.fillOpacity,
                  "name": name || 'Field of View'
                },
                "geometry": {
                  "type": "Polygon",
                  "coordinates": [
                    [
                      // 五个坐标点，形成闭环
                      [coordinates[0].ra, coordinates[0].dec],
                      [coordinates[1].ra, coordinates[1].dec],
                      [coordinates[2].ra, coordinates[2].dec],
                      [coordinates[3].ra, coordinates[3].dec],
                      [coordinates[0].ra, coordinates[0].dec]  // 闭合多边形
                    ]
                  ]
                }
              }
            ]
          }
        });

        if (!polygon) {
          console.error('GeoJSON多边形对象创建失败');
          return null;
        }

        console.log('多边形对象创建成功，开始更新和添加到图层');

        // 设置对象属性
        polygon.update();
        layer.add(polygon);

        console.log('多边形已添加到图层');

        // // 添加标签（可选）
        // if (name) {
        //   console.log('添加多边形标签');
        //   // 计算视场中心点
        //   const centerRa = coordinates.reduce((sum, coord) => sum + coord.ra, 0) / coordinates.length;
        //   const centerDec = coordinates.reduce((sum, coord) => sum + coord.dec, 0) / coordinates.length;

        //   let labelCircle = this.AddMarkCircle(stel, layer, 4, name);
        //   if (labelCircle) {
        //     let labelMm = labelCircle.pos;
        //     this.vec3_from_sphe(centerRa, centerDec + 0.02, labelMm); // 在视场上方显示名称
        //     labelCircle.pos = labelMm;
        //     labelCircle.color = [1, 1, 1, 0.8];  // 白色，半透明
        //     labelCircle.border_color = [0, 0, 0, 0.5];  // 黑色边框，半透明
        //     labelCircle.size = [0.01, 0.01];  // 很小的圆圈作为名称标签

        //     // 将标签与多边形关联
        //     polygon.labelCircle = labelCircle;
        //     console.log('标签已添加到多边形');
        //   } else {
        //     console.warn('标签创建失败');
        //   }
        // }

        console.log(`视场多边形创建完成: ${name || 'Field of View'}`, {
          coordinates: coordinates,
          color: finalColor,
          polygon: polygon
        });

        return polygon;

      } catch (error) {
        console.error('创建视场多边形时出错:', error);
        console.error('错误堆栈:', error.stack);
        return null;
      }
    },

    // 删除指定的视场多边形
    RemoveFieldOfViewPolygon: function (polygon) {
      try {
        if (!polygon) {
          console.warn('要删除的多边形对象为空');
          return false;
        }

        // 删除关联的标签
        if (polygon.labelCircle) {
          glLayer.remove(polygon.labelCircle);
        }

        // 删除多边形
        glLayer.remove(polygon);

        console.log('视场多边形已删除:', polygon);
        return true;

      } catch (error) {
        console.error('删除视场多边形时出错:', error);
        return false;
      }
    },

    // 删除所有视场多边形
    RemoveAllFieldOfViewPolygons: function () {
      try {
        // 如果有多边形数组，遍历删除
        if (this.fieldOfViewPolygons && Array.isArray(this.fieldOfViewPolygons)) {
          this.fieldOfViewPolygons.forEach(polygon => {
            this.RemoveFieldOfViewPolygon(polygon);
          });
          this.fieldOfViewPolygons = [];
        }

        console.log('所有视场多边形已删除');
        return true;

      } catch (error) {
        console.error('删除所有视场多边形时出错:', error);
        return false;
      }
    },

    // 更新视场多边形的位置
    UpdateFieldOfViewPolygonPosition: function (polygon, newCoordinates) {
      try {
        if (!polygon || !newCoordinates || !Array.isArray(newCoordinates) || newCoordinates.length !== 5) {
          console.error('更新视场多边形位置时参数无效');
          return false;
        }

        // 验证新坐标
        for (let i = 0; i < newCoordinates.length; i++) {
          const coord = newCoordinates[i];
          if (!this.isValidCoordinate(coord.ra) || !this.isValidCoordinate(coord.dec)) {
            console.error(`新坐标点${i}的值无效:`, coord);
            return false;
          }
        }

        // 更新多边形数据
        polygon.data.features[0].geometry.coordinates[0] = [
          [newCoordinates[0].ra, newCoordinates[0].dec],
          [newCoordinates[1].ra, newCoordinates[1].dec],
          [newCoordinates[2].ra, newCoordinates[2].dec],
          [newCoordinates[3].ra, newCoordinates[3].dec],
          [newCoordinates[4].ra, newCoordinates[4].dec],
          [newCoordinates[0].ra, newCoordinates[0].dec]  // 闭合
        ];

        polygon.update();

        // 更新标签位置（如果存在）
        if (polygon.labelCircle) {
          const centerRa = newCoordinates.reduce((sum, coord) => sum + coord.ra, 0) / newCoordinates.length;
          const centerDec = newCoordinates.reduce((sum, coord) => sum + coord.dec, 0) / newCoordinates.length;

          let labelMm = polygon.labelCircle.pos;
          this.vec3_from_sphe(centerRa, centerDec + 0.02, labelMm);
          polygon.labelCircle.pos = labelMm;
        }

        console.log('视场多边形位置已更新:', newCoordinates);
        return true;

      } catch (error) {
        console.error('更新视场多边形位置时出错:', error);
        return false;
      }
    },

    UpdateMainCameraTemperature(value) {
      // console.log('Main Camera Temperature:', value + '°');
      this.$bus.$emit('MainCameraTemperature', value);
    },

    setPolarPointAltitude(Altitude) {
      this.PolarPoint_Altitude = Altitude;
      console.log('Polar Point Altitude:', this.PolarPoint_Altitude);
      this.SendConsoleLogMsg('Polar Point Altitude:' + this.PolarPoint_Altitude, 'info');
    },

    AddMarkCircle: function (stel, layer, frame, label) {
      console.log(`开始创建标记圆圈: ${label}`);

      try {
        // 为临时对象创建带有名称的配置
        const circleConfig = {
          id: 'temp_circle_' + Date.now(),
          model_data: {},
          names: [label || 'Temporary Marker'],  // 添加名称
          types: ['Temporary'],
          model: 'temporary'
        };

        console.log('创建圆形对象');
        let circle = stel.createObj('circle', circleConfig);

        if (!circle) {
          console.error('圆形对象创建失败');
          return null;
        }

        console.log('圆形对象创建成功，开始设置属性');
        circle.update();
        layer.add(circle);

        // 设置默认位置（北极星附近）
        let mm = circle.pos;
        this.vec3_from_sphe(2.52971, 89.2641, mm);
        circle.pos = mm;

        // 设置圆形属性
        circle.label = label;
        circle.frame = frame;
        circle.size = [0.04, 0.04];
        circle.color = [1, 1, 1, 0.5];
        circle.border_color = [1, 1, 1, 1];

        console.log(`标记圆圈创建完成: ${label}`, {
          pos: mm,
          size: circle.size,
          color: circle.color,
          border_color: circle.border_color
        });

        return circle;
      } catch (error) {
        console.error('创建标记圆圈时出错:', error);
        console.error('错误堆栈:', error.stack);
        return null;
      }
    },

    AddMarkRectangle: function (stel, layer, RaDec) {
      let line = stel.createObj('geojson', {
        data: {
          "type": "FeatureCollection",
          "features": [
            {
              "type": "Feature",
              "properties": {
                "stroke": "#FFFFFF",
                "stroke-opacity": 1,
                "fill": "#1E90FF",
                "fill-opacity": 0.25
              },
              "geometry": {
                "type": "Polygon",
                "coordinates": [
                  [
                    // [139.76, 35.52], [139.32, 33.41], [140.92, 33.08], [141.35, 35.19], [139.76, 35.52]
                    [parseFloat(RaDec[0].Ra), parseFloat(RaDec[0].Dec)], [parseFloat(RaDec[1].Ra), parseFloat(RaDec[1].Dec)],
                    [parseFloat(RaDec[2].Ra), parseFloat(RaDec[2].Dec)], [parseFloat(RaDec[3].Ra), parseFloat(RaDec[3].Dec)],
                    [parseFloat(RaDec[0].Ra), parseFloat(RaDec[0].Dec)]
                  ]
                ]
              }
            },
          ]
        }
      });

      line.update();
      layer.add(line);
      return line;
    },



    // 辅助方法：将十六进制颜色转换为RGB
    hexToRgb: function (hex) {
      // 移除#号
      hex = hex.replace('#', '');

      // 解析RGB值
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);

      return { r, g, b };
    },

    // 更新视场方法
    updateFieldOfView: function (field) {
      if (!field || !field.fieldInfo) return;

      const info = field.fieldInfo;

      // 计算视场的四个角点
      const corners = [
        { Ra: info.maxRa, Dec: info.maxDec },
        { Ra: info.minRa, Dec: info.maxDec },
        { Ra: info.minRa, Dec: info.minDec },
        { Ra: info.maxRa, Dec: info.minDec },
        { Ra: info.maxRa, Dec: info.maxDec }  // 闭合多边形
      ];

      // 更新GeoJSON数据
      field.data = {
        "type": "FeatureCollection",
        "features": [
          {
            "type": "Feature",
            "properties": {
              "stroke": info.color,
              "strokeOpacity": 0.8,
              "fill": info.color,
              "fillOpacity": 0.2
            },
            "geometry": {
              "type": "Polygon",
              "coordinates":
                [
                  [parseFloat(corners[0].Ra), parseFloat(corners[0].Dec)],
                  [parseFloat(corners[1].Ra), parseFloat(corners[1].Dec)],
                  [parseFloat(corners[2].Ra), parseFloat(corners[2].Dec)],
                  [parseFloat(corners[3].Ra), parseFloat(corners[3].Dec)],
                  [parseFloat(corners[4].Ra), parseFloat(corners[4].Dec)]
                ]
            }
          }
        ]
      };

      field.update();
    },

    // 启动视场更新定时器
    startFieldUpdateTimer: function () {
      if (this.fieldUpdateTimer) {
        clearInterval(this.fieldUpdateTimer);
      }

      this.fieldUpdateTimer = setInterval(() => {
        // 更新校准点视场
        if (this.calibrationCircles) {
          this.calibrationCircles.forEach(field => {
            if (field.fieldInfo) {
              this.updateFieldOfView(field);
            }
          });
        }

        // 更新调整点视场
        if (this.adjustmentCircles) {
          this.adjustmentCircles.forEach(field => {
            if (field.fieldInfo) {
              this.updateFieldOfView(field);
            }
          });
        }
      }, 3000); // 每3秒更新一次
    },

    // 停止视场更新定时器
    stopFieldUpdateTimer: function () {
      if (this.fieldUpdateTimer) {
        clearInterval(this.fieldUpdateTimer);
        this.fieldUpdateTimer = null;
      }
    },

    getCiecleAzAlt(Circle) {
      let obs = this.$stel.core.observer;
      let cirs = this.$stel.convertFrame(obs, 'ICRF', 'CIRS', Circle.getInfo('radec'));
      let observed = this.$stel.convertFrame(obs, 'CIRS', 'OBSERVED', cirs);
      // const azalt = this.$stel.c2s(this.$stel.convertFrame(this.$stel.core.observer, 'ICRF', 'OBSERVED', obj.getInfo('radec')))
      let azalt = this.$stel.c2s(observed);
      let az = this.$stel.anp(azalt[0]);
      let alt = this.$stel.anp(azalt[1]);

      const az_raf = this.$stel.a2af(az, 1);
      const Az_degree = (az_raf.degrees < 0 ? az_raf.degrees + 180 : az_raf.degrees) + az_raf.arcminutes / 60 + az_raf.arcseconds / 3600;

      const alt_raf = this.$stel.a2af(alt, 1);
      const Alt_degree = alt_raf.degrees + alt_raf.arcminutes / 60 + alt_raf.arcseconds / 3600;

      console.log('AzAlt:', Az_degree, Alt_degree);

      return { Az_degree, Alt_degree };
    },

    SolveResultMark(RaDegree, DecDegree, Azimuth, Altitude) {
      let MarkCircle_RaDec = this.AddMarkCircle(this.$stel, glLayer, 1, "RaDec");
      let mm = MarkCircle_RaDec.pos;
      this.vec3_from_sphe(RaDegree, DecDegree, mm);
      MarkCircle_RaDec.pos = mm;
      console.log("RaDec circle coordinates:" + mm);

      const AzAlt = this.getCiecleAzAlt(MarkCircle_RaDec);
      glLayer.remove(MarkCircle_RaDec);

      this.MarkCircleNum++;
      let Label = "AzAlt_Vue_" + this.MarkCircleNum;

      let MarkCircle_AltAz = this.AddMarkCircle(this.$stel, glLayer, 4, Label);
      mm = MarkCircle_AltAz.pos;
      this.vec3_from_sphe(AzAlt.Az_degree, AzAlt.Alt_degree, mm);
      MarkCircle_AltAz.pos = mm;
      console.log("AzAlt_Vue circle coordinates:" + mm);

      console.log("AzAlt_Vue circle x:" + mm[0]);
      console.log("AzAlt_Vue circle y:" + mm[1]);
      console.log("AzAlt_Vue circle z:" + mm[2]);

      this.LastPoint_AzAlt = this.getCiecleAzAlt(MarkCircle_AltAz);

      this.CalculationPolarPoint(mm);

      // 将创建的圆存储到数组中
      // this.Circles.push(MarkCircle_RaDec);
      this.Circles.push(MarkCircle_AltAz);

    },

    RemoveAllCircles() {
      this.Circles.forEach(circle => {
        glLayer.remove(circle);
      });
      this.Circles = [];
    },

    SolveResultMark_RealTime(RaDegree, DecDegree, Azimuth, Altitude) {
      this.LastCircle_RaDec = this.AddMarkCircle(this.$stel, glLayer, 1, "RaDec");
      let mm = this.LastCircle_RaDec.pos;
      this.vec3_from_sphe(RaDegree, DecDegree, mm);
      this.LastCircle_RaDec.pos = mm;
      console.log("RaDec circle coordinates:" + mm);

      const AzAlt = this.getCiecleAzAlt(this.LastCircle_RaDec);
      glLayer.remove(this.LastCircle_RaDec);

      if (this.LastCircle_AzAlt !== null && this.LastCircle_AzAlt !== undefined) {
        glLayer.remove(this.LastCircle_AzAlt);
      }
      this.LastCircle_AzAlt = this.AddMarkCircle(this.$stel, glLayer, 4, 'Current');
      mm = this.LastCircle_AzAlt.pos;
      this.vec3_from_sphe(AzAlt.Az_degree, AzAlt.Alt_degree, mm);
      this.LastCircle_AzAlt.pos = mm;
      this.LastCircle_AzAlt.color = [0, 1, 1, 0.25];
      console.log("AzAlt_Vue circle coordinates:" + mm);

      console.log("AzAlt_Vue circle x:" + mm[0]);
      console.log("AzAlt_Vue circle y:" + mm[1]);
      console.log("AzAlt_Vue circle z:" + mm[2]);

      this.Current_AzAlt = this.getCiecleAzAlt(this.LastCircle_AzAlt);
      console.log("Current AzAlt:", this.Current_AzAlt.Az_degree, this.Current_AzAlt.Alt_degree);
      this.$bus.$emit('ShowCurrentAzAltText', this.Current_AzAlt.Az_degree, this.Current_AzAlt.Alt_degree);
    },


    CalculationPolarPoint(coordinate) {
      this.CartesianList.push(coordinate);

      if (this.CartesianList.length < 3) {
        return;
      }

      this.$bus.$emit('HideSingleSolveBtn');

      // 获取三个点的坐标
      const p1 = this.CartesianList[0];
      const p2 = this.CartesianList[1];
      const p3 = this.CartesianList[2];

      // 计算两个向量
      const v1 = [
        p2[0] - p1[0],
        p2[1] - p1[1],
        p2[2] - p1[2]
      ];

      const v2 = [
        p3[0] - p1[0],
        p3[1] - p1[1],
        p3[2] - p1[2]
      ];

      // 计算法向量
      const normal = [
        v1[1] * v2[2] - v1[2] * v2[1],
        v1[2] * v2[0] - v1[0] * v2[2],
        v1[0] * v2[1] - v1[1] * v2[0]
      ];

      // 计算法向量的长度
      const normalLength = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);

      // 归一化法向量
      const unitNormal = [
        normal[0] / normalLength,
        normal[1] / normalLength,
        normal[2] / normalLength
      ];

      // 假设球的半径为r，圆心为(0, 0, 0)
      const r = 1; // 根据你的实际情况调整

      // 计算与球面的交点
      const intersection1 = [
        unitNormal[0] * r,
        unitNormal[1] * r,
        unitNormal[2] * r
      ];

      const intersection2 = [
        -unitNormal[0] * r,
        -unitNormal[1] * r,
        -unitNormal[2] * r
      ];

      console.log('Intersection Points:', intersection1, intersection2);

      // 选择离(0,0,1)更近的交点
      const closerIntersection = intersection1[2] > 0 ? intersection1 : intersection2;

      let MarkCircle_FakePolarPoint = this.AddMarkCircle(this.$stel, glLayer, 4, "FakePolarPoint");
      let mm = MarkCircle_FakePolarPoint.pos;
      mm[0] = closerIntersection[0];
      mm[1] = closerIntersection[1];
      mm[2] = closerIntersection[2];
      MarkCircle_FakePolarPoint.pos = mm;
      console.log("FakePolarPoint circle coordinates:" + mm);

      const AzAlt_FakePolarPoint = this.getCiecleAzAlt(MarkCircle_FakePolarPoint);

      console.log("Fake Polar Point AzAlt:", AzAlt_FakePolarPoint.Az_degree, ',', AzAlt_FakePolarPoint.Alt_degree);

      this.Circles.push(MarkCircle_FakePolarPoint);

      let AzAlt_PolarPoint = {
        Az_degree: 0,
        Alt_degree: this.PolarPoint_Altitude
      };

      // console.log("Real Polar Point AzAlt:", AzAlt_PolarPoint.Az_degree, ',', AzAlt_PolarPoint.Alt_degree);
      this.SendConsoleLogMsg('Real Polar Point AzAlt:' + AzAlt_PolarPoint.Az_degree + ',' + AzAlt_PolarPoint.Alt_degree, 'info');
      // console.log("Last Point AzAlt:", this.LastPoint_AzAlt.Az_degree, this.LastPoint_AzAlt.Alt_degree);
      this.SendConsoleLogMsg('Last Point AzAlt:' + this.LastPoint_AzAlt.Az_degree + ',' + this.LastPoint_AzAlt.Alt_degree, 'info');

      ////////////////////////////////////////////////

      // // 将球坐标转换为笛卡尔坐标
      // let fakePolarPoint = this.sphericalToCartesian(AzAlt_FakePolarPoint.Az_degree, AzAlt_FakePolarPoint.Alt_degree);
      // let polarPoint = this.sphericalToCartesian(AzAlt_PolarPoint.Az_degree, AzAlt_PolarPoint.Alt_degree);
      // let lastPoint = this.sphericalToCartesian(this.LastPoint_AzAlt.Az_degree, this.LastPoint_AzAlt.Alt_degree);

      // // 计算旋转四元数
      // let quaternion = this.computeQuaternion(fakePolarPoint, polarPoint);

      // // 应用旋转
      // let fourthPoint = this.applyQuaternion(lastPoint, quaternion);

      // // 将结果转换回球坐标
      // let fourthPointAzAlt = this.cartesianToSpherical(fourthPoint);
      // console.log("Fourth Point AzAlt:", fourthPointAzAlt.Az_degree, ',', fourthPointAzAlt.Alt_degree);

      ////////////////////////////////////////////////

      // 计算角度差值，考虑角度的循环性质
      function calculateAngleDifference(angle1, angle2) {
        let difference = angle2 - angle1;
        while (difference > 180) difference -= 360;
        while (difference < -180) difference += 360;
        return difference;
      }

      let azimuthDifference = calculateAngleDifference(AzAlt_FakePolarPoint.Az_degree, AzAlt_PolarPoint.Az_degree);
      let altitudeDifference = AzAlt_PolarPoint.Alt_degree - AzAlt_FakePolarPoint.Alt_degree;

      // 应用差值到LastPoint
      let fourthPointAzAlt = {
        Az_degree: this.LastPoint_AzAlt.Az_degree + azimuthDifference,
        Alt_degree: this.LastPoint_AzAlt.Alt_degree + altitudeDifference
      };

      // 确保方位角在0到360度之间
      fourthPointAzAlt.Az_degree = (fourthPointAzAlt.Az_degree + 360) % 360;

      // 确保高度角在-90到90度之间
      fourthPointAzAlt.Alt_degree = Math.max(Math.min(fourthPointAzAlt.Alt_degree, 90), -90);

      console.log("Fourth Point AzAlt:", fourthPointAzAlt.Az_degree, ',', fourthPointAzAlt.Alt_degree);

      this.$bus.$emit('ShowAzAltText', azimuthDifference, altitudeDifference, fourthPointAzAlt.Az_degree, fourthPointAzAlt.Alt_degree);

      ////////////////////////////////////////////////

      // 将角度转换为弧度
      function degreesToRadians(degrees) {
        return degrees * Math.PI / 180;
      }

      // 将球坐标转换为笛卡尔坐标
      function sphericalToCartesian(azimuth, altitude) {
        let az = degreesToRadians(azimuth);
        let alt = degreesToRadians(altitude);
        let x = Math.cos(alt) * Math.cos(az);
        let y = Math.cos(alt) * Math.sin(az);
        let z = Math.sin(alt);
        return { x: x, y: y, z: z };
      }

      // 将第四个点转换为笛卡尔坐标
      let fourthPointCartesian = sphericalToCartesian(fourthPointAzAlt.Az_degree, fourthPointAzAlt.Alt_degree);
      console.log("Fourth Point Cartesian:", fourthPointCartesian.x, ',', fourthPointCartesian.y, ',', fourthPointCartesian.z);

      let MarkCircle_fourthPoint = this.AddMarkCircle(this.$stel, glLayer, 4, "Target Point");
      mm = MarkCircle_fourthPoint.pos;
      mm[0] = fourthPointCartesian.x;
      mm[1] = fourthPointCartesian.y;
      mm[2] = fourthPointCartesian.z;
      MarkCircle_fourthPoint.pos = mm;
      MarkCircle_fourthPoint.color = [1, 0, 0, 0.25];

      this.Circles.push(MarkCircle_fourthPoint);

      // 清空列表，准备下次计算
      this.CartesianList = [];
      this.MarkCircleNum = 0;
    },

    // 将角度转换为弧度
    degreesToRadians(degrees) {
      return degrees * Math.PI / 180;
    },

    // 将球坐标转换为笛卡尔坐标
    sphericalToCartesian(azimuth, altitude) {
      let az = this.degreesToRadians(azimuth);
      let alt = this.degreesToRadians(altitude);
      let x = Math.cos(alt) * Math.cos(az);
      let y = Math.cos(alt) * Math.sin(az);
      let z = Math.sin(alt);
      return { x: x, y: y, z: z };
    },

    // 计算旋转四元数
    computeQuaternion(from, to) {
      let w = from.x * to.x + from.y * to.y + from.z * to.z + 1;
      let x = from.y * to.z - from.z * to.y;
      let y = from.z * to.x - from.x * to.z;
      let z = from.x * to.y - from.y * to.x;

      let norm = Math.sqrt(w * w + x * x + y * y + z * z);
      return { w: w / norm, x: x / norm, y: y / norm, z: z / norm };
    },

    // 应用四元数旋转
    applyQuaternion(point, quat) {
      let x = quat.w * quat.w * point.x + 2 * quat.y * quat.w * point.z - 2 * quat.z * quat.w * point.y + quat.x * quat.x * point.x + 2 * quat.y * quat.x * point.y + 2 * quat.z * quat.x * point.z - quat.z * quat.z * point.x - quat.y * quat.y * point.x;
      let y = 2 * quat.x * quat.y * point.x + quat.y * quat.y * point.y + 2 * quat.z * quat.y * point.z + 2 * quat.w * quat.z * point.x - quat.z * quat.z * point.y + quat.w * quat.w * point.y - 2 * quat.x * quat.w * point.z - quat.x * quat.x * point.y;
      let z = 2 * quat.x * quat.z * point.x + 2 * quat.y * quat.z * point.y + quat.z * quat.z * point.z - 2 * quat.w * quat.y * point.x - quat.y * quat.y * point.z + 2 * quat.w * quat.x * point.y - quat.x * quat.x * point.z + quat.w * quat.w * point.z;
      return { x: x, y: y, z: z };
    },

    // 将笛卡尔坐标转换回球坐标
    cartesianToSpherical(cartesian) {
      let r = Math.sqrt(cartesian.x ** 2 + cartesian.y ** 2 + cartesian.z ** 2);
      let azimuth = Math.atan2(cartesian.y, cartesian.x);
      let altitude = Math.asin(cartesian.z / r);
      return {
        Az_degree: azimuth * 180 / Math.PI,
        Alt_degree: altitude * 180 / Math.PI
      };
    },

    SolveFovMark(RaDec) {
      console.log('RaDec[4]:', RaDec);

      // let rectangle = this.AddMarkRectangle(this.$stel, glLayer, RaDec);

      this.Circles.push(rectangle);

    },

    CalibratePolarAxis() {
      // 仅限制：自动极轴校准（主相机未绑定时禁止进入/执行）
      if (!this.$store.getters['device/isDeviceBound']('MainCamera')) {
        this.callShowMessageBox(
          this.$t('MainCameraNotBoundAction', { action: this.$t('Feature_AutoPolarAlignment') }),
          'error'
        );
        return;
      }
      this.$bus.$emit('CalibratePolarAxisMode');
      // this.$bus.$emit('AppSendMessage', 'Vue_Command', 'StartLoopCapture');
      this.nav = false;
    },

    RecalibratePolarAxis() {
      // 仅限制：自动极轴校准（主相机未绑定时禁止）
      if (!this.$store.getters['device/isDeviceBound']('MainCamera')) {
        this.callShowMessageBox(
          this.$t('MainCameraNotBoundAction', { action: this.$t('Feature_AutoPolarAlignment') }),
          'error'
        );
        return;
      }
      // 清空列表，准备下次计算
      this.CartesianList = [];
      this.MarkCircleNum = 0;
      this.RemoveAllCircles();
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ClearSloveResultList');
    },



    // 使用新的多边形方式绘制校准点
    drawCalibrationPointPolygon(coordinates, color, name) {
      console.log(`绘制校准点多边形: ${name}`, coordinates);

      try {
        // 验证输入参数
        if (!coordinates || !Array.isArray(coordinates)) {
          console.error('校准点坐标必须是数组');
          return;
        }

        if (coordinates.length !== 5) {
          console.error(`校准点坐标必须是5个点，当前有${coordinates.length}个点`);
          return;
        }

        // 验证每个坐标点
        for (let i = 0; i < coordinates.length; i++) {
          const coord = coordinates[i];
          if (!coord || typeof coord.ra === 'undefined' || typeof coord.dec === 'undefined') {
            console.error(`校准点坐标${i}格式错误：`, coord);
            return;
          }

          if (!this.isValidCoordinate(coord.ra) || !this.isValidCoordinate(coord.dec)) {
            console.error(`校准点坐标${i}值无效：`, coord);
            return;
          }
        }

        // 使用新的多边形绘制方法
        let calibrationPolygon = this.AddFieldOfViewPolygon(
          this.$stel,
          glLayer,
          coordinates,
          color,
          name
        );

        if (calibrationPolygon) {
          // 添加到校准点数组
          if (!this.calibrationCircles) {
            this.calibrationCircles = [];
          }
          this.calibrationCircles.push(calibrationPolygon);

          console.log(`校准点多边形创建成功: ${name}`, calibrationPolygon);
        } else {
          console.error(`校准点多边形创建失败: ${name}`);
        }

      } catch (error) {
        console.error('绘制校准点多边形时出错:', error);
      }
    },

    // 清除所有校准点
    clearCalibrationPoints() {
      console.log('清除所有校准点');

      // 确保数组存在
      if (!this.calibrationCircles) {
        this.calibrationCircles = [];
      }
      if (!this.adjustmentCircles) {
        this.adjustmentCircles = [];
      }

      // 清除校准点
      if (this.calibrationCircles.length > 0) {
        console.log(`清除 ${this.calibrationCircles.length} 个校准点`);
        this.calibrationCircles.forEach((circle, index) => {
          try {
            if (circle && glLayer) {
              glLayer.remove(circle);
              console.log(`成功清除校准点 ${index + 1}`);
            }
          } catch (error) {
            console.warn(`清除校准点 ${index + 1} 时出错:`, error);
          }
        });
        this.calibrationCircles = [];
      }

      // 清除调整点
      if (this.adjustmentCircles.length > 0) {
        console.log(`清除 ${this.adjustmentCircles.length} 个调整点`);
        this.adjustmentCircles.forEach((circle, index) => {
          try {
            if (circle && glLayer) {
              glLayer.remove(circle);
              console.log(`成功清除调整点 ${index + 1}`);
            }
          } catch (error) {
            console.warn(`清除调整点 ${index + 1} 时出错:`, error);
          }
        });
        this.adjustmentCircles = [];
      }

      // 清除上一次位置
      this.lastPosition = null;

      // 清除目标点
      if (this.targetPointCircle) {
        try {
          if (glLayer) {
            glLayer.remove(this.targetPointCircle);
            console.log('成功清除目标点');
          }
          this.targetPointCircle = null;
        } catch (error) {
          console.warn('清除目标点时出错:', error);
        }
      }

      if (this.fakePolarAxisCircle) {
        try {
          if (glLayer) {
            glLayer.remove(this.fakePolarAxisCircle);
            console.log('成功清除假极轴');
          }
        } catch (error) {
          console.warn('清除假极轴时出错:', error);
        }
        this.fakePolarAxisCircle = null;
      }

      console.log('所有校准相关元素清除完成');
    },


    // 使用新的多边形方式绘制调整点
    // 使用新的多边形方式绘制调整点（不在此处画圆）
    drawAdjustmentPointsPolygon(currentCoordinates, targetCoordinates, currentColor, targetColor, isTimerUpdate) {
      if (isTimerUpdate === undefined) isTimerUpdate = false;
      console.log('绘制调整点多边形', { currentCoordinates, targetCoordinates });

      try {
        // 1) 清除之前的调整点
        if (this.adjustmentCircles) {
          this.adjustmentCircles.forEach(obj => {
            try { glLayer.remove(obj); } catch (e) { console.warn('清除调整点时出错:', e); }
          });
        }
        this.adjustmentCircles = [];

        // 2) 绘制当前位置视场多边形
        if (currentCoordinates && Array.isArray(currentCoordinates) && currentCoordinates.length === 5) {
          console.log('绘制当前位置多边形');
          const currentPolygon = this.AddFieldOfViewPolygon(
            this.$stel,
            glLayer,
            currentCoordinates,
            currentColor,
            'Current'
          );
          if (currentPolygon) {
            this.adjustmentCircles.push(currentPolygon);
            console.log('当前位置多边形创建成功');
          } else {
            console.error('当前位置多边形创建失败');
          }
        } else {
          console.warn('当前位置坐标无效，跳过绘制');
        }

        // 3) 视角转向（可选；不创建圆）
        if (!isTimerUpdate && targetCoordinates && Array.isArray(targetCoordinates) && targetCoordinates.length === 5) {
          try {
            const centerRa = targetCoordinates.reduce((s, c) => s + c.ra, 0) / targetCoordinates.length;
            const centerDec = targetCoordinates.reduce((s, c) => s + c.dec, 0) / targetCoordinates.length;
            console.log(`视角转向目标: RA=${centerRa}, DEC=${centerDec}`);

            // 用临时对象只做指向，不加入 layer
            const targetObjConfig = {
              id: 'temp_target_' + Date.now(),
              model_data: {},
              names: ['Target Position'],
              types: ['Temporary'],
              model: 'temporary'
            };
            const targetObj = this.$stel.createObj('circle', targetObjConfig);
            let mm = targetObj.pos;
            this.vec3_from_sphe(centerRa, centerDec, mm);
            targetObj.pos = mm;
            if (typeof targetObj.update === 'function') targetObj.update();

            this.$stel.pointAndLock(targetObj, 1.0);
            console.log('视角转向完成');

            // 清理临时对象（未加入 layer，无需 remove）
            setTimeout(() => { try { /* no-op */ } catch (_) { } }, 0);
          } catch (error) {
            console.error('视角转向出错:', error);
          }
        }

      } catch (error) {
        console.error('绘制调整点多边形时出错:', error);
      }
    },


    // 绘制目标点圆形（坐标：RA/Dec，单位：度）
    drawTargetPointCircle(targetRa, targetDec, color, name, text, clearlast) {
      if (clearlast === undefined) clearlast = true; // 内部设置默认值
      console.log('绘制目标点圆形', { targetRa, targetDec, color });

      try {
        // 1) 校验
        if (!this.isValidCoordinate(targetRa) || !this.isValidCoordinate(targetDec)) {
          console.error(text + '坐标无效:', { targetRa, targetDec });
          return;
        }

        // 2) 清除之前的目标点
        if (this.targetPointCircle && clearlast) {
          try {
            if (glLayer) {
              glLayer.remove(this.targetPointCircle);
              console.log('成功清除之前的' + name);
            }
          } catch (error) {
            console.warn('清除之前的' + text + '时出错:', error);
          }
        }

        // 3) 创建圆对象
        const circle = this.AddMarkCircle(this.$stel, glLayer, 4, name); // frame=4：赤道系
        if (!circle) {
          console.error(text + '圆形创建失败');
          return;
        }

        // 4) 位置（RA/Dec 度 → 3D 单位向量）
        const mm = circle.pos;
        this.vec3_from_sphe(targetRa, targetDec, mm);
        circle.pos = mm;

        // 5) 样式
        if (color) {
          const rgb = this.hexToRgb(color.stroke || color.fill || '#FF8C00');
          const alpha = (color.fillOpacity || 0.3);
          const borderAlpha = (color.strokeOpacity || 1.0);
          circle.color = [rgb.r / 255, rgb.g / 255, rgb.b / 255, alpha];
          circle.border_color = [rgb.r / 255, rgb.g / 255, rgb.b / 255, borderAlpha];
        } else {
          circle.color = [1, 0.55, 0, 0.3];
          circle.border_color = [1, 0.55, 0, 1];
        }
        const size = 0.02;
        circle.size = [size, size];

        // 6) 更新 & 保存引用
        if (typeof circle.update === 'function') circle.update();
        this.targetPointCircle = circle;

        console.log(text + '圆形创建成功', circle);
      } catch (error) {
        console.error('绘制' + text + '圆形时出错:', error);
      }
    },


    // 绘制假极轴圆形
    DrawFakePolarAxisCircle(targetRa, targetDec, color, name, text) {
      console.log('绘制目标点圆形', { targetRa, targetDec, color });

      try {
        // 验证输入参数
        if (!this.isValidCoordinate(targetRa) || !this.isValidCoordinate(targetDec)) {
          console.error(text + '坐标无效:', { targetRa, targetDec });
          return;
        }

        // 清除之前的目标点
        if (this.fakePolarAxisCircle) {
          try {
            if (glLayer) {
              glLayer.remove(this.fakePolarAxisCircle);
              console.log('成功清除之前的' + name);
            }
          } catch (error) {
            console.warn('清除之前的' + text + '时出错:', error);
          }
        }

        // 创建目标点圆形
        let targetCircle = this.AddMarkCircle(this.$stel, glLayer, 4, name);
        if (targetCircle) {
          // 设置目标点位置
          let targetMm = targetCircle.pos;
          this.vec3_from_sphe(targetRa, targetDec, targetMm);
          targetCircle.pos = targetMm;

          // 设置目标点颜色和样式
          if (color) {
            // 将十六进制颜色转换为RGB数组
            const rgb = this.hexToRgb(color.stroke || color.fill || '#FF8C00');
            const alpha = (color.fillOpacity || 0.3);
            const borderAlpha = (color.strokeOpacity || 1.0);

            targetCircle.color = [rgb.r / 255, rgb.g / 255, rgb.b / 255, alpha];
            targetCircle.border_color = [rgb.r / 255, rgb.g / 255, rgb.b / 255, borderAlpha];
          } else {
            // 默认橙色
            targetCircle.color = [1, 0.55, 0, 0.3];  // 橙色，半透明
            targetCircle.border_color = [1, 0.55, 0, 1];  // 橙色边框
          }

          // 设置目标点大小
          const targetSize = 0.02; // 固定小尺寸
          targetCircle.size = [targetSize, targetSize];

          // 保存目标点引用，用于后续清除
          this.fakePolarAxisCircle = targetCircle;

          console.log(text + '圆形创建成功', targetCircle);
        } else {
          console.error(text + '圆形创建失败');
        }

      } catch (error) {
        console.error('绘制' + text + '圆形时出错:', error);
      }
    },

    ShowConfirmDialog(Title, Text, ToDo) {
      // window.location.reload();
      this.nav = false;
      this.$bus.$emit('ShowConfirmDialog', Title, Text, ToDo);
    },

    decrement(item) {
      console.log('decrement:', item.value);
      if (item.value > item.inputMin) {
        item.value -= item.inputStep;
      }
    },

    increment(item) {
      console.log('increment:', item.value);
      if (item.value < item.inputMax) {
        item.value += item.inputStep;
      }
    },

    PolarAxisMode(bool) {
      this.isPolarAxisMode = bool;
    },

    handleGuiderCanvasClick(event) {
      const rect = this.getGuiderCanvasDisplayRect();
      const x = event.clientX - rect.left; // 点击坐标X
      const y = event.clientY - rect.top;  // 点击坐标Y
      console.log(`Clicked at: (${x}, ${y})`);
      const CanvasWidth = Math.max(1, rect.width);
      const CanvasHeight = Math.max(1, rect.height);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderCanvasClick:' + CanvasWidth + ':' + CanvasHeight + ':' + x + ':' + y);
    },
    connectDriver() {
      this.isConnecting = true;
      // this.isOpenDevicePage = false;
      this.startLoading();
      const DeviceType = this.CurrentDriverType;
      for (const device of this.devices) {
        if (device.driverType === DeviceType && device.isConnected == false) {
          let DriverName = device.driverName;
          if (!DriverName || DriverName === '') {
            this.SendConsoleLogMsg('No driver selected', 'warning');
            this.isConnecting = false;
            this.stopLoading();
            return;
          }

          // 防护：若 driverName 被污染成 SDK/INDI 占位符，拒绝连接并提示用户重新选择驱动
          const upperName = String(DriverName).toUpperCase();
          if (upperName === 'SDK' || upperName === 'INDI') {
            this.SendConsoleLogMsg(`Invalid driver name "${DriverName}". Please select a valid driver from the list.`, 'error');
            this.callShowMessageBox(`Invalid driver name "${DriverName}". Please reselect driver.`, 'error');
            this.isConnecting = false;
            this.stopLoading();
            return;
          }

          // 根据 UI 当前选择的连接模式，显式携带 :SDK，避免后端仍处于 INDI 默认分支
          const mode = String(device.connectionMode || this.selectedConnectionMode || 'INDI').toUpperCase();
          const msg = (mode === 'SDK')
            ? `ConnectDriver:${DriverName}:${DeviceType}:SDK`
            : `ConnectDriver:${DriverName}:${DeviceType}`;
          this.$bus.$emit('AppSendMessage', 'Vue_Command', msg);
          this.SendConsoleLogMsg('Start Connecting driver:' + DeviceType + ' ' + DriverName, 'info');
          return;
        }
      }
    },
    connectDriverSuccess(devicetype) {
      console.log('connectDriverSuccess:', devicetype);
      this.SendConsoleLogMsg("connectDriverSuccess:" + devicetype, 'info');
      this.isConnecting = false;
      if (this.drawer_2 == true) {
        this.drawer_2 = false
      }

      this.stopLoading();
    },
    connectDriverFailed(message, deviceType = '') {
      console.log('connectDriverFailed:', message, deviceType);
      this.SendConsoleLogMsg("connectDriverFailed:" + (deviceType ? deviceType + ':' : '') + message, 'error');
      
      // 构建友好的错误提示
      let errorMsg = message;
      if (deviceType) {
        // 尝试翻译设备类型
        const deviceTypeName = this.$t(deviceType) !== deviceType ? this.$t(deviceType) : deviceType;
        // 尝试翻译错误消息
        const translatedMsg = this.$t(message) !== message ? this.$t(message) : message;
        errorMsg = `${deviceTypeName}: ${translatedMsg}`;
      } else {
        // 尝试翻译错误消息
        errorMsg = this.$t(message) !== message ? this.$t(message) : message;
      }
      
      // 显示错误提示框
      this.callShowMessageBox(errorMsg, 'error');
      
      // 关闭连接状态和进度条
      this.isConnecting = false;
      this.stopLoading();
    },
    disconnectDriver() {
      const DeviceType = this.CurrentDriverType;
      for (const device of this.devices) {
        if (device.driverType === DeviceType && device.isConnected) {
          this.$bus.$emit('AppSendMessage', 'Vue_Command', 'DisconnectDevice:' + device.device + ":" + DeviceType);
        }
      }
    },
    disconnectDriversuccess(devicetype) {
      console.log('disconnectDevicesuccess:', devicetype);
      this.drawer_2 = false
      if (devicetype == "all") {
        this.sendMessage('Vue_Command', 'disconnectAllDevice');
        this.SendConsoleLogMsg('Disconnect All Device', 'info');
        this.haveDeviceConnect = false;
        this.$bus.$emit('MainCameraConnected', 0);
        this.$bus.$emit('MountConnected', 0);
        this.$bus.$emit('CFWConnected', 0);
        this.$bus.$emit('GuiderConnected', 0);
        this.clearDeviceList();
        this.$bus.$emit('deleteDeviceTypeAllocationList', 'all');
        return;
      };

      for (const device of this.devices) {
        if (device.driverType === devicetype && device.isConnected) {
          device.isConnected = false;
          device.isget = false;
          device.device = device.driverName;
          // 防护：如果 driverName 是 "SDK" 或 "INDI"，清空它，避免断开后仍然保留无效值
          const upperName = String(device.driverName || '').toUpperCase();
          if (upperName === 'SDK' || upperName === 'INDI') {
            console.warn(`disconnectDriversuccess: Clearing invalid driverName "${device.driverName}" for ${devicetype}`);
            device.driverName = '';
          }
        }
      }
      for (const device of this.ToBeConnectDevice) {
        if (device.driverType === devicetype) {
          device.isConnected = false;
          device.isget = false;
          device.device = device.driverName;
        }
      }

      this.$bus.$emit('deleteDeviceTypeAllocationList', devicetype);
      if (devicetype == "MainCamera") {
        this.$bus.$emit('MainCameraConnected', 0);
      } else if (devicetype == "Mount") {
        this.$bus.$emit('MountConnected', 0);
      } else if (devicetype == "CFW") {
        this.$bus.$emit('CFWConnected', 0);
      } else if (devicetype == "Guider") {
        this.$bus.$emit('GuiderConnected', 0);
      }
      
      // 恢复选中驱动：断开后保持驱动选择不变，方便用户重新连接
      if (this.CurrentDriverType === devicetype) {
        this.updateSelectedDriver(devicetype);
      }
    },

    disconnectDriverFail(devicetype) {
      console.log('disconnectDeviceFail:', devicetype);
      this.drawer_2 = false
      if (devicetype == "all") {
        this.sendMessage('Vue_Command', 'disconnectAllDevice');
        this.SendConsoleLogMsg('Disconnect All Device', 'info');
        this.haveDeviceConnect = false;
        this.$bus.$emit('MainCameraConnected', 0);
        this.$bus.$emit('MountConnected', 0);
        this.$bus.$emit('CFWConnected', 0);
        this.$bus.$emit('GuiderConnected', 0);
        this.clearDeviceList();
        this.$bus.$emit('deleteDeviceTypeAllocationList', 'all');
        return;
      };

      for (const device of this.devices) {
        if (device.driverType === devicetype && device.isConnected) {
          device.isConnected = false;
          device.isget = false;
          device.device = device.driverName;
          // 防护：如果 driverName 是 "SDK" 或 "INDI"，清空它，避免断开后仍然保留无效值
          const upperName = String(device.driverName || '').toUpperCase();
          if (upperName === 'SDK' || upperName === 'INDI') {
            console.warn(`disconnectDriverFail: Clearing invalid driverName "${device.driverName}" for ${devicetype}`);
            device.driverName = '';
          }
        }
      }
      for (const device of this.ToBeConnectDevice) {
        if (device.driverType === devicetype) {
          device.isConnected = false;
          device.isget = false;
          device.device = device.driverName;
        }
      }

      this.$bus.$emit('deleteDeviceTypeAllocationList', devicetype);
      if (devicetype == "MainCamera") {
        this.$bus.$emit('MainCameraConnected', 0);
      } else if (devicetype == "Mount") {
        this.$bus.$emit('MountConnected', 0);
      } else if (devicetype == "CFW") {
        this.$bus.$emit('CFWConnected', 0);
      } else if (devicetype == "Guider") {
        this.$bus.$emit('GuiderConnected', 0);
      }
      
      // 恢复选中驱动：断开后保持驱动选择不变，方便用户重新连接
      if (this.CurrentDriverType === devicetype) {
        this.updateSelectedDriver(devicetype);
      }
    },
    // 兼容处理 SelectedDriverList（旧/新协议）
    // - 旧：SelectedDriverList:Desc1:Driver1:Desc2:Driver2:...
    // - 新：SelectedDriverList:Desc1:Driver1:SDKSupport1:Mode1:Desc2:Driver2:SDKSupport2:Mode2:...
    loadSelectedDriverListFromParts(parts) {
      const payload = parts.slice(1);
      if (!payload.length) return;

      const isNewFormat = (payload.length % 4 === 0);
      const step = isNewFormat ? 4 : 2;

      for (let i = 0; i < payload.length; i += step) {
        const deviceType = (payload[i] || '').trim();
        const driverName = (payload[i + 1] || '').trim();
        const supportSDK = isNewFormat ? String(payload[i + 2]).trim().toLowerCase() === 'true' : undefined;
        const modeRaw = isNewFormat ? String(payload[i + 3] || '').trim() : undefined;
        const connectionMode = (modeRaw && modeRaw.toUpperCase() === 'SDK') ? 'SDK' : (modeRaw ? 'INDI' : undefined);

        if (!deviceType) continue;

        // 防护：过滤掉 SDK/INDI 占位符，避免将连接模式误当作驱动名称
        const upperName = String(driverName).toUpperCase();
        if (upperName === 'SDK' || upperName === 'INDI') {
          console.warn(`loadSelectedDriverListFromParts: Skipping invalid driver name "${driverName}" for ${deviceType}`);
          continue;
        }

        // 写入后端下发缓存（优先级最高）
        if (typeof supportSDK === 'boolean' && driverName) {
          if (!this.sdkSupportCache[deviceType]) this.sdkSupportCache[deviceType] = {};
          this.sdkSupportCache[deviceType][driverName] = supportSDK;
        }

        // 写回 devices
        const dev = this.devices.find(d => d.driverType === deviceType);
        if (!dev) continue;

        // 只有在 driverName 有效时才更新（避免空字符串或无效值覆盖已有的驱动名称）
        if (driverName && driverName.trim() !== '') {
          if (!dev.isConnected) {
            dev.device = driverName;
            dev.driverName = driverName;
          } else {
            // 已连接时也同步 driverName（用于 UI/缓存一致性）
            dev.driverName = driverName;
          }
        }
        // 如果 driverName 为空，保持 dev.driverName 不变，避免清空已有的驱动选择

        if (typeof supportSDK === 'boolean') dev.supportSDK = supportSDK;
        if (connectionMode) dev.connectionMode = connectionMode;
      }

      // 如果当前正在查看某个设备页，刷新 UI 显示（选中驱动/模式）
      if (this.CurrentDriverType) {
        this.updateSelectedDriver(this.CurrentDriverType);
      }
    },

    // 由固定表格/规则判定某个(设备类型,驱动)是否支持 SDK
    // 分别匹配 driverName (value) 和 driverLabel (label)，二者有一者匹配即可
    isDriverSupportSDK(deviceType, driverName, driverLabel = '') {
      if (!deviceType || !driverName) return false;

      const rules = FIXED_SDK_SUPPORT_RULES[deviceType] || [];
      if (rules.length === 0) return false;
      
      // 分别检查 driverName 和 driverLabel
      const nameMatch = rules.some(r => r.test(driverName));
      const labelMatch = driverLabel ? rules.some(r => r.test(driverLabel)) : false;
      
      return nameMatch || labelMatch;
    },

    // 驱动切换/状态恢复后：刷新 supportSDK + selectedConnectionMode，并在“不支持 SDK”时强制回到 INDI
    refreshSdkSupportAndModeForDevice(deviceType, driverName) {
      const driverItem = (this.drivers || []).find(d => d.value === driverName);
      const driverLabel = driverItem ? driverItem.label : '';
      const supportSDK = this.isDriverSupportSDK(deviceType, driverName, driverLabel);

      const dev = this.devices.find(d => d.driverType === deviceType);
      if (!dev) return;
      dev.supportSDK = !!supportSDK;

      // UI 当前设备：同步显示
      if (this.CurrentDriverType === deviceType) {
        const nextMode = dev.connectionMode || 'INDI';
        this.selectedConnectionMode = nextMode;
      }

      // 如果当前驱动不支持 SDK，则强制切回 INDI，避免后端仍处于 SDK 模式导致连接失败
      if (!supportSDK) {
        const prev = dev.connectionMode || 'INDI';
        if (prev !== 'INDI') {
          dev.connectionMode = 'INDI';
        }
        if (this.CurrentDriverType === deviceType) {
          this.selectedConnectionMode = 'INDI';
        }
        // 等 ConfirmIndiDriver 先被后端处理，再发 SetConnectionMode，降低竞态
        setTimeout(() => {
          this.requestSetConnectionMode(deviceType, 'INDI', { silent: true });
        }, 50);
      }
    },

    requestSetConnectionMode(deviceType, mode, opts = {}) {
      const nextMode = (String(mode || '').toUpperCase() === 'SDK') ? 'SDK' : 'INDI';
      const dev = this.devices.find(d => d.driverType === deviceType);
      if (!dev) return;

      // 已连接：禁止切换连接模式（必须先断开）
      const prev = dev.connectionMode || 'INDI';
      if (dev.isConnected && prev !== nextMode) {
        // 回滚 UI（保持原模式）
        dev.connectionMode = prev;
        if (this.CurrentDriverType === deviceType) this.selectedConnectionMode = prev;
        if (!opts.silent) this.callShowMessageBox(this.$t('DeviceConnectedLockModeChangeForbidden'), 'warning');
        return;
      }

      // 规则：主相机与导星镜若使用同一驱动，则必须同一连接模式；且一旦存在 SDK 连接则禁止切换到 INDI
      const isMainOrGuider = (deviceType === 'MainCamera' || deviceType === 'Guider');
      if (isMainOrGuider && this.isMainGuiderSameDriver()) {
        if (nextMode === 'INDI' && this.anySdkConnectedInMainGuider()) {
          // 禁止切回 INDI：回滚到 SDK 并提示
          dev.connectionMode = 'SDK';
          if (this.CurrentDriverType === deviceType) this.selectedConnectionMode = 'SDK';
          if (!opts.silent) this.callShowMessageBox(this.$t('SDKConnectedLockIndiForbidden'), 'warning');
          return;
        }
        if (nextMode === 'SDK' && this.anyIndiConnectedInMainGuider()) {
          // 禁止切到 SDK：回滚到 INDI 并提示
          dev.connectionMode = 'INDI';
          if (this.CurrentDriverType === deviceType) this.selectedConnectionMode = 'INDI';
          if (!opts.silent) this.callShowMessageBox(this.$t('INDIConnectedLockSdkForbidden'), 'warning');
          return;
        }

        // 同步另一台相机的模式（避免 SDK/INDI 混用）
        if (!opts.fromPeer) {
          const peerType = (deviceType === 'MainCamera') ? 'Guider' : 'MainCamera';
          this.requestSetConnectionMode(peerType, nextMode, { silent: true, fromPeer: true });
        }
      }

      // 只有在“该驱动支持 SDK 或目标模式为 INDI”时才允许发（INDI 永远安全）
      if (nextMode === 'SDK' && !dev.supportSDK) {
        if (!opts.silent) this.callShowMessageBox('Device does not support SDK mode', 'error');
        // 回滚 UI
        if (this.CurrentDriverType === deviceType) this.selectedConnectionMode = 'INDI';
        dev.connectionMode = 'INDI';
        return;
      }

      if (prev === nextMode) return;

      this.pendingConnectionModeByDevice[deviceType] = { prev, next: nextMode };
      this.isSettingConnectionMode = true;

      // 乐观更新 UI
      dev.connectionMode = nextMode;
      if (this.CurrentDriverType === deviceType) this.selectedConnectionMode = nextMode;

      this.$bus.$emit('AppSendMessage', 'Vue_Command', `SetConnectionMode:${deviceType}:${nextMode}`);
      if (!opts.silent) this.SendConsoleLogMsg(`SetConnectionMode:${deviceType}:${nextMode}`, 'info');
    },

    onConnectionModeChange() {
      // v-select 的 @change 传入 value，这里直接读取 selectedConnectionMode，避免 Vuetify 版本差异
      const deviceType = this.CurrentDriverType;
      this.requestSetConnectionMode(deviceType, this.selectedConnectionMode);
    },

    onSetConnectionModeSuccess(deviceType, mode) {
      const dev = this.devices.find(d => d.driverType === deviceType);
      if (dev) dev.connectionMode = mode;
      if (this.CurrentDriverType === deviceType) this.selectedConnectionMode = mode;
      delete this.pendingConnectionModeByDevice[deviceType];
      this.isSettingConnectionMode = Object.keys(this.pendingConnectionModeByDevice || {}).length > 0;
      this.SendConsoleLogMsg(`SetConnectionModeSuccess:${deviceType}:${mode}`, 'info');

      // 成功后再次确保主相机/导星镜一致（防止并发/竞态导致短暂不一致）
      if (deviceType === 'MainCamera' || deviceType === 'Guider') {
        this.ensureMainGuiderModeConsistency(deviceType);
      }
    },

    onSetConnectionModeFailed(deviceType, errorMsg) {
      const pending = this.pendingConnectionModeByDevice[deviceType];
      const dev = this.devices.find(d => d.driverType === deviceType);

      // 回滚到之前模式：优先使用 pending.prev，如果没有则回滚到 INDI（因为SDK模式失败了）
      if (pending && dev) {
        // 如果尝试设置SDK失败，应该回滚到INDI
        const rollbackMode = pending.next === 'SDK' ? 'INDI' : (pending.prev || 'INDI');
        dev.connectionMode = rollbackMode;
        if (this.CurrentDriverType === deviceType) {
          this.selectedConnectionMode = rollbackMode;
        }
      } else if (dev) {
        // 如果没有pending信息，强制回滚到INDI（因为SDK设置失败了）
        dev.connectionMode = 'INDI';
        if (this.CurrentDriverType === deviceType) {
          this.selectedConnectionMode = 'INDI';
        }
      }

      delete this.pendingConnectionModeByDevice[deviceType];
      this.isSettingConnectionMode = Object.keys(this.pendingConnectionModeByDevice || {}).length > 0;
      const translated = (this.$t(errorMsg) !== errorMsg) ? this.$t(errorMsg) : errorMsg;
      this.callShowMessageBox(`SetConnectionMode failed: ${translated}`, 'error');

      // 失败后也尝试恢复一致性（尤其是主相机/导星镜同驱动时）
      if (deviceType === 'MainCamera' || deviceType === 'Guider') {
        this.ensureMainGuiderModeConsistency(deviceType);
      }
    },
    loadBindDeviceList(deviceObject) {
      console.log('loadBindDeviceList:', deviceObject);
      this.$bus.$emit('loadBindDeviceList', deviceObject);

    },
    loadBindDeviceTypeList(deviceTypeObject) {
      console.log('loadBindDeviceTypeList:', deviceTypeObject);
      this.$bus.$emit('loadBindDeviceTypeList', deviceTypeObject);
      deviceTypeObject.forEach(deviceType => {
        const { Type, DeviceName, DriverName, isbind } = deviceType;
        // 刷新/恢复阶段常会触发此列表回传，默认静默更新，避免频繁弹窗
        this.updateDevicesConnect(Type, DeviceName, DriverName, isbind, { silent: true });
      });
    },
    updateSelectedDriver(driverType) {

      this.selectedDriver = null;
      this.devices.forEach(device => {
        if (device.driverType === driverType) {
          // 防护：过滤掉 SDK/INDI 占位符，避免将连接模式误当作驱动名称
          const driverName = device.driverName || '';
          const upperName = String(driverName).toUpperCase();
          if (driverName && upperName !== 'SDK' && upperName !== 'INDI') {
            this.selectedDriver = driverName;
          }
        }
      });
      console.log('Current drivers:', this.selectedDriver);

      // 同步"连接模式"显示，并根据驱动能力刷新 supportSDK
      const dev = this.devices.find(d => d.driverType === driverType);
      if (dev) {
        this.selectedConnectionMode = dev.connectionMode || 'INDI';
        // 防护：只有在 driverName 有效时才刷新
        const driverName = dev.driverName || '';
        const upperName = String(driverName).toUpperCase();
        if (driverName && upperName !== 'SDK' && upperName !== 'INDI') {
          this.refreshSdkSupportAndModeForDevice(driverType, driverName);
        } else {
          dev.supportSDK = false;
          dev.connectionMode = 'INDI';
          this.selectedConnectionMode = 'INDI';
        }
      }

      // 打开设备页/刷新 UI 时，若主相机与导星镜同驱动，确保模式一致（并处理 SDK 连接锁定）
      if (driverType === 'MainCamera' || driverType === 'Guider') {
        this.ensureMainGuiderModeConsistency(driverType);
      }
    },
    startLoading() {
      this.loadingDeviceSelection = true;
    },
    stopLoading() {
      this.loadingDeviceSelection = false;
    },
    deleteDeviceAllocationList(deviceName) {
      console.log('deleteDeviceAllocationList:', deviceName);
      this.$bus.$emit('deleteDeviceAllocationList', deviceName);
    },
    UnBindingDevice(type, name) {
      // 解绑只改变“绑定状态”，不应污染/清空 driverName（尤其是 SDK 模式下会导致后续逻辑错乱）
      const dev = (this.devices || []).find(d => d && d.driverType === type);
      const driverName = dev ? dev.driverName : '';
      console.log('UnBindingDevice:', type, name, driverName);
      this.updateDevicesConnect(type, '', driverName, false, { silent: true });
    },

    displayErrorImage() {
      console.error("image is error, load errorImage.svg");
      const canvas = document.getElementById('mainCamera-canvas');
      const ctx = canvas.getContext('2d');
      const image = new Image();

      image.onload = () => {
        // 获取设备像素比
        const devicePixelRatio = window.devicePixelRatio || 1;

        // 调整画布尺寸以适应高清显示
        canvas.width = image.width * devicePixelRatio;
        canvas.height = image.height * devicePixelRatio;
        ctx.scale(devicePixelRatio, devicePixelRatio); // 缩放ctx以适应高清画布

        // 绘制图像
        ctx.drawImage(image, 0, 0);
      };

      image.onerror = () => {
        console.error("Failed to load image from " + image.src);
        // 可以在这里添加备用图像或其他错误处理逻辑
      };

      // 确保ErrorImage是有效的URL
      image.src = ErrorImage; // 请替换为实际的图像路径
    },
    handleError(message, location, error = null) {
      const errorMsg = error ? `${message} at ${location}: ${error}` : `${message} at ${location}`;
      console.error(errorMsg);
      this.SendConsoleLogMsg(errorMsg, 'error');
      this.displayErrorImage(); // 显示错误图像
    },
    showSelectdisconnectDriver(drivername) {
      this.showDisconnectDialog = true;
      this.currentDisconnectDriverName = drivername;
    },
    confirmDisconnect() {
      this.sendMessage('Vue_Command', 'disconnectSelectDriver:' + this.currentDisconnectDriverName);
      this.showDisconnectDialog = false;
    },

    // 主画布点击事件
    handleMainCanvasClick(event) {
      // this.SendConsoleLogMsg('触发鼠标点击事件:', 'info');
      if (!this.enableMainCanvasClick || this.isDragging || this.drawImgData == null) return; // 如果画布不可点击，则不处理点击事件
      // console.log('触发鼠标点击事件:', event);
      const canvas = this.$refs.mainCanvas;
      if (!canvas) return; // 确保 canvas 元素存在
      const rect = canvas.getBoundingClientRect();// 获取 canvas 元素的边界矩形
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      console.log('Mouse clicked at:', x, y);
      if (!this.isFocusLoopShooting) {
        // 期望中心（画布坐标 → 传感器像素坐标）
        const desiredCenterX = (x / window.innerWidth * this.visibleWidth) + this.visibleX - this.visibleWidth / 2;
        const desiredCenterY = (y / window.innerHeight * this.visibleHeight) + this.visibleY - this.visibleHeight / 2;

        // ROI 边长（像素，偶数化），来源于固定 RedBoxSideLength
        let side = this.RedBoxSideLength / this.cameraBin;
        side = Math.max(2, Math.floor(side));
        if (side % 2 !== 0) side += 1; // 强制偶数

        // 将 ROI 左上角按中心反推，并约束在图像范围内
        const half = side / 2;
        // ROI 边界约束以当前渲染底图尺寸为准（瓦片模式下 tileGPM / bufferCanvas）
        const imgW =
          (this.bufferCanvas && this.bufferCanvas.width) ? this.bufferCanvas.width :
            (this.tileGPM && this.tileGPM.imageWidth) ? Number(this.tileGPM.imageWidth) :
              Number(this.mainCameraSizeX);
        const imgH =
          (this.bufferCanvas && this.bufferCanvas.height) ? this.bufferCanvas.height :
            (this.tileGPM && this.tileGPM.imageHeight) ? Number(this.tileGPM.imageHeight) :
              Number(this.mainCameraSizeY);

        let roiX = desiredCenterX - half;
        let roiY = desiredCenterY - half;

        // 边界约束
        const maxX = Math.max(0, imgW - side);
        const maxY = Math.max(0, imgH - side);
        roiX = Math.min(Math.max(0, roiX), maxX);
        roiY = Math.min(Math.max(0, roiY), maxY);

        // 偶数对齐位置
        roiX = Math.floor(roiX);
        roiY = Math.floor(roiY);
        if (roiX % 2 !== 0) roiX += 1;
        if (roiY % 2 !== 0) roiY += 1;

        this.ROI_x = roiX;
        this.ROI_y = roiY;
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'sendRedBoxState:' + this.RedBoxSideLength + ':' + this.ROI_x + ':' + this.ROI_y);
      } else {
        this.selectStarX = ((x / window.innerWidth * this.visibleWidth) + this.visibleX - this.visibleWidth / 2 - this.ROI_x) * this.cameraBin; // 计算选择位置的x坐标
        this.selectStarY = ((y / window.innerHeight * this.visibleHeight) + this.visibleY - this.visibleHeight / 2 - this.ROI_y) * this.cameraBin; // 计算选择位置的y坐标

        if (this.selectStarX >= 0 && this.selectStarX < this.RedBoxSideLength &&
          this.selectStarY >= 0 && this.selectStarY < this.RedBoxSideLength) {
          this.SendConsoleLogMsg('Select Star is in ROI', 'info');
        } else {
          this.SendConsoleLogMsg('Select Star is not in ROI', 'error');
          this.selectStarX = -1;
          this.selectStarY = -1;
        }
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'sendSelectStars:' + this.selectStarX + ':' + this.selectStarY);
      }
      this.drawImageData();
    },

    // 主画布拖动
    handleMouseDown(event) {
      // this.SendConsoleLogMsg('触发鼠标按下事件:', 'info');
      if (this.isDragging || this.drawImgData == null) return;
      this.isDragging = true;
      this.startX = event.clientX;
      this.startY = event.clientY;
      this.currentX = event.clientX;
      this.currentY = event.clientY;

      // 关键：鼠标拖出 canvas 或窗口后，canvas 可能收不到 mouseup，导致 isDragging 永远为 true（“粘鼠标”）
      // 因此拖动期间把 mousemove/mouseup 绑定到 document，并用 window blur 兜底结束拖动
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
      window.addEventListener('blur', this.handleMouseUp);

      // 设置一个定时器，每100ms执行一次鼠标移动的逻辑
      this.moveIntervalId = setInterval(() => {
        if (!this.isDragging) return;

        const dx = this.startX - this.currentX;
        const dy = this.startY - this.currentY;
        if (isNaN(dx) || isNaN(dy)) {
          return;
        }
        let newVisibleX = this.visibleX + dx / window.innerWidth * this.visibleWidth;
        let newVisibleY = this.visibleY + dy / window.innerHeight * this.visibleHeight;
        if (newVisibleX < 0) {
          newVisibleX = 0;
        }
        if (newVisibleY < 0) {
          newVisibleY = 0;
        }
        // 关键修复：拖动边界应以“当前渲染底图”的尺寸为准（瓦片模式下是 tileGPM / bufferCanvas），
        // 避免 mainCameraSizeX/Y 与瓦片基准尺寸不一致导致无法拖动/被钳制回原位。
        const boundW =
          (this.bufferCanvas && this.bufferCanvas.width) ? this.bufferCanvas.width :
            (this.tileGPM && this.tileGPM.imageWidth) ? Number(this.tileGPM.imageWidth) :
              Number(this.mainCameraSizeX);
        const boundH =
          (this.bufferCanvas && this.bufferCanvas.height) ? this.bufferCanvas.height :
            (this.tileGPM && this.tileGPM.imageHeight) ? Number(this.tileGPM.imageHeight) :
              Number(this.mainCameraSizeY);
        if (Number.isFinite(boundW) && boundW > 0 && newVisibleX > boundW) {
          newVisibleX = boundW;
        }
        if (Number.isFinite(boundH) && boundH > 0 && newVisibleY > boundH) {
          newVisibleY = boundH;
        }

        this.visibleX = newVisibleX;
        this.visibleY = newVisibleY;

        this.startX = this.currentX;
        this.startY = this.currentY;
        this.drawImageData();
        // 触发瓦片重新加载
        this.onViewportChange();
        // this.SendConsoleLogMsg('拖动事件,拖动距离:' + dx + ',' + dy, 'info');
      }, 100);
    },
    handleMouseMove(event) {
      // this.SendConsoleLogMsg('触发鼠标移动事件:', 'info');
      if (!this.isDragging) return;
      this.currentX = event.clientX;
      this.currentY = event.clientY;
    },
    handleMouseUp(event) {
      // this.SendConsoleLogMsg('触发鼠标抬起事件:', 'info');
      this.isDragging = false;

      // 清除定时器
      clearInterval(this.moveIntervalId);
      this.moveIntervalId = null;

      // 清理全局监听，避免残留导致状态错乱
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('mouseup', this.handleMouseUp);
      window.removeEventListener('blur', this.handleMouseUp);
    },
    handleWheel(event) {
      // this.SendConsoleLogMsg('触发鼠标滚轮事件:', 'info');
      if (this.drawImgData == null) return;
      // 缩放范围：
      // - 0.1 ~ 1.0：原有 10 档（同时影响瓦片层级映射）
      // - 0.01 ~ 0.1：新增 10 档（仅做缩放，不再细分瓦片层级）
      const MIN_SCALE = 0.01;
      const TILE_LEVEL_MIN_SCALE = 0.1;
      const MAX_SCALE = 1.0;
      const EPS = 1e-6;

      const zoomOut = event.deltaY > 0; // deltaY>0 视为缩小（scale 变大）
      let newScale = this.scale;
      if (zoomOut) {
        if (newScale < TILE_LEVEL_MIN_SCALE - EPS) {
          newScale = Math.min(TILE_LEVEL_MIN_SCALE, Math.round((newScale + 0.01) * 100) / 100);
        } else {
          newScale = Math.min(MAX_SCALE, Math.round((newScale + 0.1) * 10) / 10);
        }
      } else {
        if (newScale > TILE_LEVEL_MIN_SCALE + EPS) {
          newScale = Math.max(TILE_LEVEL_MIN_SCALE, Math.round((newScale - 0.1) * 10) / 10);
        } else {
          newScale = Math.max(MIN_SCALE, Math.round((newScale - 0.01) * 100) / 100);
        }
      }
      // 最终钳制，避免浮点越界
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

      // 如果已经有一个待执行的缩放操作，则直接返回
      if (this.pendingScaleChange) {
        return;
      }

      // 标记有一个待执行的缩放操作
      this.pendingScaleChange = true;

      // 使用 requestAnimationFrame 来控制缩放操作的执行频率
      requestAnimationFrame(() => {
        if (newScale != this.scale) {
          this.scale = newScale; // 更新缩放比例
          this.$bus.$emit('setScale', this.scale);
          this.emitTileLevelInfo();
          this.drawImageData();
          // 触发瓦片重新加载
          this.onViewportChange();
          this.SendConsoleLogMsg('缩放比例变化,缩放比例:' + newScale, 'info');
        } else {
          this.SendConsoleLogMsg('缩放比例没有变化,缩放比例:' + this.scale, 'info');
        }
        this.pendingScaleChange = false; // 清除待执行的缩放操作标记
      });
    },

    handleMainCanvasTouch(event) {
      // this.SendConsoleLogMsg('触发触摸事件:', 'info');
      if (!this.enableMainCanvasClick || this.isDragging || this.drawImgData == null) return; // 如果画布不可点击，则不处理点击事件
      // console.log('触发触摸事件:', event);
      if (!this.enableMainCanvasClick || !event.touches || event.touches.length === 0) return;
      const canvas = this.$refs.mainCanvas;
      if (!canvas) return; // 确保 canvas 元素存在
      const touch = event.touches[0];
      const rect = canvas.getBoundingClientRect();// 获取 canvas 元素的边界矩形
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      console.log('Touch at:', x, y);
      event.preventDefault();// 阻止默认事件，如页面滚动
      if (!this.isFocusLoopShooting) {
        // 期望中心（画布坐标 → 传感器像素坐标）
        const desiredCenterX = (x / window.innerWidth * this.visibleWidth) + this.visibleX - this.visibleWidth / 2;
        const desiredCenterY = (y / window.innerHeight * this.visibleHeight) + this.visibleY - this.visibleHeight / 2;

        // ROI 边长（像素，偶数化），来源于固定 RedBoxSideLength
        let side = this.RedBoxSideLength / this.cameraBin;
        side = Math.max(2, Math.floor(side));
        if (side % 2 !== 0) side += 1; // 强制偶数

        // 将 ROI 左上角按中心反推，并约束在图像范围内
        const half = side / 2;
        // ROI 边界约束以当前渲染底图尺寸为准（瓦片模式下 tileGPM / bufferCanvas）
        const imgW =
          (this.bufferCanvas && this.bufferCanvas.width) ? this.bufferCanvas.width :
            (this.tileGPM && this.tileGPM.imageWidth) ? Number(this.tileGPM.imageWidth) :
              Number(this.mainCameraSizeX);
        const imgH =
          (this.bufferCanvas && this.bufferCanvas.height) ? this.bufferCanvas.height :
            (this.tileGPM && this.tileGPM.imageHeight) ? Number(this.tileGPM.imageHeight) :
              Number(this.mainCameraSizeY);

        let roiX = desiredCenterX - half;
        let roiY = desiredCenterY - half;

        // 边界约束
        const maxX = Math.max(0, imgW - side);
        const maxY = Math.max(0, imgH - side);
        roiX = Math.min(Math.max(0, roiX), maxX);
        roiY = Math.min(Math.max(0, roiY), maxY);

        // 偶数对齐位置
        roiX = Math.floor(roiX);
        roiY = Math.floor(roiY);
        if (roiX % 2 !== 0) roiX += 1;
        if (roiY % 2 !== 0) roiY += 1;

        this.ROI_x = roiX;
        this.ROI_y = roiY;
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'sendRedBoxState:' + this.RedBoxSideLength + ':' + this.ROI_x + ':' + this.ROI_y);
      } else {
        this.selectStarX = ((x / window.innerWidth * this.visibleWidth) + this.visibleX - this.visibleWidth / 2 - this.ROI_x) * this.cameraBin; // 计算选择位置的x坐标
        this.selectStarY = ((y / window.innerHeight * this.visibleHeight) + this.visibleY - this.visibleHeight / 2 - this.ROI_y) * this.cameraBin; // 计算选择位置的y坐标

        if (this.selectStarX >= 0 && this.selectStarX < this.RedBoxSideLength &&
          this.selectStarY >= 0 && this.selectStarY < this.RedBoxSideLength) {
          this.SendConsoleLogMsg('Select Star is in ROI', 'info');
        } else {
          this.SendConsoleLogMsg('Select Star is not in ROI', 'error');
          this.selectStarX = -1;
          this.selectStarY = -1;
        }
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'sendSelectStars:' + this.selectStarX + ':' + this.selectStarY);
      }
      this.drawImageData();
    },
    handleTouchStart(event) {
      if (this.drawImgData == null) return;
      // this.SendConsoleLogMsg('触发触摸开始事件:', 'info');
      // 兜底：窗口失焦时强制结束触摸拖动/缩放，避免状态卡住
      window.addEventListener('blur', this.handleTouchEnd);
      if (event.touches.length === 1) { // 单指触摸，开始拖动
        this.isOneTouch = true;
        // this.SendConsoleLogMsg('触发单指触摸事件', 'info');
        this.isDragging = true;
        this.startTouchX[0] = event.touches[0].clientX;
        this.startTouchY[0] = event.touches[0].clientY;
        this.currentTouchX[0] = event.touches[0].clientX;
        this.currentTouchY[0] = event.touches[0].clientY;
        // 清除可能存在的双指触摸的定时器
        if (this.zoomIntervalId) {
          clearInterval(this.zoomIntervalId);
          this.zoomIntervalId = null;
        }


        this.handleMainCanvasTouch(event);
      } else if (event.touches.length >= 2) { // 双指触摸，开始缩放
        this.isOneTouch = false;
        // this.SendConsoleLogMsg('触发双指触摸事件', 'info');
        this.isDragging = true;
        // 初始化两指坐标，避免使用旧值/默认0导致 startTouchDistance 计算错误
        this.currentTouchX[0] = event.touches[0].clientX;
        this.currentTouchY[0] = event.touches[0].clientY;
        this.currentTouchX[1] = event.touches[1].clientX;
        this.currentTouchY[1] = event.touches[1].clientY;
        this.startTouchX[0] = this.currentTouchX[0];
        this.startTouchY[0] = this.currentTouchY[0];
        this.startTouchX[1] = this.currentTouchX[1];
        this.startTouchY[1] = this.currentTouchY[1];
        // 计算两个触摸点之间的距离
        const dx = this.currentTouchX[0] - this.currentTouchX[1];
        const dy = this.currentTouchY[0] - this.currentTouchY[1];
        this.startTouchDistance = Math.sqrt(dx * dx + dy * dy);
        // 清除可能存在的单指触摸的定时器
        if (this.moveIntervalId) {
          clearInterval(this.moveIntervalId);
          this.moveIntervalId = null;
        }


      } else {
        // this.SendConsoleLogMsg('触发多指触摸事件，获取当前触摸点数量:' + event.touches.length, 'info');
      }

    },

    handleTouchMove(event) {
      // this.SendConsoleLogMsg('触发触摸移动事件:', 'info');
      if (!this.isDragging || this.drawImgData == null) return;
      if (event.touches.length == 1) {
        this.currentTouchX[0] = event.touches[0].clientX;
        this.currentTouchY[0] = event.touches[0].clientY;
        if (this.zoomIntervalId) {
          clearInterval(this.zoomIntervalId);
          this.zoomIntervalId = null;
        }
        if (this.moveIntervalId != null) {
          return;
        }
        // 设置一个定时器，每100ms执行一次触摸移动的逻辑
        this.moveIntervalId = setInterval(() => {
          // console.log('执行触摸移动!');
          if (!this.isDragging || !this.isOneTouch) return;

          const dx = this.startTouchX[0] - this.currentTouchX[0];
          const dy = this.startTouchY[0] - this.currentTouchY[0];
          if (isNaN(dx) || isNaN(dy)) {
            return;
          }
          if (dx == 0 && dy == 0) {
            return;
          }

          let newVisibleX = this.visibleX + dx / window.innerWidth * this.visibleWidth;
          let newVisibleY = this.visibleY + dy / window.innerHeight * this.visibleHeight;
          if (newVisibleX < 0) {
            newVisibleX = 0;
          }
          if (newVisibleY < 0) {
            newVisibleY = 0;
          }
          // 同鼠标拖动：边界使用当前渲染底图尺寸（瓦片模式下 tileGPM / bufferCanvas）
          const boundW =
            (this.bufferCanvas && this.bufferCanvas.width) ? this.bufferCanvas.width :
              (this.tileGPM && this.tileGPM.imageWidth) ? Number(this.tileGPM.imageWidth) :
                Number(this.mainCameraSizeX);
          const boundH =
            (this.bufferCanvas && this.bufferCanvas.height) ? this.bufferCanvas.height :
              (this.tileGPM && this.tileGPM.imageHeight) ? Number(this.tileGPM.imageHeight) :
                Number(this.mainCameraSizeY);
          if (Number.isFinite(boundW) && boundW > 0 && newVisibleX > boundW) {
            newVisibleX = boundW;
          }
          if (Number.isFinite(boundH) && boundH > 0 && newVisibleY > boundH) {
            newVisibleY = boundH;
          }

          this.visibleX = newVisibleX;
          this.visibleY = newVisibleY;

          this.startTouchX[0] = this.currentTouchX[0];
          this.startTouchY[0] = this.currentTouchY[0];

          this.drawImageData();
          // 触发瓦片重新加载
          this.onViewportChange();
        }, 100);

      } else if (event.touches.length >= 2) {
        this.currentTouchX[0] = event.touches[0].clientX;
        this.currentTouchY[0] = event.touches[0].clientY;
        this.currentTouchX[1] = event.touches[1].clientX;
        this.currentTouchY[1] = event.touches[1].clientY;

        // 清除可能存在的单指触摸的定时器
        if (this.moveIntervalId) {
          clearInterval(this.moveIntervalId);
          this.moveIntervalId = null;
        }
        if (this.zoomIntervalId != null) {
          return;
        }
        // 设置一个定时器，每100ms执行一次缩放逻辑
        this.zoomIntervalId = setInterval(() => {
          // 双指缩放时 isOneTouch=false；这里原本条件写反会导致缩放逻辑永远不执行
          if (!this.isDragging || this.isOneTouch) return;
          const dx = this.currentTouchX[0] - this.currentTouchX[1];
          const dy = this.currentTouchY[0] - this.currentTouchY[1];
          const distance = Math.sqrt(dx * dx + dy * dy);
          this.SendConsoleLogMsg('距离变化 distance:' + distance, 'info');
          if (this.startTouchDistance == 0) {
            this.startTouchDistance = distance;
          }
          // 计算缩放比例的变化量
          const scaleChange = distance / this.startTouchDistance;
          this.SendConsoleLogMsg('距离变化比例 scaleChange:' + scaleChange, 'info');
          let newScale = this.scale * scaleChange; // 更新缩放比例
          if (newScale < 0.01) {
            newScale = 0.01;
          }
          if (newScale > 1.0) {
            newScale = 1.0;
          }
          if (newScale != this.scale) {
            this.SendConsoleLogMsg('缩放比例变化,缩放比例:' + newScale, 'info');
            this.scale = newScale; // 更新缩放比例
            this.$bus.$emit('setScale', this.scale);
            this.emitTileLevelInfo();
            this.drawImageData();
            // 触发瓦片重新加载
            this.onViewportChange();
          } else {
            this.SendConsoleLogMsg('缩放比例没有变化,缩放比例:' + this.scale, 'info');
          }
          this.startTouchDistance = distance; // 更新两个触摸点之间的距离
        }, 100);
      } else {
        this.SendConsoleLogMsg('触发多指触摸事件，获取当前触摸点数量:' + event.touches.length, 'info');
      }
    },

    handleTouchEnd(event) {
      // this.SendConsoleLogMsg('触发触摸结束事件:', 'info');
      this.isDragging = false; // 停止拖动
      window.removeEventListener('blur', this.handleTouchEnd);
      // 清除定时器
      if (this.moveIntervalId) {
        clearInterval(this.moveIntervalId);
        this.moveIntervalId = null;
      }
      if (this.zoomIntervalId) {
        clearInterval(this.zoomIntervalId);
        this.zoomIntervalId = null;
      }
    },

    ScaleChange(type) {
      if (this.drawImgData == null) return;
      // 缩放范围：
      // - 0.1 ~ 1.0：原有 10 档（影响瓦片层级）
      // - 0.01 ~ 0.1：新增 10 档（仅缩放）
      const MIN_SCALE = 0.01;
      const TILE_LEVEL_MIN_SCALE = 0.1;
      const MAX_SCALE = 1.0;
      const EPS = 1e-6;

      if (type == '+') {
        // 放大（scale 变小）
        if (this.scale > TILE_LEVEL_MIN_SCALE + EPS) {
          this.scale = Math.max(TILE_LEVEL_MIN_SCALE, Math.round((this.scale - 0.1) * 10) / 10);
        } else {
          this.scale = Math.max(MIN_SCALE, Math.round((this.scale - 0.01) * 100) / 100);
        }
      } else if (type == '-') {
        // 缩小（scale 变大）
        if (this.scale < TILE_LEVEL_MIN_SCALE - EPS) {
          this.scale = Math.min(TILE_LEVEL_MIN_SCALE, Math.round((this.scale + 0.01) * 100) / 100);
        } else {
          this.scale = Math.min(MAX_SCALE, Math.round((this.scale + 0.1) * 10) / 10);
        }
      }
      // 最终钳制，避免浮点越界
      this.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, this.scale));
      this.$bus.$emit('setScale', this.scale);
      this.emitTileLevelInfo();
      this.drawImageData();
      // 触发瓦片重新加载
      this.onViewportChange();
    },

    // 显示ROI图像
    showRoiImage(fileName, destX, destY) {
      if (this.RedBoxSideLength == 0 || this.RedBoxSideLength == null) {
        this.SendConsoleLogMsg('RedBoxSideLength is 0 or null', 'error');
        return;
      }
      if (this.isProcessingImage) {
        this.SendConsoleLogMsg('Image is being transmitted, current processing is slow, skipping one frame.', 'warning');
        return;
      }
      // 兼容瓦片模式：
      // - 旧“bin整图”链路会在 readBinFile() 里设置 isDownloadingImageName
      // - 新瓦片金字塔链路不会再触发 readBinFile()，因此不能用 isDownloadingImageName 作为 ROI 显示的前置条件
      // 只要瓦片 GPM 已就绪（tileGPM 存在），就允许 ROI 叠加继续工作
      const hasBaseImage = !!this.tileGPM || !(this.isDownloadingImageName == "" || this.isDownloadingImageName == null);
      if (!hasBaseImage) {
        this.SendConsoleLogMsg('Base image not ready (no TileGPM and isDownloadingImageName is empty). Stop ROI loop.', 'error');
        // 终止循环拍摄（避免前端没有底图时无限拉取 ROI 帧）
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'FocusLoopShooting:false');
        return;
      }
      this.isProcessingImage = true;
      const imagePath = 'img/' + fileName;
      // 创建一个AbortController实例来取消fetch请求
      const fetchController = new AbortController();
      const fetchSignal = fetchController.signal;

      // const startDownloadTime = performance.now();

      // 使用 fetch API 获取二进制数据
      fetch(imagePath, { cache: 'no-store', signal: fetchSignal })
        .then(response => response.arrayBuffer())
        .then(buffer => {
          // const endDownloadTime = performance.now();
          // const downloadTime = endDownloadTime - startDownloadTime;
          if (this.isFocusLoopShooting) this.$bus.$emit('AppSendMessage', 'Vue_Command', 'showRoiImageSuccess:true');
          else this.$bus.$emit('AppSendMessage', 'Vue_Command', 'showRoiImageSuccess:false');
          let time1 = performance.now();
          let src, imgData, targetImg8;
          try {
            const uint16Array = new Uint16Array(buffer);
            // ROI 帧尺寸要与后端写入保持一致：
            // - 非瓦片模式：使用 cameraBin
            // - 瓦片模式：后端可能把 MainCameraBinning 固定回 1（坐标不缩放），但 ROI 叠加仍按 previewBinningFactor 写出
            //   所以这里优先使用 tileGPM.previewBinningFactor
            const roiBinFactor = (this.tileGPM && this.tileGPM.previewBinningFactor)
              ? parseInt(this.tileGPM.previewBinningFactor)
              : parseInt(this.cameraBin || 1);
            let newWidth = parseInt(this.RedBoxSideLength / roiBinFactor);
            let newHeight = parseInt(this.RedBoxSideLength / roiBinFactor);
            if (newWidth % 2 != 0) {
              newWidth = newWidth - 1;
            }
            if (newHeight % 2 != 0) {
              newHeight = newHeight - 1;
            }
            const expectedLen = newWidth * newHeight;
            if (uint16Array.length !== expectedLen) {
              // 容错：若前端 bin 状态不同步，尝试从 buffer 长度推断正方形边长
              const inferredSide = Math.round(Math.sqrt(uint16Array.length));
              if (inferredSide * inferredSide === uint16Array.length) {
                this.SendConsoleLogMsg(
                  `ROI buffer size mismatch, fallback to inferred side. ` +
                  `len=${uint16Array.length}, expected=${expectedLen} (${newWidth}x${newHeight}), ` +
                  `inferred=${inferredSide}x${inferredSide}, roiBinFactor=${roiBinFactor}, cameraBin=${this.cameraBin}`,
                  'warning'
                );
                newWidth = inferredSide;
                newHeight = inferredSide;
              } else {
                this.SendConsoleLogMsg(
                  `uint16Array.length (${uint16Array.length}) !== newWidth * newHeight (${expectedLen}), ` +
                  `and cannot infer square side (sqrt=${Math.sqrt(uint16Array.length)}).`,
                  'error'
                );
                return;
              }
            }
            // 创建一个空的 Mat 对象
            src = new cv.Mat(newHeight, newWidth, cv.CV_16UC1);
            src.data16U.set(uint16Array);
            let time2 = performance.now();
            this.SendConsoleLogMsg('创建mat对象时间: ' + (time2 - time1).toFixed(0) + 'ms', 'info');
            // 瓦片模式下 ROI 显示参数应与 tileGPM 保持一致（白平衡/黑白点/CFA）
            if (this.tileGPM) {
              const gpm = this.tileGPM;
              const isColorCamera = gpm.cfa && gpm.cfa !== '' && gpm.cfa !== 'null';
              if (isColorCamera) {
                const analysis = { whiteBalance: { gainR: gpm.gainR ?? 1, gainB: gpm.gainB ?? 1 } };
                targetImg8 = this.applyStretchAndGain(src, analysis, 'bayer', gpm.cfa, gpm.blackLevel, gpm.whiteLevel);
              } else {
                targetImg8 = this.applyStretchAndGain(src, { gainR: 1, gainB: 1, offset: 0 }, 'gray', gpm.cfa, gpm.blackLevel, gpm.whiteLevel);
              }
            } else {
              if (this.lastImageProcessParams.isColorCamera == 'true' || this.lastImageProcessParams.isColorCamera == 'True' || this.lastImageProcessParams.isColorCamera) {
                targetImg8 = this.applyStretchAndGain(src, this.lastImageProcessParams.analysis, 'bayer', this.lastImageProcessParams.CFA, this.lastImageProcessParams.blackLevel, this.lastImageProcessParams.whiteLevel);
              } else {
                targetImg8 = this.applyStretchAndGain(src, this.lastImageProcessParams.analysis, 'gray', this.lastImageProcessParams.CFA, this.lastImageProcessParams.blackLevel, this.lastImageProcessParams.whiteLevel);
              }
            }
            time1 = performance.now();
            this.SendConsoleLogMsg('applyStretchAndGain时间: ' + (time1 - time2).toFixed(0) + 'ms', 'info');
            src.delete();
            src = null;

            // 将 Mat 对象转换回 ImageData 对象
            imgData = new ImageData(new Uint8ClampedArray(targetImg8.data), targetImg8.cols, targetImg8.rows);
            targetImg8.delete();
            targetImg8 = null;
            // 以消息携带的 ROI 坐标为准（若缺失则回退当前状态）
            const x = Number.isFinite(destX) ? destX : this.ROI_x;
            const y = Number.isFinite(destY) ? destY : this.ROI_y;

            if (this.tileGPM) {
              // 瓦片模式：保存为叠加层，由 renderTiles() 在每次瓦片重绘后自动叠加，避免丢失
              this.roiOverlayImageData = imgData;
              this.roiOverlayX = x;
              this.roiOverlayY = y;
              this.applyRoiOverlay();
            } else {
              // 非瓦片模式：直接写入缓冲画布（旧逻辑）
              // this.bufferCtx.clearRect(x, y, imgData.width, imgData.height);
              this.bufferCtx.putImageData(imgData, x, y);
            }
            // this.SendConsoleLogMsg('绘制一次ROI数据:' + fileName + ':' + this.ROI_x + ':' + this.ROI_y, 'info');
            // 标注识别到的星点位置
            // time2 = performance.now();
            // this.SendConsoleLogMsg('绘制在缓存画布耗时: ' + (time2 - time1).toFixed(0) + 'ms', 'info');
            this.drawImageData();
            // time1 = performance.now();
            // this.SendConsoleLogMsg('drawImageData时间: ' + (time1 - time2).toFixed(0) + 'ms', 'info');
            this.focuserPictureFileName = fileName;
            // const processTime = performance.now() - downloadTime;
            // this.SendConsoleLogMsg(`ROI的执行时间 下载: ${downloadTime.toFixed(0)}ms, 处理: ${processTime.toFixed(0)}ms`, 'info');

          } catch (error) {
            console.error(`处理图像失败: ${imagePath}`, error);
          } finally {
            // 确保 Mat 对象和 ImageData 对象被删除
            if (src && !src.isDeleted()) {
              src.delete();
              src = null; // 添加这行代码，确保 src 对象被清理
            }
            if (targetImg8 && !targetImg8.isDeleted()) {
              targetImg8.delete();
              targetImg8 = null; // 添加这行代码，确保 originalImg8 对象被清理
            }
            // 确保 buffer 被清理
            buffer = null;
            this.isProcessingImage = false;
          }
        })
        .catch(error => {
          if (error.name === 'AbortError') {
            console.log('Fetch request cancelled');
          } else {
            console.error(`获取图像失败: ${imagePath}`, error);
          }
          this.isProcessingImage = false;
        });

      // 在组件卸载时取消 fetch 请求
      this.$once('hook:beforeDestroy', () => {
        fetchController.abort();
      });
    },
    setRedBoxState(length, x, y) {
      this.SendConsoleLogMsg('setRedBoxState:' + length + ',' + x + ',' + y, 'info');
      this.$bus.$emit('setRedBoxPosition', x, y);
      this.$bus.$emit('setRedBoxSideLength', length);
    },
    setFocuserState(state) {
      if (state === 'selectstars') {
        this.isFocusLoopShooting = true;
      } else {
        this.isFocusLoopShooting = false;
        // 退出 ROI 循环时，清空 ROI 叠加层，避免停留在瓦片画面上造成误导
        this.roiOverlayImageData = null;
      }
    },

    /**
     * 将 ROI 叠加层应用到 bufferCanvas（仅影响显示层，不污染瓦片缓存）
     * - 瓦片模式下 renderTiles() 每次拷贝 tileCanvas → bufferCanvas 后都会调用本方法，保证 ROI 不被覆盖
     */
    applyRoiOverlay() {
      if (!this.roiOverlayImageData || !this.bufferCtx || !this.bufferCanvas) return;

      const x = Math.max(0, Math.floor(this.roiOverlayX || 0));
      const y = Math.max(0, Math.floor(this.roiOverlayY || 0));

      // 边界保护：避免越界导致异常
      const w = this.roiOverlayImageData.width;
      const h = this.roiOverlayImageData.height;
      if (x >= this.bufferCanvas.width || y >= this.bufferCanvas.height) return;
      if (x + w <= 0 || y + h <= 0) return;

      this.bufferCtx.putImageData(this.roiOverlayImageData, x, y);
    },
    setShowSelectStar(state) {
      this.showSelectStar = state;
    },
    RedBoxSizeChange(length) {
      this.RedBoxSideLength = parseInt(length);
      // this.$bus.$emit('AppSendMessage', 'Vue_Command', 'sendRedBoxState:' + this.RedBoxSideLength + ':' + this.ROI_x + ':' + this.ROI_y);
    },
    setMainCameraParameters(parameters) {
      for (const parameter in parameters) {
        const item = this.MainCameraConfigItems.find(item => item.label === parameter);
        if (item) {
          if (parameter == 'Temperature') {
            item.value = parseInt(parameters[parameter]);
          } else {
            item.value = parameters[parameter];
          }
        } else {
          if (parameter == 'RedBoxSize') {
            this.$bus.$emit('setRedBoxSideLength', parameters[parameter]);
            this.RedBoxSideLength = parseInt(parameters[parameter]);
          } else if (parameter == 'ROI_x') {
            this.ROI_x = parseFloat(parameters[parameter]);
          } else if (parameter == 'ROI_y') {
            this.ROI_y = parseFloat(parameters[parameter]);
          }else if (parameter == 'SelfExposureTime(ms)') {
            item = this.MainCameraConfigItems.find(item => item.label === 'Self Exposure Time (ms)');
            if (item) {
              item.value = parseInt(parameters[parameter]);
            }
            this.$bus.$emit('setSelfExposureTime',parseInt(parameters[parameter]));
          }
          else if (parameter == 'AutoSave') {
            const item = this.MainCameraConfigItems.find(item => item.label === 'Auto Save');
            if (item) {
              item.value = parameters[parameter] === 'true' || parameters[parameter] === true;
            }
          }
          else if (parameter == 'SaveFailedParse') {
            const item = this.MainCameraConfigItems.find(item => item.label === 'Save Failed Parse');
            if (item) {
              item.value = parameters[parameter] === 'true' || parameters[parameter] === true;
            }
          } else if (parameter === 'USB Traffic') {
            // 仅在需要时动态插入（位置：Offset 后）
            const usbItem = this.ensureMainCameraUsbTrafficItem();
            if (usbItem) {
              usbItem.value = parseInt(parameters[parameter], 10);
            }
          }else {
            console.error(`未找到参数：${parameter}`);
          }
        }
      }
      this.confirmConfiguration(this.MainCameraConfigItems);
    },
    showCanvas(canvas) {
      if (canvas === 'Stel') {
        this.currentcanvas = 'Stel';
        this.showStelCanvas();
      }
      else if (canvas === 'MainCamera') {

        this.currentcanvas = 'MainCamera';
        this.showMainCameraCanvas();
        this.drawImageData()
      }
      else if (canvas === 'GuiderCamera') {
        this.currentcanvas = 'GuiderCamera';
        this.showGuiderCameraCanvas();
      } else {
        this.SendConsoleLogMsg("unknown canvas: " + canvas, 'error');
      }
    },
    // 现有的加减函数需要修改
    decrementAndNotify(item) {
      if (this.isCurrentDeviceUnbound) return;
      if (item.value > item.inputMin) {
        item.value -= item.inputStep;
        this.handleConfigChange(item.label, item.value, item.driverType);
      }
    },

    incrementAndNotify(item) {
      if (this.isCurrentDeviceUnbound) return;
      if (item.value < item.inputMax) {
        item.value += item.inputStep;
        this.handleConfigChange(item.label, item.value, item.driverType);
      }
    },

    // 通用的配置更改处理函数
    handleConfigChange(label, value, driverType = '') {
      if (this.isCurrentDeviceUnbound) return;
      console.log(`配置已更改: ${label} = ${value}`);
      if (value !== '') {
        if (driverType === 'Guider' && label === 'Gain') {
          this.sendMessage('Vue_Command', 'SetGuiderGain:' + parseInt(value));
        } else if (driverType === 'Guider' && label === 'Offset') {
          this.sendMessage('Vue_Command', 'SetGuiderOffset:' + parseInt(value));
        // 主相机参数更改处理
        } else if (label === 'ImageCFA') {
          this.ImageCFASet(value);
        }else if (label === 'Binning') {
          this.cameraBin = parseInt(value);
          this.sendMessage('Vue_Command', 'SetBinning:' + this.cameraBin);
          this.$bus.$emit('SetBinningNum', this.cameraBin);
        }else if (label === 'Temperature') {
          this.sendMessage('Vue_Command', 'SetCameraTemperature:' + parseInt(value));
        }else if (label === 'Gain') {
          this.sendMessage('Vue_Command', 'SetCameraGain:' + parseInt(value));
        }else if (label === 'Offset') {
          this.cameraOffset = parseFloat(value);
          this.sendMessage('Vue_Command', 'ImageOffset:' + this.cameraOffset);
        }else if (label === 'USB Traffic') {
          this.sendMessage('Vue_Command', 'SetUsbTraffic:' + parseInt(value));
        }else if (label === 'Self Exposure Time (ms)') {
          let IntValue = parseInt(value); // 将值转换为 Int 类型
          if (IntValue <= 0) {
            this.callShowMessageBox('Self Exposure Time must be greater than 0', 'error');
            IntValue = 0;
            this.$bus.$emit('setSelfExposureTime', 0);  
          }
          this.SendConsoleLogMsg('Self Exposure Time is set to:' + IntValue, 'info');
          this.sendMessage('Vue_Command', 'Self Exposure Time (ms):' + IntValue);
          this.$bus.$emit('setSelfExposureTime', IntValue);
        }else if (label === 'Auto Save') {
          this.sendMessage('Vue_Command', 'SetMainCameraAutoSave:' + (value === 'true' || value === true));
        }else if (label === 'Save Failed Parse') {
          this.sendMessage('Vue_Command', 'SetMainCameraSaveFailedParse:' + (value === 'true' || value === true));
        }else if (label === 'Save Folder') {
          this.sendMessage('Vue_Command', 'SetMainCameraSaveFolder:' + value);
        }else if (label === 'Tile Build Mode') {
          const normalizedMode = this.normalizeTileBuildModeValue(value);
          this.sendMessage('Vue_Command', 'SetMainCameraTileBuildMode:' + normalizedMode);
          if (this.tileGPM) {
            this.tileGPM.buildMode = normalizedMode;
            this.tileCanvasNeedsClear = true;
            this.rememberTileViewportState();
            this.loadVisibleTiles();
          }
        }else if (label === 'LoopCaptureNum') {
          this.sendMessage('Vue_Command', 'SetMainCameraLoopCaptureNum:' + value);
        }else if (label === 'Capture Mode') {
          // 仅前端本地控制：决定拍摄按钮行为（Single: takeExposure / Burst: takeExposureBurst / Live: 预览不触发拍摄）
          const v = String(value || 'Single');
          this.$bus.$emit('SetCaptureMode', v);
          // 同步到后端：主相机采集模式（Single/Live/Burst）
          this.sendMessage('Vue_Command', 'SetMainCameraCaptureMode:' + v);
          this.SendConsoleLogMsg('Capture Mode = ' + v, 'info');
        }else if (label === 'Burst Frames') {
          // 仅前端本地控制：Burst 连续采集帧数
          let n = parseInt(value, 10);
          if (!Number.isFinite(n) || isNaN(n)) n = 20;
          if (n < 1) n = 1;
          if (n > 1024) n = 1024;
          this.$bus.$emit('SetBurstFrames', n);
          this.SendConsoleLogMsg('Burst Frames = ' + n, 'info');
        }
        else{
          this.SendConsoleLogMsg(label + ':' + value, 'info');
          this.$bus.$emit(label, label + ':' + value);
        }
      }else{
        this.SendConsoleLogMsg(label + 'is NULL', 'info');
      }
    },
    // 校准相关方法
    startCalibrationProcess() {
      this.calibrationInfo.isCalibrating = true;
      this.calibrationInfo.calibrationState = 'running';
      this.calibrationInfo.calibrationStep = 0;
      this.calibrationInfo.calibrationMessage = 'Preparing to start focuser travel calibration...';
      console.log('App: Calibration started:', this.calibrationInfo);
    },

    updateCalibrationInfo(step, message, state) {
      try {
        this.calibrationInfo.calibrationStep = step;
        // 如果消息是国际化键，则翻译它
        if (message && typeof message === 'string') {
          this.calibrationInfo.calibrationMessage = message;
        } else {
          this.calibrationInfo.calibrationMessage = message;
        }
        if (state) {
          this.calibrationInfo.calibrationState = state;
        }
        if (step === 0) {
          this.calibrationInfo.isCalibrating = true;
        }
        console.log('App: Calibration info updated:', this.calibrationInfo);
      } catch (error) {
        console.error('Error in updateCalibrationInfo:', error);
      }
    },

    endCalibration() {
      this.calibrationInfo.isCalibrating = false;
      this.calibrationInfo.calibrationState = 'idle';
      this.calibrationInfo.calibrationStep = 0;
      this.calibrationInfo.calibrationMessage = '';
      console.log('App: Calibration ended');
    },// 自动对焦相关方法 - [AUTO_FOCUS_UI_ENHANCEMENT]
    startAutoFocusProcess() {
      this.autoFocusInfo.isRunning = true;
      this.autoFocusInfo.state = 'running';
      this.autoFocusInfo.step = 0;
      this.autoFocusInfo.message = this.$t('Preparing to start auto focus...');
      // 每次开始自动对焦时重置阶段与进度，避免沿用上一次的 coarse 进度
      this.autoFocusInfo.stage = '';
      this.autoFocusInfo.currentShot = 0;
      this.autoFocusInfo.totalShots = 0;
      console.log('App: Auto focus started:', this.autoFocusInfo);
      
      // 自动对焦开始时禁用拍摄按键
      this.$bus.$emit('disableCaptureButton', true);
      // 同步设备占用（页面刷新后由后端通知触发）
      this.$startFeature(['Focuser'], 'AutoFocus');
    },

    updateAutoFocusStep(step, message) {
      try {

        this.autoFocusInfo.step = step;
        const stepNum = parseInt(step, 10);
        // 对完整自动对焦与“仅精调”模式分别使用固定的国际化文案，
        // 避免直接展示后端传来的英文提示。
        if (stepNum === 4) {
          if (this.autoFocusInfo.mode === 'fine') {
            // 仅精调（fine）模式下的 HFR 精调提示
            this.autoFocusInfo.message = this.$t('Fine HFR adjustment in progress. The system is performing HFR-based fitting, please wait for the final best focus position.');
          } else {
            // 完整自动对焦流程的第 4 步（super-fine 精调）
            this.autoFocusInfo.message = this.$t('Fine HFR adjustment in progress. The system is performing HFR-based fitting, please wait for the final best focus position.');
          }
        } else {
          // 其它步骤：把后端传来的英文提示当作 i18n key 做一次翻译
          // 例如：
          //   "Star finding in progress, please observe if the focuser has started moving..."
          // 会在 cn.json / en.json 中找到对应条目。
          this.autoFocusInfo.message = this.$t(message);
        }
        this.autoFocusInfo.isRunning = true;
        // 自动对焦开始时禁用拍摄按键
        this.$bus.$emit('disableCaptureButton', true);
        console.log('App: Auto focus info updated:', this.autoFocusInfo);
        this.$startFeature(['Focuser'], 'AutoFocus');

        // 当进入完整自动对焦的第 4 步（更细致精调）时，清空焦点曲线上的既有数据点，
        // 避免精调阶段的点影响观感，只保留 super-fine 的 HFR 拟合点。
        if (stepNum === 4 && this.autoFocusInfo.mode !== 'fine') {
          this.$bus.$emit('ClearAllData');
        }
      } catch (error) {
        console.error('Error in updateAutoFocusStep:', error);
      }
    },

    endAutoFocus() {
      this.autoFocusInfo.isRunning = false;
      this.autoFocusInfo.state = 'idle';
      this.autoFocusInfo.step = 0;
      this.autoFocusInfo.message = '';
      console.log('App: Auto focus ended');
      
      // 自动对焦结束时启用拍摄按键
      this.$bus.$emit('disableCaptureButton', false);
      this.$stopFeature(['Focuser'], 'AutoFocus');
    },
  },
  computed: {
    showConnectionModeSelector() {
      try {
        if (!this.CurrentDriverType) return false;
        if (!this.selectedDriver) return false;
        // 仅在"设备未连接"页面显示（模板块已限制，这里再兜底一次）
        if (this.DeviceIsConnected) return false;
        const driverItem = (this.drivers || []).find(d => d.value === this.selectedDriver);
        const driverLabel = driverItem ? driverItem.label : '';
        // 使用匹配规则判断是否支持 SDK
        return this.isDriverSupportSDK(this.CurrentDriverType, this.selectedDriver, driverLabel);
      } catch (e) {
        return false;
      }
    },
    // ConnectionMode 下拉框：根据“SDK已连接锁定”动态禁用 INDI 选项（仅对同驱动的主相机/导星镜生效）
    connectionModeItemsForCurrentDevice() {
      const items = (this.connectionModeItems || []).map(i => ({ ...i }));
      const t = this.CurrentDriverType;
      const isPair = (t === 'MainCamera' || t === 'Guider');
      const lockToSdk = isPair && this.isMainGuiderSameDriver() && this.anySdkConnectedInMainGuider();
      const lockToIndi = isPair && this.isMainGuiderSameDriver() && !lockToSdk && this.anyIndiConnectedInMainGuider();

      return items.map(it => {
        const v = String(it.value || '').toUpperCase();
        if (v === 'INDI') return { ...it, disabled: !!lockToSdk };
        if (v === 'SDK') return { ...it, disabled: !!lockToIndi };
        return { ...it, disabled: false };
      });
    },
    currentDevice() {
      return (this.devices || []).find(d => d.driverType === this.CurrentDriverType) || null;
    },
    // 未绑定：后端会返回空 deviceName，然后前端用 "Not Bind Device" 占位
    isCurrentDeviceUnbound() {
      const dev = this.currentDevice;
      return !!(dev && dev.isConnected && this.isNotBindDevice(dev.device));
    },
    menuDrawerWidth() {
      return 170;
    },
    submenuDrawerWidth() {
      return 200;
    },
    submenuLeft() {
      // submenu 默认跟随主菜单抽屉的宽度偏移；主菜单关闭时回到左侧
      return (this.nav ? this.menuDrawerWidth : 0) + 'px';
    },
    submenuParamsStyle() {
      // 将模板里“绝对定位 + padding + 底部预留”抽离出来，减少内联样式噪音
      return {
        position: 'absolute',
        top: '60px',
        bottom: (this.DeviceIsConnected ? '60px' : '10px'),
        left: 0,
        right: 0,
        paddingRight: '5px',
        paddingBottom: '80px',
        paddingLeft: '5px',
        boxSizing: 'border-box'
      }
    },
    submenuContentKey() {
      // 只重建子菜单的内容区（不重建滚动容器），避免 v-select/v-slider 等内部缓存导致 UI 不刷新
      const t = this.CurrentDriverType || '';
      const c = this.DeviceIsConnected ? '1' : '0';
      const d = this.selectedDriver || '';
      const m = this.selectedConnectionMode || '';
      return `${t}|${c}|${d}|${m}|${this.submenuRenderNonce}`;
    },
    nav: {
      get: function () {
        console.log('nav:', this.$store.state.showNavigationDrawer);
        return this.$store.state.showNavigationDrawer
      },
      set: function (v) {
        if (this.$store.state.showNavigationDrawer !== v) {
          console.log('nav:', this.$store.state.showNavigationDrawer);
          this.$store.commit('toggleBool', 'showNavigationDrawer')
        }
      }
    },
    storeCurrentLocation: function () {
      return this.$store.state.currentLocation
    },
    getQTClientVersionColor() {
      if (this.QTClientVersion === 'Not connected') {
        return 'rgba(255, 0, 0, 0.5)'; // 红色，透明度 0.5
      } else {
        return 'rgba(255, 255, 255, 0.5)'; // 默认白色，透明度 0.5
      }
    },

    // 自动对焦当前阶段的本地化名称
    // 要求：
    //  - 第一步：由“粗调”改为“找星”
    //  - 第二步：由“精调”改为“粗调”
    //  - 第三步：由“超精细精调”改为“精调”
    autoFocusStageLabel() {
      if (!this.autoFocusInfo) return '';

      // “仅精调”模式下，统一视为精调阶段
      if (this.autoFocusInfo.mode === 'fine') {
        return this.$t('Auto Focus Stage - Fine');
      }

      const stage = this.autoFocusInfo.stage;
      if (!stage) return '';

      if (stage === 'coarse') {
        // 原来的“粗调”阶段，现在在 UI 上显示为“找星”
        return this.$t('Auto Focus Stage - Finding stars');
      }
      if (stage === 'fine') {
        // 原来的“精调”阶段，现在在 UI 上显示为“粗调”
        return this.$t('Auto Focus Stage - Coarse');
      }
      if (stage === 'super_fine') {
        // 原来的“超精细精调”阶段，现在在 UI 上显示为“精调”
        return this.$t('Auto Focus Stage - Fine');
      }
      return '';
    },
    isMobile() {
      var ua = navigator.userAgent || '';
      var touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      var uaDataMobile = null;
      // 兼容老浏览器：避免可选链
      if (navigator.userAgentData && typeof navigator.userAgentData.mobile !== 'undefined') {
        uaDataMobile = navigator.userAgentData.mobile;
      }
      var mobileLike = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
      return (uaDataMobile !== null ? uaDataMobile : mobileLike) && !!touch;
    },
    isDesktop() {
      return !this.isMobile;
    },
    isMountConnected() {
      try {
        const dev = this.devices && this.devices.find(d => d.driverType === 'Mount');
        return !!(dev && dev.isConnected);
      } catch (e) {
        return false;
      }
    },
    flipEtaSeconds() {
      try {
        const item = this.MountConfigItems && this.MountConfigItems.find(i => i.label === 'Flip ETA');
        const raw = item ? (item.displayValue != null ? String(item.displayValue) : String(item.value || '')) : '';
        const m = raw.match(/^(-)?(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
        if (!m) return 999999;
        const sign = m[1] === '-' ? -1 : 1;
        const h = parseInt(m[2], 10) || 0;
        const mi = parseInt(m[3], 10) || 0;
        const s = parseInt(m[4], 10) || 0;
        const total = sign * (h * 3600 + mi * 60 + s);
        return Number.isFinite(total) ? total : 999999;
      } catch (e) {
        return 999999;
      }
    },
  },
  watch: {
    /** 主菜单关闭时同步关闭子菜单状态，避免 E2E 再次打开主菜单时误判“子菜单已打开”而跳过点击 */
    '$store.state.showNavigationDrawer': function (isOpen) {
      if (!isOpen) {
        this.drawer_2 = false
        this.isOpenDevicePage = false
      }
    },
    storeCurrentLocation: function (loc) {
      const DD2R = Math.PI / 180
      this.$stel.core.observer.latitude = loc.lat * DD2R
      this.$stel.core.observer.longitude = loc.lng * DD2R
      this.$stel.core.observer.elevation = loc.alt

      // At startup, we need to wait for the location to be set before deciding which
      // startup time to set so that it's night time.
      if (!this.startTimeIsSet) {
        this.$stel.core.observer.utc = swh.getTimeAfterSunset(this.$stel)
        this.startTimeIsSet = true
      }
      // Init of time and date is complete
      this.$store.commit('setValue', { varName: 'initComplete', newValue: true })
    },
    $route: function () {
      // react to route changes...
      this.setStateFromQueryArgs()
    },
    CurrentDriverType(newVal) {
      // 当 CurrentDriverType 变化时，更新 selectedDriver
      this.updateSelectedDriver(newVal);
      this.bumpSubmenuRender();
    },
    selectedDriver() {
      this.bumpSubmenuRender();
    },
    DeviceIsConnected() {
      this.bumpSubmenuRender();
    },
    selectedConnectionMode() {
      this.bumpSubmenuRender();
    }
  },
  mounted: function () {
    // // 阻止默认的触摸行为
    // document.addEventListener('touchstart', this.preventDefault, { passive: false });
    // document.addEventListener('touchmove', this.preventDefault, { passive: false });
    // document.addEventListener('touchend', this.preventDefault, { passive: false });

    // // 阻止默认的鼠标行为
    // document.addEventListener('mousedown', this.preventDefault, { passive: false });
    // document.addEventListener('mousemove', this.preventDefault, { passive: false });
    // document.addEventListener('mouseup', this.preventDefault, { passive: false });

    // // 阻止默认的滚轮行为
    // document.addEventListener('wheel', this.preventDefault, { passive: false });

    let that = this

    this.getLocationHostName();

    this.loadImageToCanvasMainCamera();
    this.loadImageToCanvasGuiderCamera();

    this.initCanvas();
    this.addEventListeners();

    for (const i in this.$stellariumWebPlugins()) {
      const plugin = this.$stellariumWebPlugins()[i]
      if (plugin.onAppMounted) {
        plugin.onAppMounted(that)
      }
    }

    this.connect();
    this.setupNetworkStatusListener();

    // 使用 Promise 检查 OpenCV.js 是否加载完成
    this.loadOpenCv().then(() => {
      if (!this._isDestroyed) { // 检查组件是否已销毁
        console.log('OpenCV.js is ready');
        this.onCvReady();  // 调用 OpenCV 准备好的回调
      }
    }).catch(error => {
      console.error('Error loading OpenCV.js:', error);
    });

    // const script = document.createElement('script');
    // script.src = 'https://docs.opencv.org/4.5.5/opencv.js';
    // script.async = true;
    // script.onload = () => this.onCvReady();
    // document.head.appendChild(script);

    import('@/assets/js/stellarium-web-engine.wasm').then(f => {
      if (!this._isDestroyed) { // 再次检查组件是否已销毁
        // Initialize the StelWebEngine viewer singleton
        // After this call, the StelWebEngine state will always be available in vuex store
        // in the $store.stel object in a reactive way (useful for vue components).
        // To modify the state of the StelWebEngine, it's enough to call/set values directly on the $stel object
        try {
          swh.initStelWebEngine(that.$store, f.default, that.$refs.stelCanvas, function () {
            // Start auto location detection (even if we don't use it)
            swh.getGeolocation().then(p => swh.geoCodePosition(p, that)).then((loc) => {
              that.$store.commit('setAutoDetectedLocation', loc)
            }, (error) => { console.log(error) })

            that.$stel.setFont('regular', process.env.BASE_URL + 'fonts/Roboto-Regular.ttf', 1.38)
            that.$stel.setFont('bold', process.env.BASE_URL + 'fonts/Roboto-Bold.ttf', 1.38)
            that.$stel.core.constellations.show_only_pointed = false

            that.setStateFromQueryArgs()
            that.guiComponent = 'Gui'
            for (const i in that.$stellariumWebPlugins()) {
              const plugin = that.$stellariumWebPlugins()[i]
              if (plugin.onEngineReady) {
                plugin.onEngineReady(that)
              }
            }

            if (!that.dataSourceInitDone) {
              // Set all default data sources
              const core = that.$stel.core
              core.stars.addDataSource({ url: process.env.BASE_URL + 'skydata/stars' })
              core.stars.addDataSource({ url: process.env.BASE_URL + 'skydata/stars_base' })
              core.stars.addDataSource({ url: process.env.BASE_URL + 'skydata/stars_extend' })
              core.dss.addDataSource({ url: process.env.BASE_URL + 'skydata/dss/v1' })
              // core.stars.addDataSource({ url: process.env.BASE_URL + 'skydata/stars' })

              // Allow to specify a custom path for sky culture data
              if (that.$route.query.sc) {
                const key = that.$route.query.sc.substring(that.$route.query.sc.lastIndexOf('/') + 1)
                core.skycultures.addDataSource({ url: that.$route.query.sc, key: key })
                core.skycultures.current_id = key
              } else {
                core.skycultures.addDataSource({ url: process.env.BASE_URL + 'skydata/skycultures/western', key: 'western' })
              }

              core.dsos.addDataSource({ url: process.env.BASE_URL + 'skydata/dso' })
              core.landscapes.addDataSource({ url: process.env.BASE_URL + 'skydata/landscapes/guereins', key: 'guereins' })
              core.milkyway.addDataSource({ url: process.env.BASE_URL + 'skydata/surveys/milkyway' })
              // core.dss.addDataSource({ url: process.env.BASE_URL + 'skydata/surveys/dss' })
              core.minor_planets.addDataSource({ url: process.env.BASE_URL + 'skydata/mpcorb.dat', key: 'mpc_asteroids' })
              core.planets.addDataSource({ url: process.env.BASE_URL + 'skydata/surveys/sso/moon', key: 'moon' })
              core.planets.addDataSource({ url: process.env.BASE_URL + 'skydata/surveys/sso/sun', key: 'sun' })
              core.planets.addDataSource({ url: process.env.BASE_URL + 'skydata/surveys/sso/moon', key: 'default' })
              core.comets.addDataSource({ url: process.env.BASE_URL + 'skydata/CometEls.txt', key: 'mpc_comets' })
              core.satellites.addDataSource({ url: process.env.BASE_URL + 'skydata/tle_satellite.jsonl.gz', key: 'jsonl/sat' })

              // Mount Pointing
              glStel = that.setGloabalStel(that.$stel);
              glLayer = that.setGlobalLayer(that.$stel);
              glTestCircle = that.testAddCircle(that.$stel, glLayer);

            }
          })
        } catch (e) {
          this.$store.commit('setValue', { varName: 'wasmSupport', newValue: false })
        }
      }
    });

    window.addEventListener('load', () => {
      // 页面完全加载
      this.SendConsoleLogMsg('页面已完全加载', 'info');
      this.$bus.$emit('AppSendMessage', 'Process_Command_Return', 'VueClientVersion:' + process.env.VUE_APP_VERSION);
      // 页面加载完成后，主动广播一次当前已知的系统版本信息
      this.broadcastSystemVersion();
    })

    document.addEventListener('DOMContentLoaded', () => {
      // DOM加载完成
      this.SendConsoleLogMsg('DOM已加载完成', 'info');
    })

  },
  // 在组件销毁时移除
  beforeDestroy() {
    document.removeEventListener('touchstart', this.preventDefault);
    document.removeEventListener('touchmove', this.preventDefault);
    document.removeEventListener('touchend', this.preventDefault);

    document.removeEventListener('mousedown', this.preventDefault);
    document.removeEventListener('mousemove', this.preventDefault);
    document.removeEventListener('mouseup', this.preventDefault);

    document.removeEventListener('wheel', this.preventDefault);

    // 若销毁时仍在拖动，确保清理全局监听，避免“粘鼠标”残留
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('blur', this.handleMouseUp);
    window.removeEventListener('blur', this.handleTouchEnd);

    // 清理极轴校准相关的圆圈
    if (this.calibrationCircles) {
      this.calibrationCircles.forEach(circle => {
        if (glLayer && circle) {
          glLayer.remove(circle);
        }
      });
      this.calibrationCircles = [];
    }

    if (this.adjustmentCircles) {
      this.adjustmentCircles.forEach(circle => {
        if (glLayer && circle) {
          glLayer.remove(circle);
        }
      });
      this.adjustmentCircles = [];
    }

    // 停止视场更新定时器
    this.stopFieldUpdateTimer();
  },


}
</script>

<style>
/* 全局关闭 UI 毛玻璃模糊（backdrop-filter） */
.no-backdrop-blur,
.no-backdrop-blur * {
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}

body {
  background-color: black;
  /* 禁用文本选择 */
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  /* 禁用触摸操作 */
  /* touch-action: none;
  -ms-touch-action: none; */

  /* 禁用双击缩放 */
  -webkit-tap-highlight-color: transparent;

  /* 禁用滚动和缩放 */
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;

  /* 禁用长按菜单 */
  -webkit-touch-callout: none;

  /* 禁用图片拖拽 */
  -webkit-user-drag: none;
  -khtml-user-drag: none;
  -moz-user-drag: none;
  -o-user-drag: none;
}

/* 确保画布元素也继承这些属性 */
canvas {
  /* touch-action: none;
  -ms-touch-action: none; */
  -webkit-tap-highlight-color: transparent;
  -webkit-user-drag: none;
}

/* 禁用所有元素的默认触摸行为 */
/* * {
  touch-action: none;
  -ms-touch-action: none;
} */

a {
  color: #82b1ff;
}

a:link {
  text-decoration-line: none;
}

.divider_menu {
  margin-top: 8px;
  margin-bottom: 8px;
}

html {
  overflow-y: visible;
}

html,
body,
#app {
  overflow-y: visible !important;
  overflow-x: visible;
  position: fixed !important;
  width: 100%;
  height: 100%;
  padding: 0 !important;
  font-size: 10px;
}

.fullscreen {
  overflow-y: hidden;
  position: fixed;
  width: 100%;
  height: 100%;
  padding: 0 !important;
}

.click-through {
  pointer-events: none;
}

.get-click {
  pointer-events: all;
}

.dialog {
  background: transparent;
}

.menu__content {
  background-color: transparent !important;
}

#stel {
  height: 100%;
  width: 100%;
  position: absolute;
}

#stel-canvas {
  width: 100%;
  height: 100%;
}

#mainCamera-canvas {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  /* 避免瓦片首帧/清屏阶段出现“透明画布透底”闪屏 */
  background-color: #000;
}

#guiderCamera-canvas {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  /* 同上：导星画布也保持不透明背景 */
  background-color: #000;
}

.right_panel {
  padding-right: 400px;
}

/* .v-btn {
  margin-left: 8px;
  margin-right: 8px;
  margin-top: 6px;
  margin-bottom: 6px;
} */

/* 仅作用于配置面板里的按钮 */
.config-btn {
  text-transform: none;     /* 不要全大写 */
  letter-spacing: 0;
  font-weight: 600;
  font-size: 1.4rem;        /* 根是 10px，这里约 14px，更易读 */
  min-height: 40px;         /* 触达面积 */
  padding-inline: 14px;
  margin: 8px 0;            /* 局部间距，替代全局 .v-btn margin */
  backdrop-filter: blur(2px);
}

/* 深色侧栏里更柔和的“微浮起” */
.config-btn.v-btn--variant-tonal {
  box-shadow: 0 2px 6px rgba(0,0,0,.25);
}

/* 悬停/按下反馈 */
.config-btn:hover {
  transform: translateY(-1px);
}
.config-btn:active {
  transform: translateY(0);
}

/* 禁用时稍降对比，避免像“块砖头” */
.config-btn.v-btn--disabled {
  opacity: .8;
  box-shadow: none;
}

.v-application--wrap {
  min-height: 100% !important;
}


.my-custom-button {
  background-color: #4CAF50;
  /* 绿色背景 */
  color: white;
  /* 白色文字 */
  padding: 15px 32px;
  /* 内边距 */
  text-align: center;
  /* 文字居中 */
  text-decoration: none;
  /* 无文本装饰 */
  display: inline-block;
  /* 行内块显示 */
  font-size: 16px;
  /* 字体大小 */
  margin: 4px 2px;
  /* 外边距 */
  cursor: pointer;
  /* 鼠标样式 */
  border: none;
  /* 无边框 */
}

.connected-device {
  color: #4dc251;
}

.not-bind-device {
  color: #ffd54f;
}

.btn-confirm {
  width: 60px;
  height: 30px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.btn-confirm--green {
  background-color: green !important;
}

.btn-confirm--red {
  background-color: red !important;
}

.menu-navigation-drawer,
.submenu-navigation-drawer {
  backdrop-filter: blur(5px);
  /* 降低透明度，菜单栏更不透明便于阅读 */
  background-color: rgba(0, 0, 0, 0.75) !important;
}

/* 主菜单抽屉整体下移，不遮挡顶部工具栏（工具栏高度 40px） */
.v-navigation-drawer.menu-navigation-drawer {
  top: 40px !important;
  height: calc(100% - 40px) !important;
  max-height: calc(100vh - 40px) !important;
}

/* 主菜单打开时浮在遮罩之上的菜单按钮，与顶部工具栏的菜单图标同一位置（z-index 高于 Vuetify overlay） */
.menu-button-above-overlay {
  position: fixed;
  top: 2px;
  left: 10px;
  z-index: 100;
  cursor: pointer;
}

.submenu-page {
  position: relative;
  width: 200px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.submenu-page-title {
  position: absolute;
  top: 0px;
  left: 50%;
  transform: translateX(-50%);
  font-size: clamp(14px, 4vw, 30px);
  color: rgba(255, 255, 255, 0.5);
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 190px;
  display: inline-block;
  z-index: 1;
}

.submenu-center {
  text-align: center;
}

.submenu-section-title {
  display: inline-block;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.5);
  user-select: none;
}

.submenu-connection-mode {
  margin-top: 6px;
}

.submenu-serial-select {
  margin-top: 8px;
}

.submenu-bottom-actions {
  position: absolute;
  bottom: 10px;
  left: 0;
  right: 0;
  text-align: center;
  display: flex;
  justify-content: center;
  gap: 10px;
  z-index: 2;
}

.submenu-footer-spacer {
  height: 5px;
  flex-shrink: 0;
}

.btn-slider {
  width: 20px;
  height: 20px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.btn-confirm:active,
.btn-slider:active {
  transform: scale(0.95);
  background-color: rgba(255, 255, 255, 0.5);
}


/* 配置项样式 */
.config-item {
  text-align: center;
  width: 100%;
  margin-bottom: 5px;
}

/* 配置项标题 */
.config-title {
  display: inline-block;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.5);
  user-select: none;
  margin-top: 10px;
  margin-bottom: 5px;
}

/* 配置输入框 */
.config-input {
  width: 150px;
  display: inline-block;
  margin: 5px 0;
}

/* 滑块容器 */
.slider-container {
  text-align: left;
  height: 30px;
  width: 150px;
  display: inline-block;
  margin-bottom: 20px;
  position: relative;
}

/* 滑块标签 */
.slider-label {
  display: inline-block;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.5);
  user-select: none;
  margin-bottom: 5px;
}

/* 滑块控制样式 */
.slider-control {
  position: absolute;
  left: 30px;
  width: calc(100% - 60px);
}

/* 提示控制样式 */
.tip-field {
  display: grid;
  grid-template-columns: auto 1fr auto;
  /* 左标签 | 中值 | 右复制 */
  align-items: center;
  gap: 8px;
  padding: 8px 4px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  /* 与其他输入项的下划线保持一致 */
}

.tip-label {
  color: var(--v-theme-primary, #42a5f5);
  font-size: 0.9rem;
  line-height: 1.2;
  white-space: nowrap;
}

.tip-value {
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  user-select: text;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}

.tip-copy {
  margin-left: 4px;
  opacity: 0.9;
}

/* 减少按钮样式 */
.btn-minus {
  position: absolute;
  left: 5px;
  transform: translateY(5px);
}

/* 增加按钮样式 */
.btn-plus {
  position: absolute;
  right: 5px;
  transform: translateY(5px);
}

/* 按钮内容居中 */
.btn-content {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

/* 按钮图标样式 */
.btn-icon {
  min-height: 10px;
  pointer-events: none;
}

/* 开关样式 */
.config-switch {
  width: 150px;
  display: inline-block;
  margin-bottom: 0;
  margin-top: 0;
}

/* 自定义滚动条样式 */
.config-items-container::-webkit-scrollbar {
  width: 6px;
}

.config-items-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.config-items-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.config-items-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* Firefox滚动条样式 */
.config-items-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) rgba(0, 0, 0, 0.1);
}

/* 参数容器滚动条样式 - 隐藏滚动条但保留滚动功能 */
.params-container {
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  /* Firefox - 隐藏滚动条 */
  scrollbar-width: none !important;
  -ms-overflow-style: none !important; /* IE和Edge */
}

/* Webkit浏览器 - 完全隐藏滚动条 */
.params-container::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
  visibility: hidden !important;
}

.params-container::-webkit-scrollbar-track {
  display: none !important;
  background: transparent !important;
  visibility: hidden !important;
}

.params-container::-webkit-scrollbar-thumb {
  display: none !important;
  background: transparent !important;
  visibility: hidden !important;
}

/* 菜单栏导航抽屉滚动条样式 - 桌面端专用，隐藏滚动条但保留滚动功能 */
@media (hover: hover) and (pointer: fine) {
  /* 桌面端浏览器 */
  .menu-navigation-drawer,
  .menu-navigation-drawer * {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }

  .menu-navigation-drawer >>> .v-navigation-drawer__content,
  .menu-navigation-drawer >>> .v-list,
  .menu-navigation-drawer >>> .v-layout,
  .menu-navigation-drawer /deep/ .v-navigation-drawer__content,
  .menu-navigation-drawer /deep/ .v-list,
  .menu-navigation-drawer /deep/ .v-layout {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }

  .menu-navigation-drawer >>> .v-navigation-drawer__content::-webkit-scrollbar,
  .menu-navigation-drawer >>> .v-list::-webkit-scrollbar,
  .menu-navigation-drawer >>> .v-layout::-webkit-scrollbar,
  .menu-navigation-drawer /deep/ .v-navigation-drawer__content::-webkit-scrollbar,
  .menu-navigation-drawer /deep/ .v-list::-webkit-scrollbar,
  .menu-navigation-drawer /deep/ .v-layout::-webkit-scrollbar,
  .menu-navigation-drawer *::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    background: transparent !important;
    visibility: hidden !important;
  }

  .menu-navigation-drawer >>> .v-navigation-drawer__content::-webkit-scrollbar-track,
  .menu-navigation-drawer >>> .v-list::-webkit-scrollbar-track,
  .menu-navigation-drawer >>> .v-layout::-webkit-scrollbar-track,
  .menu-navigation-drawer /deep/ .v-navigation-drawer__content::-webkit-scrollbar-track,
  .menu-navigation-drawer /deep/ .v-list::-webkit-scrollbar-track,
  .menu-navigation-drawer /deep/ .v-layout::-webkit-scrollbar-track,
  .menu-navigation-drawer *::-webkit-scrollbar-track {
    display: none !important;
    background: transparent !important;
    visibility: hidden !important;
  }

  .menu-navigation-drawer >>> .v-navigation-drawer__content::-webkit-scrollbar-thumb,
  .menu-navigation-drawer >>> .v-list::-webkit-scrollbar-thumb,
  .menu-navigation-drawer >>> .v-layout::-webkit-scrollbar-thumb,
  .menu-navigation-drawer /deep/ .v-navigation-drawer__content::-webkit-scrollbar-thumb,
  .menu-navigation-drawer /deep/ .v-list::-webkit-scrollbar-thumb,
  .menu-navigation-drawer /deep/ .v-layout::-webkit-scrollbar-thumb,
  .menu-navigation-drawer *::-webkit-scrollbar-thumb {
    display: none !important;
    background: transparent !important;
    visibility: hidden !important;
  }

  /* 全局选择器 - 确保覆盖所有情况 */
  .v-navigation-drawer.menu-navigation-drawer .v-navigation-drawer__content,
  .v-navigation-drawer.menu-navigation-drawer .v-list,
  .v-navigation-drawer.menu-navigation-drawer .v-layout {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }

  .v-navigation-drawer.menu-navigation-drawer .v-navigation-drawer__content::-webkit-scrollbar,
  .v-navigation-drawer.menu-navigation-drawer .v-list::-webkit-scrollbar,
  .v-navigation-drawer.menu-navigation-drawer .v-layout::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    background: transparent !important;
    visibility: hidden !important;
  }

  .v-navigation-drawer.menu-navigation-drawer .v-navigation-drawer__content::-webkit-scrollbar-track,
  .v-navigation-drawer.menu-navigation-drawer .v-list::-webkit-scrollbar-track,
  .v-navigation-drawer.menu-navigation-drawer .v-layout::-webkit-scrollbar-track {
    display: none !important;
    background: transparent !important;
    visibility: hidden !important;
  }

  .v-navigation-drawer.menu-navigation-drawer .v-navigation-drawer__content::-webkit-scrollbar-thumb,
  .v-navigation-drawer.menu-navigation-drawer .v-list::-webkit-scrollbar-thumb,
  .v-navigation-drawer.menu-navigation-drawer .v-layout::-webkit-scrollbar-thumb {
    display: none !important;
    background: transparent !important;
    visibility: hidden !important;
  }

  /* 子菜单导航抽屉滚动条样式 - 隐藏滚动条但保留滚动功能 */
  .submenu-navigation-drawer,
  .submenu-navigation-drawer * {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }

  .submenu-navigation-drawer >>> .v-navigation-drawer__content,
  .submenu-navigation-drawer >>> .params-container,
  .submenu-navigation-drawer /deep/ .v-navigation-drawer__content,
  .submenu-navigation-drawer /deep/ .params-container {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }

  .submenu-navigation-drawer >>> .v-navigation-drawer__content::-webkit-scrollbar,
  .submenu-navigation-drawer >>> .params-container::-webkit-scrollbar,
  .submenu-navigation-drawer /deep/ .v-navigation-drawer__content::-webkit-scrollbar,
  .submenu-navigation-drawer /deep/ .params-container::-webkit-scrollbar,
  .submenu-navigation-drawer *::-webkit-scrollbar,
  .submenu-navigation-drawer .params-container::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    background: transparent !important;
    visibility: hidden !important;
  }

  .submenu-navigation-drawer >>> .v-navigation-drawer__content::-webkit-scrollbar-track,
  .submenu-navigation-drawer >>> .params-container::-webkit-scrollbar-track,
  .submenu-navigation-drawer /deep/ .v-navigation-drawer__content::-webkit-scrollbar-track,
  .submenu-navigation-drawer /deep/ .params-container::-webkit-scrollbar-track,
  .submenu-navigation-drawer *::-webkit-scrollbar-track,
  .submenu-navigation-drawer .params-container::-webkit-scrollbar-track {
    display: none !important;
    background: transparent !important;
    visibility: hidden !important;
  }

  .submenu-navigation-drawer >>> .v-navigation-drawer__content::-webkit-scrollbar-thumb,
  .submenu-navigation-drawer >>> .params-container::-webkit-scrollbar-thumb,
  .submenu-navigation-drawer /deep/ .v-navigation-drawer__content::-webkit-scrollbar-thumb,
  .submenu-navigation-drawer /deep/ .params-container::-webkit-scrollbar-thumb,
  .submenu-navigation-drawer *::-webkit-scrollbar-thumb,
  .submenu-navigation-drawer .params-container::-webkit-scrollbar-thumb {
    display: none !important;
    background: transparent !important;
    visibility: hidden !important;
  }

  /* 全局选择器 - 确保覆盖子菜单所有情况 */
  .v-navigation-drawer.submenu-navigation-drawer .v-navigation-drawer__content,
  .v-navigation-drawer.submenu-navigation-drawer .params-container,
  .v-navigation-drawer.submenu-navigation-drawer * {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }

  .v-navigation-drawer.submenu-navigation-drawer .v-navigation-drawer__content::-webkit-scrollbar,
  .v-navigation-drawer.submenu-navigation-drawer .params-container::-webkit-scrollbar,
  .v-navigation-drawer.submenu-navigation-drawer *::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    background: transparent !important;
    visibility: hidden !important;
  }

  .v-navigation-drawer.submenu-navigation-drawer .v-navigation-drawer__content::-webkit-scrollbar-track,
  .v-navigation-drawer.submenu-navigation-drawer .params-container::-webkit-scrollbar-track,
  .v-navigation-drawer.submenu-navigation-drawer *::-webkit-scrollbar-track {
    display: none !important;
    background: transparent !important;
    visibility: hidden !important;
  }

  .v-navigation-drawer.submenu-navigation-drawer .v-navigation-drawer__content::-webkit-scrollbar-thumb,
  .v-navigation-drawer.submenu-navigation-drawer .params-container::-webkit-scrollbar-thumb,
  .v-navigation-drawer.submenu-navigation-drawer *::-webkit-scrollbar-thumb {
    display: none !important;
    background: transparent !important;
    visibility: hidden !important;
  }
}

/* 校准信息显示框样式（用于“行程校准”等需要高优先级的大弹窗） */
.calibration-info-box {
  position: fixed;
  /* 默认：在所有设备上都靠上居中，避免遮挡底部控制区域 */
  top: 18vh;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(15px);
  border: 2px solid rgba(255, 165, 0, 0.8);
  border-radius: 15px;
  padding: 18px 16px;
  z-index: 1000;
  min-width: 300px;
  max-width: 360px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

/* 自动对焦信息框：只保留文字，不再出现大灰色遮罩，优先级低于按键与控制面板 */
.auto-focus-info-box {
  position: fixed;
  top: 14vh;                       /* 稍微靠上，避免靠近底部控制区 */
  left: 50%;
  transform: translateX(-50%);
  background-color: transparent;   /* 去除黑色背景 */
  box-shadow: none;                /* 取消投影，弱化存在感 */
  border-width: 0;                 /* 去掉描边，避免“弹窗感” */
  backdrop-filter: none;           /* 不再模糊背景，防止出现整块灰色区域 */
  pointer-events: none;            /* 不拦截点击，让下方按键可操作 */
  z-index: 1;                      /* 降低层级，使电调与相机控制组件图标完全露出 */
  min-width: 0;
  max-width: 70vw;
  padding: 8px 10px;               /* 自动对焦仅作轻量提示，缩小内边距 */
}

/* 手机端自动对焦 / 校准信息框自适应尺寸与位置，避免遮挡主要操作区域 */
@media (max-width: 960px) {
  .calibration-info-box {
    top: 16vh;                  /* 手机端再稍微往上挪一点 */
    min-width: 0;
    width: 70vw;                /* 宽度再收窄一些 */
    max-width: 80vw;
    padding: 12px 10px;
  }

  .calibration-title {
    font-size: 16px;
    margin-bottom: 8px;
  }

  .calibration-message {
    font-size: 12px;
    line-height: 1.3;
    margin-bottom: 8px;
  }

  .calibration-progress {
    font-size: 11px;
  }
}

.calibration-content {
  text-align: center;
  color: white;
}

.calibration-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 14px;
  color: #FFA500;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.calibration-message {
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 12px;
  color: #FFFFFF;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.calibration-progress {
  font-size: 12px;
  color: #FFA500;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.calibration-shot-info {
  margin-top: 4px;
  font-size: 12px;
  color: #FFD27F;
}

.calibration-running-indicator {
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.calibration-running-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(255, 165, 0, 0.35);
  border-top-color: #FFA500;
  border-right-color: #FFA500;
  background-color: transparent;
  box-shadow: 0 0 8px rgba(255, 165, 0, 0.8);
  animation: autofocus-spin 0.9s linear infinite;
}

.calibration-running-text {
  font-size: 12px;
  color: #FFA500;
}

@keyframes autofocus-spin {
  0% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(180deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.config-btn {
  text-transform: none;      /* 取消全大写 */
  letter-spacing: 0;         /* 去掉过大的字间距 */
  font-weight: 600;          /* 更稳重一些 */
  min-height: 40px;          /* 提高可触达性 */
  backdrop-filter: blur(2px);
}

/* 在深色侧栏里更融洽的“微浮起”效果 */
.config-btn.v-btn--variant-tonal {
  box-shadow: 0 2px 6px rgba(0,0,0,.25);
}

/* 按下的反馈 */
.config-btn:active {
  transform: translateY(1px);
}
</style>