// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

<template>
  <v-app>
    <v-navigation-drawer v-model="drawer_2" ref="Drawer_2" app absolute temporary :width="DeviceIsConnected ? 200 : 200"
      style="left: 170px; backdrop-filter: blur(5px); background-color: rgba(0, 0, 0, 0.1);">

      <div v-show="isOpenDevicePage">
        <span
          style="position: absolute; top: 0px; left: 50%; transform: translateX(-50%); font-size: 30px; color: rgba(255, 255, 255, 0.5); user-select: none;">
          {{ $t(CurrentDriverType) }}
          <v-divider></v-divider>
        </span>

        <div :style="{ width: DeviceIsConnected ? '200px' : '200px' }"
          style="position: absolute; top: 50px; max-height: calc(100% - 95px); overflow-y: auto;"
          class="params-container">

          <div v-show="!DeviceIsConnected" style="text-align: center;">
            <span style="display: inline-block; font-size: 15px; color: rgba(255, 255, 255, 0.5); user-select: none;">
              {{ $t('Device Connection') }}
            </span>

            <!-- 驱动选择下拉框，添加@change事件 -->
            <v-select :label="$t('Select Driver')" :items="drivers" item-text="label" item-value="value"
              v-model="selectedDriver" @change="confirmDriver" style="width: 150px; display: inline-block;">
            </v-select>

            <!-- 波特率下拉框，添加@change事件 -->
            <v-select v-if="CurrentDriverType === 'Mount' || CurrentDriverType === 'Focuser'" :label="$t('Baud Rate')"
              :items="BaudRateItems" item-text="label" item-value="value" v-model="BaudRateSelected"
              @change="confirmDriver" style="width: 150px; display: inline-block;">
            </v-select>

            <v-row no-gutters>
              <v-col cols="6">
                <button @click="clearDriver" class="btn-confirm" style="display: inline-block;">
                  <div style="display: flex; justify-content: center; align-items: center;">
                    <img src="@/assets/images/svg/ui/delete.svg" height="20px"
                      style="min-height: 20px; pointer-events: none;"></img>
                  </div>
                </button>
              </v-col>
              <v-col cols="6">
                <button v-if="!isConnecting" @click="connectDriver(selectedDriver)" class="btn-confirm"
                  style="display: inline-block; background-color: green;">
                  <div style="display: flex; justify-content: center; align-items: center;">
                    <v-icon color="white">mdi-link</v-icon>
                  </div>
                </button>
                <v-progress-circular v-else indeterminate color="green" size="24"></v-progress-circular>
              </v-col>
            </v-row>
          </div>

          <div v-show="DeviceIsConnected" v-for="(item, index) in CurrentConfigItems()" :key="index"
            class="config-item">
            <!-- 标题，仅在第一个项目显示 -->
            <span v-if="index === 0" class="config-title">
              {{ $t('Device Config Items') }}
            </span>

            <!-- 配置项卡片内容 -->
            <v-card-text>
              <!-- 文本输入类型 -->
              <v-text-field v-if="item.inputType === 'text'" v-model="item.value" :label="item.label"
                @input="handleConfigChange(item.label, item.value)" class="config-input">
              </v-text-field>

              <!-- 数字输入类型 -->
              <v-text-field v-if="item.inputType === 'number'" v-model="item.value" :label="item.label"
                :type="isDesktop ? 'number' : 'text'" :min="item.min" :max="item.max"
                :step="item.step !== undefined && item.step !== null ? item.step : 1" :rules="numberRules(item)"
                :inputmode="isMobile ? getInputMode(item) : ''" :pattern="isMobile ? getPattern(item) : ''"
                enterkeyhint="done" @blur="onNumberCommit(item)" @keydown.enter.prevent="onNumberCommit(item)"
                class="config-input" />

              <!-- 滑动条类型 -->
              <div v-if="item.inputType === 'slider'" class="slider-container">
                <span class="slider-label">
                  {{ item.label }}: {{ item.value }}
                </span>
                <div>
                  <!-- 减小按钮 -->
                  <button @click="decrementAndNotify(item)" class="get-click btn-slider btn-minus">
                    <div class="btn-content">
                      <img src="@/assets/images/svg/ui/Minus.svg" height="10px" class="btn-icon">
                    </div>
                  </button>

                  <!-- 滑动条 -->
                  <v-slider v-model="item.value" :step="item.inputStep" :max="item.inputMax" :min="item.inputMin"
                    @change="handleConfigChange(item.label, item.value)" color="white"
                    class="align-center slider-control">
                  </v-slider>

                  <!-- 增加按钮 -->
                  <button @click="incrementAndNotify(item)" class="get-click btn-slider btn-plus">
                    <div class="btn-content">
                      <img src="@/assets/images/svg/ui/Plus.svg" height="10px" class="btn-icon">
                    </div>
                  </button>
                </div>
              </div>

              <!-- 选择框类型 -->
              <v-select v-if="item.inputType === 'select'" v-model="item.value" :label="item.label"
                @change="handleConfigChange(item.label, item.value)" :items="item.selectValue" class="config-input">
              </v-select>

              <!-- 开关类型 -->
              <v-switch v-if="item.inputType === 'switch'" v-model="item.value" :label="item.label"
                @change="handleConfigChange(item.label, item.value)" class="config-switch">
              </v-switch>

              <!-- 提示信息类型（只读） -->
              <div v-if="item.inputType === 'tip'" class="tip-field">
                <div class="tip-label">{{ item.label }}</div>
                <div class="tip-value" :title="formatTipTitle(item)">
                  {{ formatTipValue(item) }}
                </div>
              </div>
            </v-card-text>
          </div>

          <div v-show="DeviceIsConnected"
            style="text-align: center; position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px;">
            <button @click="disconnectDriver" class="btn-confirm" style="display: inline-block; background-color: red;">
              <div style="display: flex; justify-content: center; align-items: center;">
                <v-icon color="white">mdi-link-off</v-icon>
              </div>
            </button>
          </div>

        </div>

        <div v-show="isOpenPowerPage">
          <span
            style="position: absolute; top: 0px; left: 50%; transform: translateX(-50%); font-size: 26px; color: rgba(255, 255, 255, 0.5); user-select: none; white-space: nowrap; ">
            {{ $t('Power Management') }}
            <v-divider></v-divider>
          </span>

          <div style="position: absolute; top: 50px; max-height: calc(100% - 50px); width: 200px; overflow-y: auto;">
            <v-list dense>

              <v-list-item @click.stop="SwitchOutPutPower(1, OutPutPower_1_ON)"
                :style="{ height: '36px', marginBottom: '10px' }">
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
                      <div :style="{ fontSize: '7px' }" :class="{ 'connected-device': OutPutPower_1_ON }">{{
                        OutPutPower_1_ON ?
                          '[ON]' : '[OFF]' }}</div>
                    </span>
                  </v-list-item-title>

                </v-list-item-content>
              </v-list-item>

              <v-list-item @click.stop="SwitchOutPutPower(2, OutPutPower_2_ON)"
                :style="{ height: '36px', marginBottom: '10px' }">
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
                      <div :style="{ fontSize: '7px' }" :class="{ 'connected-device': OutPutPower_2_ON }">{{
                        OutPutPower_2_ON ?
                          '[ON]' : '[OFF]' }}</div>
                    </span>
                  </v-list-item-title>

                </v-list-item-content>
              </v-list-item>

              <v-divider :style="{ marginBottom: '10px' }"></v-divider>

              <v-list-item @click.stop="RestartRaspberryPi()" :style="{ height: '36px', marginBottom: '10px' }">
                <v-list-item-icon style="margin-right: 10px;">
                  <div style="display: flex; justify-content: center; align-items: center;">
                    <img src="@/assets/images/svg/ui/Reboot.svg" height="30px"
                      style="min-height: 30px; pointer-events: none;"></img>
                  </div>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('Restart')
                  }}</v-list-item-title>
                </v-list-item-content>
              </v-list-item>

              <v-list-item @click.stop="ShutdownRaspberryPi()" :style="{ height: '36px', marginBottom: '10px' }">
                <v-list-item-icon style="margin-right: 10px;">
                  <div style="display: flex; justify-content: center; align-items: center;">
                    <img src="@/assets/images/svg/ui/PowerOFF.svg" height="30px"
                      style="min-height: 30px; pointer-events: none;"></img>
                  </div>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('Shut Down')
                  }}</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
              <!-- 强制更新 -->
              <v-list-item @click.stop="ForceUpdate()" :style="{ height: '36px', marginBottom: '10px' }">
                <v-list-item-icon style="margin-right: 10px;">
                  <div style="display: flex; justify-content: center; align-items: center;">
                    <img src="@/assets/images/svg/ui/PowerOFF.svg" height="30px"
                      style="min-height: 30px; pointer-events: none;"></img>
                  </div>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ $t('Force Update')
                  }}</v-list-item-title>
                </v-list-item-content>
              </v-list-item>

            </v-list>
          </div>

        </div>

      </div>

    </v-navigation-drawer>

    <v-navigation-drawer v-model="nav" app :stateless="drawer_2" temporary width="170"
      style="backdrop-filter: blur(5px); background-color: rgba(0, 0, 0, 0.1);">
      <v-layout column fill-height>
        <v-list dense>
          <!-- 客户端版本和服务器版本信息 -->
          <template>
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
          <v-list-item @click.stop="QuitToMainApp()" :style="{ height: '36px' }">
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
          <v-list-item @click.stop="toggleStoreValue('showViewSettingsDialog')" :style="{ height: '36px' }">
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
          <v-list-item @click.stop="openPowerManagerPage()" :style="{ height: '36px' }">
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
          <v-list-item v-for="(device, index) in devices" :key="index" @click.stop="selectDevice(device)"
            :style="{ height: '36px' }">
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
                  <div :style="{ fontSize: '7px' }" :class="{ 'connected-device': device.isConnected }">{{
                    device.device }}
                  </div>
                </span>
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <v-divider></v-divider>

          <!-- 连接所有(Connect All) -->
          <v-list-item :disabled="loadingConnectAllDevice" @touchstart="startConnectBtnPress"
            @touchend="endConnectBtnPress" @mousedown="startConnectBtnPress" @mouseup="endConnectBtnPress"
            :style="{ height: '36px' }">
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
          <v-list-item @click.stop="disconnectAllDevice(false)" :style="{ height: '36px' }">
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
          <v-list-item @click.stop="DeviceAllocation()" :style="{ height: '36px' }">
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
          <v-list-item @click.stop="CalibratePolarAxis()" :style="{ height: '36px' }">
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
          <v-list-item @click.stop="OpenIamgeFolder()" :style="{ height: '36px' }">
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
          <v-list-item @click.stop="OpenDebugLog()" :style="{ height: '36px' }">
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
          <v-list-item @click.stop="locationClicked()" :style="{ height: '36px' }">
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
            :style="{ height: '36px' }">
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
          <v-list-item @click.stop="toggleStoreValue('showDataCreditsDialog')" :style="{ height: '36px' }">
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
              @touchend="handleTouchEnd" @mousedown="handleMouseDown" @mouseup="handleMouseUp"
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

    <v-dialog v-model="showDisconnectDialog" persistent max-width="290">
      <v-card>
        <v-card-title class="text-h5">Confirm Action</v-card-title>
        <v-card-text>Are you sure you want to disconnect the driver {{ currentDisconnectDriverName }}?</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="red darken-1" text @click="showDisconnectDialog = false">Cancel</v-btn>
          <v-btn color="green darken-1" text @click="confirmDisconnect">Confirm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 校准信息显示框 -->
    <div v-if="calibrationInfo.isCalibrating || calibrationInfo.calibrationState === 'complete'"
      class="calibration-info-box">
      <div class="calibration-content">
        <div class="calibration-title">{{ $t('Focuser Travel Calibration') }}</div>
        <div class="calibration-message">{{ calibrationInfo.calibrationMessage }}</div>
        <div class="calibration-progress">{{ $t('Step') }} {{ calibrationInfo.calibrationStep }}/3</div>
      </div>
    </div>

    <!-- 自动对焦信息显示框 - [AUTO_FOCUS_UI_ENHANCEMENT] -->
    <div v-if="(autoFocusInfo.isRunning || autoFocusInfo.state === 'complete') && currentcanvas === 'MainCamera'"
      class="calibration-info-box">
      <div class="calibration-content">
        <div class="calibration-title">{{ $t('Auto Focus') }}</div>
        <div class="calibration-message">{{ autoFocusInfo.message }}</div>
        <div class="calibration-progress">{{ $t('Step') }} {{ autoFocusInfo.step }}/3</div>
      </div>
    </div>

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

