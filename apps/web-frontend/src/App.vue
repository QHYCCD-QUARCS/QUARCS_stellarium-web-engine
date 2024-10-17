// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

<template>

<v-app>
  <v-navigation-drawer v-model="drawer_2" ref="Drawer_2" app absolute temporary :width="DeviceIsConnected ? 200 : 200" style="left: 170px; backdrop-filter: blur(5px); background-color: rgba(0, 0, 0, 0.1);">
    
    <div v-show="isOpenDevicePage">
      <span style="position: absolute; top: 0px; left: 50%; transform: translateX(-50%); font-size: 30px; color: rgba(255, 255, 255, 0.5); user-select: none;">
        {{ $t(CurrentDriverType) }}
        <v-divider></v-divider>
      </span>

      <div :style="{ width: DeviceIsConnected ? '200px' : '200px' }" style="position: absolute; top: 50px; max-height: calc(100% - 95px); overflow-y: auto;">

        <div v-show="!DeviceIsConnected" style="text-align: center;">
          <span style="display: inline-block; font-size: 15px; color: rgba(255, 255, 255, 0.5); user-select: none;">
            {{ $t('Device Connection') }}
          </span>
          <v-select :label="$t('Select Driver')" :items="drivers" item-text="label" item-value="value" v-model="selectedDriver" style="width: 150px; display: inline-block;"></v-select>
          <button :disabled="loadingSelectDriver" @click="confirmDriver" class="get-click btn-confirm" style="display: inline-block;">
            <template v-if="!loadingSelectDriver">
              <v-icon color="rgba(255, 255, 255)">mdi-check-bold</v-icon>
            </template>
            <template v-else>
              <div class="progress-spinner">
                <v-progress-circular indeterminate color="white" size="20"></v-progress-circular>
              </div>
            </template>
          </button>
        </div>

        <div v-show="!DeviceIsConnected" style="text-align: center;">
          <v-select :label="$t('Select Device')" :items="ToBeConnectDevice" item-text="label" item-value="value" v-model="selectedDevice" style="width: 150px; display: inline-block;"></v-select>
          <button @click="confirmDevice" class="get-click btn-confirm" style="display: inline-block;">
            <v-icon color="rgba(255, 255, 255)"> mdi-check-bold </v-icon>
          </button>
        </div>

        <!-- <v-divider style="margin-top: 20px;"></v-divider> -->

        <div v-show="DeviceIsConnected" v-for="(item, index) in CurrentConfigItems()" :key="index" style="text-align: center; width: 200px;">
          <span v-if="index === 0" style="display: inline-block; font-size: 15px; color: rgba(255, 255, 255, 0.5); user-select: none;">
            {{ $t('Device Config Items') }}
          </span>
          <v-card-text>
            <v-text-field v-if="item.inputType === 'text'" v-model="item.value" :label="item.label" style="width: 150px; display: inline-block;"></v-text-field>

            <div v-if="item.inputType === 'slider'" style="text-align: left; height: 30px; width: 150px; display: inline-block; margin-bottom: 20px;">
              <span style="display: inline-block; font-size: 15px; color: rgba(255, 255, 255, 0.5); user-select: none;">{{ item.label }}: {{ item.value }}</span>
              <div>
                <button @click="decrement(item)" class="get-click btn-slider" style="position: absolute; left: 25px; transform: translateY(5px); user-select: none; font-size: 5px;">
                  <div style="display: flex; justify-content: center; align-items: center;">
                    <img src="@/assets/images/svg/ui/Minus.svg" height="10px" style="min-height: 10px; pointer-events: none;"></img>
                  </div>
                </button>
                <v-slider v-model="item.value" :step="item.inputStep" :max="item.inputMax" :min="item.inputMin" color="white" class="align-center" style="position: absolute; left: 45px; width: calc(100% - 90px);"></v-slider>
                <button @click="increment(item)" class="get-click btn-slider" style="position: absolute; right: 25px; transform: translateY(5px); user-select: none; font-size: 5px;">
                  <div style="display: flex; justify-content: center; align-items: center;">
                    <img src="@/assets/images/svg/ui/Plus.svg" height="10px" style="min-height: 10px; pointer-events: none;"></img>
                  </div>
                </button>
              </div>
            </div>

            <v-select v-if="item.inputType === 'select'" v-model="item.value" :label="item.label" :items="item.selectValue" style="width: 150px; display: inline-block;"></v-select>
          </v-card-text>
        </div>

      </div>

      <button v-show="DeviceIsConnected" @click="confirmConfiguration(CurrentConfigItems())" class="get-click btn-confirm" style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); display: inline-block; user-select: none;">
        <v-icon color="rgba(255, 255, 255)"> mdi-check-bold </v-icon>
      </button>

    </div>

    <div v-show="isOpenPowerPage">
      <span style="position: absolute; top: 0px; left: 50%; transform: translateX(-50%); font-size: 26px; color: rgba(255, 255, 255, 0.5); user-select: none; white-space: nowrap; ">
        {{ $t('Power Management') }}
        <v-divider></v-divider>
      </span>

      <div style="position: absolute; top: 50px; max-height: calc(100% - 50px); width: 200px; overflow-y: auto;">
        <v-list dense>

          <v-list-item @click.stop="SwitchOutPutPower(1, OutPutPower_1_ON)" :style="{ height: '36px', marginBottom: '10px' }">
            <v-list-item-icon style="margin-right: 10px;">
              <div style="display: flex; justify-content: center; align-items: center;">
                <img src="@/assets/images/svg/ui/OutPutPower.svg" height="30px" style="min-height: 30px; pointer-events: none;"></img>
              </div>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>
                <span>
                  <div :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('OutPut Power 1') }}</div>
                  <div :style="{ fontSize: '7px' }" :class="{ 'connected-device': OutPutPower_1_ON }">{{ OutPutPower_1_ON ? '[ON]' : '[OFF]' }}</div>
                </span>
              </v-list-item-title>

            </v-list-item-content>
          </v-list-item>

          <v-list-item @click.stop="SwitchOutPutPower(2, OutPutPower_2_ON)" :style="{ height: '36px', marginBottom: '10px' }">
            <v-list-item-icon style="margin-right: 10px;">
              <div style="display: flex; justify-content: center; align-items: center;">
                <img src="@/assets/images/svg/ui/OutPutPower.svg" height="30px" style="min-height: 30px; pointer-events: none;"></img>
              </div>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>
                <span>
                  <div :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('OutPut Power 2') }}</div>
                  <div :style="{ fontSize: '7px' }" :class="{ 'connected-device': OutPutPower_2_ON }">{{ OutPutPower_2_ON ? '[ON]' : '[OFF]' }}</div>
                </span>
              </v-list-item-title>

            </v-list-item-content>
          </v-list-item>

          <v-divider :style="{ marginBottom: '10px' }"></v-divider>

          <v-list-item @click.stop="openPowerManagerPage()" :style="{ height: '36px', marginBottom: '10px' }">
            <v-list-item-icon style="margin-right: 10px;">
              <div style="display: flex; justify-content: center; align-items: center;">
                <img src="@/assets/images/svg/ui/Reboot.svg" height="30px" style="min-height: 30px; pointer-events: none;"></img>
              </div>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('Reboot') }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <v-list-item @click.stop="openPowerManagerPage()" :style="{ height: '36px', marginBottom: '10px' }">
            <v-list-item-icon style="margin-right: 10px;">
              <div style="display: flex; justify-content: center; align-items: center;">
                <img src="@/assets/images/svg/ui/PowerOFF.svg" height="30px" style="min-height: 30px; pointer-events: none;"></img>
              </div>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('Shut Down') }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

        </v-list>
      </div>

    </div>

  </v-navigation-drawer>

  <v-navigation-drawer v-model="nav" app :stateless = "drawer_2" temporary width="170" style="backdrop-filter: blur(5px); background-color: rgba(0, 0, 0, 0.1);">  <!-- stateless temporary  -->
    <v-layout column fill-height>
      <v-list dense>
        <template>
          <div>
            <span style="font-size: 10px; color: rgba(255, 255, 255, 0.5); user-select: none; white-space: nowrap; ">
              Client Version: {{ VueClientVersion }}
            </span>
          </div>
          <div>
            <span style="font-size: 10px; color: rgba(255, 255, 255, 0.5); user-select: none; white-space: nowrap; ">
              Server Version: {{ QTClientVersion }}
            </span>
          </div>
          <v-divider></v-divider>
        </template>

        <template v-for="(item,i) in menuItems">
          <template v-if="$store.state[item.store_show_menu_item] === false"></template>
          <v-subheader v-else-if="item.header" v-text="item.header" class="grey--text text--darken-1" :key="i"/>
          <v-divider class="divider_menu" v-else-if="item.divider" :key="i"/>
          <v-list-item v-else-if="item.switch" @click.stop="toggleStoreValue(item.store_var_name)" :key="i">
            <v-list-item-action>
              <v-switch value :input-value="getStoreValue(item.store_var_name)" label=""></v-switch>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>{{ item.title }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <template v-else>
            <v-list-item v-if='item.link' target="_blank" rel="noopener" :href='item.link' :key="i">
              <v-list-item-icon><v-icon>{{ item.icon }}</v-icon></v-list-item-icon>
              <!-- <v-list-item-title v-text="item.title"/> -->
              <v-list-item-title>{{ $t(item.title) }}</v-list-item-title>
              <v-icon disabled>mdi-open-in-new</v-icon>
            </v-list-item>
            <v-list-item v-else-if='item.footer===undefined' @click.stop="toggleStoreValue(item.store_var_name)" :key="i">
              <v-list-item-icon><v-icon>{{ item.icon }}</v-icon></v-list-item-icon>
              <!-- <v-list-item-title v-text="item.title"/> -->
              <v-list-item-title>{{ $t(item.title) }}</v-list-item-title>
            </v-list-item>
          </template>
        </template>

        <v-list-item @click.stop="openPowerManagerPage()" :style="{ height: '36px' }">
          <v-list-item-icon style="margin-right: 10px;">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/Power.svg" height="30px" style="min-height: 30px; pointer-events: none;"></img>
            </div>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('Power Management') }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item :disabled="loadingConnectAllDevice" @click.stop="connectAllDevice()" :style="{ height: '36px' }">
          <v-list-item-icon style="margin-right: 10px;">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/Connect.svg" height="30px" style="min-height: 30px; pointer-events: none;"></img>
            </div>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('Connect All') }}</v-list-item-title>
            <v-progress-linear
              v-if="loadingConnectAllDevice"
              indeterminate
              color="white"
              height="5"
            ></v-progress-linear>
          </v-list-item-content>
        </v-list-item>

        <v-list-item @click.stop="disconnectAllDevice(false)" :style="{ height: '36px' }">
          <v-list-item-icon style="margin-right: 10px;">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/DisConnect.svg" height="30px" style="min-height: 30px; pointer-events: none;"></img>
            </div>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('Disconnect All') }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item @click.stop="CalibratePolarAxis()" :style="{ height: '36px' }">
          <v-list-item-icon style="margin-right: 10px;">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/PoleAxis.svg" height="30px" style="min-height: 30px; pointer-events: none;"></img>
            </div>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('Calibrate Polar Axis') }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item @click.stop="OpenIamgeFolder()" :style="{ height: '36px' }">
          <v-list-item-icon style="margin-right: 10px;">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/FolderSwitch.svg" height="30px" style="min-height: 30px; pointer-events: none;"></img>
            </div>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('Image Files') }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-divider></v-divider>

        <v-list-item v-for="(device, index) in devices" :key="index" @click.stop="selectDevice(device)" :style="{ height: '36px' }">
          <v-list-item-icon style="margin-right: 10px;">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img :src="require(`@/assets/images/svg/ui/${device.driverType}.svg`)" height="30px" style="min-height: 30px"></img>
            </div>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>
              <span>
                <div :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t(device.driverType) }}</div>
                <div :style="{ fontSize: '7px' }" :class="{ 'connected-device': device.isConnected }">{{ device.device }}</div>
              </span>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-divider></v-divider>

      </v-list>


      <!-- <template v-for="(item,i) in menuComponents">
        <component :is="item" :key="i"></component>
      </template>
      <v-spacer></v-spacer> -->


      <v-list dense>

        <!-- <v-divider class="divider_menu"/> -->

        <v-list-item @click.stop="locationClicked()" :style="{ height: '36px' }">
          <v-list-item-icon style="margin-right: 10px;">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img :src="require(`@/assets/images/svg/ui/Location.svg`)" height="30px" style="min-height: 30px"></img>
            </div>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>
              <span>
                <div :style="{ fontSize: '10px' }">{{ $store.state.currentLocation.short_name }}</div>
              </span>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item @click.stop="ShowConfirmDialog('Confirm', 'Are you sure you need to refresh?', 'Refresh')" :style="{ height: '36px' }">
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
        
        <template v-for="(item,i) in menuItems">
          <v-list-item v-if='item.footer' @click.stop="toggleStoreValue(item.store_var_name)" :key="i">
            <v-list-item-icon><v-icon>{{ item.icon }}</v-icon></v-list-item-icon>
            <!-- <v-list-item-title v-text="item.title"/> -->
            <v-list-item-title>{{ $t(item.title) }}</v-list-item-title>
          </v-list-item>
        </template>

      </v-list>
    </v-layout>
  </v-navigation-drawer>


  <!-- 添加一个新的按钮 This button is to test the opencv.js. Need to set the #guiderCamera-canvas z-index = 0 -->

  <!-- <v-btn class="my-custom-button" @click="handleButtonTestClick">Switch Pages</v-btn> -->
  <!-- 消息框 -->
  <!-- <div>
      <button @click="callShowMessageBox('this is a MessageBox','msg')">显示消息</button>
      <message-box v-if="isMessageBoxShow" ref="messageBox"></message-box>
  </div> -->


  <v-main>

    <canvas v-show=false id="TestCanvas" width="1920" height="1080"></canvas>

    <v-container class="fill-height" fluid style="padding: 0">
      <div id="stel" v-bind:class="{ right_panel: $store.state.showSidePanel }">
        <div style="position: relative; width: 100%; height: 100%">
          <component v-bind:is="guiComponent"></component>
          <canvas id="stel-canvas" ref='stelCanvas' :style="{ zIndex: canvasZIndexStel }"></canvas>
          <canvas ref="mainCanvas" id="mainCamera-canvas"   :style="{ zIndex: canvasZIndexMainCamera }"></canvas>
          <canvas ref="guiderCanvas" id="guiderCamera-canvas" :style="{ zIndex: canvasZIndexGuiderCamera }" @click="handleGuiderCanvasClick"></canvas>
          <!-- <img id="imageSrc" alt="Source" :src="imageSrc" crossOrigin = "" /> -->

        </div>
      </div>


    </v-container>
  </v-main>

