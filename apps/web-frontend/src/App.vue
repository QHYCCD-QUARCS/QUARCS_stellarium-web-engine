// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

<template>

<v-app>
  <v-navigation-drawer v-model="nav" app stateless width="150">
    <v-layout column fill-height>
      <v-list dense>
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
              <v-list-item-title v-text="item.title"/>
              <v-icon disabled>mdi-open-in-new</v-icon>
            </v-list-item>
            <v-list-item v-else-if='item.footer===undefined' @click.stop="toggleStoreValue(item.store_var_name)" :key="i">
              <v-list-item-icon><v-icon>{{ item.icon }}</v-icon></v-list-item-icon>
              <v-list-item-title v-text="item.title"/>
            </v-list-item>
          </template>
        </template>

        <v-list-item @click.stop="connectAllDevice()" :style="{ height: '36px' }">
          <v-list-item-content>
            <v-list-item-title :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ '连接所选设备' }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>


        <v-list-item v-for="(device, index) in devices" :key="index" @click.stop="selectDevice(device)" :style="{ height: '36px' }">
          <v-list-item-content>
            <v-list-item-title>
              <!-- {{ device.name }} <span>{{ device.device }}</span> -->
              <span>
                <div :style="{ height: '15px', padding: '1px', fontSize: '10px' }">{{ device.name }}</div>
                <div :style="{ fontSize: '7px' }" :class="{ 'connected-device': device.isConnected }">{{ device.device }}</div>
              </span>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>

      <template v-for="(item,i) in menuComponents">
        <component :is="item" :key="i"></component>
      </template>
      <v-spacer></v-spacer>
      <v-list dense>

        <v-divider class="divider_menu"/>

        <v-list-item @click.stop="locationClicked()" :style="{ height: '36px' }">
          <v-list-item-content>
            <v-list-item-title>
              <span>
                <div :style="{ fontSize: '10px' }">{{ 'Location: '+$store.state.currentLocation.short_name }}</div>
              </span>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item @click.stop="applyHistStretch(histogram_min, histogram_max)" :style="{ height: '36px' }">
          <v-list-item-content>
            <v-list-item-title>
              <span>
                <div :style="{ fontSize: '10px' }">{{ 'showIMG' }}</div>
              </span>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        
        <template v-for="(item,i) in menuItems">
          <v-list-item v-if='item.footer' @click.stop="toggleStoreValue(item.store_var_name)" :key="i">
            <v-list-item-icon><v-icon>{{ item.icon }}</v-icon></v-list-item-icon>
            <v-list-item-title v-text="item.title"/>
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
          <canvas ref="guiderCanvas" id="guiderCamera-canvas" :style="{ zIndex: canvasZIndexGuiderCamera }"></canvas>
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

      // isMessageBoxShow: false,

      driverType: '',
      deviceType: '',

      devices: [
        // { name: '一键连接', device: '' },
        { name: '导星镜', driverType: 'Guider', type: 'CCDs', ListNum: "1", isget: false, device: '', isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_Guider' },
        { name: '主相机', driverType: 'MainCamera', type: 'CCDs', ListNum: "20", isget: false, device: '', isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_MainCamera' },
        { name: '赤道仪', driverType: 'Mount', type: 'Telescopes', ListNum: "0", isget: false, device: '', isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_Mount' },
        { name: '望远镜', dialogStateVar: 'showDeviceSettingsDialog_Telescopes', device: '' },
        { name: '电动调焦器', driverType: 'Focuser', type: 'Focusers', ListNum: "22", isget: false, device: '', isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_Focuser' },
        { name: '电子极轴镜', driverType: 'PoleCamera', type: 'CCDs', ListNum: "2", isget: false, device: '', isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_PoleCamera' },
        { name: '滤镜轮', driverType: 'CFW', type: 'Filter Wheels', ListNum: "21", isget: false, device: '', isConnected: false, dialogStateVar: 'showDeviceSettingsDialog_CFW' },
      ],

      imageData: null,
      histogramData: null,

      histogramImage: null,
      histogram_min: 0,
      histogram_max: 255,

      ImageGainR: 1,
      ImageGainB: 1,

      CanvasWidth: 4096,
      CanvasHeight: 2160,

      scale: 2,
      translateX: 0,
      translateY: 0,
      bufferCanvas: null,
      bufferCtx: null,
      imageWidth: 0,
      imageHeight: 0,
      drawImgData: null,
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
  },
  methods: {
    getLocationHostName() {
      const hostname = window.location.hostname;
      console.log('location hostname:', hostname);
      this.WebSocketUrl = `ws://${hostname}:8600`;
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
        console.log('QHYCCD | Received message:', message.data);

        const data = JSON.parse(message.data);

        if (data.type === 'QT_Return') {
          console.log('QHYCCD | QT_Return');
          if (data.message.startsWith('AddDriver:')) {
            const parts = data.message.split(':');
            if (parts.length === 3) {
              const label = parts[1];
              const value = parts[2];
              const type = this.driverType;
              // 创建一个驱动对象
              const driver = { type, label, value };
              this.$bus.$emit('add-driver', driver);
            }
          }

          if (data.message.startsWith('AddDevice:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const label = parts[1];
              console.log('QHYCCD | AddDevice: ',label);
              // const value = parts[2];
              const type = this.driverType;
              // 创建一个驱动对象
              const device = { type, label, label };
              console.log('QHYCCD | AddDevice: ',device);
              this.$bus.$emit('add-device', device);
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
              console.log('QHYCCD | Add line chart Data:', newDataPoint_Ra, ',', newDataPoint_Dec);
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
          
          if (data.message.startsWith('TelescopeTotalSlewRate:')) {
            const parts = data.message.split(':');
            if (parts.length === 2) {
              const num = parts[1];
              this.$bus.$emit('MountTotalSlewRate',num);
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
      this.sendMessage('Vue_Command', 'getConnectedDevices');
      this.sendMessage('Vue_Command', 'getStagingImage');
      this.sendMessage('Vue_Command', 'getStagingScheduleData');
    },

    selectDevice(device) {
      if (device.isget === false) {
        // console.log('QHYCCD | Selected device:', device.type);
        // 将 isget 设置为 true
        device.isget = true;
        this.sendMessage('Vue_Command', 'SelectIndiDriver:' + device.type + ":" + device.ListNum);
      }

      this.driverType = device.driverType;

      this.toggleStoreValue(device.dialogStateVar);
      // console.log('QHYCCD | dialogStateVar:', device.dialogStateVar);
      // console.log('QHYCCD | dialogState:', this.$store.state[device.dialogStateVar]);
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
    },

    updateDevicesConnect(type, newDevice) {    // 连接成功
      this.devices.forEach(device => {
        if (device.driverType === type) {
          device.device = ' [ '+newDevice+' ] ';
          device.isConnected = true;
        }
      });
      this.callShowMessageBox( newDevice + ' success connected','success');
    },

    connectAllDevice()
    {
      console.log("QHYCCD | connectAllDevice.");
      this.sendMessage('Vue_Command', 'connectAllDevice');
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

    async readBinFile(fileName) {
      try {
        const response = await fetch(fileName);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const blob = await response.blob();

        const fileReader = new FileReader();
        fileReader.onload = () => {
          const arrayBuffer = fileReader.result;
          this.processImage(arrayBuffer);
        };
        fileReader.onerror = (error) => {
          console.error('FileReader error:', error);
        };
        fileReader.readAsArrayBuffer(blob);
      } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
      }
    },

    processImage(imgArray) {
      // 获取 ArrayBuffer 数据视图
      const dataView = new DataView(imgArray);
      // console.log('ArrayBuffer byte length:', dataView.byteLength);

      // 将 ArrayBuffer 转换为 Uint16Array
      const uint16Array = new Uint16Array(dataView.buffer);
      // console.log('转换后的16位数据长度', uint16Array.length);

      // 设置画布宽高常量
      const canvasWidth = 6252;
      const canvasHeight = 4176;

      // 获取原始画布和修改后的画布以及对应上下文
      const modifiedCanvas = document.getElementById('mainCamera-canvas');
      const modifiedCtx = modifiedCanvas.getContext('2d');

      modifiedCtx.clearRect(0, 0, modifiedCanvas.width, modifiedCanvas.height);

      modifiedCanvas.width = canvasWidth;
      modifiedCanvas.height = canvasHeight;

      // 用户自定义参数
      let gainR = 1.0;
      let gainB = 1.0;
      let offset = 0;
      let mode = 1;

      // 参数
      let B = 0;
      let W = 65535;
      let CFA = 'RGGB';
      let cvmode = 0;

      let mat = new cv.Mat(canvasHeight, canvasWidth, cv.CV_16UC1);
      mat.data16U.set(uint16Array);

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
        // console.log('dst目标图像大小:', dst.cols, 'x', dst.rows);
        // console.log('dst目标图像通道数:', dst.channels());
      } catch (error) {
        console.error('cvtColor 出错:', error);
        // console.log('mat目标图像大小:', mat.cols, 'x', mat.rows);
        // console.log('mat目标图像通道数:', mat.channels());
        return
      }

      mat.delete();

      let resizeImg = new cv.Mat();

      // Resize the image
      // console.log('Resize the image');
      cv.resize(dst, resizeImg, new cv.Size(4096, 2160), 0, 0, cv.INTER_LINEAR);

      dst.delete();

      modifiedCanvas.width = 4096;
      modifiedCanvas.height = 2160;

      let targetImg16 = this.ImageSoftAWB(resizeImg, gainR, gainB, offset);
      // 检查目标图像数据是否有效
      if (!targetImg16 || targetImg16.empty() || !(targetImg16 instanceof cv.Mat) || targetImg16.channels() !== 4) {
        console.error('错误: 目标图像数据无效');
        return;
      }

      // 输出目标图像信息
      // console.log('图像处理正常！', 'targetImg16目标图像大小:', targetImg16.cols, 'x', targetImg16.rows, 'targetImg16目标图像通道数:', targetImg16.channels());

      const { blackLevel, whiteLevel } = this.GetAutoStretch(uint16Array, mode);
      B = blackLevel;
      W = whiteLevel;
      // console.log('Stretch to:', B, ',', W);
      // 对目标图像进行位深度转换
      let img8 = this.Bit16To8_Stretch(targetImg16, B, W);
      if (img8.empty() || img8.rows === 0 || img8.cols === 0) {
        console.error('img8 为空或大小为0');
        return;
      }
      // 输出转换后的图像信息
      // console.log('img8图像大小:', img8.rows, 'x', img8.cols);
      // console.log('img8通道数:', img8.channels());

      // 创建用于绘制的 ImageData 对象，并在修改后的画布上绘制图像
      const colorData = new ImageData(new Uint8ClampedArray(img8.data), img8.cols, img8.rows);

      // modifiedCtx.putImageData(colorData, 0, 0);
      this.drawImgData = colorData;
      this.drawImageData(this.drawImgData);
      // console.log('修改后的彩图绘制完成！');

      this.$bus.$emit('showCaptureImage');

      // console.log('QHYCCD | imageData:', colorData);
      this.MakeHistogram(colorData);
      this.histogramImage = colorData;

      // 内存释放
      // dst.delete();
      // mat.delete();
      targetImg16.delete();
      img8.delete();
      resizeImg.delete();
    },

    initCanvas() {
      this.bufferCanvas = document.createElement('canvas');
      this.bufferCtx = this.bufferCanvas.getContext('2d');
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

      // 绘制图像
      this.bufferCtx.drawImage(this.bufferCanvas, this.translateX, this.translateY, colorData.width * this.scale, colorData.height * this.scale);
      this.imageWidth = colorData.width * this.scale;
      this.imageHeight = colorData.height * this.scale;
      console.log('image size: ' + colorData.width * this.scale + ', ' + colorData.height * this.scale);
      console.log('image scale: ' + this.scale);

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

          console.log('Move to: ' + this.translateX + ', ' + this.translateY);
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
      }, 100); // 100 毫秒内最多执行一次

      canvas.addEventListener('mousedown', (event) => {
        event.preventDefault();
        isDragging = true;
        lastX = event.offsetX;
        lastY = event.offsetY;
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
      });

      // 添加触摸事件监听
      canvas.addEventListener('touchstart', (event) => {
        event.preventDefault();
        isDragging = true;
        lastX = event.touches[0].clientX;
        lastY = event.touches[0].clientY;
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
      // console.time('SoftAWB处理完成,处理时间');

      // 分离通道
      // console.log('正在分离通道...');
      let channels = new cv.MatVector();
      cv.split(img16, channels);

      // 减去偏移量并乘以增益
      for (let i = 0; i < channels.size(); i++) {
        let channel = channels.get(i);
        channel.convertTo(channel, -1, 1, offset); // 减去偏移量
        if (i === 0) {
          channel.convertTo(channel, -1, gainB, 0); // 乘以增益
        } else if (i === 2) {
          channel.convertTo(channel, -1, gainR, 0); // 乘以增益
        }
        channel.delete(); // 手动释放内存
      }

      // 合并通道
      // console.log('正在合并通道...');
      let mergedImg = new cv.Mat();
      cv.merge(channels, mergedImg);

      // 释放资源
      // console.log('正在释放资源...');
      channels.delete();

      // console.log('图像处理完成。');
      // console.timeEnd('SoftAWB处理完成,处理时间');
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
      const histogramData = this.calculateHistogram(imageData);

      this.$bus.$emit('showHistogram', histogramData);
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
        // Convert the image to a cv.Mat
        // const src = cv.imread(this.histogramImage);    //Image()

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

        // Draw the image on canvas
        cv.imshow(canvas, stretchImage);
        console.log('QHYCCD | canvas size:', canvas.width, canvas.height);

        // Clean up
        src.delete();
        stretchImage.delete();
      }
    },

    setAutoHistogramNum(min, max) {
      this.histogram_min = min;
      this.histogram_max = max;
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

    // convertToGrayscale() {
    //   //console.log('QHYCCD | convertToGrayscale()');
    //   //changeOrder();


    //   if (!this.cvReady) {
    //     console.log('QHYCCD | OpenCV.js is not ready.');
    //     return;
    //   }
      
      
    //   console.log('QHYCCD | convertToGrayscale() 1');
    //   let imgElement = document.getElementById('imageSrc');
    //   console.log('QHYCCD | convertToGrayscale() 1.5');
    //   if (!imgElement) {
    //     console.error('Image element not found');
    //   return;
    //   };

    //   console.log('QHYCCD | convertToGrayscale() 1.6');
    //   if (!imgElement) {
    //     console.error('Image element not found');
    //     return;
    //   } else {
    //     console.log('QHYCCD | imgElement:', imgElement);
    //   }

    //   let src; 
    //   try {
    //     src = cv.imread(imgElement);
    //     console.log('QHYCCD | Image read into OpenCV:', src);
    //   } catch (error) {
    //     console.log('QHYCCD | Error reading image with OpenCV:', error);
    //   }
    //   console.log('QHYCCD | convertToGrayscale() 1.7');
    //   console.log('QHYCCD | src:', src);

    //   let dst = new cv.Mat();

    //   try {
    //     console.log('QHYCCD | convertToGrayscale()2');
    //     cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);
    //     console.log('QHYCCD | convertToGrayscale()3');
    //   } catch (error) {
    //     console.log('QHYCCD | Error during grayscale conversion:', error);
    //   }


    //   console.log('QHYCCD | imshow()');
    //   cv.imshow('guiderCamera-canvas', dst);

    //   // 释放内存
    //   src.delete();
    //   dst.delete();
    //   console.log('QHYCCD | convertToGrayscale() Finished');
    // },




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

   
  },
  computed: {
    nav: {
      get: function () {
        return this.$store.state.showNavigationDrawer
      },
      set: function (v) {
        if (this.$store.state.showNavigationDrawer !== v) {
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


</style>