let glTestCircle;
let glLayer;
let glStel;

export default {
  data(context) {
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
      websocketState: 'disconnected', // 添加WebSocket连接状态
      networkDisconnected: false, // 添加网络连接状态

      QTClientVersion: 'Not connected',
      VueClientVersion: process.env.VUE_APP_VERSION,

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
        message: ''
      },

      // isMessageBoxShow: false,

      CurrentDriverType: '',
      DeviceIsConnected: null,
      confirmDriverType: '',

      MainCameraOffsetMin: 0,
      MainCameraOffsetMax: 0,

      MainCameraGainMin: 0,
      MainCameraGainMax: 0,

      devices: [
        { name: '导星镜', driverType: 'Guider', type: 'CCDs', ListNum: "1", isget: false, device: '', BaudRate: 9600, driverName: '', usbSerialPath: '', sdkVersion: '',isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_Guider' },
        { name: '主相机', driverType: 'MainCamera', type: 'CCDs', ListNum: "20", isget: false, device: '', BaudRate: 9600, driverName: '', usbSerialPath: '', sdkVersion: '',isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_MainCamera' },
        { name: '赤道仪', driverType: 'Mount', type: 'Telescopes', ListNum: "0", isget: false, device: '', BaudRate: 9600, driverName: '', usbSerialPath: '', sdkVersion: '',isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_Mount' },
        { name: '望远镜', driverType: 'Telescopes', device: '', isConnected: true },
        { name: '电动调焦器', driverType: 'Focuser', type: 'Focusers', ListNum: "22", isget: false, device: '', BaudRate: 9600, driverName: '', usbSerialPath: '', sdkVersion: '',isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_Focuser' },
        { name: '电子极轴镜', driverType: 'PoleCamera', type: 'CCDs', ListNum: "2", isget: false, device: '', BaudRate: 9600, driverName: '', usbSerialPath: '', sdkVersion: '',isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_PoleCamera' },
        { name: '滤镜轮', driverType: 'CFW', type: 'Filter Wheels', ListNum: "21", isget: false, device: '', BaudRate: 9600, driverName: '', usbSerialPath: '', sdkVersion: '',isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_CFW' },
      ],

      // Changing the label name also requires changing the emit signal name
      GuiderConfigItems: [
        { driverType: 'Guider', label: 'Guider Focal Length (mm)', value: '', inputType: 'text' },
        { driverType: 'Guider', label: 'Multi Star Guider', value: false, inputType: 'switch' },
        // { driverType: 'Guider', label: 'Guider Pixel size', value: '', inputType: 'text'},
        { driverType: 'Guider', label: 'Guider Gain', value: '', inputType: 'slider', inputMin: 0, inputMax: 100, inputStep: 1 },
        { driverType: 'Guider', label: 'Calibration step (ms)', value: '', inputType: 'text' },
        { driverType: 'Guider', label: 'Ra Aggression', value: '', inputType: 'slider', inputMin: 0, inputMax: 100, inputStep: 1 },
        { driverType: 'Guider', label: 'Dec Aggression', value: '', inputType: 'slider', inputMin: 0, inputMax: 100, inputStep: 1 },

      ],

      MainCameraConfigItems: [
        // vue处理参数
        { driverType: 'MainCamera', label: 'ImageCFA', value: '', inputType: 'select', selectValue: ['GR', 'GB', 'BG', 'RGGB', 'null'] },
        // 硬件处理参数
        { driverType: 'MainCamera', label: 'Binning', value: '', inputType: 'slider', inputMin: 1, inputMax: 16, inputStep: 1 },
        { driverType: 'MainCamera', label: 'Temperature', value: '', inputType: 'select', selectValue: [5, 0, -5, -10, -15, -20, -25] },
        { driverType: 'MainCamera', label: 'Gain', value: '', inputType: 'slider', inputMin: 0, inputMax: 0, inputStep: 1 },
        { driverType: 'MainCamera', label: 'Offset', value: '', inputType: 'slider', inputMin: 0, inputMax: 0, inputStep: 1 },
      ],

      MountConfigItems: [
        { driverType: 'Mount', label: 'Flip ETA', value: '00:00:00', displayValue: '00:00:00', inputType: 'tip' },
        { driverType: 'Mount', label: 'GotoThenSolve', value: false, inputType: 'switch' },
        // { driverType: 'Mount', label: 'AutoFlip', value: false, inputType: 'switch' },

      ],


      TelescopesConfigItems: [
        { driverType: 'Telescopes', num: 1, label: 'Focal Length (mm)', value: '', inputType: 'number' },
      ],

      FocuserConfigItems: [
        { driverType: 'Focuser', num: 2, label: 'Sync Focuser Step', value: '', inputType: 'text' },
        { driverType: 'Focuser', num: 2, label: 'Min Limit', value: '', inputType: 'number' },
        { driverType: 'Focuser', num: 2, label: 'Max Limit', value: '', inputType: 'number' },
        { driverType: 'Focuser', num: 2, label: 'Backlash', value: '', inputType: 'number' },
      ],

      PoleCameraConfigItems: [

      ],

      CFWConfigItems: [

      ],

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
    }
  },
  components: {
    Gui,
    GuiLoader,
    ProgressBar,
    MeridianFlipNotifier,
    // MessageBox,
  },
  created() {
    this.$bus.$on('AppSendMessage', this.sendMessage);
    this.$bus.$on('AppUpdateDevices', this.updateDevices);
    this.$bus.$on('Switch-MainPage', this.handleButtonTestClick);
    this.$bus.$on('HandleHistogramNum', this.applyHistStretch);
    this.$bus.$on('ImageGainR', this.ImageGainSet);
    this.$bus.$on('ImageGainB', this.ImageGainSet);
    this.$bus.$on('Offset', this.ImageOffsetSet);
    this.$bus.$on('Binning', this.BinningSet);
    this.$bus.$on('Gain', this.GainSet);
    this.$bus.$on('Offset', this.OffsetSet);
    this.$bus.$on('ImageCFA', this.ImageCFASet);
    // this.$bus.$on('MainCameraCFA', this.ImageCFASet);
    this.$bus.$on('Temperature', this.CameraTemperatureSet);
    this.$bus.$on('Focal Length (mm)', this.FocalLengthSet);
    this.$bus.$on('Guider Focal Length (mm)', this.GuiderFocalLengthSet);
    this.$bus.$on('Multi Star Guider', this.MultiStarGuiderSet);
    this.$bus.$on('Guider Pixel size', this.GuiderPixelSizeSet);
    this.$bus.$on('Guider Gain', this.GuiderGainSet);
    this.$bus.$on('Calibration step (ms)', this.CalibrationDurationSet);
    this.$bus.$on('Ra Aggression', this.RaAggressionSet);
    this.$bus.$on('Dec Aggression', this.DecAggressionSet);
    this.$bus.$on('Sync Focuser Step', this.SyncFocuserStep);
    this.$bus.$on('Min Limit', this.MinLimitSet);
    this.$bus.$on('Max Limit', this.MaxLimitSet);
    this.$bus.$on('Backlash', this.BacklashSet);
    this.$bus.$on('GotoThenSolve', this.GotoThenSolve);
    this.$bus.$on('AutoFlip', this.AutoFlipSet);
    this.$bus.$on('WestMinutesPastMeridian', this.WestMinutesPastMeridianSet);
    this.$bus.$on('EastMinutesPastMeridian', this.EastMinutesPastMeridianSet);
    this.$bus.$on('ImageProportion', this.setImageProportion);
    this.$bus.$on('MountGoto', this.lookatcircle);
    this.$bus.$on('SwitchImageToShow', this.SwitchImageToShow);
    this.$bus.$on('PolarPointAltitude', this.setPolarPointAltitude);
    this.$bus.$on('showStelCanvas', this.showStelCanvas);
    this.$bus.$on('RecalibratePolarAxis', this.RecalibratePolarAxis);
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

    this.memoryCheckInterval = setInterval(this.checkMemoryUsage, 30000);


  },
  methods: {
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
      const step = item.step ?? 1;
      if (step > 0) {
        const base = (item.min !== undefined ? item.min : 0);
        v = base + Math.round((v - base) / step) * step;
        if (item.min !== undefined && v < item.min) v = item.min;
        if (item.max !== undefined && v > item.max) v = item.max;
        v = Number(v.toFixed(12)); // 去浮点误差
      }

      // 回写并通知
      item.value = v;
      this.handleConfigChange(item.label, v);
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
                  this.$bus.$emit('DeviceToBeAllocated', DeviceIndex, DeviceName);
                }
                break;

              case 'ShowDeviceAllocationWindow':
                this.$bus.$emit('toggleDeviceAllocationPanel');
                this.nav = false;
                break;

              case 'ExposureCompleted':
                this.$bus.$emit('ExposureCompleted');
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
                if (parts.length === 2) {
                  const fileName = parts[1];
                  this.readBinFile('img/' + fileName);
                  this.DetectedStarsFinish = false;
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

              case 'AddScatterChartData':
                if (parts.length === 3) {
                  const Data_x = parts[1];
                  const Data_y = parts[2];
                  const newDataPoint = [Data_x, Data_y];
                  this.$bus.$emit('AddScatterChartData', newDataPoint);
                }
                break;

              case 'AddLineChartData':
                if (parts.length === 4) {
                  const Data_x = parts[1];
                  const Data_Ra = parts[2];
                  const Data_Dec = parts[3];
                  const newDataPoint_Ra = [Data_x, Data_Ra];
                  const newDataPoint_Dec = [Data_x, Data_Dec];
                  this.$bus.$emit('AddLineChartData', newDataPoint_Ra, newDataPoint_Dec);
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
                  this.callShowMessageBox('FitResult:' + parts[2], 'warning');
                }

              case 'StarDetectionResult':
                if (parts.length === 3) {
                  const detected = parts[1] === 'true';
                  const hfr = parseFloat(parts[2]);
                  if (detected) {
                    this.callShowMessageBox(`星点的HFR为：${hfr}`, 'info');
                  } else {
                    this.callShowMessageBox('未识别到星点', 'warning');
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

              case 'AutoFocusStepChanged': // [AUTO_FOCUS_UI_ENHANCEMENT]
                if (parts.length >= 3) {
                  const step = parts[1];
                  const description = parts[2];
                  console.log('AutoFocusStepChanged:', step, description);
                  this.$bus.$emit('UpdateAutoFocusStep', step, description);
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

                  for (let i = 1; i <= parts[1]; i++) {
                    this.CFWConfigItems.push({ driverType: 'CFW', label: `CFW [${i}]`, value: '', inputType: 'text' });
                  }

                  this.$bus.$emit('AppSendMessage', 'Vue_Command', 'getCFWList');
                }
                break;


              case 'SetCFWPositionSuccess':
                if (parts.length === 2) {
                  this.$bus.$emit('SetCFWPositionSuccess', parts[1]);
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
                if (parts.length === 3) {
                  this.$bus.$emit('ShowAllImageFolder', parts[1], parts[2]);
                }
                break;


              case 'ImageFilesName':
                if (parts.length === 2) {
                  this.$bus.$emit('ImageFilesName', parts[1]);
                }
                break;


              case 'USBCheck':
                if (parts.length === 2) {
                  const USBdata = parts[1].split(',');
                  console.log('USB name: ', USBdata[0]);
                  console.log('USB space: ', USBdata[1]);
                  this.SendConsoleLogMsg('USB name:' + USBdata[0], 'info');
                  this.SendConsoleLogMsg('USB space:' + USBdata[1], 'info');

                  this.$bus.$emit('USB_Name_Sapce', USBdata[0], USBdata[1]);
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

              case 'MainCameraOffsetRange':
                if (parts.length === 3) {
                  console.log('MainCameraOffsetRange:', parts[1], ',', parts[2]);
                  this.SendConsoleLogMsg('MainCameraOffsetRange:' + parts[1] + ',' + parts[2], 'info');
                  this.MainCameraOffsetMin = parts[1];
                  this.MainCameraOffsetMax = parts[2];

                  const OffsetItem = this.MainCameraConfigItems.find(item => item.label === 'Offset');
                  if (OffsetItem) {
                    console.log('MainCameraOffsetRange:', parseInt(this.MainCameraOffsetMin, 10), ',', parseInt(this.MainCameraOffsetMax, 10));
                    OffsetItem.inputMin = parseInt(this.MainCameraOffsetMin, 10);
                    OffsetItem.inputMax = parseInt(this.MainCameraOffsetMax, 10);
                  }
                }
                break;

              case 'MainCameraGainRange':
                if (parts.length === 3) {
                  console.log('MainCameraGainRange:', parts[1], ',', parts[2]);
                  this.SendConsoleLogMsg('MainCameraGainRange:' + parts[1] + ',' + parts[2], 'info');
                  this.MainCameraGainMin = parts[1];
                  this.MainCameraGainMax = parts[2];

                  const gainItem = this.MainCameraConfigItems.find(item => item.label === 'Gain');
                  if (gainItem) {
                    console.log('MainCameraGainRange:', parseInt(this.MainCameraGainMin, 10), ',', parseInt(this.MainCameraGainMax, 10));
                    gainItem.inputMin = parseInt(this.MainCameraGainMin, 10);
                    gainItem.inputMax = parseInt(this.MainCameraGainMax, 10);
                  }
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

              case 'QTClientVersion':
                if (parts.length === 2) {
                  this.QTClientVersion = parts[1];
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
                  }
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
                    this.GuiderConfigItems[0].value = parts[2];
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
                    this.GuiderConfigItems[1].value = (parts[2] === 'true');
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MultiStarGuider:' + parts[2]);
                  }

                  if (parts[1] === 'GuiderGain') {
                    this.GuiderConfigItems[2].value = parts[2];
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderGain:' + parts[2]);
                  }

                  if (parts[1] === 'CalibrationDuration') {
                    this.GuiderConfigItems[3].value = parts[2];
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'CalibrationDuration:' + parts[2]);
                  }

                  if (parts[1] === 'RaAggression') {
                    this.GuiderConfigItems[4].value = parts[2];
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'RaAggression:' + parts[2]);
                  }

                  if (parts[1] === 'DecAggression') {
                    this.GuiderConfigItems[5].value = parts[2];
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'DecAggression:' + parts[2]);
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
                if (parts.length === 2) {
                  const message = parts[1];
                  this.connectDriverFailed(message);
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
                if (parts.length >= 3) {
                  const deviceObjects = parts.slice(1).reduce((acc, part, index, array) => {
                    if (index % 2 === 0) {
                      acc.push({ [array[index]]: array[index + 1] });
                    }
                    return acc;
                  }, []);
                  this.loadSelectedDriverList(deviceObjects);
                }
                break;


              case 'BindDeviceList':
                if (parts.length >= 3) {
                  const deviceObjects = parts.slice(1).reduce((acc, part, index, array) => {
                    if (index % 2 === 0) {
                      acc.push({ [array[index]]: array[index + 1] });
                    }
                    return acc;
                  }, []);
                  this.loadBindDeviceList(deviceObjects);
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

              case 'LoopSolveImageFinished':
                this.$bus.$emit('LoopSolveImageFinished');
                break;

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

              case 'localMessage':
                if (parts.length === 4) {
                  const lat = parts[1];
                  const lon = parts[2];
                  const language = parts[3];
                  this.SendConsoleLogMsg('2------------获得参数设置localMessage: ' + lat + ',' + lon + ',' + language, 'info');
                  if (language == 'zh') {
                    this.$bus.$emit('ClientLanguage', 'cn');
                  } else {
                    this.$bus.$emit('ClientLanguage', 'en');
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
              case 'ServerInitSuccess':
                this.callShowMessageBox('Server init success', 'success');
                window.location.reload();
                break;
              case 'PolarAlignmentState':
                if (parts.length === 5) {
                  const isRunning = parts[1];
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
              case 'Backlash':
                if (parts.length === 2) {
                  const FocuserBacklash = parts[1];
                  let item = this.FocuserConfigItems.find(i => i.label === 'Backlash');
                  if (item) {
                    item.value = FocuserBacklash;
                  }
                }
                break;
              case 'updateAutoFocuserState':
                if (parts.length === 2 ) {
                  const autoFocusState = parts[1];
                  this.$bus.$emit('updateAutoFocuserState', autoFocusState == 'true'); // 更新自动对焦按钮状态
                  
                }
                break;
              case 'AutoFocusConfirm': // [AUTO_FOCUS_UI_ENHANCEMENT]
                if (parts.length >= 2) {
                  const question = parts[1];
                  console.log('AutoFocusConfirm:', question);
                  this.ShowConfirmDialog('自动对焦', question, 'AutoFocusConfirm');
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
                  const message = parts[1];
                  console.log('AutoFocusStarted:', message);
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
      this.sendMessage('Vue_Command', 'getROIInfo'); // 获取ROI信息
      this.sendMessage('Vue_Command', 'localMessage'); // 获取位置信息
      this.sendMessage('Vue_Command', 'getLastSelectDevice'); // 获取上一次选择的设备
      this.sendMessage('Vue_Command', 'getMainCameraParameters'); // 获取主相机参数
      this.sendMessage('Vue_Command', 'getMountParameters'); // 获取赤道仪UI信息
      this.sendMessage('Vue_Command', 'getFocuserParameters'); // 获取焦距器参数
      this.RecalibratePolarAxis(); // 重新校准极轴
      this.sendMessage('Vue_Command', 'getStagingSolveResult'); // 获取定标结果
      this.sendMessage('Vue_Command', 'getFocuserLoopingState'); // 获取焦距器循环状态
      
      this.sendMessage('Vue_Command', 'getStagingScheduleData'); // 获取定标计划数据
      this.sendMessage('Vue_Command', 'getStagingSolveResult'); // 获取定标结果
      this.sendMessage('Vue_Command', 'getGPIOsStatus'); // 获取GPIO状态

      // this.sendMessage('Vue_Command', 'getStagingImage'); // 获取最后拍摄的图像
      // this.sendMessage('Vue_Command', 'getPolarAlignmentState'); // 获取极轴对齐状态
      this.sendMessage('Vue_Command', 'loadSDKVersionAndUSBSerialPath'); // 获取SDK版本和USB序列号路径


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
      this.SendConsoleLogMsg('Confirm Indi Driver:' + this.selectedDriver, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ConfirmIndiDriver:' + this.selectedDriver + ':' + this.BaudRateSelected);
      this.confirmDriverType = this.CurrentDriverType;
      this.loadingSelectDriver = true;

      this.devices.forEach(device => {
        if (device.driverType === this.CurrentDriverType) {
          device.device = this.selectedDriver;
          device.driverName = this.selectedDriver;
          device.BaudRate = this.BaudRateSelected;
        }
      });
    },
    clearDriver() {
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ClearIndiDriver');
      this.SendConsoleLogMsg('Clear Indi Driver', 'info');
      this.devices.forEach(device => {
        if (device.driverType === this.CurrentDriverType) {
          device.device = '';
          device.driverName = '';
          device.BaudRate = 9600;
        }
      });
      this.selectedDriver = '';
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

    updateDevicesConnect(type, DeviceName, DriverName, isBind = true) {    // 连接成功
      this.SendConsoleLogMsg('updateDevicesConnect' + type + ' ' + DeviceName + ' ' + DriverName + ' ' + isBind, 'info');
      this.devices.forEach(device => {
        if (device.driverType === type) {
          if (isBind == true) {
            device.device = DeviceName;
          } else {
            device.device = "Not Bind Device";
          }
          device.driverName = DriverName;
          device.isConnected = true;
        }
      });
      this.callShowMessageBox(DeviceName + ' success connected', 'success');
      this.haveDeviceConnect = true;
      this.loadingConnectAllDevice = false;

      if (type === 'MainCamera') {
        this.$bus.$emit('MainCameraConnected', 1);
        console.log('MainCamera is Connected.');
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
        // this.ConnectBtnPressTimer = setTimeout(() => {
        //   this.isConnectBtnLongPress = true; // 标记为长按
        //   this.handleConnectBtnLongPress();
        // }, this.ConnectBtnlongPressThreshold);
        this.handleConnectBtnClick();
      }
      // 如果是鼠标事件，且没有正在进行的触摸事件，则处理
      else if (event.type === 'mousedown' && !this.isTouching) {
        this.isConnectBtnLongPress = false; // 重置长按标记
        // this.ConnectBtnPressTimer = setTimeout(() => {
        //   this.isConnectBtnLongPress = true; // 标记为长按
        //   this.handleConnectBtnLongPress();
        // }, this.ConnectBtnlongPressThreshold);
        this.handleConnectBtnClick();
      }
    },
    endConnectBtnPress(event) {
      // 如果是触摸事件，处理并重置标记
      if (event.type === 'touchend') {
        clearTimeout(this.ConnectBtnPressTimer); // 清除定时器
        // if (!this.isConnectBtnLongPress) {
        //   this.handleConnectBtnClick(); // 如果不是长按，则触发点击事件
        // }
        this.handleConnectBtnClick();
        this.ConnectBtnPressTimer = null; // 重置定时器
        this.isTouching = false; // 重置触摸标记
      }
      // 如果是鼠标事件，且没有正在进行的触摸事件，则处理
      else if (event.type === 'mouseup' && !this.isTouching) {
        clearTimeout(this.ConnectBtnPressTimer); // 清除定时器
        // if (!this.isConnectBtnLongPress) {
        //   this.handleConnectBtnClick(); // 如果不是长按，则触发点击事件
        // }
        this.handleConnectBtnClick();
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
      this.$bus.$emit('sendCurrentConnectedDevices',this.devices);
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

    ImageGainSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const doubleValue = parseFloat(value); // 将值转换为 double 类型

      if (signal === 'ImageGainR') {
        // 处理 ImageGainR 信号
        this.ImageGainR = doubleValue;
        this.SendConsoleLogMsg('ImageGainR is set to:' + doubleValue, 'info');
        this.sendMessage('Vue_Command', 'ImageGainR:' + doubleValue);
      } else if (signal === 'ImageGainB') {
        // 处理 ImageGainB 信号
        this.ImageGainB = doubleValue;
        this.SendConsoleLogMsg('ImageGainB is set to:' + doubleValue, 'info');
        this.sendMessage('Vue_Command', 'ImageGainB:' + doubleValue);
      }
    },

    ImageOffsetSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const doubleValue = parseFloat(value); // 将值转换为 double 类型

      this.ImageOffset = doubleValue;
      console.log('Image Offset is set to:', doubleValue);
      this.SendConsoleLogMsg('Image Offset is set to:' + doubleValue, 'info');
      this.sendMessage('Vue_Command', 'ImageOffset:' + doubleValue);
    },

    BinningSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const IntValue = parseInt(value); // 将值转换为 Int 类型
      this.cameraBin = IntValue;
      console.log('Image Binning is set to:', IntValue);
      this.SendConsoleLogMsg('Image Binning is set to:' + IntValue, 'info');
      this.sendMessage('Vue_Command', 'SetBinning:' + IntValue);
      this.$bus.$emit('SetBinningNum', IntValue);
    },

    GainSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const IntValue = parseInt(value); // 将值转换为 Int 类型

      console.log('Camera Gain is set to:', IntValue);
      this.SendConsoleLogMsg('Camera Gain is set to:' + IntValue, 'info');
      this.sendMessage('Vue_Command', 'SetCameraGain:' + IntValue);
    },

    OffsetSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const IntValue = parseInt(value); // 将值转换为 Int 类型

      console.log('Camera Offset is set to:', IntValue);
      this.SendConsoleLogMsg('Camera Offset is set to:' + IntValue, 'info');
      this.sendMessage('Vue_Command', 'SetCameraOffset:' + IntValue);
    },

    ImageCFASet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值

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

    CameraTemperatureSet(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const IntValue = parseInt(value); // 将值转换为 Int 类型

      console.log('Camera Temperature is set to:', IntValue);
      this.SendConsoleLogMsg('Camera Temperature is set to:' + IntValue, 'info');
      this.sendMessage('Vue_Command', 'SetCameraTemperature:' + IntValue);
    },

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

    GotoThenSolve(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      const BooleanValue = Boolean(value);
      this.SendConsoleLogMsg('Goto Then Solve:' + BooleanValue, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GotoThenSolve:' + BooleanValue);
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

    async readBinFile(fileName, retryCount = 1) {
      while (this.isDownloadingImage) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!this.isWaitingLogged) {
          this.SendConsoleLogMsg('The image is already being processed. Please wait for the previous process to complete.', 'warning');
          this.isWaitingLogged = true; // 确保只记录一次等待信息
        }
      }

      if (this.isDownloadingImageName === fileName) {
        this.SendConsoleLogMsg('The image(' + fileName + ') is already processed.', 'info');
        return;
      }

      this.isDownloadingImage = true;
      this.isWaitingLogged = false; // 重置等待日志标志
      this.SendConsoleLogMsg('CaptureTestTime | Read image(' + fileName + ') data start.', 'info');

      const startTime = new Date();
      try {
        // Check if the fileName is valid
        if (!fileName || typeof fileName !== 'string') {
          throw new Error('Invalid file name provided');
        }

        // Fetch with progress tracking
        const response = await fetch(fileName, { cache: 'no-store' });
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
                if (Math.round(percent) % 10 === 0) {
                  // this.SendConsoleLogMsg(`Progress: ${Math.round(percent)}%`, 'info');
                  this.updateCaptureImageProgress(Math.round(percent));
                }
                // this.SendConsoleLogMsg(`当前进度: ${Math.round(percent)}%`, 'info');
                controller.enqueue(value);
                push();
              }).catch(error => {
                console.error('Stream reading error:', error);
                this.SendConsoleLogMsg('Stream reading error: ' + error.message, 'error');
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
          this.SendConsoleLogMsg('CaptureTestTime | Read image data end: ' + elapsedTime + ' ms', 'info');
          if (!this.isPolarAxisMode) {
            this.callShowMessageBox(`Read image data end: '${elapsedTime}' ms.`, 'info');
          }
          this.isDownloadingImageName = fileName;
          this.processImage(this.ImageArrayBuffer);
        };

        fileReader.onerror = (error) => {
          console.error('FileReader error:', error);
          this.SendConsoleLogMsg('FileReader error: ' + error.message, 'error');
        };

        fileReader.readAsArrayBuffer(blob);
      } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
        this.SendConsoleLogMsg('There was a problem with the fetch operation: ' + error.message, 'error');

        // 下载失败，重试
        if (retryCount > 0) {
          console.log('Retrying download...');
          this.SendConsoleLogMsg('Retrying download...', 'warning');
          this.isDownloadingImage = false;
          this.updateCaptureImageProgress(100);
          await this.readBinFile(fileName, retryCount - 1);
        } else {
          this.SendConsoleLogMsg('Max retries reached. Download failed.', 'error');
        }
      } finally {
        this.isDownloadingImage = false; // 确保在任何情况下都重置状态
      }
    },


    // async readBinFile(fileName, retryCount = 1) {
    //   while (this.isDownloadingImage) {
    //     await new Promise(resolve => setTimeout(resolve, 1000));
    //     if (!this.isWaitingLogged) {
    //       this.SendConsoleLogMsg('The image is already being processed. Please wait for the previous process to complete.', 'warning');
    //       this.isWaitingLogged = true; // 确保只记录一次等待信息
    //     }
    //   }

    //   if (this.isDownloadingImageName === fileName) {
    //     this.SendConsoleLogMsg('The image(' + fileName + ') is already processed.', 'info');
    //     return;
    //   }

    //   this.isDownloadingImage = true;
    //   this.isWaitingLogged = false; // 重置等待日志标志
    //   this.SendConsoleLogMsg('CaptureTestTime | Read image(' + fileName + ') data start.', 'info');

    //   const startTime = new Date();
    //   try {
    //     // Fetch with progress tracking
    //     const response = await fetch(fileName);
    //     if (!response.ok) {
    //       throw new Error('Network response was not ok');
    //     }

    //     const contentLength = response.headers.get('content-length');
    //     if (!contentLength) {
    //       throw new Error('Content-Length header is missing');
    //     }

    //     const total = parseInt(contentLength, 10);
    //     let loaded = 0;

    //     const reader = response.body.getReader();
    //     const stream = new ReadableStream({
    //       start: (controller) => {
    //         const push = () => {
    //           reader.read().then(({ done, value }) => {
    //             if (done) {
    //               controller.close();
    //               return;
    //             }
    //             loaded += value.byteLength;
    //             const percent = (loaded / total) * 100;
    //             if (Math.round(percent) % 10 === 0) {
    //               this.SendConsoleLogMsg(`Progress: ${Math.round(percent)}%`,'info');
    //               this.updateCaptureImageProgress(Math.round(percent));
    //             }
    //             controller.enqueue(value);
    //             push();
    //           }).catch(error => {
    //             console.error('Stream reading error:', error);
    //             controller.error(error);
    //           });
    //         };
    //         push();
    //       }
    //     });

    //     const newResponse = new Response(stream);
    //     const blob = await newResponse.blob();

    //     // FileReader with progress tracking
    //     const fileReader = new FileReader();
    //     fileReader.onload = () => {
    //       this.ImageArrayBuffer = fileReader.result;

    //       const endTime = new Date();
    //       const elapsedTime = endTime.getTime() - startTime.getTime();
    //       this.SendConsoleLogMsg('CaptureTestTime | Read image data end: ' + elapsedTime + ' ms', 'info');
    //       if (!this.isPolarAxisMode) {
    //         this.callShowMessageBox(`Read image data end: '${elapsedTime}' ms.`, 'info');
    //       }
    //       this.isDownloadingImageName = fileName;
    //       this.processImage(this.ImageArrayBuffer);
    //     };

    //     fileReader.onerror = (error) => {
    //       console.error('FileReader error:', error);
    //       this.SendConsoleLogMsg('FileReader error:' + error, 'error');
    //     };

    //     fileReader.readAsArrayBuffer(blob);
    //   } catch (error) {
    //     console.error('There was a problem with the fetch operation:', error);
    //     this.SendConsoleLogMsg('There was a problem with the fetch operation:' + error, 'error');

    //     // 下载失败，重试
    //     if (retryCount > 0) {
    //       console.log('Retrying download...');
    //       this.SendConsoleLogMsg('Retrying download...', 'warning');
    //       this.isDownloadingImage = false;
    //       this.updateCaptureImageProgress(100);
    //       await this.readBinFile(fileName, retryCount - 1);
    //     }
    //   } finally {
    //     this.isDownloadingImage = false; // 确保在任何情况下都重置状态
    //   }
    // },

    updateCaptureImageProgress(num) {
      this.$bus.$emit('ShowCaptureImageProgress', num);
    },

    setImageProportion(value) {
      this.ImageProportion = value;
    },

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

        if (uintArray.length != parseInt(this.mainCameraSizeY) * parseInt(this.mainCameraSizeX)) {
          throw new Error("Image size mismatch");
        }
        // 创建Mat对象
        await processAsync(() => {
          mat = new cv.Mat(parseInt(this.mainCameraSizeY), parseInt(this.mainCameraSizeX), cv.CV_16UC1);
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
          this.$bus.$emit('showHistogram', analysis.histogram);  // 更新 直方图数据
          this.$bus.$emit('ChangeDialPosition', blackLevel, whiteLevel);  // 更新直方图的显示轴
          this.$bus.$emit('AutoHistogramNum', blackLevel, whiteLevel);
        }

        this.lastImageProcessParams = {
          blackLevel: blackLevel,
          whiteLevel: whiteLevel,
          CFA: CFA,
          analysis: analysis,
          isColorCamera: isColorCamera,
        };

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

      // 确保 blackLevel < whiteLevel
      if (blackLevel >= whiteLevel) {
        blackLevel = whiteLevel - 1;
      }

      return { blackLevel, whiteLevel };
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
      // 确保黑点小于白点
      if (blackLevel >= whiteLevel) {
        blackLevel = whiteLevel - 1;
      }

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
    // checkImageData(img) {
    //   // 检查是否为 cv.Mat 类型
    //   if (!(img instanceof cv.Mat)) {
    //     this.SendConsoleLogMsg('The image is not a valid cv.Mat object.', 'error');
    //     return false;
    //   }

    //   // 检查图像是否为空
    //   if (img.empty()) {
    //     this.SendConsoleLogMsg('The image is empty.', 'error');
    //     return false;
    //   }

    //   // 检查图像深度是否为 8 位或 16 位
    //   const depth = img.type() & cv.CV_MAT_DEPTH_MASK;
    //   if (depth !== cv.CV_8U && depth !== cv.CV_16U) {
    //     this.SendConsoleLogMsg('The image depth is not 8-bit or 16-bit.', 'error');
    //     return false;
    //   }

    //   // 检查图像尺寸是否合理
    //   if (img.rows <= 0 || img.cols <= 0) {
    //     this.SendConsoleLogMsg('The image dimensions are not valid.', 'error');
    //     return false;
    //   }

    //   // 检查图像数据是否超出范围或全为0
    //   const data = img.data;
    //   let isAllZero = true;
    //   const maxValue = depth === cv.CV_8U ? 255 : 65535;

    //   for (let i = 0; i < data.length; i++) {
    //     if (data[i] < 0 || data[i] > maxValue) {
    //       this.SendConsoleLogMsg('The image data contains out-of-range values.', 'error');
    //       return false;
    //     }
    //     if (data[i] !== 0) {
    //       isAllZero = false;
    //     }
    //   }

    //   if (isAllZero) {
    //     this.SendConsoleLogMsg('The image data is all zero.', 'error');
    //     return false;
    //   }
    //   return true;
    // },


    // processImage(imgArray) {
    //   this.progressValue = 0;
    //   try {
    //     if (!(imgArray instanceof ArrayBuffer) && !ArrayBuffer.isView(imgArray)) {
    //       throw new Error("Input must be ArrayBuffer or TypedArray");
    //     }
    //     const totalStartTime = new Date(); // 总开始时间

    //     this.SendConsoleLogMsg('CaptureTestTime | Process image data start.', 'info');
    //     const startTime = new Date();
    //     let img_bit = -1;
    //     let uintArray;
    //     if (imgArray.byteLength === this.mainCameraSizeX * this.mainCameraSizeY * 2 ){
    //       uintArray = new Uint16Array(imgArray);
    //       img_bit = 16;
    //     }else if(imgArray.byteLength === this.mainCameraSizeX * this.mainCameraSizeY){
    //       uintArray = new Uint8Array(imgArray);
    //       img_bit = 8;
    //     }else{
    //       this.SendConsoleLogMsg(`Image data is underfind bit`, 'error');
    //       return;
    //     }

    //     this.SendConsoleLogMsg(`Image data detected as ${img_bit}-bit.`, 'info');



    //     // 设置画布宽高常量
    //     const canvasWidth = parseInt(this.mainCameraSizeX);
    //     const canvasHeight = parseInt(this.mainCameraSizeY);

    //     // 获取原始画布和修改后的画布以及对应上下文
    //     const modifiedCanvas = document.getElementById('mainCamera-canvas');
    //     const modifiedCtx = modifiedCanvas.getContext('2d');



    //     modifiedCanvas.width = canvasWidth;
    //     modifiedCanvas.height = canvasHeight;

    //     let mat;
    //     if (img_bit === 16){
    //       mat = new cv.Mat(canvasHeight, canvasWidth, cv.CV_16UC1);
    //       mat.data16U.set(uintArray);
    //     }else{
    //       mat = new cv.Mat(canvasHeight, canvasWidth, cv.CV_8UC1);
    //       mat.data.set(uintArray);
    //     }
    //     this.progressValue = 10;

    //     const matEndTime = new Date(); // mat 结束时间
    //     this.SendConsoleLogMsg('CaptureTestTime | Mat creation time: ' + (matEndTime.getTime() - startTime.getTime()) + ' ms', 'info');

    //     // 用户自定义参数
    //     let gainR = this.ImageGainR;
    //     let gainB = this.ImageGainB;
    //     let offset = this.ImageOffset;
    //     let CFA = this.ImageCFA;
    //     let mode = 1;

    //     // 参数
    //     let B = 0;
    //     let W = 65535;
    //     let cvmode = 0;

    //     const { blackLevel, whiteLevel } = this.GetAutoStretch(uintArray, mode, img_bit);
    //     B = blackLevel;
    //     W = whiteLevel;
    //     this.progressValue = 30;
    //     const GetAutoStretchEndTime = new Date(); // GetAutoStretch 结束时间
    //     this.SendConsoleLogMsg('CaptureTestTime | GetAutoStretch time: ' + (GetAutoStretchEndTime.getTime() - matEndTime.getTime()) + ' ms', 'info');

    //     // 根据CFA设置颜色转换模式
    //     if (CFA === 'GR') {
    //       cvmode = cv.COLOR_BayerGR2RGBA;
    //     } else if (CFA === 'GB') {
    //       cvmode = cv.COLOR_BayerGB2RGBA;
    //     } else if (CFA === 'BG') {
    //       cvmode = cv.COLOR_BayerBG2RGBA;
    //     } else if (CFA === 'RGGB') {
    //       cvmode = cv.COLOR_BayerRG2RGBA;
    //     }else{
    //       cvmode = cv.COLOR_GRAY2RGBA
    //     }

    //     // 对目标图像进行颜色转换
    //     let dst = new cv.Mat();

    //     try {
    //       cv.cvtColor(mat, dst, cvmode);
    //     } catch (error) {
    //       this.handleError('cvtColor 出错', 'cvtColor', error);
    //       mat.delete();
    //       return;
    //     }

    //     this.progressValue = 50;

    //     const cvtColorEndTime = new Date(); // cvtColor 结束时间
    //     this.SendConsoleLogMsg('CaptureTestTime | cvtColor time: ' + (cvtColorEndTime.getTime() - GetAutoStretchEndTime.getTime()) + ' ms', 'info');

    //     mat.delete();

    //     // 调整图像大小
    //     // cv.resize(dst, resizeImg, new cv.Size(this.CanvasWidth, this.CanvasHeight), 0, 0, cv.INTER_LINEAR);
    //     // dst.delete();

    //     // let originalImg8 = this.Bit16To8_Stretch(resizeImg, B, W);
    //     // resizeImg.delete();

    //     let resizeImg = new cv.Mat(); // 用来存储调整后的图像
    //     if (this.isPolarAxisMode) {
    //       this.progressValue = 0;
    //       // 调整图像大小
    //       cv.resize(dst, resizeImg, new cv.Size(this.CanvasWidth, this.CanvasHeight), 0, 0, cv.INTER_LINEAR);
    //       dst.delete();

    //       let originalImg8;
    //       if (img_bit === 16){
    //         originalImg8 = this.Bit16To8_Stretch(resizeImg, B, W);
    //       }else{
    //         originalImg8 = resizeImg;
    //       }

    //       resizeImg.delete();

    //       const Bit16To8_StretchEndTime = new Date(); // Bit16To8_Stretch 结束时间
    //       this.SendConsoleLogMsg('CaptureTestTime | Bit16To8_Stretch time: ' + (Bit16To8_StretchEndTime.getTime() - GetAutoStretchEndTime.getTime()) + ' ms', 'info');

    //       let targetImg8 = this.ImageSoftAWB(originalImg8, gainR, gainB, offset);
    //       this.$bus.$emit('showSolveImage', targetImg8);

    //       const ImageSoftAWBEndTime = new Date(); // ImageSoftAWB 结束时间
    //       this.SendConsoleLogMsg('CaptureTestTime | ImageSoftAWB time: ' + (ImageSoftAWBEndTime.getTime() - Bit16To8_StretchEndTime.getTime()) + ' ms', 'info');
    //     } else {
    //       modifiedCtx.clearRect(0, 0, modifiedCanvas.width, modifiedCanvas.height);
    //       cv.resize(dst, resizeImg, new cv.Size(this.CanvasWidth, this.CanvasHeight), 0, 0, cv.INTER_LINEAR);
    //       this.progressValue = 70;
    //       let originalResizeImg8 = this.Bit16To8_Stretch(resizeImg, B, W);
    //       this.OriginalImage = new ImageData(new Uint8ClampedArray(originalResizeImg8.data), originalResizeImg8.cols, originalResizeImg8.rows);
    //       resizeImg.delete();
    //       originalResizeImg8.delete();
    //       console.log('dst.data.length: ', dst.data.length);
    //       console.log('dst.cols: ', dst.cols);
    //       console.log('dst.rows: ', dst.rows);
    //       let originalImg8 = this.Bit16To8_Stretch(dst, B, W);
    //       dst.delete();
    //       this.progressValue = 80;

    //       const Bit16To8_StretchEndTime = new Date(); // Bit16To8_Stretch 结束时间
    //       this.SendConsoleLogMsg('CaptureTestTime | Bit16To8_Stretch time: ' + (Bit16To8_StretchEndTime.getTime() - GetAutoStretchEndTime.getTime()) + ' ms', 'info');

    //       // let targetImg8 = this.ImageSoftAWB(originalImg8, gainR, gainB, offset);

    //       // const ImageSoftAWBEndTime = new Date(); // ImageSoftAWB 结束时间
    //       // this.SendConsoleLogMsg('CaptureTestTime | ImageSoftAWB time: ' + (ImageSoftAWBEndTime.getTime() - Bit16To8_StretchEndTime.getTime()) + ' ms', 'info');

    //       // originalImg8.delete();

    //       this.lastImageProcessParams = {
    //         gainR: gainR,
    //         gainB: gainB,
    //         offset: offset,
    //         CFA: CFA,
    //         mode: mode,
    //         B: B,
    //         W: W,
    //         cvmode: cvmode,
    //       };

    //       modifiedCanvas.width = this.CanvasWidth;
    //       modifiedCanvas.height = this.CanvasHeight;
    //       let colorData = new ImageData(new Uint8ClampedArray(originalImg8.data), originalImg8.cols, originalImg8.rows);
    //       originalImg8.delete();
    //       this.drawImgData = colorData;
    //       this.progressValue = 90;
    //       // 设置缓冲画布宽高
    //       this.bufferCanvas.width = colorData.width;
    //       this.bufferCanvas.height = colorData.height;
    //       // 绘制缓存画布图像
    //       this.bufferCtx.putImageData(colorData, 0, 0);
    //       // 绘制主画布图像
    //       this.drawImageData();
    //       this.progressValue = 100;
    //       const DrawImageDataEndTime = new Date(); // DrawImageData 结束时间
    //       this.SendConsoleLogMsg('CaptureTestTime | DrawImageData time: ' + (DrawImageDataEndTime.getTime() - Bit16To8_StretchEndTime.getTime()) + ' ms', 'info');

    //       const endTime = new Date();
    //       const elapsedTime = endTime.getTime() - startTime.getTime();
    //       this.SendConsoleLogMsg('CaptureTestTime | Process image data end:' + elapsedTime + ' milliseconds', 'info');

    //       const totalEndTime = new Date(); // 总结束时间
    //       this.SendConsoleLogMsg('CaptureTestTime | Total process image data time: ' + (totalEndTime.getTime() - totalStartTime.getTime()) + ' ms', 'info');

    //       this.$bus.$emit('showCaptureImage');
    //       this.MakeHistogram(colorData);
    //       this.histogramImage = colorData;

    //       const checkDetectedStarsFinish = () => {
    //         if (this.DetectedStarsFinish) {
    //           this.detectStarsImg = this.DrawDetectStars(targetImg8, this.DetectedStarsList);
    //           targetImg8.delete();
    //           clearInterval(intervalId);
    //         }
    //       };

    //       const intervalId = setInterval(checkDetectedStarsFinish, 1000);
    //     }

    //     // if (this.isNotDrawStars) {
    //     //   this.drawImageData(this.drawImgData);
    //     // } else {
    //     //   if (this.detectStarsImg != null) {
    //     //     this.drawImageData(this.detectStarsImg);
    //     //   } else {
    //     //     this.drawImageData(this.drawImgData);
    //     //   }
    //     // }

    //     // const windowWidth = window.innerWidth;
    //     // const windowHeight = window.innerHeight;

    //     // const minTranslateX = this.imageWidth - this.CanvasWidth;
    //     // const minTranslateY = this.imageHeight - this.CanvasHeight;

    //     // 计算初始的 ScaleImageSize_X 和 ScaleImageSize_Y
    //     // this.ScaleImageSize_X = Math.floor(minTranslateX / this.CanvasWidth * windowWidth + windowWidth);
    //     // this.ScaleImageSize_Y = Math.floor(minTranslateY / this.CanvasHeight * windowHeight + windowHeight);

    //     // this.$bus.$emit('ScaleImageSize', this.ScaleImageSize_X, this.ScaleImageSize_Y);

    //   } catch (error) {
    //     this.handleError('Process image data error', 'processImage', error);
    //     if (mat) {
    //       mat.delete();
    //     }
    //     if (resizeImg) {
    //       resizeImg.delete();
    //     }
    //     if (originalImg8) {
    //       originalImg8.delete();
    //     }
    //     if (targetImg8) {
    //       targetImg8.delete();
    //     }
    //   }
    // },

    // histogramStretch(imageData, min, max) {
    //   const startTime = new Date();
    //   // Convert ImageData to cv.Mat
    //   const image = cv.matFromImageData(imageData);
    //   let Time1 = new Date();
    //   this.SendConsoleLogMsg('histogramStretch | 转换图像数据时间: ' + (Time1.getTime() - startTime.getTime()) + ' ms', 'info');
    //   // Perform the histogram stretch
    //   const channels = new cv.MatVector();
    //   cv.split(image, channels); // Split channels (BGR) into separate Mat objects
    //   let Time2 = new Date();
    //   this.SendConsoleLogMsg('histogramStretch | 分割通道时间: ' + (Time2.getTime() - Time1.getTime()) + ' ms', 'info');
    //   // Calculate alpha and beta for each channel
    //   let alpha = 255.0 / (max - min);
    //   let beta = -min * alpha;

    //   if (alpha < 0) {
    //     alpha = 0;
    //     beta = 0;
    //   } else if (alpha > 255) {
    //     alpha = 255;
    //     beta = 0;
    //   }
    //   Time1 = new Date();
    //   this.SendConsoleLogMsg('histogramStretch | 计算alpha和beta时间: ' + (Time1.getTime() - Time2.getTime()) + ' ms', 'info');
    //   // Iterate over each channel and apply histogram stretching
    //   for (let i = 0; i < channels.size(); i++) {
    //     let channel = channels.get(i);


    //     // Apply histogram stretching to the channel
    //     channel.convertTo(channel, -1, alpha, beta);

    //     // Release the memory of channel
    //     channel.delete();
    //   }
    //   Time2 = new Date();
    //   this.SendConsoleLogMsg('histogramStretch | 各通道拉伸时间: ' + (Time2.getTime() - Time1.getTime()) + ' ms', 'info');
    //   // Merge the channels back into a single image
    //   const stretchImage = new cv.Mat();
    //   cv.merge(channels, stretchImage);
    //   Time1 = new Date();
    //   this.SendConsoleLogMsg('histogramStretch | 合并通道时间: ' + (Time1.getTime() - Time2.getTime()) + ' ms', 'info');
    //   // Release the memory of channels and MatVector
    //   channels.delete();

    //   // Convert cv.Mat back to ImageData
    //   const stretchedImageData = new ImageData(new Uint8ClampedArray(stretchImage.data), stretchImage.cols, stretchImage.rows);
    //   Time2 = new Date();
    //   this.SendConsoleLogMsg('histogramStretch | 转换图像数据时间: ' + (Time2.getTime() - Time1.getTime()) + ' ms', 'info');
    //   // Clean up
    //   image.delete();
    //   stretchImage.delete();
    //   Time1 = new Date();
    //   this.SendConsoleLogMsg('histogramStretch | 释放内存时间: ' + (Time1.getTime() - Time2.getTime()) + ' ms', 'info');
    //   this.SendConsoleLogMsg('histogramStretch | 总时间: ' + (Time1.getTime() - startTime.getTime()) + ' ms', 'info');
    //   return stretchedImageData;
    // },

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

      // 计算 ROI 区域的边界
      const roiLeft = this.ROI_x;
      const roiRight = this.ROI_x + this.ROI_length;
      const roiTop = this.ROI_y;
      const roiBottom = this.ROI_y + this.ROI_length;

      // 判断 ROI 区域是否在可见区域内
      const isRoiInVisible = roiRight >= visibleLeft && roiLeft <= visibleRight && roiBottom >= visibleTop && roiTop <= visibleBottom;

      // 计算 ROI 区域在屏幕上的位置，中心点坐标
      const roiScreenX = (this.ROI_x - visibleLeft) * (window.innerWidth / newVisibleWidth) + this.RedBoxSideLength * window.innerWidth / newVisibleWidth / 2;
      const roiScreenY = (this.ROI_y - visibleTop) * (window.innerHeight / newVisibleHeight) + this.RedBoxSideLength * window.innerHeight / newVisibleHeight / 2;
      // this.SendConsoleLogMsg('ROI 区域在屏幕上的位置: ' + roiScreenX + '*' + roiScreenY + '长度 ' + this.RedBoxSideLength * window.innerWidth / newVisibleWidth + '*' + this.RedBoxSideLength * window.innerHeight / newVisibleHeight, 'info');
      this.$bus.$emit('setRedBoxLength', this.RedBoxSideLength * window.innerWidth / newVisibleWidth, this.RedBoxSideLength * window.innerHeight / newVisibleHeight);
      this.$bus.$emit('setRedBoxPosition', roiScreenX, roiScreenY);


      const canvas = this.$refs.mainCanvas;
      const ctx = canvas.getContext('2d');
      canvas.width = this.CanvasWidth;
      canvas.height = this.CanvasHeight;

      ctx.drawImage(this.bufferCanvas, visibleLeft, visibleTop, newVisibleWidth, newVisibleHeight, 0, 0, canvas.width, canvas.height);

      this.visibleX = newVisibleX;
      this.visibleY = newVisibleY;
      this.visibleWidth = newVisibleWidth;
      this.visibleHeight = newVisibleHeight;

      this.$bus.$emit('setCurrentMainCanvasHasImage', true); // 发送给电调，用于判断是否可以进行循环拍摄
      // 发送消息给QT客户端，用于信息图标
      // 统一坐标：发送给 QT 的 ROI 坐标采用传感器像素坐标（不再按 bin 放大），避免在回环中被重复乘以 bin 导致指数级增长
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'sendVisibleArea:' + this.visibleX + ':' + this.visibleY + ':' + this.scale);

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

    DrawPHD2MultiStars(PHD2ImageSize_X, PHD2ImageSize_Y, Star_X, Star_Y) {
      const ratioZoomX = PHD2ImageSize_X / window.innerWidth;
      const ratioZoomY = PHD2ImageSize_Y / window.innerHeight;

      const StarStartX = Star_X / ratioZoomX - 12 / 2;
      const StarStartY = Star_Y / ratioZoomY - 12 / 2;

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
      this.currentHistogramMin = Min;
      this.currentHistogramMax = Max;
      if (this.ImageArrayBuffer) {
        this.processImage(this.ImageArrayBuffer, Min, Max, { calculateHistogram: false });
      }
      this.$bus.$emit('ChangeDialPosition', Min, Max);
    },


    calcWhiteBalanceGains() {
      // const Gains = this.calculateWhiteBalanceGains(this.histogramData, this.ImageOffset);
      this.calculateGain = true;
      this.processImage(this.ImageArrayBuffer, this.currentHistogramMin, this.currentHistogramMax, { calculateHistogram: false });

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
      this.$bus.$emit('CalibratePolarAxisMode');
      // this.$bus.$emit('AppSendMessage', 'Vue_Command', 'StartLoopCapture');
      this.nav = false;
    },

    RecalibratePolarAxis() {
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
      const canvas = this.$refs.guiderCanvas;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left; // 点击坐标X
      const y = event.clientY - rect.top;  // 点击坐标Y
      console.log(`Clicked at: (${x}, ${y})`);
      const CanvasWidth = window.innerWidth;
      const CanvasHeight = window.innerHeight;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderCanvasClick:' + CanvasWidth + ':' + CanvasHeight + ':' + x + ':' + y);
    },
    connectDriver() {
      this.isConnecting = true;
      // this.isOpenDevicePage = false;
      this.startLoading();
      const DeviceType = this.CurrentDriverType;
      for (const device of this.devices) {
        if (device.driverType === DeviceType && device.isConnected == false) {
          const DriverName = device.driverName;
          if (DriverName == '') {
            this.SendConsoleLogMsg('No driver selected', 'warning');
            this.isConnecting = false;
            return;
          }
          this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ConnectDriver:' + DriverName + ':' + DeviceType);
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
    connectDriverFailed(message) {
      console.log('connectDriverFailed:', message);
      this.SendConsoleLogMsg("connectDriverFailed:" + message, 'error');
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
    },
    loadSelectedDriverList(deviceObject) {
      console.log('loadSelectedDriverList:', deviceObject);
      deviceObject.forEach(device => {
        // 假设你想要打印每个设备对象的键值对
        for (const [driverType, driverName] of Object.entries(device)) {
          this.devices.forEach(device => {
            if (device.driverType === driverType && device.isConnected == false) {
              device.device = driverName;
              device.driverName = driverName;
            }
          });
        }
      });
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
        this.updateDevicesConnect(Type, DeviceName, DriverName, isbind);
      });
    },
    updateSelectedDriver(driverType) {

      this.selectedDriver = null;
      this.devices.forEach(device => {
        if (device.driverType === driverType) {
          this.selectedDriver = device.driverName
        }
      });
      console.log('Current drivers:', this.selectedDriver);
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
    UnBindingDevice(type, name, driverName) {
      console.log('UnBindingDevice:', type, name, driverName);
      this.updateDevicesConnect(type, name, driverName, false);
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
        const imgW = this.mainCameraSizeX;
        const imgH = this.mainCameraSizeY;

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
        if (newVisibleX > this.mainCameraSizeX) {
          newVisibleX = this.mainCameraSizeX;
        }
        if (newVisibleY > this.mainCameraSizeY) {
          newVisibleY = this.mainCameraSizeY;
        }

        this.visibleX = newVisibleX;
        this.visibleY = newVisibleY;

        this.startX = this.currentX;
        this.startY = this.currentY;
        this.drawImageData();
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
    },
    handleWheel(event) {
      // this.SendConsoleLogMsg('触发鼠标滚轮事件:', 'info');
      if (this.drawImgData == null) return;
      const scaleChange = event.deltaY > 0 ? 0.1 : -0.1; // 根据滚轮的滚动方向，计算缩放比例的变化量
      let newScale = this.scale + scaleChange; // 更新缩放比例
      if (newScale < 0.1) {
        newScale = 0.1;
      }
      if (newScale > 1) {
        newScale = 1;
      }

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
          this.drawImageData();
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
        const imgW = this.mainCameraSizeX;
        const imgH = this.mainCameraSizeY;

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
          if (newVisibleX > this.mainCameraSizeX) {
            newVisibleX = this.mainCameraSizeX;
          }
          if (newVisibleY > this.mainCameraSizeY) {
            newVisibleY = this.mainCameraSizeY;
          }

          this.visibleX = newVisibleX;
          this.visibleY = newVisibleY;

          this.startTouchX[0] = this.currentTouchX[0];
          this.startTouchY[0] = this.currentTouchY[0];

          this.drawImageData();
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
          if (!this.isDragging || !this.isOneTouch) return;
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
          if (newScale < 0.1) {
            newScale = 0.1;
          }
          if (newScale > 1) {
            newScale = 1;
          }
          if (newScale != this.scale) {
            this.SendConsoleLogMsg('缩放比例变化,缩放比例:' + newScale, 'info');
            this.scale = newScale; // 更新缩放比例
            this.$bus.$emit('setScale', this.scale);
            this.drawImageData();
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
      if (type == '+') {
        this.scale -= 0.1;
      } else if (type == '-') {
        this.scale += 0.1;
      }
      if (this.scale < 0.1) {
        this.scale = 0.1;
      }
      if (this.scale > 1) {
        this.scale = 1;
      }
      this.$bus.$emit('setScale', this.scale);
      this.drawImageData();
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
      if (this.isDownloadingImageName == "" || this.isDownloadingImageName == null) {
        this.SendConsoleLogMsg('isDownloadingImageName is empty or null', 'error');
        // 终止循环拍摄
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
            let newWidth = parseInt(this.RedBoxSideLength / this.cameraBin);
            let newHeight = parseInt(this.RedBoxSideLength / this.cameraBin);
            if (newWidth % 2 != 0) {
              newWidth = newWidth - 1;
            }
            if (newHeight % 2 != 0) {
              newHeight = newHeight - 1;
            }
            if (uint16Array.length !== newWidth * newHeight) {
              this.SendConsoleLogMsg('uint16Array.length (' + uint16Array.length + ') !== newWidth * newHeight (' + newWidth * newHeight + ')', 'error');
              return;
            }
            // 创建一个空的 Mat 对象
            src = new cv.Mat(newHeight, newWidth, cv.CV_16UC1);
            src.data16U.set(uint16Array);
            let time2 = performance.now();
            this.SendConsoleLogMsg('创建mat对象时间: ' + (time2 - time1).toFixed(0) + 'ms', 'info');
            if (this.lastImageProcessParams.isColorCamera == 'true' || this.lastImageProcessParams.isColorCamera == 'True' || this.lastImageProcessParams.isColorCamera) {
              targetImg8 = this.applyStretchAndGain(src, this.lastImageProcessParams.analysis, 'bayer', this.lastImageProcessParams.CFA, this.lastImageProcessParams.blackLevel, this.lastImageProcessParams.whiteLevel);

            } else {
              targetImg8 = this.applyStretchAndGain(src, this.lastImageProcessParams.analysis, 'gray', this.lastImageProcessParams.CFA, this.lastImageProcessParams.blackLevel, this.lastImageProcessParams.whiteLevel);
     
            }
            time1 = performance.now();
            this.SendConsoleLogMsg('applyStretchAndGain时间: ' + (time1 - time2).toFixed(0) + 'ms', 'info');
            src.delete();
            src = null;

            // 将 Mat 对象转换回 ImageData 对象
            imgData = new ImageData(new Uint8ClampedArray(targetImg8.data), targetImg8.cols, targetImg8.rows);
            targetImg8.delete();
            targetImg8 = null;
            // 在指定位置开始绘制图像
            // this.bufferCtx.clearRect(this.ROI_x, this.ROI_y, targetImg8.cols, targetImg8.rows);
            this.bufferCtx.putImageData(imgData, this.ROI_x, this.ROI_y);
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
      }
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
          item.value = parameters[parameter];
        } else {
          if (parameter == 'RedBoxSize') {
            this.$bus.$emit('setRedBoxSideLength', parameters[parameter]);
            this.RedBoxSideLength = parseInt(parameters[parameter]);
          } else if (parameter == 'ROI_x') {
            this.ROI_x = parseFloat(parameters[parameter]);
          } else if (parameter == 'ROI_y') {
            this.ROI_y = parseFloat(parameters[parameter]);
          } 
          else {
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
      if (item.value > item.inputMin) {
        item.value -= item.inputStep;
        this.handleConfigChange(item.label, item.value);
      }
    },

    incrementAndNotify(item) {
      if (item.value < item.inputMax) {
        item.value += item.inputStep;
        this.handleConfigChange(item.label, item.value);
      }
    },

    // 通用的配置更改处理函数
    handleConfigChange(label, value) {
      console.log(`配置已更改: ${label} = ${value}`);
      if (value !== '') {
        // console.log(item.label, item.value);
        this.SendConsoleLogMsg(label + ':' + value, 'info');
        this.$bus.$emit(label, label + ':' + value);
      } else if (value == '' && label === 'Focal Length (mm)') {
        this.SendConsoleLogMsg(label + 'is NULL', 'info');
        this.$bus.$emit(item.label, item.label + ':');
      }
    },
    // 校准相关方法
    startCalibrationProcess() {
      this.calibrationInfo.isCalibrating = true;
      this.calibrationInfo.calibrationState = 'running';
      this.calibrationInfo.calibrationStep = 0;
      this.calibrationInfo.calibrationMessage = this.$t('Preparing to start focuser travel calibration...');
      console.log('App: Calibration started:', this.calibrationInfo);
    },

    updateCalibrationInfo(step, message, state) {
      try {
        this.calibrationInfo.calibrationStep = step;
        // 如果消息是国际化键，则翻译它
        if (message && typeof message === 'string') {
          this.calibrationInfo.calibrationMessage = this.$t(message);
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
      console.log('App: Auto focus started:', this.autoFocusInfo);
    },

    updateAutoFocusStep(step, message) {
      try {
        
        this.autoFocusInfo.step = step;
        this.autoFocusInfo.message = this.$t(message);
        if (step === 0) {
          this.autoFocusInfo.isRunning = true;
        }
        console.log('App: Auto focus info updated:', this.autoFocusInfo);
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
    },
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
    },
    getQTClientVersionColor() {
      if (this.QTClientVersion === 'Not connected') {
        return 'rgba(255, 0, 0, 0.5)'; // 红色，透明度 0.5
      } else {
        return 'rgba(255, 255, 255, 0.5)'; // 默认白色，透明度 0.5
      }
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
}

#guiderCamera-canvas {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

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

/* 参数容器滚动条样式 */
.params-container {
  overflow-y: auto;
  height: 100%;
}

.params-container::-webkit-scrollbar {
  width: 6px;
}

.params-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.params-container::-webkit-scrollbar-thumb {
  background: white;
  border-radius: 3px;
}

.params-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.8);
}

/* Firefox滚动条样式 */
.params-container {
  scrollbar-width: thin;
  scrollbar-color: white rgba(0, 0, 0, 0.1);
}

/* 校准信息显示框样式 */
.calibration-info-box {
  position: fixed;
  top: 50vh;
  left: 50vw;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(15px);
  border: 2px solid rgba(255, 165, 0, 0.8);
  border-radius: 15px;
  padding: 25px;
  z-index: 10001;
  min-width: 350px;
  max-width: 450px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.calibration-content {
  text-align: center;
  color: white;
}

.calibration-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #FFA500;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.calibration-message {
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 20px;
  color: #FFFFFF;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.calibration-progress {
  font-size: 14px;
  color: #FFA500;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}
</style>