</v-app>

</template>

<script>
import _ from 'lodash'
import Gui from '@/components/gui.vue'
import GuiLoader from '@/components/gui-loader.vue'
import swh from '@/assets/sw_helpers.js'
import Moment from 'moment'

var glTestCircle;
var glLayer;
var glStel;

export default {
  data (context) {
    return {
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
      websocketState: '未连接', // 添加WebSocket连接状态
      networkDisconnected: false, // 添加网络连接状态

      QTClientVersion: 'Not connected',
      VueClientVersion: '20241017',

      // isMessageBoxShow: false,

      CurrentDriverType: '',
      DeviceIsConnected: null,
      confirmDriverType: '',

      MainCameraOffsetMin: 0,
      MainCameraOffsetMax: 0,

      MainCameraGainMin: 0,
      MainCameraGainMax: 0,

      devices: [
        { name: '导星镜', driverType: 'Guider', type: 'CCDs', ListNum: "1", isget: false, device: '', driverName: '', isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_Guider'},
        { name: '主相机', driverType: 'MainCamera', type: 'CCDs', ListNum: "20", isget: false, device: '', driverName: '', isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_MainCamera'},
        { name: '赤道仪', driverType: 'Mount', type: 'Telescopes', ListNum: "0", isget: false, device: '', driverName: '', isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_Mount'},
        { name: '望远镜', driverType: 'Telescopes', device: '', isConnected: true},
        { name: '电动调焦器', driverType: 'Focuser', type: 'Focusers', ListNum: "22", isget: false, device: '', driverName: '', isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_Focuser'},
        { name: '电子极轴镜', driverType: 'PoleCamera', type: 'CCDs', ListNum: "2", isget: false, device: '', driverName: '', isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_PoleCamera'},
        { name: '滤镜轮', driverType: 'CFW', type: 'Filter Wheels', ListNum: "21", isget: false, device: '', driverName: '', isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_CFW'},
      ],

      // Changing the label name also requires changing the emit signal name
      GuiderConfigItems: [

      ],

      MainCameraConfigItems: [
        // { driverType: 'MainCamera', num: 1, label: 'Chip Width (mm)', value: '' },
        // { driverType: 'MainCamera', num: 2, label: 'Chip Height (mm)', value: '' },
        // { driverType: 'MainCamera', num: 3, label: 'Focal Length (mm)', value: '' },
        { driverType: 'MainCamera', label: 'ImageGainR', value: '', inputType: 'slider', inputMin: 0, inputMax: 3, inputStep: 0.01},
        { driverType: 'MainCamera', label: 'ImageGainB', value: '', inputType: 'slider', inputMin: 0, inputMax: 3, inputStep: 0.01},
        { driverType: 'MainCamera', label: 'ImageCFA', value: '', inputType: 'select', selectValue: ['GR', 'GB', 'BG', 'RGGB']},
        { driverType: 'MainCamera', label: 'ImageOffset', value: '', inputType: 'slider', inputMin: 0, inputMax: 255, inputStep: 0.1},
        { driverType: 'MainCamera', label: 'Binning', value: '', inputType: 'slider', inputMin: 1, inputMax: 4, inputStep: 1},

        { driverType: 'MainCamera', label: 'Gain', value: '', inputType: 'slider', inputMin: 0, inputMax: 0, inputStep: 1},
        { driverType: 'MainCamera', label: 'Offset', value: '', inputType: 'slider', inputMin: 0, inputMax: 0, inputStep: 1},
        { driverType: 'MainCamera', label: 'RedBox Side Length (px)', value: '', inputType: 'text'},
        { driverType: 'MainCamera', label: 'ExpTime [1]', value: '', inputType: 'text' },
        { driverType: 'MainCamera', label: 'ExpTime [2]', value: '', inputType: 'text' },
        { driverType: 'MainCamera', label: 'ExpTime [3]', value: '', inputType: 'text' },
        { driverType: 'MainCamera', label: 'ExpTime [4]', value: '', inputType: 'text' },
        { driverType: 'MainCamera', label: 'ExpTime [5]', value: '', inputType: 'text' },
        { driverType: 'MainCamera', label: 'ExpTime [6]', value: '', inputType: 'text' },
        { driverType: 'MainCamera', label: 'ExpTime [7]', value: '', inputType: 'text' },
        { driverType: 'MainCamera', label: 'ExpTime [8]', value: '', inputType: 'text' },
        { driverType: 'MainCamera', label: 'ExpTime [9]', value: '', inputType: 'text' },
        // 在这里添加更多的配置项
      ],

      MountConfigItems: [

      ],

      TelescopesConfigItems: [
        { driverType: 'Telescopes', num: 1, label: 'Focal Length (mm)', value: '', inputType: 'text'},
      ],

      FocuserConfigItems: [
        { driverType: 'Focuser', num: 1, label: 'RedBox Side Length (px)', value: '', inputType: 'text'},
        { driverType: 'Focuser', num: 2, label: 'Min Step', value: '', inputType: 'text' },
        
      ],

      PoleCameraConfigItems: [

      ],

      CFWConfigItems: [

      ],

      BeforeChangeConfigItems: [],

      

      imageData: null,

      histogramImage: null,
      histogram_min: 0,
      histogram_max: 255,

      ImageGainR: 1,
      ImageGainB: 1,

      ImageOffset: 0,

      ImageCFA: 'BG',

      CanvasWidth: 4096,
      CanvasHeight: 2160,

      scale: 1,
      translateX: 0,
      translateY: 0,
      bufferCanvas: null,
      bufferCtx: null,
      imageWidth: 0,
      imageHeight: 0,
      drawImgData: null,
      OriginalImage: null,
      detectStarsImg: null,

      mainCameraSizeX: 0,
      mainCameraSizeY: 0,

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

      drawer_2: null,

      drivers: [], // 驱动选项数组
      selectedDriver: null, // 选中的驱动

      devicesList: [], // 设备选项数组
      selectedDevice: null, // 选中的设备
      ToBeConnectDevice: [],

      loadingSelectDriver: false,
      loadingConnectAllDevice: false,

      CurrentLocationLng: 0,
      CurrentLocationLat: 0,

      histogramData: [],

      ImageArrayBuffer: null,

      isOpenDevicePage: false,
      isOpenPowerPage: false,

      OutPutPower_1_ON: true,
      OutPutPower_2_ON: false,

      isPolarAxisMode: false,

    }
  },
  components: { Gui,
    GuiLoader,
    // MessageBox,
  },
  created() {
    this.$bus.$on('AppSendMessage', this.sendMessage);
    this.$bus.$on('AppUpdateDevices', this.updateDevices);
    this.$bus.$on('Switch-MainPage', this.handleButtonTestClick);
    this.$bus.$on('AutoHistogramNum', this.setAutoHistogramNum);
    this.$bus.$on('HandleHistogramNum', this.applyHistStretch);
    this.$bus.$on('ImageGainR', this.ImageGainSet);
    this.$bus.$on('ImageGainB', this.ImageGainSet);
    this.$bus.$on('Offset', this.CameraOffsetSet);
    this.$bus.$on('ImageOffset', this.ImageOffsetSet);
    this.$bus.$on('Binning', this.BinningSet);
    this.$bus.$on('ImageCFA', this.ImageCFASet);
    this.$bus.$on('ImageProportion', this.setImageProportion);
    this.$bus.$on('MountGoto',this.lookatcircle);
    this.$bus.$on('SwitchImageToShow', this.SwitchImageToShow);
    this.$bus.$on('PolarPointAltitude', this.setPolarPointAltitude);
    this.$bus.$on('showStelCanvas', this.showStelCanvas);
    this.$bus.$on('RecalibratePolarAxis', this.RecalibratePolarAxis);
    this.$bus.$on('CurrentExpTimeList', this.CurrentExpTimeList);
    this.$bus.$on('disconnectAllDevice', this.disconnectAllDevice);
    this.$bus.$on('GetConnectedDevices', this.ReturnConnectedDevices);
    this.$bus.$on('CurrentCFWList', this.CurrentCFWList);
    this.$bus.$on('calcWhiteBalanceGains', this.calcWhiteBalanceGains);
    this.$bus.$on('SwitchOutPutPower', this.SwitchOutPutPower);
    this.$bus.$on('PolarAxisMode', this.PolarAxisMode);
  },
  methods: {
    getLocationHostName() {
      const hostname = window.location.hostname;
      console.log('location hostname:', hostname);
      this.WebSocketUrl = `ws://${hostname}:8600`;
    },
    getQTClientVersion() {
      this.sendMessage('Vue_Command', 'getQTClientVersion');
    },
    connect() {
      // 替换为你的 WebSocket 服务器地址
      // this.websocket = new WebSocket('ws://192.168.2.31:8600');  // process.env.VUE_APP_WEBSOCKET
      // this.websocket = new WebSocket(process.env.VUE_APP_WEBSOCKET);
      this.websocket = new WebSocket(this.WebSocketUrl);

      this.websocket.onopen = () => {
        console.log('QHYCCD | WebSocket connected');
        this.websocketState = '已连接';
        this.networkDisconnected = false; // WebSocket连接成功时重置网络连接状态
        this.callShowMessageBox('WebSocket connected','success');
        this.$bus.$emit('ShowNetStatus', 'true');
        this.StatusRecovery();
        console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
      };

      this.websocket.onmessage = (message) => {
        // console.log('QHYCCD | Received message:', message.data);

        const data = JSON.parse(message.data);

        if (data.type === 'QT_Return') {
          // console.log('QHYCCD | QT_Return');
          if (data.message.startsWith('AddDriver:')) {
            const parts = data.message.split(':');
            if (parts.length === 3) {
              const label = parts[1];
              const value = parts[2];
              const type = this.CurrentDriverType;
              // 创建一个驱动对象
              const driver = { type, label, value };
              this.$bus.$emit('add-driver', driver);
              this.drivers.push(driver);
            }
          }

          if (data.message.startsWith('AddDevice:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const label = parts[1];
              console.log('QHYCCD | AddDevice: ',label);
              // const value = parts[2];
              const type = this.confirmDriverType;
              // 创建一个驱动对象
              const device = { type, label, label };
              console.log('QHYCCD | AddDevice: ',device);
              this.$bus.$emit('add-device', device);
              this.devicesList.push(device);

              this.ToBeConnectDevice = [];
              this.devicesList.forEach(devicesList => {
                if (devicesList.type === this.CurrentDriverType) {
                  this.ToBeConnectDevice.push(devicesList);
                }
              });

              this.loadingSelectDriver = false;
            }
          }

          if (data.message.startsWith('updateDevices_:')) {
            const parts = data.message.split(':');
            if (parts.length === 3) {
              const ListNum = parts[1];
              const name = parts[2];
              this.updateDevices_(ListNum,name);
            }
          }

          if (data.message.startsWith('ConnectSuccess:')) {
            const parts = data.message.split(':');
            if (parts.length === 3) {
              const type = parts[1];
              const device = parts[2];
              this.updateDevicesConnect(type,device);
            }
          }

          if (data.message.startsWith('ConnectFailed:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const reason = parts[1];
              this.callShowMessageBox(reason,'error');
              this.loadingConnectAllDevice = false;
            }
          }

          if (data.message.startsWith('ScanFailed:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const reason = parts[1];
              this.callShowMessageBox(reason,'error');
              this.loadingSelectDriver = false;
            }
          }

          if (data.message.startsWith('SaveJpgSuccess:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const fileName = parts[1];
              this.$bus.$emit('showRoiImage',fileName);
            }
          }

          if (data.message.startsWith('SavePngSuccess:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const fileName = parts[1];
              // this.fetchImage('http://192.168.2.31:8080/img/'+fileName); // http://192.168.2.111:8600/images/  http://192.168.2.111:8080/img/
              // this.fetchImage(process.env.VUE_APP_IMAGE_FILE + fileName);    // process.env.VUE_APP_IMAGE_FILE  
              // this.fetchImage(this.ImageFileUrl + fileName);

              // this.fetchImage('img/' + fileName);
            }
          }

          if (data.message.startsWith('SaveBinSuccess:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const fileName = parts[1];
              // this.readBinFile('http://192.168.2.31:8080/img/'+fileName); // http://192.168.2.111:8600/images/  http://192.168.2.111:8080/img/
              // this.readBinFile(process.env.VUE_APP_IMAGE_FILE + fileName);  
              // this.readBinFile(this.ImageFileUrl + fileName); //this.ImageFileUrl + fileName
              this.readBinFile('img/' + fileName);
              this.DetectedStarsFinish = false;
            }
          }

          if (data.message.startsWith('SaveGuiderImageSuccess:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const fileName = parts[1];
              // this.loadAndDisplayImage('http://192.168.2.31:8080/img/'+fileName);
              // this.loadAndDisplayImage(process.env.VUE_APP_IMAGE_FILE + fileName);
              // this.loadAndDisplayImage(this.ImageFileUrl + fileName);
              this.loadAndDisplayImage('img/' + fileName);
            }
          }

          if (data.message.startsWith('AddScatterChartData:')) {
            const parts = data.message.split(':');
            if (parts.length === 3) {
              const Data_x = parts[1];
              const Data_y = parts[2];
              const newDataPoint = [Data_x, Data_y];
              this.$bus.$emit('AddScatterChartData', newDataPoint);
            }
          }

          if (data.message.startsWith('AddLineChartData:')) {
            const parts = data.message.split(':');
            if (parts.length === 4) {
              const Data_x = parts[1];
              const Data_Ra = parts[2];
              const Data_Dec = parts[3];
              const newDataPoint_Ra = [Data_x, Data_Ra];
              const newDataPoint_Dec = [Data_x, Data_Dec];
              // console.log('QHYCCD | Add line chart Data:', newDataPoint_Ra, ',', newDataPoint_Dec);
              this.$bus.$emit('AddLineChartData', newDataPoint_Ra, newDataPoint_Dec);
            }
          }

          if (data.message.startsWith('SetLineChartRange:')) {
            const parts = data.message.split(':');
            if (parts.length === 3) {
              const min = parts[1];
              const max = parts[2];
              this.$bus.$emit('SetLineChartRange', min, max);
            }
          }

          if (data.message.startsWith('GuiderStatus:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const status = parts[1];
              this.$bus.$emit('GuiderStatus', status);
            }
          }

          if (data.message.startsWith('FocusChangeSpeedSuccess:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const Speed = parts[1];
              this.$bus.$emit('FocusChangeSpeedSuccess', Speed);
            }
          }

          if (data.message.startsWith('FocusPosition:')) {
            const parts = data.message.split(':');
            if (parts.length === 3) {
              const CurrentPosition = parts[1];
              const TargetPosition = parts[2];
              this.$bus.$emit('FocusPosition', CurrentPosition, TargetPosition);
            }
          }

          if (data.message.startsWith('FocusMoveDone:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const FWHM = parts[1];
              this.$bus.$emit('UpdateFWHM',FWHM);
            }
            this.$bus.$emit('FocusMoveDone');
          }

          if (data.message.startsWith('MainCameraSize:')) {
            const parts = data.message.split(':');
            if (parts.length === 3) {
              const SizeX = parts[1];
              const SizeY = parts[2];
              this.$bus.$emit('MainCameraSize', SizeX, SizeY);
              this.mainCameraSizeX = SizeX;
              this.mainCameraSizeY = SizeY;
            }
          }

          if (data.message.startsWith('fitQuadraticCurve:')) {
            this.$bus.$emit('ClearfitQuadraticCurve');
            const parts = data.message.split(':');
            for (var x = 0; x <= 601; x += 1) {
              const a = parts[x];
              const b = a.split('|');
              if (b.length === 2) {
                const x = b[0];
                const y = b[1];
                this.$bus.$emit('fitQuadraticCurve', x, y);
              }
            }
          }

          if (data.message.startsWith('fitQuadraticCurve_minPoint:')) {
            const parts = data.message.split(':');

            const x = parts[1];
            const y = parts[2];
      
            this.$bus.$emit('fitQuadraticCurve_minPoint', x, y);
          }
          
          if (data.message.startsWith('TelescopePark:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const Switch = parts[1];
              this.$bus.$emit('MountParkSwitch',Switch);
            }
          }

          if (data.message.startsWith('TelescopeTrack:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const Switch = parts[1];
              this.$bus.$emit('MountTrackSwitch',Switch);
            }
          }
          
          // if (data.message.startsWith('TelescopeTotalSlewRate:')) {
          //   const parts = data.message.split(':');
          //   if (parts.length === 2) {
          //     const num = parts[1];
          //     this.$bus.$emit('MountTotalSlewRate',num);
          //   }
          // }

          if (data.message.startsWith('MountSetSpeedSuccess:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const num = parts[1];
              this.$bus.$emit('newMountSlewRate',num);
            }
          }

          if (data.message.startsWith('TelescopePierSide:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const Side = parts[1];
              this.$bus.$emit('updateMountPierSide',Side);
            }
          }

          if (data.message.startsWith('UpdateScheduleProcess:')) {
            const parts = data.message.split(':');
            if (parts.length === 3) {
              const RowNum = parts[1];
              const Process = parts[2];
              this.$bus.$emit('UpdateScheduleProcess', RowNum, Process);
            }
          }

          if (data.message.startsWith('StagingScheduleData:')) {
            console.log('------------------------------');
            const parts = data.message.split('[');

            if (parts.length > 0) {
              console.log('parts.length: ', parts.length);
              this.$bus.$emit('StagingScheduleData', data.message);
            }
            console.log('------------------------------');
          }

          if (data.message.startsWith('ExpTimeList:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              this.$bus.$emit('initExpTimeList', parts[1]);
            }
          }

          if (data.message.startsWith('CameraInExposuring:')) {
            this.$bus.$emit('CameraInExposuring');
          }

          if (data.message.startsWith('AutoFocusOver:')) {
            this.$bus.$emit('AutoFocusOver');
          }

          if (data.message.startsWith('CFWPositionMax:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              this.$bus.$emit('SetCFWPositionMax', parts[1]);

              for(let i = 1; i <= parts[1]; i++) {
                this.CFWConfigItems.push({ driverType: 'CFW', label: `CFW [${i}]`, value: '', inputType: 'text' });
              }

              this.$bus.$emit('AppSendMessage', 'Vue_Command', 'getCFWList');
            }
          }

          if (data.message.startsWith('SetCFWPositionSuccess:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              this.$bus.$emit('SetCFWPositionSuccess', parts[1]);
            }
          }

          if (data.message.startsWith('getCFWList:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              this.$bus.$emit('initCFWList', parts[1]);
            }
          }

          if (data.message.startsWith('GuiderSwitchStatus:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              this.$bus.$emit('GuiderSwitchStatus', parts[1]);
            }
          }

          if (data.message.startsWith('GuiderLoopExpStatus:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              this.$bus.$emit('GuiderLoopExpStatus', parts[1]);
            }
          }

          if (data.message.startsWith('TelescopeRADEC:')) {
            const parts = data.message.split(':');
            if (parts.length === 3) {
              this.UpdateCirclePos(parts[1], parts[2]);
            }
          }

          if (data.message.startsWith('TelescopeStatus:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              this.UpdateTelescopeStatus(parts[1]);
            }
          }

          if (data.message.startsWith('MainCameraStatus:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              this.UpdateMainCameraStatus(parts[1]);
            }
          }

          if (data.message.startsWith('ShowAllImageFolder:')) {
            const parts = data.message.split(':');
            if (parts.length === 3) {
              this.$bus.$emit('ShowAllImageFolder', parts[1],parts[2]);
            }
          }

          if (data.message.startsWith('USBCheck:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const USBdata = parts[1].split(',');
              console.log('USB name: ', USBdata[0]);
              console.log('USB space: ', USBdata[1]);

              this.$bus.$emit('USB_Name_Sapce', USBdata[0], USBdata[1]);
            }
          }
          
          if (data.message.startsWith('ImageSaveErroe:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const Erroe = parts[1];
              if (Erroe === 'USB-Null') {
                this.callShowMessageBox('No USB Drive Detected.','error');
              } else if (Erroe === 'USB-Multiple') {
                this.callShowMessageBox('Multiple USB drives detected, please remove excess USB drives','error');
              }
            }
          }

          if (data.message.startsWith('DetectedStars:')) {
            // this.$bus.$emit('ClearfitQuadraticCurve');
            const parts = data.message.split(':');
            console.log('Detected', parts.length, 'stars.');
            this.DetectedStarsList = [];
            for (let i = 0; i < parts.length; i++) {
              const a = parts[i];
              const b = a.split('|');
              if (b.length === 3) {
                const x = b[0];
                const y = b[1];
                const hfr = b[2];
                // console.log('Stars at(', x, ',', y, ') with HFR:', hfr);
                this.DetectedStarsList.push({x: x, y: y, hfr: hfr});
              }
            }
            this.DetectedStarsFinish = true;
          }

          if (data.message.startsWith('SolveImageResult:')) {
            const parts = data.message.split(':');
            if (parts.length === 5) {
              // this.UpdateCirclePos(parts[1], parts[2]);
              console.log('Solve Image Result(RA_Degree, DEC_Degree, Azimuth, Altitude):', parts[1], ',', parts[2], ',', parts[3], ',', parts[4]);
              this.SolveResultMark(parts[1], parts[2], parts[3], parts[4]);
            }
          }

          if (data.message.startsWith('SolveFovResult:')) {
            const parts = data.message.split(':');
            if (parts.length === 9) {
              // this.UpdateCirclePos(parts[1], parts[2]);
              // console.log('Solve Image Result(RA_Degree, DEC_Degree, Azimuth, Altitude):', parts[1], ',', parts[2], ',', parts[3], ',', parts[4]);
              const RaDec = [
                {Ra: parts[1], Dec: parts[2]},
                {Ra: parts[3], Dec: parts[4]},
                {Ra: parts[5], Dec: parts[6]},
                {Ra: parts[7], Dec: parts[8]},
              ];
              this.SolveFovMark(RaDec);
            }
          }

          if (data.message.startsWith('RealTimeSolveImageResult:')) {
            const parts = data.message.split(':');
            if (parts.length === 5) {
              // this.UpdateCirclePos(parts[1], parts[2]);
              // glLayer.remove(this.LastCircle_RaDec);
              // glLayer.remove(this.LastCircle_AzAlt);
              console.log('Solve Image Result(RA_Degree, DEC_Degree, Azimuth, Altitude):', parts[1], ',', parts[2], ',', parts[3], ',', parts[4]);
              const result = this.SolveResultMark_RealTime(parts[1], parts[2], parts[3], parts[4]);
              // this.LastCircle_RaDec = result.Circle_RaDec;
              // this.LastCircle_AzAlt = result.Circle_AltAz;
            }
          }

          if (data.message.startsWith('SolveImageFaild')) {
            this.callShowMessageBox('Solve image faild...','error');
          }

          if (data.message.startsWith('SetCurrentLocation')) {
            const parts = data.message.split(':');
            if (parts.length === 3) {
              this.$bus.$emit('SetCurrentLocation',parts[1], parts[2]);
              this.CurrentLocationLat = parts[1];
              this.CurrentLocationLng = parts[2];
            }
          }

          if (data.message.startsWith('MainCameraOffsetRange:')) {
            const parts = data.message.split(':');
            if (parts.length === 3) {
              console.log('MainCameraOffsetRange:', parts[1], ',', parts[2]);
              this.MainCameraOffsetMin = parts[1];
              this.MainCameraOffsetMax = parts[2];

              const OffsetItem = this.MainCameraConfigItems.find(item => item.label === 'Offset');
              if (OffsetItem) {
                console.log('MainCameraOffsetRange:', parseInt(this.MainCameraOffsetMin, 10), ',', parseInt(this.MainCameraOffsetMax, 10));
                OffsetItem.inputMin = parseInt(this.MainCameraOffsetMin, 10);
                OffsetItem.inputMax = parseInt(this.MainCameraOffsetMax, 10);
              }
            }
          }

          if (data.message.startsWith('MainCameraGainRange:')) {
            const parts = data.message.split(':');
            if (parts.length === 3) {
              console.log('MainCameraGainRange:', parts[1], ',', parts[2]);
              this.MainCameraGainMin = parts[1];
              this.MainCameraGainMax = parts[2];

              const gainItem = this.MainCameraConfigItems.find(item => item.label === 'Gain');
              if (gainItem) {
                console.log('MainCameraGainRange:', parseInt(this.MainCameraGainMin, 10), ',', parseInt(this.MainCameraGainMax, 10));
                gainItem.inputMin = parseInt(this.MainCameraGainMin, 10);
                gainItem.inputMax = parseInt(this.MainCameraGainMax, 10);
              }
            }
          }

          if (data.message.startsWith('OutPutPowerStatus:')) {
            const parts = data.message.split(':');
            if (parts.length === 3) {
              const index = parseInt(parts[1], 10);
              const value = parseInt(parts[2], 10);

              if (index === 1) {
                this.OutPutPower_1_ON = value === 1;
              } else if (index === 2) {
                this.OutPutPower_2_ON = value === 1;
              }
            }
          }

          if (data.message.startsWith('PHD2StarBoxView:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const view = parts[1];
              this.$bus.$emit('PHD2StarBoxView',view);
            }
          }

          if (data.message.startsWith('PHD2StarCrossView:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const view = parts[1];
              this.$bus.$emit('PHD2StarCrossView',view);
            }
          }

          if (data.message.startsWith('PHD2StarBoxPosition:')) {
            const parts = data.message.split(':');
            if (parts.length === 5) {
              const PHD2ImageSize_X = parseInt(parts[1], 10);
              const PHD2ImageSize_Y = parseInt(parts[2], 10);
              const Box_X = parseInt(parts[3], 10);
              const Box_Y = parseInt(parts[4], 10);
              this.DrawPHD2Box(PHD2ImageSize_X, PHD2ImageSize_Y, Box_X, Box_Y);
            }
          }

          if (data.message.startsWith('PHD2StarCrossPosition:')) {
            const parts = data.message.split(':');
            if (parts.length === 5) {
              const PHD2ImageSize_X = parseInt(parts[1], 10);
              const PHD2ImageSize_Y = parseInt(parts[2], 10);
              const Cross_X = parseInt(parts[3], 10);
              const Cross_Y = parseInt(parts[4], 10);
              this.DrawPHD2Cross(PHD2ImageSize_X, PHD2ImageSize_Y, Cross_X, Cross_Y);
            }
          }

          if (data.message.startsWith('QTClientVersion:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              this.QTClientVersion = parts[1];
            }
          }

          
        }
        else if (data.type === 'QT_Confirm') {
          // 处理确认消息
          const messageId = data.msgid;
          this.handleMessageResponse(messageId);
        }
        
        this.receivedMessages.push(data.message); // 将接收到的消息添加到数组中
      };

      this.websocket.onerror = (error) => {
        console.log('QHYCCD | WebSocket Error:', error);
      };

      this.websocket.onclose = () => {
        console.log('QHYCCD | WebSocket disconnected');
        this.websocketState = '已断开';
        this.networkDisconnected = true; // WebSocket连接关闭时设置网络连接状态
        console.log('QHYCCD | WebSocket disconnected');
        this.callShowMessageBox('WebSocket disconnected','error');
        this.$bus.$emit('ShowNetStatus', 'false');
        // 启动自动重连
        this.reconnectWebSocket();
      };
    },

    // 自动重连
    reconnectWebSocket() {
      setTimeout(() => {
        console.log('QHYCCD | WebSocket reconnected');
        this.connect();
      }, 2000); // 2秒后尝试重新连接
    },
    // 自动重连

    //监听网络连接状态
    setupNetworkStatusListener() {
      window.addEventListener('online', () => {
        this.networkDisconnected = false; // 网络恢复时重置网络连接状态
        this.callShowMessageBox('WebSocket connected','success');
        this.$bus.$emit('ShowNetStatus', 'true');
        this.StatusRecovery();
        this.reconnectWebSocket(); // 网络恢复后自动重连WebSocket
      });

      window.addEventListener('offline', () => {
        this.networkDisconnected = true; // 网络断开时设置网络连接状态
        this.callShowMessageBox('WebSocket disconnected','error');
        this.$bus.$emit('ShowNetStatus', 'false');
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
    callShowMessageBox(msg,type) {
      console.log('QHYCCD | callShowMessageBox:',msg,type);
      this.$bus.$emit('showMsgBox', msg, type);
    },
    // 消息框

    locationClicked: function () {
      this.$store.commit('toggleBool', 'showLocationDialog')
    },

    StatusRecovery() {
      this.getQTClientVersion();
      this.sendMessage('Vue_Command', 'getConnectedDevices');
      this.sendMessage('Vue_Command', 'getStagingImage');
      this.sendMessage('Vue_Command', 'getStagingScheduleData');
      this.sendMessage('Vue_Command', 'getStagingSolveResult');
      this.sendMessage('Vue_Command', 'getGPIOsStatus');
    },

    openPowerManagerPage() {
      this.isOpenDevicePage = false;
      this.isOpenPowerPage = true;

      // window.setHighFrameRate(true); // 使用全局函数更新帧率

      this.drawer_2 = true;
    },

    selectDevice(device) {
      this.isOpenDevicePage = true;
      this.isOpenPowerPage = false;

      if (device.isget === false) {
        // device.isget = true;
        this.sendMessage('Vue_Command', 'SelectIndiDriver:' + device.type + ":" + device.ListNum);
        this.drivers = [];
      }

      this.CurrentDriverType = device.driverType;
      this.DeviceIsConnected = device.isConnected;

      // this.toggleStoreValue(device.dialogStateVar);

      this.drawer_2 = true;

      this.ToBeConnectDevice = [];
      this.devicesList.forEach(devicesList => {
        if (devicesList.type === this.CurrentDriverType) {
          this.ToBeConnectDevice.push(devicesList);
        }
      });

      // this.BeforeChangeConfigItems = this.CurrentConfigItems();
    },

    CurrentConfigItems() {
      console.log('CurrentConfigItems: ',this.CurrentDriverType + 'ConfigItems');
      switch (this.CurrentDriverType) {
        case 'Guider':
          return this.GuiderConfigItems;
        case 'MainCamera':
          return this.MainCameraConfigItems;
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
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ConfirmIndiDriver:' + this.selectedDriver);
      this.confirmDriverType = this.CurrentDriverType;
      this.loadingSelectDriver = true;

      this.devices.forEach(device => {
        if (device.driverType === this.CurrentDriverType) {
          device.driverName = this.selectedDriver;
        }
      });
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
          device.device = ' [ '+newDevice+' ] ';
        }
      });
    },

    updateDevices_(ListNum, newDevice) {    // 从文件导入
      this.devices.forEach(device => {
        if (device.ListNum === ListNum) {
          device.device = ' [ '+newDevice+' ] ';
        }
      });
      this.loadingConnectAllDevice = false;
    },

    updateDevicesConnect(type, newDevice) {    // 连接成功
      this.devices.forEach(device => {
        if (device.driverType === type) {
          device.device = ' [ '+newDevice+' ] ';
          device.isConnected = true;
        }
      });
      this.callShowMessageBox( newDevice + ' success connected','success');
      this.loadingConnectAllDevice = false;

      if (type === 'MainCamera') {
        this.$bus.$emit('MainCameraConnected', 1);
        console.log('MainCamera is Connected.');
      } else if (type === 'Mount') {
        this.$bus.$emit('MountConnected', 1);
        console.log('Mount is Connected.');
      }
    },

    connectAllDevice()
    {
      console.log("QHYCCD | connectAllDevice.");
      this.sendMessage('Vue_Command', 'connectAllDevice');
      this.loadingConnectAllDevice = true;
    },

    disconnectAllDevice(confirm) {
      // 检查是否有设备的 isConnected 属性为 true
      const hasConnectedDevices = this.devices.some(device => device.isConnected);

      if (hasConnectedDevices) { 
        if(confirm === false) {
          this.ShowConfirmDialog('Confirm', 'Are you sure you want to disconnect all devices?', 'disconnectAllDevice');
        } else {
          this.sendMessage('Vue_Command', 'disconnectAllDevice');
          this.devices.forEach(device => {
            device.isConnected = false;
            // device.device = '';
          });

          // this.$bus.$emit('MainCameraConnected', 0);
          // this.$bus.$emit('MountConnected', 0);
          this.claerDeviceList();
        }
      } else {
        console.log("没有设备连接");
        this.callShowMessageBox('No devices have been connected.', 'error');
      }
    },

    claerDeviceList() {
      this.devices.forEach(device => {
        device.isConnected = false;
        device.isget = false;
        device.device = ''; 
        device.driverName = '';
      });
      this.ToBeConnectDevice = [];
      this.devicesList = [];
      this.drivers = [];
    },

    SwitchOutPutPower(index, isPowerON) {
      if (isPowerON) { 
        this.drawer_2 = false;
        this.ShowConfirmDialog('Output Power:' + index, 'Are you sure you want to turn off this output power?', 'SwitchOutPutPower');
      } else {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'SwitchOutPutPower:' + index);
      }
    },

    ReturnConnectedDevices() {
      this.devices.forEach(device => {
        if (device.driverType === 'MainCamera') {
          if(device.isConnected === true){
            this.$bus.$emit('MainCameraConnected', 1);
            console.log('MainCamera is Connected.');
          }
        } else if (device.driverType === 'Mount') {
          if(device.isConnected === true){
            this.$bus.$emit('MountConnected', 1);
            console.log('Mount is Connected.');
          }
        }
      });
    },

    OpenIamgeFolder() {
      this.$bus.$emit('ImageManagerPanelOpen');
      this.nav = false;
    },

    CurrentExpTimeList(index, value) {
      const expTimeIndex = this.MainCameraConfigItems.findIndex(item => item.label === 'ExpTime [' + (index + 1) + ']');
      if (expTimeIndex !== -1) { // 确保找到了对应的配置项
        // 更新 ExpTime1 配置项的值
        this.MainCameraConfigItems[expTimeIndex].value = value;
      } else {
        console.error('ExpTime [' + index + '] configuration item not found.');
      }
    },

    CurrentCFWList(index, value) {
      const expTimeIndex = this.CFWConfigItems.findIndex(item => item.label === 'CFW [' + (index + 1) + ']');
      if (expTimeIndex !== -1) { // 确保找到了对应的配置项
        // 更新 ExpTime1 配置项的值
        this.CFWConfigItems[expTimeIndex].value = value;
      } else {
        console.error('CFW [' + index + '] configuration item not found.');
      }
    },

    // confirmConfiguration(item) {
    //   console.log(`QHYCCD | confirmConfiguration: ${item.value}`);
    //   switch (item.driverType) {
    //     case 'Guider':
          
    //     case 'MainCamera':
    //       this.$bus.$emit(item.label, item.label + ':' + item.value);
    //     case 'Mount':

    //     case 'Telescope':

    //     case 'Focuser':
    //         this.$bus.$emit(item.label, item.value);  //RedBox Side Length (px)
          
    //     case 'PoleCamera':
          
    //     case 'CFW':
    //       if (item.label.startsWith('CFW [')) {
    //         this.$bus.$emit('CFWvalue', item.label+':'+item.value);
    //       }
    //       else {
    //         this.$bus.$emit(item.label, item.label+':'+item.value);
    //       }
    //   }
    // },

    confirmConfiguration(List) {
      List.forEach(item => {
        if (item.value !== '') {
          console.log(item.label, item.value);
          this.$bus.$emit(item.label, item.label + ':' + item.value);
        }
      });
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
        };

        img.src = imagePath;
      }
    },

    ImageGainSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const doubleValue = parseFloat(value); // 将值转换为 double 类型

      if (signal === 'ImageGainR') {
        // 处理 ImageGainR 信号
        this.ImageGainR = doubleValue;
        console.log('ImageGainR is set to:', doubleValue);
      } else if (signal === 'ImageGainB') {
        // 处理 ImageGainB 信号
        this.ImageGainB = doubleValue;
        console.log('ImageGainB is set to:', doubleValue);
      }
    },

    CameraOffsetSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const doubleValue = parseFloat(value); // 将值转换为 double 类型

      console.log('CameraOffset is set to:', doubleValue);
    },

    ImageOffsetSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const doubleValue = parseFloat(value); // 将值转换为 double 类型

      this.ImageOffset = doubleValue;
      console.log('Image Offset is set to:', doubleValue);
    },

    BinningSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const IntValue = parseInt(value); // 将值转换为 double 类型

      console.log('Image Binning is set to:', IntValue);
      this.sendMessage('Vue_Command', 'SetBinning:' + IntValue);
    },

    ImageCFASet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值

      if (['GR', 'GB', 'BG', 'RGGB'].includes(value)) {
        this.ImageCFA = value;
        console.log('ImageCFA is set to:', value);
      } else {
        console.log(`Invalid value for ImageCFA: '${value}'. Please set it to one of 'GR', 'GB', 'BG', 'RGGB'.`);
        this.callShowMessageBox(`Invalid value for ImageCFA: '${value}'. Please set it to one of 'GR', 'GB', 'BG', 'RGGB'.`,'error');
      }
    },

    // async readBinFile(fileName) {
    //   console.log('CaptureTestTime | Read image data start.');
    //   const startTime = new Date();

    //   try {
    //     const response = await fetch(fileName);
    //     if (!response.ok) {
    //       throw new Error('Network response was not ok');
    //     }

    //     const blob = await response.blob();

    //     const fileReader = new FileReader();
    //     fileReader.onload = () => {
    //       const arrayBuffer = fileReader.result;

    //       const endTime = new Date();
    //       const elapsedTime = endTime.getTime() - startTime.getTime();
    //       console.log('CaptureTestTime | Read image data end:', elapsedTime, 'milliseconds');
    //       this.callShowMessageBox(`Read image data end: '${elapsedTime}' milliseconds.`,'msg');

    //       this.processImage(arrayBuffer);
    //     };
    //     fileReader.onerror = (error) => {
    //       console.error('FileReader error:', error);
    //     };
    //     fileReader.readAsArrayBuffer(blob);
    //   } catch (error) {
    //     console.error('There was a problem with the fetch operation:', error);
    //   }
    // },

    async readBinFile(fileName) {
      console.log('CaptureTestTime | Read image data start.');
      const startTime = new Date();

      try {
        // Fetch with progress tracking
        const response = await fetch(fileName);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const contentLength = response.headers.get('content-length');
        if (!contentLength) {
          throw new Error('Content-Length header is missing');
        }

        const total = parseInt(contentLength, 10);
        let loaded = 0;

        const reader = response.body.getReader();
        const stream = new ReadableStream({
          start: (controller) => {
            const push = () => {
              reader.read().then(({ done, value }) => {
                if (done) {
                  controller.close();
                  return;
                }
                loaded += value.byteLength;
                const percent = (loaded / total) * 100;
                console.log(`Progress: ${Math.round(percent)}%`); 
                this.updateCaptureImageProgress(Math.round(percent));
                controller.enqueue(value);
                push();
              }).catch(error => {
                console.error('Stream reading error:', error);
                controller.error(error);
              });
            };
            push();
          }
        });

        const newResponse = new Response(stream);
        const blob = await newResponse.blob();

        // FileReader with progress tracking
        const fileReader = new FileReader();
        fileReader.onload = () => {
          this.ImageArrayBuffer = fileReader.result;

          const endTime = new Date();
          const elapsedTime = endTime.getTime() - startTime.getTime();
          console.log('CaptureTestTime | Read image data end:', elapsedTime, 'milliseconds');
          if (!this.isPolarAxisMode) {
            this.callShowMessageBox(`Read image data end: '${elapsedTime}' milliseconds.`, 'msg');
          }

          this.processImage(this.ImageArrayBuffer);
        };

        fileReader.onerror = (error) => {
          console.error('FileReader error:', error);
        };

        fileReader.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentLoaded = (event.loaded / event.total) * 100;
            console.log(`FileReader Progress: ${Math.round(percentLoaded)}%`); // Update this with your progress UI update logic
            this.updateCaptureImageProgress(Math.round(percentLoaded));
          }
        };

        fileReader.readAsArrayBuffer(blob);
      } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
      }
    },

    updateCaptureImageProgress(num) {
      this.$bus.$emit('ShowCaptureImageProgress', num);
    },

    setImageProportion(value) {
      this.ImageProportion = value;
    },

    processImage(imgArray) {
      console.log('CaptureTestTime | Process image data start.');
      const startTime = new Date();

      // 获取 ArrayBuffer 数据视图
      const dataView = new DataView(imgArray);

      // 将 ArrayBuffer 转换为 Uint16Array
      const uint16Array = new Uint16Array(dataView.buffer);

      // 设置画布宽高常量
      const canvasWidth = parseInt(this.mainCameraSizeX);
      const canvasHeight = parseInt(this.mainCameraSizeY);

      // 获取原始画布和修改后的画布以及对应上下文
      const modifiedCanvas = document.getElementById('mainCamera-canvas');
      const modifiedCtx = modifiedCanvas.getContext('2d');

      modifiedCtx.clearRect(0, 0, modifiedCanvas.width, modifiedCanvas.height);

      modifiedCanvas.width = canvasWidth;
      modifiedCanvas.height = canvasHeight;

      // 用户自定义参数
      // let gainR = 1.0;
      let gainR = this.ImageGainR;
      // let gainB = 1.0;
      let gainB = this.ImageGainB;
      // let offset = 0;
      let offset = this.ImageOffset;
      // let CFA = 'BG';
      let CFA = this.ImageCFA;
      let mode = 1;
      
      // 参数
      let B = 0;
      let W = 65535;
      let cvmode = 0;

      let mat = new cv.Mat(canvasHeight, canvasWidth, cv.CV_16UC1);
      mat.data16U.set(uint16Array);

      let colorData;
      let img8 = new cv.Mat();

      if (CFA === 'GR') {
        cvmode = cv.COLOR_BayerGR2RGBA;
      } else if (CFA === 'GB') {
        cvmode = cv.COLOR_BayerGB2RGBA;
      } else if (CFA === 'BG') {
        cvmode = cv.COLOR_BayerBG2RGBA;
      } else if (CFA === 'RGGB') {
        cvmode = cv.COLOR_BayerRG2RGBA;
      }
      // 对目标图像进行颜色转换
      let dst = new cv.Mat();
      try {
        cv.cvtColor(mat, dst, cvmode);
      } catch (error) {
        console.error('cvtColor 出错:', error);
        return
      }

      mat.delete();

      let resizeImg = new cv.Mat();

      // Resize the image
      cv.resize(dst, resizeImg, new cv.Size(4096, 2160), 0, 0, cv.INTER_LINEAR);  // 2048, 1080   4096, 2160

      dst.delete();

      modifiedCanvas.width = 4096;
      modifiedCanvas.height = 2160;

      let targetImg16 = this.ImageSoftAWB(resizeImg, gainR, gainB, offset);
      // 检查目标图像数据是否有效
      if (!targetImg16 || targetImg16.empty() || !(targetImg16 instanceof cv.Mat) || targetImg16.channels() !== 4) {
        console.error('错误: 目标图像数据无效');
        return;
      }

      resizeImg.delete();

      const { blackLevel, whiteLevel } = this.GetAutoStretch(uint16Array, mode);
      B = blackLevel;
      W = whiteLevel;
      // console.log('Stretch to:', B, ',', W);
      // 对目标图像进行位深度转换
      img8 = this.Bit16To8_Stretch(targetImg16, B, W);
      if (img8.empty() || img8.rows === 0 || img8.cols === 0) {
        console.error('img8 为空或大小为0');
        return;
      }

      targetImg16.delete();

      if (this.isPolarAxisMode) {
        this.$bus.$emit('showSolveImage', img8);
      } 
      else {
        // 创建用于绘制的 ImageData 对象，并在修改后的画布上绘制图像
        colorData = new ImageData(new Uint8ClampedArray(img8.data), img8.cols, img8.rows);

        this.OriginalImage = colorData;
        this.drawImgData = this.OriginalImage;
        this.drawImageData(this.drawImgData);

        const endTime = new Date();
        const elapsedTime = endTime.getTime() - startTime.getTime();
        console.log('CaptureTestTime | Process image data end:', elapsedTime, 'milliseconds');

        this.$bus.$emit('showCaptureImage');

        this.MakeHistogram(colorData);
        this.histogramImage = colorData;

        // 检查 DetectedStarsFinish 变量
        const checkDetectedStarsFinish = () => {
          console.log('Wait for Detect Stars finish...');
          if (this.DetectedStarsFinish) {
            // 如果 DetectedStarsFinish 为 true，执行星点检测并清除定时器
            this.detectStarsImg = this.DrawDetectStars(img8, this.DetectedStarsList);
            img8.delete();
            clearInterval(intervalId);
          }
        };

        // 设置一个定时器，每隔 100 毫秒检查一次 DetectedStarsFinish 变量
        const intervalId = setInterval(checkDetectedStarsFinish, 1000);
      }
    },

    initCanvas() {
      this.bufferCanvas = document.createElement('canvas');
      this.bufferCtx = this.bufferCanvas.getContext('2d');
    },

    SwitchImageToShow(isOriginal) {
      console.log('Show Original Image: ', isOriginal);
      if(isOriginal) {
        this.drawImgData = this.OriginalImage;
      } else {
        this.drawImgData = this.detectStarsImg;
      }
      
      this.drawImageData(this.drawImgData);
    },

    drawImageData(colorData) {
      // Clear buffer canvas
      this.bufferCtx.clearRect(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);

      // 计算可见区域的位置和大小
      const visibleWidth = this.bufferCanvas.width / this.scale;
      const visibleHeight = this.bufferCanvas.height / this.scale;
      const visibleX = -this.translateX / this.scale;
      const visibleY = -this.translateY / this.scale;

      // 裁剪 buffer canvas，只绘制可见区域
      this.bufferCtx.save();
      this.bufferCtx.beginPath();
      this.bufferCtx.rect(visibleX, visibleY, visibleWidth, visibleHeight);
      this.bufferCtx.clip();

      // Draw ImageData on buffer canvas
      this.bufferCanvas.width = colorData.width;
      this.bufferCanvas.height = colorData.height;
      this.bufferCtx.putImageData(colorData, 0, 0);

      // 计算调整后的高度
      const adjustedHeight = colorData.height * this.ImageProportion;

      // 绘制图像
      this.bufferCtx.drawImage(this.bufferCanvas, this.translateX, this.translateY, colorData.width * this.scale, adjustedHeight * this.scale);
      this.imageWidth = colorData.width * this.scale;
      this.imageHeight = adjustedHeight * this.scale;

      // 恢复 buffer canvas 状态
      this.bufferCtx.restore();

      // Draw buffer canvas on main canvas
      const canvas = this.$refs.mainCanvas;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(this.bufferCanvas, 0, 0);
    },

    addEventListeners() {
      const canvas = this.$refs.mainCanvas;
      let isDragging = false;
      let lastX = 0;
      let lastY = 0;

      const throttledTouchMove = this.throttle((event) => {
        event.preventDefault();
        if (isDragging) {
          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;

          const deltaX = (event.touches[0].clientX - lastX) * (this.imageWidth/windowWidth) / this.scale;
          const deltaY = (event.touches[0].clientY - lastY) * (this.imageHeight/windowHeight) / this.scale;

          this.translateX += deltaX;
          this.translateY += deltaY;

          const minTranslateX = this.imageWidth - 4096;
          const minTranslateY = this.imageHeight - 2160;

          this.translateX = Math.min(Math.max(this.translateX, -minTranslateX), 0);
          this.translateY = Math.min(Math.max(this.translateY, -minTranslateY), 0);

          // console.log('Move to: ' + Math.floor(-this.translateX/4096*windowWidth) + ', ' + Math.floor(-this.translateY/2160*windowHeight));
          this.$bus.$emit('RedBoxOffset', Math.floor(-this.translateX/4096*windowWidth), Math.floor(-this.translateY/2160*windowHeight));

          const ScaleImageSize_X = Math.floor(minTranslateX / 4096 * windowWidth + windowWidth);
          const ScaleImageSize_Y = Math.floor(minTranslateY / 2160 * windowHeight + windowHeight);
          // console.log('ScaleImageSize: ' + ScaleImageSize_X + ', ' + ScaleImageSize_Y);
          this.$bus.$emit('ScaleImageSize', ScaleImageSize_X, ScaleImageSize_Y);

          lastX = event.touches[0].clientX;
          lastY = event.touches[0].clientY;
          this.drawImageData(this.drawImgData);
        }
      }, 100); // 100 毫秒内最多执行一次

      const throttledGesturechange = this.throttle((event) => {
        event.preventDefault();
        const delta = event.scale > 1 ? 0.1 : -0.1;
        this.scale += delta;
        this.scale = Math.min(Math.max(this.scale, 1), 3);
        this.translateX = 0;
        this.translateY = 0;
        this.drawImageData(this.drawImgData);
        this.$bus.$emit('RedBoxScale', this.scale);
        this.$bus.$emit('RedBoxOffset', 0, 0);
      }, 100); // 100 毫秒内最多执行一次

      canvas.addEventListener('mousedown', (event) => {
        event.preventDefault();
        isDragging = true;
        lastX = event.offsetX;
        lastY = event.offsetY;
        this.$bus.$emit('RedBox_XY', lastX, lastY);
      });

      canvas.addEventListener('mousemove', (event) => {
        event.preventDefault();
        if (isDragging) {
          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;

          const deltaX = (event.offsetX - lastX) * (this.imageWidth/windowWidth) / this.scale;
          const deltaY = (event.offsetY - lastY) * (this.imageHeight/windowHeight) / this.scale;

          this.translateX += deltaX;
          this.translateY += deltaY;

          const minTranslateX = this.imageWidth - 4096;
          const minTranslateY = this.imageHeight - 2160;

          this.translateX = Math.min(Math.max(this.translateX, -minTranslateX), 0);
          this.translateY = Math.min(Math.max(this.translateY, -minTranslateY), 0);

          console.log('Move to: ' + this.translateX + ', ' + this.translateY);
          this.$bus.$emit('RedBoxOffset', Math.floor(-this.translateX/4096*windowWidth), Math.floor(-this.translateY/2160*windowHeight));

          const ScaleImageSize_X = Math.floor(minTranslateX / 4096 * windowWidth + windowWidth);
          const ScaleImageSize_Y = Math.floor(minTranslateY / 2160 * windowHeight + windowHeight);
          // console.log('ScaleImageSize: ' + ScaleImageSize_X + ', ' + ScaleImageSize_Y);
          this.$bus.$emit('ScaleImageSize', ScaleImageSize_X, ScaleImageSize_Y);

          lastX = event.offsetX;
          lastY = event.offsetY;
          this.drawImageData(this.drawImgData);
        }
      });

      canvas.addEventListener('mouseup', () => {
        isDragging = false;
      });

      canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        this.scale += delta;
        this.scale = Math.min(Math.max(this.scale, 1), 3);
        this.translateX = 0;
        this.translateY = 0;
        this.drawImageData(this.drawImgData);
        this.$bus.$emit('RedBoxScale', this.scale);
        this.$bus.$emit('RedBoxOffset', 0, 0);
      });

      // 添加触摸事件监听
      canvas.addEventListener('touchstart', (event) => {
        event.preventDefault();
        isDragging = true;
        lastX = event.touches[0].clientX;
        lastY = event.touches[0].clientY;
        this.$bus.$emit('RedBox_XY', event);
      });

      canvas.addEventListener('touchmove', throttledTouchMove);

      canvas.addEventListener('touchend', () => {isDragging = false; });

      // 添加缩放功能
      canvas.addEventListener('gesturechange', throttledGesturechange);
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

    ImageSoftAWB (img16, gainR, gainB, offset) {
      // 分离通道
      let channels = new cv.MatVector();
      cv.split(img16, channels);

      // 减去偏移量并乘以增益
      for (let i = 0; i < channels.size(); i++) {
        let channel = channels.get(i);
        channel.convertTo(channel, -1, 1, offset); // 减去偏移量
        if (i === 0) {
          channel.convertTo(channel, -1, gainR, 0); // 乘以增益
        } else if (i === 2) {
          channel.convertTo(channel, -1, gainB, 0); // 乘以增益
        }
        channel.delete(); // 手动释放内存
      }

      // 合并通道
      let mergedImg = new cv.Mat();
      cv.merge(channels, mergedImg);

      // 释放资源
      channels.delete();

      return mergedImg;
    },

    Bit16To8_Stretch(img16, B, W) {
      // console.time('Bit16To8处理时间');
      let img8 = new cv.Mat();
      img8.create(img16.rows, img16.cols, cv.CV_8UC4);
      img16.convertTo(img8, cv.CV_8U, 255.0 / (W - B), -B * 255.0 / (W - B));
      // console.log('转换完成！');
      // console.timeEnd('Bit16To8处理时间');
      return img8;
    },

    DrawDetectStars(image, Stars) {
      console.log('Draw circle on the Capture Image(', image.cols, ',', image.rows, ').');
      if (!(image instanceof cv.Mat)) {
        throw new Error('Invalid image data');
      }
      Stars.forEach(star => {
        // 将坐标和半径转换为整数
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

    DrawPHD2Box(PHD2ImageSize_X, PHD2ImageSize_Y, Box_X, Box_Y) {
      const ratioZoomX = PHD2ImageSize_X / window.innerWidth;
      const ratioZoomY = PHD2ImageSize_Y / window.innerHeight;

      const BoxWidth = 20 / ratioZoomX;
      const BoxHeight = 20 / ratioZoomY;

      const BoxStartX = Box_X / ratioZoomX - BoxWidth / 2;
      const BoxStartY = Box_Y / ratioZoomY - BoxHeight / 2;

      this.$bus.$emit('PHD2BoxPosition', BoxStartX, BoxStartY, BoxWidth, BoxHeight);
    },

    DrawPHD2Cross(PHD2ImageSize_X, PHD2ImageSize_Y, Cross_X, Cross_Y) {
      const ratioZoomX = PHD2ImageSize_X / window.innerWidth;
      const ratioZoomY = PHD2ImageSize_Y / window.innerHeight;

      const CrossStartX = Cross_X / ratioZoomX;
      const CrossStartY = Cross_Y / ratioZoomY;

      this.$bus.$emit('PHD2CrossPosition', CrossStartX, CrossStartY);
    },

    GetAutoStretch(imgData, mode) {
      const mean = imgData.reduce((sum, value) => sum + value, 0) / imgData.length;
      const std = Math.sqrt(imgData.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / imgData.length);

      let a, b;
      switch (mode) {
        case 0:
          a = 3;
          b = 5;
          break;
        case 1:
          a = 2;
          b = 5;
          break;
        case 2:
          a = 3;
          b = 8;
          break;
        default:
          a = 2;
          b = 8;
      }

      let bx = Math.max(0, mean - std * a);
      let wx = Math.min(65535, mean + std * b);

      let blackLevel = Math.round(bx);
      let whiteLevel = Math.round(wx);
      return { blackLevel, whiteLevel };
    },

    fetchImage(imagePath) {
      const url = imagePath;
      const xhr = new XMLHttpRequest();
      
      xhr.responseType = 'blob'; // 设置响应类型为 blob

      xhr.onload = () => {
        if (xhr.status === 200) {
          const imageUrl = URL.createObjectURL(xhr.response);
          // 在这里，您可以将 imageUrl 设置到某个 <img> 元素上，或者做其他处理
          this.$bus.$emit('showCaptureImage');
          this.displayImageOnCanvas(imageUrl); // 将图像显示在Canvas上
        } else {
          console.error('Failed to fetch the image. Status:', xhr.status);
        }
      };

      xhr.onerror = () => {
        console.error('There was an error fetching the image.');
      };

      xhr.open('GET', url, true);
      xhr.send();
    },

    displayImageOnCanvas(imageUrl) {
      const showcanvas = document.getElementById('mainCamera-canvas');
      const canvas = document.getElementById('TestCanvas');
      const showctx = showcanvas.getContext('2d');
      const ctx = canvas.getContext('2d');
      showcanvas.width = 4096;
      showcanvas.height = 2160;
      console.log('QHYCCD | canvas size:', showcanvas.width, showcanvas.height);

      const img = new Image();
      img.setAttribute('crossOrigin', '');
      img.onload = () => {
        this.histogramImage = img;

        // 计算图像的缩放比例以使其铺满固定大小的 Canvas
        const scaleWidth = showcanvas.width / img.width;
        const scaleHeight = showcanvas.height / img.height;

        const width = img.width * scaleWidth;
        const height = img.height * scaleHeight;

        // 清空 Canvas
        showctx.clearRect(0, 0, showcanvas.width, showcanvas.height);
        ctx.clearRect(0, 0, showcanvas.width, showcanvas.height);

        // 在 Canvas 上绘制图像
        showctx.drawImage(img, 0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        console.log('QHYCCD | crossOrigin:', img.crossOrigin);
        this.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        console.log('QHYCCD | imageData:', this.imageData);
        this.MakeHistogram(this.imageData);
      };
      img.src = imageUrl;
    },

    MakeHistogram(imageData) {
      console.log('MakeHistogram');

      // 计算三个通道的直方图
      this.histogramData = this.calculateHistogram(imageData);

      this.$bus.$emit('showHistogram', this.histogramData);
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
      if (cv && this.histogramImage) {
        // Create cv.Mat object from image data
        const src = cv.matFromImageData(this.histogramImage);

        // Perform the histogram stretch (similar to the C++ code)
        const channels = new cv.MatVector();
        cv.split(src, channels); // Split channels (BGR) into separate Mat objects

        // Iterate over each channel and apply histogram stretching
        for (let i = 0; i < channels.size(); i++) {
          let channel = channels.get(i);

          // Calculate alpha and beta for each channel
          let alpha = 255.0 / (Max - Min);
          let beta = -Min * alpha;
          this.$bus.$emit('ChangeDialPosition', Min, Max);

          if (alpha < 0) {
            alpha = 0;
            beta = 0;
          } else if (alpha > 255) {
            alpha = 255;
            beta = 0;
          }

          // Apply histogram stretching to the channel
          channel.convertTo(channel, -1, alpha, beta);

          // Release the memory of channel
          channel.delete();
        }

        // Merge the channels back into a single image
        const stretchImage = new cv.Mat();
        cv.merge(channels, stretchImage);

        // Release the memory of channels
        channels.delete();

        // Display the stretched image on a canvas
        const canvas = document.getElementById('mainCamera-canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size to match the image
        canvas.width = stretchImage.cols;
        canvas.height = stretchImage.rows;

        this.drawImgData = new ImageData(new Uint8ClampedArray(stretchImage.data), stretchImage.cols, stretchImage.rows);

        // Draw the image on canvas
        this.drawImageData(this.drawImgData);

        // Clean up
        src.delete();
        stretchImage.delete();
      }
    },

    setAutoHistogramNum(min, max) {
      this.histogram_min = min;
      this.histogram_max = max;
    },

    calcWhiteBalanceGains() {
      const Gains = this.calculateWhiteBalanceGains(this.histogramData, this.ImageOffset);

      this.ImageGainR = Gains.GainR;
      this.ImageGainB = Gains.GainB;

      const GainRIndex = this.MainCameraConfigItems.findIndex(item => item.label === 'ImageGainR');
      if (GainRIndex !== -1) { // 确保找到了对应的配置项
        // 更新 ExpTime1 配置项的值
        this.MainCameraConfigItems[GainRIndex].value = this.ImageGainR;
      } else {
        console.error('ImageGainR configuration item not found.');
      }

      const GainBIndex = this.MainCameraConfigItems.findIndex(item => item.label === 'ImageGainB');
      if (GainBIndex !== -1) { // 确保找到了对应的配置项
        // 更新 ExpTime1 配置项的值
        this.MainCameraConfigItems[GainBIndex].value = this.ImageGainB;
      } else {
        console.error('ImageGainB configuration item not found.');
      }

      this.processImage(this.ImageArrayBuffer);
    },

    calculateWhiteBalanceGains(histogram, offset) {
      let sumR = 0, sumG = 0, sumB = 0;
      let countR = 0, countG = 0, countB = 0;

      // for (let i = 0; i < 256; i++) {
      //   sumR += histogram[2][i] * i;
      //   sumG += histogram[1][i] * i;
      //   sumB += histogram[0][i] * i;

      //   countR += histogram[2][i];
      //   countG += histogram[1][i];
      //   countB += histogram[0][i];
      // }

      for (let i = 0; i < 256; i++) {
        // Subtract offset from pixel value
        const adjustedR = Math.max(i - offset, 0);
        const adjustedG = Math.max(i - offset, 0);
        const adjustedB = Math.max(i - offset, 0);

        sumR += histogram[2][i] * adjustedR;
        sumG += histogram[1][i] * adjustedG;
        sumB += histogram[0][i] * adjustedB;

        countR += histogram[2][i];
        countG += histogram[1][i];
        countB += histogram[0][i];
      }

      const meanR = sumR / countR;
      const meanG = sumG / countG;
      const meanB = sumB / countB;

      // Calculate gains
      const GainR = meanG / meanR;
      const GainB = meanG / meanB;

      console.log(`GainR: ${GainR}, GainB: ${GainB}`);
      return { GainR, GainB };
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

    // loadOpenCv() {
    //   return new Promise((resolve, reject) => {
    //     if (typeof cv === 'undefined') {
    //       const script = document.createElement('script');
    //       script.src = 'https://docs.opencv.org/4.5.5/opencv.js';
    //       script.async = true;
    //       script.onload = () => {
    //         if (typeof cv !== 'undefined') {
    //           resolve();
    //         } else {
    //           reject(new Error('Failed to load OpenCV.js'));
    //         }
    //       }
    //       script.onerror = (error) => {
    //         reject(error);
    //       }
    //       document.head.appendChild(script);
    //     } else {
    //       resolve();
    //     }
    //   });
    // },

    onCvReady() {
      
      // Test if some of opencv method can work.
      if (cv) {
        console.log("QHYCCD | OpenCV.js is ready.");
      } else {
        console.log("QHYCCD | Failed to load OpenCV.js");
      }

      this.cvReady = true;
    },


    loadImageToCanvasMainCamera: function () {
      const canvas = document.getElementById('mainCamera-canvas')
      const ctx = canvas.getContext('2d')
      const image = new Image()
      image.onload = () => {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        // const imageAspectRatio = image.width / image.height
        // if (canvas.width / canvas.height > imageAspectRatio) {
        //   ctx.drawImage(image, 0, 0, canvas.height * imageAspectRatio, canvas.height)
        // } else {
        //   ctx.drawImage(image, 0, 0, canvas.width, canvas.width / imageAspectRatio)
        // }
      }
      image.src = 'https://www.qhyccd.cn/wp-content/uploads/2023112312-scaled.jpg'
    },
    loadImageToCanvasGuiderCamera: function () {
      const canvas = document.getElementById('guiderCamera-canvas')
      const ctx = canvas.getContext('2d')
      const image = new Image()
      image.onload = () => {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        // const imageAspectRatio = image.width / image.height
        // if (canvas.width / canvas.height > imageAspectRatio) {
        //   ctx.drawImage(image, 0, 0, canvas.height * imageAspectRatio, canvas.height)
        // } else {
        //   ctx.drawImage(image, 0, 0, canvas.width, canvas.width / imageAspectRatio)
        // }
        console.log(image.width, image.height, canvas.width, canvas.height)
      }
      image.src = 'https://www.qhyccd.cn/wp-content/uploads/2023112312-scaled.jpg'
            /*
      const canvas = document.getElementById('guiderCamera-canvas')
      const ctx = canvas.getContext('2d')
      const buffer = new ArrayBuffer(1280 * 720 * 4)
      const view = new Uint8Array(buffer)
      for (let i = 0; i < view.length; i++) {
        view[i] = i % 256
      }
      const blob = new Blob([buffer], { type: 'image/png' })
      const imageBitmap = createImageBitmap(blob)
      ctx.drawImage(imageBitmap, 0, 0)
      */
    },


    showGuiderCameraCanvas() {
      // 动态更新z-index
      this.canvasZIndexStel= -10;
      this.canvasZIndexMainCamera = -11;
      this.canvasZIndexGuiderCamera = 0;

      // this.convertToGrayscale();
    },

    showStelCanvas() {
      this.canvasZIndexStel= 0;
      this.canvasZIndexMainCamera = -10;
      this.canvasZIndexGuiderCamera = -11;
    },

    showMainCameraCanvas() {
      this.canvasZIndexStel= -10;
      this.canvasZIndexMainCamera = 0;
      this.canvasZIndexGuiderCamera = -11;
    },


    handleButtonTestClick() {
      // this.changeOrder();
      if(this.currentcanvas === 'Stel')
      {
        this.currentcanvas = 'MainCamera';
        this.showMainCameraCanvas();
      }
      else if (this.currentcanvas === 'MainCamera')
      {
        this.currentcanvas = 'GuiderCamera';
        this.showGuiderCameraCanvas();
      }
      else if (this.currentcanvas === 'GuiderCamera')
      {
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
      var that = this

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
        })
      }
    },

    lookatcircle() {
      // glStel.core.selection = glTestCircle;
      glStel.pointAndLock(glTestCircle);
    },

    setGloabalStel: function (stel){
      return stel;
    },

    setGlobalLayer: function (stel) {
      return stel.createLayer({ id: 'testLayerStars', z: 7, visible: true });
    },

    vec3_from_sphe: function (ra_degree, dec_degree, out) {
      const cp = Math.cos(dec_degree * Math.PI / 180);
      out[0] = Math.cos(ra_degree * Math.PI / 180) * cp;
      out[1] = Math.sin(ra_degree * Math.PI / 180) * cp;
      out[2] = Math.sin(dec_degree * Math.PI / 180);
    },

    testAddCircle: function (stel, layer) {
      console.log("Add a circle star near polaris");

      var circle = stel.createObj('circle', { id: 'my circle  ', model_data: {} });

      circle.update();
      layer.add(circle);

      // Select
      stel.core.selection = circle;
      stel.pointAndLock(circle);

      // Circle Property
      var mm = circle.pos;
      this.vec3_from_sphe(2.52971 , 89.2641, mm);
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
      var mm = glTestCircle.pos;
      this.vec3_from_sphe(Ra_degree, Dec_degree, mm);
      glTestCircle.pos = mm;
    },

    UpdateTelescopeStatus(status) {
      this.$bus.$emit('MountStatus', status);
      if(status === 'Slewing') {
        glTestCircle.color = [1, 0, 0, 0.25];
        glTestCircle.border_color = [1, 0, 0, 1];
      } 
      else {
        glTestCircle.color = [0, 1, 0, 0.25];
        glTestCircle.border_color = [0, 1, 0, 1];
      }
    },

    UpdateMainCameraStatus(status) {
      this.$bus.$emit('MainCameraStatus', status);
      if(status === 'Exposuring') {

      } 
      else {

      }
    },

    setPolarPointAltitude(Altitude) {
      this.PolarPoint_Altitude = Altitude;
      console.log('Polar Point Altitude:', this.PolarPoint_Altitude);
    },

    AddMarkCircle: function (stel, layer, frame, label) {
      var circle = stel.createObj('circle', { id: 'my circle  ', model_data: {} });

      circle.update();
      layer.add(circle);

      // Select
      stel.core.selection = circle;
      stel.pointAndLock(circle);

      // Circle Property
      var mm = circle.pos;
      this.vec3_from_sphe(2.52971 , 89.2641, mm);
      circle.pos = mm;
      circle.label = label;
      circle.frame = frame;
      circle.size = [0.04, 0.04];
      circle.color = [1, 1, 1, 0.25];
      circle.border_color = [1, 1, 1, 0.5];

      return circle;
    },

    AddMarkRectangle: function (stel, layer, RaDec) {
      var line = stel.createObj('geojson', {
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

    getCiecleAzAlt(Circle) {
      var obs = this.$stel.core.observer;
      var cirs = this.$stel.convertFrame(obs, 'ICRF', 'CIRS', Circle.getInfo('radec'));
      var observed = this.$stel.convertFrame(obs, 'CIRS', 'OBSERVED', cirs);
      // const azalt = this.$stel.c2s(this.$stel.convertFrame(this.$stel.core.observer, 'ICRF', 'OBSERVED', obj.getInfo('radec')))
      var azalt = this.$stel.c2s(observed);
      var az = this.$stel.anp(azalt[0]);
      var alt = this.$stel.anp(azalt[1]);

      const az_raf = this.$stel.a2af(az, 1);
      const Az_degree = (az_raf.degrees < 0 ? az_raf.degrees + 180 : az_raf.degrees) + az_raf.arcminutes / 60 + az_raf.arcseconds / 3600;

      const alt_raf = this.$stel.a2af(alt, 1);
      const Alt_degree = alt_raf.degrees + alt_raf.arcminutes / 60 + alt_raf.arcseconds / 3600;

      console.log('AzAlt:', Az_degree, Alt_degree);

      return { Az_degree, Alt_degree };
    },

    SolveResultMark(RaDegree, DecDegree, Azimuth, Altitude) {
      var MarkCircle_RaDec = this.AddMarkCircle(this.$stel, glLayer, 1, "RaDec");
      var mm = MarkCircle_RaDec.pos;
      this.vec3_from_sphe(RaDegree, DecDegree, mm);
      MarkCircle_RaDec.pos = mm;
      console.log("RaDec circle coordinates:" + mm);

      const AzAlt = this.getCiecleAzAlt(MarkCircle_RaDec);

      this.MarkCircleNum ++;
      let Label = "AzAlt_Vue_" + this.MarkCircleNum;

      var MarkCircle_AltAz = this.AddMarkCircle(this.$stel, glLayer, 4, Label);
      var mm = MarkCircle_AltAz.pos;
      this.vec3_from_sphe(AzAlt.Az_degree, AzAlt.Alt_degree, mm);
      MarkCircle_AltAz.pos = mm;
      console.log("AzAlt_Vue circle coordinates:" + mm);

      console.log("AzAlt_Vue circle x:" + mm[0]);
      console.log("AzAlt_Vue circle y:" + mm[1]);
      console.log("AzAlt_Vue circle z:" + mm[2]);

      this.LastPoint_AzAlt = this.getCiecleAzAlt(MarkCircle_AltAz);

      this.CalculationPolarPoint(mm);

      // 将创建的圆存储到数组中
      this.Circles.push(MarkCircle_RaDec);
      this.Circles.push(MarkCircle_AltAz);

      // var MarkCircle_AltAz_Qt = this.AddMarkCircle(this.$stel, glLayer, 4, "AzAlt_Qt");
      // var mm = MarkCircle_AltAz_Qt.pos;
      // this.vec3_from_sphe(Azimuth, Altitude, mm);
      // MarkCircle_AltAz_Qt.pos = mm;
      // console.log("AzAlt_Qt circle coordinates:" + mm)

      // return {
      //   Circle_RaDec: MarkCircle_RaDec,
      //   Circle_AltAz: MarkCircle_AltAz
      // };
    }, 

    RemoveAllCircles() {
      this.Circles.forEach(circle => {
        glLayer.remove(circle);
      });
      this.Circles = [];
    },

    SolveResultMark_RealTime(RaDegree, DecDegree, Azimuth, Altitude) {
      this.LastCircle_RaDec = this.AddMarkCircle(this.$stel, glLayer, 1, "RaDec");
      var mm = this.LastCircle_RaDec.pos;
      this.vec3_from_sphe(RaDegree, DecDegree, mm);
      this.LastCircle_RaDec.pos = mm;
      console.log("RaDec circle coordinates:" + mm);

      const AzAlt = this.getCiecleAzAlt(this.LastCircle_RaDec);
      glLayer.remove(this.LastCircle_RaDec);
      
      if (this.LastCircle_AzAlt !== null && this.LastCircle_AzAlt !== undefined) {
        glLayer.remove(this.LastCircle_AzAlt);
      }
      this.LastCircle_AzAlt = this.AddMarkCircle(this.$stel, glLayer, 4, 'Current');
      var mm = this.LastCircle_AzAlt.pos;
      this.vec3_from_sphe(AzAlt.Az_degree, AzAlt.Alt_degree, mm);
      this.LastCircle_AzAlt.pos = mm;
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

      if(this.CartesianList.length < 3) {
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

      var MarkCircle_FakePolarPoint = this.AddMarkCircle(this.$stel, glLayer, 4, "FakePolarPoint");
      var mm = MarkCircle_FakePolarPoint.pos;
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

      console.log("Real Polar Point AzAlt:", AzAlt_PolarPoint.Az_degree, ',', AzAlt_PolarPoint.Alt_degree);

      console.log("Last Point AzAlt:", this.LastPoint_AzAlt.Az_degree, this.LastPoint_AzAlt.Alt_degree);

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

      var MarkCircle_fourthPoint = this.AddMarkCircle(this.$stel, glLayer, 4, "fourthPoint");
      var mm = MarkCircle_fourthPoint.pos;
      mm[0] = fourthPointCartesian.x;
      mm[1] = fourthPointCartesian.y;
      mm[2] = fourthPointCartesian.z;
      MarkCircle_fourthPoint.pos = mm;

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

      var rectangle = this.AddMarkRectangle(this.$stel, glLayer, RaDec);

      this.Circles.push(rectangle);

    },

    CalibratePolarAxis() {
      this.$bus.$emit('CalibratePolarAxisMode');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'StartLoopCapture');
      this.nav = false;
    },

    RecalibratePolarAxis() {
      // 清空列表，准备下次计算
      this.CartesianList = [];
      this.MarkCircleNum = 0;
      this.RemoveAllCircles();
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ClearSloveResultList');
    },

    ShowConfirmDialog(Title, Text, ToDo) {
      // window.location.reload();
      this.nav = false;
      this.$bus.$emit('ShowConfirmDialog', Title, Text, ToDo);
    },

    GetCurrentLocation() {
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'getCurrentLocation');
    },

    decrement(item) {
      console.log('decrement:', item.value);
      if (item.value > item.inputMin) {
        item.value -= item.inputStep;
      }
    },

    increment (item) {
      console.log('increment:', item.value);
      if (item.value < item.inputMax) {
        item.value += item.inputStep;
      }
    },

    PolarAxisMode(bool) {
      this.isPolarAxisMode = bool;
    },

    handleGuiderCanvasClick(event) {
      const canvas = this.$refs.guiderCanvas;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left; // 点击坐标X
      const y = event.clientY - rect.top;  // 点击坐标Y
      console.log(`Clicked at: (${x}, ${y})`);
      const CanvasWidth = window.innerWidth;
      const CanvasHeight = window.innerHeight;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderCanvasClick:' + CanvasWidth + ':' + CanvasHeight + ':' + x + ':' + y);
    }

   
  },
  computed: {
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
    }
  },
  watch: {
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
    }
  },
  mounted: function () {
    var that = this

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
      console.log('OpenCV.js is ready');
      this.onCvReady();  // 调用 OpenCV 准备好的回调
    }).catch(error => {
      console.error('Error loading OpenCV.js:', error);
    });

    // const script = document.createElement('script');
    // script.src = 'https://docs.opencv.org/4.5.5/opencv.js';
    // script.async = true;
    // script.onload = () => this.onCvReady();
    // document.head.appendChild(script);

    import('@/assets/js/stellarium-web-engine.wasm').then(f => {
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
            glStel  = that.setGloabalStel(that.$stel);
            glLayer = that.setGlobalLayer(that.$stel);
            glTestCircle = that.testAddCircle(that.$stel,glLayer);
            
          }
        })
      } catch (e) {
        this.$store.commit('setValue', { varName: 'wasmSupport', newValue: false })
      }



    })

  }
}
</script>

<style>

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

html, body, #app {
  overflow-y: visible!important;
  overflow-x: visible;
  position: fixed!important;
  width: 100%;
  height: 100%;
  padding: 0!important;
  font-size: 10px;
}

.fullscreen {
  overflow-y: hidden;
  position: fixed;
  width: 100%;
  height: 100%;
  padding: 0!important;
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
  background-color: transparent!important;
}

#stel {height: 100%; width: 100%; position: absolute;}
#stel-canvas {width: 100%; height: 100%;}
#mainCamera-canvas {width: 100%; height: 100%;position: absolute; top: 0; left: 0;}
#guiderCamera-canvas {width: 100%; height: 100%;position: absolute; top: 0; left: 0;}

.right_panel {
  padding-right: 400px;
}

.v-btn {
  margin-left: 8px;
  margin-right: 8px;
  margin-top: 6px;
  margin-bottom: 6px;
}

.v-application--wrap {
  min-height: 100%!important;
}


.my-custom-button {
  background-color: #4CAF50; /* 绿色背景 */
  color: white; /* 白色文字 */
  padding: 15px 32px; /* 内边距 */
  text-align: center; /* 文字居中 */
  text-decoration: none; /* 无文本装饰 */
  display: inline-block; /* 行内块显示 */
  font-size: 16px; /* 字体大小 */
  margin: 4px 2px; /* 外边距 */
  cursor: pointer; /* 鼠标样式 */
  border: none; /* 无边框 */
}

.connected-device {
  color: #4dc251;
}

.btn-confirm {
  width: 60px; 
  height: 30px;
  background-color: rgba(255, 255, 255, 0.1); 
  border-radius: 10px;
}

.btn-slider {
  width: 20px; 
  height: 20px;
  background-color: rgba(255, 255, 255, 0.1); 
  border-radius: 10px;
}

.btn-confirm:active
.btn-slider:active {
  /* transform: scale(0.95); 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.5);
}


</style>
