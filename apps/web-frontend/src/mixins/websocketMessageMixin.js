import { recordServerRawMessage } from '@/runtime/unifiedRuntime'
import { handleSpecialWebSocketMessage } from '@/domain/websocket/specialMessageHandlers'
import { handleDeviceDiscoveryMessage } from '@/domain/devices/deviceDiscoveryMessageHandlers'

export default {
  methods: {
    handleWebSocketMessage(message) {
        // console.log('QHYCCD | Received message:', message.data);

        const data = JSON.parse(message.data);
        if (data && typeof data.message === 'string') {
          recordServerRawMessage(data.message);
        }

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
          const setGuiderItemValue = (label, value) => {
            this.updateConfigItemValue(this.GuiderConfigItems, label, value, 'ConfigureRecovery');
          };
          const acceptMessage = handleSpecialWebSocketMessage(this, data.message)
            || handleDeviceDiscoveryMessage(this, messageType, parts);
          if (!acceptMessage) {
            switch (messageType) {
              case 'ExposureCompleted':
                this.e2eExposureCompletedSeq = (Number(this.e2eExposureCompletedSeq) || 0) + 1;
                this.emitCaptureTrace('frontend_exposure_completed_rx');
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
                if (parts.length >= 4) {
                  const fileName = parts[1];
                  const roi_x = parseFloat(parts[2]);
                  const roi_y = parseFloat(parts[3]);
                  const roiCfa = parts.length >= 5 ? parts[4] : null;
                  if (!Number.isFinite(roi_x) || !Number.isFinite(roi_y)) {
                    this.SendConsoleLogMsg(
                      `SaveJpgSuccess: invalid ROI coords parts=[${parts[2]}, ${parts[3]}]`,
                      'error'
                    );
                    break;
                  }
                  this.ROI_x = roi_x;
                  this.ROI_y = roi_y;

                  // this.$bus.$emit('showRoiImage', fileName);
                  this.showRoiImage(fileName, roi_x, roi_y, roiCfa);
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
                // - v5(追加): ...:{levelMode}
                if (parts.length >= 11) {
                  const normalizedCfa = this.normalizeCfaPattern(parts[8]);
                  const gpm = {
                    sessionId: parts[1],
                    imageWidth: parseInt(parts[2]),
                    imageHeight: parseInt(parts[3]),
                    tileSize: parseInt(parts[4]),
                    maxZoomLevel: parseInt(parts[5]),
                    blackLevel: parseInt(parts[6]),
                    whiteLevel: parseInt(parts[7]),
                    cfa: normalizedCfa,
                    gainR: parseFloat(parts[9]),
                    gainB: parseFloat(parts[10]),
                    // 兼容字段（可能不存在）
                    previewWidth: (parts.length >= 14) ? parseInt(parts[11]) : null,
                    previewHeight: (parts.length >= 14) ? parseInt(parts[12]) : null,
                    previewBinningFactor: (parts.length >= 14) ? parseInt(parts[13]) : null,
                    frameId: (parts.length >= 15) ? parseInt(parts[14]) : null,
                    buildMode: (parts.length >= 16) ? parts[15] : 'pyramid',
                    levelMode: (parts.length >= 17) ? parts[16] : 'full',
                  };
                  const tileGpmRxExtra = {
                    sessionId: gpm.sessionId,
                    frameId: gpm.frameId,
                    width: gpm.imageWidth,
                    height: gpm.imageHeight,
                    clientNowMs: Date.now(),
                  };
                  if (
                    this.captureTrace &&
                    Number.isFinite(Number(this.captureTrace.lastBackendTileGpmSentAtMs))
                  ) {
                    tileGpmRxExtra.approxClientSinceServerTileGpmSentMs =
                      Date.now() - Number(this.captureTrace.lastBackendTileGpmSentAtMs);
                  }
                  this.emitCaptureTrace('frontend_tilegpm_rx', {
                    ...tileGpmRxExtra,
                  });
                  this.logMainCameraImagePipeLine('App.vue', 'WebSocketOnMessage.TileGPM', 'gpmMessage', gpm);
                  this.handleTileGPM(gpm);
                }
                break;

              case 'CaptureTrace':
                this.handleBackendCaptureTrace(parts);
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
                  this.SendConsoleLogMsg('忽略后端 WhiteBalanceGains：自动白平衡改由前端基于 Z=0 计算', 'warning');
                }
                break;

              case 'SaveGuiderImageSuccess':
                if (parts.length === 2) {
                  const fileName = parts[1];
                  if (this.currentcanvas === 'GuiderCamera') {
                    this.loadAndDisplayImage('img/' + fileName);
                  }
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

              case 'GuiderErrorUnit':
                if (parts.length >= 2) {
                  const unit = parts[1] === 'arcsec' ? 'arcsec' : 'px';
                  const scale = parts.length >= 3 ? Number(parts[2]) : 0;
                  this.$bus.$emit('GuiderErrorUnitChanged', unit, Number.isFinite(scale) ? scale : 0);
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
                  this.updateConfigItemValue(this.MainCameraConfigItems, 'Binning', this.cameraBin, 'MainCameraBinning');
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
                if (parts.length === 5 || parts.length === 6) {
                  const PHD2ImageSize_X = parseInt(parts[1], 10);
                  const PHD2ImageSize_Y = parseInt(parts[2], 10);
                  const Box_X = parseInt(parts[3], 10);
                  const Box_Y = parseInt(parts[4], 10);
                  const boxHalfSizePx = parts.length >= 6 ? parseInt(parts[5], 10) : null;
                  this.lastPHD2BoxState = {
                    imageW: PHD2ImageSize_X,
                    imageH: PHD2ImageSize_Y,
                    x: Box_X,
                    y: Box_Y,
                    halfSizePx: boxHalfSizePx
                  };
                  this.DrawPHD2Box(PHD2ImageSize_X, PHD2ImageSize_Y, Box_X, Box_Y, boxHalfSizePx);
                  // 同步把“锁定星点”的原始像素坐标广播给 UI（用于显示导星的是哪颗星）
                  this.$bus.$emit('GuiderLockStar', PHD2ImageSize_X, PHD2ImageSize_Y, Box_X, Box_Y);
                }
                break;

              case 'GuiderSearchBoxMode':
                if (parts.length >= 3) {
                  const mode = parts[1];
                  const halfSizePx = parseInt(parts[2], 10);
                  this.guiderBoxDisplayMode = mode;
                  this.$bus.$emit('GuiderBoxDisplayModeChanged', mode);
                  if (this.lastPHD2BoxState) {
                    this.lastPHD2BoxState.halfSizePx = halfSizePx;
                    this.redrawLastPHD2Box();
                  }
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

              case 'ClearGuiderDebugCandidates':
                this.guiderDebugOverlay.dedup = [];
                this.guiderDebugOverlay.snr = [];
                this.guiderDebugOverlay.final = [];
                this.guiderDebugOverlay.selected = null;
                console.info('[GuiderDebugOverlay] cleared');
                this.scheduleGuiderCanvasRedraw();
                this.$bus.$emit('ClearGuiderDebugCandidates');
                break;

              case 'GuiderDebugDedupCandidatePosition':
                if (parts.length === 5) {
                  const imageW = parseInt(parts[1], 10);
                  const imageH = parseInt(parts[2], 10);
                  const starX = parseInt(parts[3], 10);
                  const starY = parseInt(parts[4], 10);
                  this.guiderDebugOverlay.dedup.push({ x: starX, y: starY, imageW, imageH });
                  console.info('[GuiderDebugOverlay] dedup', this.guiderDebugOverlay.dedup.length, starX, starY);
                  this.scheduleGuiderCanvasRedraw();
                  this.DrawGuiderDebugDedupCandidate(imageW, imageH, starX, starY);
                }
                break;

              case 'GuiderDebugSnrCandidatePosition':
                if (parts.length === 5) {
                  const imageW = parseInt(parts[1], 10);
                  const imageH = parseInt(parts[2], 10);
                  const starX = parseInt(parts[3], 10);
                  const starY = parseInt(parts[4], 10);
                  this.guiderDebugOverlay.snr.push({ x: starX, y: starY, imageW, imageH });
                  console.info('[GuiderDebugOverlay] snr', this.guiderDebugOverlay.snr.length, starX, starY);
                  this.scheduleGuiderCanvasRedraw();
                  this.DrawGuiderDebugSnrCandidate(imageW, imageH, starX, starY);
                }
                break;

              case 'GuiderDebugCandidatePosition':
                if (parts.length === 5) {
                  const imageW = parseInt(parts[1], 10);
                  const imageH = parseInt(parts[2], 10);
                  const starX = parseInt(parts[3], 10);
                  const starY = parseInt(parts[4], 10);
                  this.DrawGuiderDebugCandidate(imageW, imageH, starX, starY);
                }
                break;

              case 'GuiderDebugFinalCandidatePosition':
                if (parts.length >= 5) {
                  const imageW = parseInt(parts[1], 10);
                  const imageH = parseInt(parts[2], 10);
                  const starX = parseInt(parts[3], 10);
                  const starY = parseInt(parts[4], 10);
                  const label = parts.length >= 6 ? parts.slice(5).join(':') : '';
                  this.guiderDebugOverlay.final.push({ x: starX, y: starY, imageW, imageH, label });
                  console.info('[GuiderDebugOverlay] final', this.guiderDebugOverlay.final.length, starX, starY, label);
                  this.scheduleGuiderCanvasRedraw();
                  this.DrawGuiderDebugFinalCandidate(imageW, imageH, starX, starY, label);
                }
                break;

              case 'GuiderDebugSelectedCandidatePosition':
                if (parts.length === 5) {
                  const imageW = parseInt(parts[1], 10);
                  const imageH = parseInt(parts[2], 10);
                  const starX = parseInt(parts[3], 10);
                  const starY = parseInt(parts[4], 10);
                  this.guiderDebugOverlay.selected = { x: starX, y: starY, imageW, imageH };
                  console.info('[GuiderDebugOverlay] selected', starX, starY);
                  this.scheduleGuiderCanvasRedraw();
                  this.DrawGuiderDebugSelectedCandidate(imageW, imageH, starX, starY);
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
                  const setMainFocalLengthValue = (value) => {
                    this.updateConfigItemValue(this.MainCameraConfigItems, 'Main Camera Focal Length (mm)', value, 'ConfigureRecovery')
                  }
                  console.log('Configure:', ConfigName, ',', ConfigValue);
                  this.SendConsoleLogMsg('Configure Recovery:' + parts[1] + ',' + parts[2], 'info');
                  this.$bus.$emit(ConfigName, ConfigValue);

                  if (parts[1] === 'MainCameraFocalLength') {
                    setMainFocalLengthValue(parts[2]);
                  }

                  if (parts[1] === 'FocalLength' && !parts[2]) {
                    setMainFocalLengthValue(parts[2]);
                  }

                  if (parts[1] === 'FocalLength' && parts[2]) {
                    const currentMainFocal = this.MainCameraConfigItems.find(item => item.label === 'Main Camera Focal Length (mm)')
                    if (!currentMainFocal || currentMainFocal.value === '' || currentMainFocal.value === null || currentMainFocal.value === undefined) {
                      setMainFocalLengthValue(parts[2]);
                    }
                  }

                  if (parts[1] === 'GuiderFocalLength') {
                    setGuiderItemValue('Guider Focal Length (mm)', parts[2]);
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderFocalLength:' + parts[2]);
                  }

                  if (parts[1] === 'PoleCameraFocalLength') {
                    this.updateConfigItemValue(this.PoleCameraConfigItems, 'PoleCameraFocalLength', parts[2], 'ConfigureRecovery')
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'PoleCameraFocalLength:' + parts[2]);
                  }

                  if (parts[1] === 'GuiderPixelSize') {
                    setGuiderItemValue('Guider Pixel size', parts[2]);
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderPixelSize:' + parts[2]);
                  }

                  if (parts[1] === 'GuiderExposureMs') {
                    this.$bus.$emit('GuiderExposureMs', parts[2]);
                    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderExpTimeSwitch:' + parts[2]);
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
                    const rawDir = String(parts[2] || '').trim().toUpperCase();
                    const uiDir = rawDir === 'NORTH' ? 'DEC+'
                      : rawDir === 'SOUTH' ? 'DEC-'
                      : rawDir === 'AUTO' ? 'BOTH'
                      : rawDir;
                    setGuiderItemValue('DEC Single Guide Direction', uiDir);
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

              case 'ConnectDriverPendingAllocation':
                // 设备已进入“待分配”阶段（不是失败），应结束单独连接按钮执行态，
                // 由分配面板继续完成绑定。
                if (parts.length >= 2) {
                  const deviceType = parts[1];
                  this.SendConsoleLogMsg(`ConnectDriverPendingAllocation:${deviceType}`, 'info');
                  if (this.isCameraAllocationRole(deviceType)) {
                    this.CurrentDriverType = deviceType;
                    this.isOpenPowerPage = false;
                    this.isOpenDevicePage = true;
                    this.drawer_2 = true;
                  }
                }
                this.isConnecting = false;
                this.stopLoading();
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
                      const idxNum = Number(payload[i + 2]);
                      list.push({
                        DeviceType: (payload[i] || '').trim(),
                        DeviceName: (payload[i + 1] || '').trim(),
                        DeviceIndex: Number.isFinite(idxNum) ? idxNum : payload[i + 2],
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
                    if (deviceType === 'all') {
                      this.clearInlineCameraAllocationState('all');
                    } else {
                      this.clearInlineCameraAllocationState(deviceType);
                    }
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

              case 'FocusCalibrationBoundaryShifted':
                if (parts.length >= 4) {
                  const edge = parts[1] === 'inner' ? 'inner' : 'outer';
                  const minLimit = parts[2];
                  const maxLimit = parts[3];
                  const msg = `Calibration boundary shifted (${edge}). New range: [${minLimit}, ${maxLimit}]`;
                  this.callShowMessageBox(msg, 'info');
                  this.SendConsoleLogMsg(msg, 'info');
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
                if (parts.length >= 4) {
                  this.DrawSelectStarX = parseFloat(parts[1]);
                  this.DrawSelectStarY = parseFloat(parts[2]);
                  this.DrawSelectStarHFR = parseFloat(parts[3]);
                  if (parts.length >= 5) {
                    this.DrawSelectStarSNR = parseFloat(parts[4]);
                    this.$bus.$emit('addSnrNow', this.DrawSelectStarSNR);
                  }
                  if (parts.length >= 7) {
                    this.DrawSelectStarLocalMax = parseFloat(parts[5]);
                    this.DrawSelectStarBgStd = parseFloat(parts[6]);
                    this.$bus.$emit('updateFocusMetrics', {
                      snr: this.DrawSelectStarSNR,
                      localMax: this.DrawSelectStarLocalMax,
                      bgStd: this.DrawSelectStarBgStd
                    });
                  }
                }
                break;

              case 'SetRedBoxState':
                if (parts.length === 4) {
                  const length = parseInt(parts[1]);
                  const rx = parseFloat(parts[2]);
                  const ry = parseFloat(parts[3]);
                  this.ROI_x = rx;
                  this.ROI_y = ry;

                  this.setRedBoxState(length, this.ROI_x, this.ROI_y);
                  // 跟踪星居中：SaveJpgSuccess 与 SetRedBoxState 可能同批到达，叠加层像素仍是上一帧 ROI，而红框已被更新为新居中位置；仅当坐标仍一致时保留叠加层（如 sendRoiInfo 同步）。
                  if (this.tileGPM && this.roiOverlayImageData != null) {
                    const ox = this.roiOverlayX;
                    const oy = this.roiOverlayY;
                    const same =
                      Number.isFinite(ox) &&
                      Number.isFinite(oy) &&
                      Math.abs(ox - rx) < 0.5 &&
                      Math.abs(oy - ry) < 0.5;
                    if (!same) {
                      this.roiOverlayImageData = null;
                    }
                  }
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
                  const latNum = parseFloat(lat);
                  const lonNum = parseFloat(lon);
                  if (Number.isFinite(latNum) && Number.isFinite(lonNum) && !(latNum === 0 && lonNum === 0)) {
                    const mutation = this.$store.state.useAutoLocation ? 'setAutoDetectedLocation' : 'setCurrentLocation';
                    this.$store.commit(mutation, {
                      short_name: 'Unknown',
                      country: 'Unknown',
                      lng: lonNum,
                      lat: latNum,
                      alt: 0,
                      accuracy: 0,
                      street_address: ''
                    });
                  }
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
                  const value = this.normalizeCfaPattern(parts[1]);
                  this.ImageCFA = value;
                  console.log("获取到的主相机参数  MainCameraCFA: ", this.ImageCFA);
                  this.updateConfigItemValue(this.MainCameraConfigItems, 'ImageCFA', this.ImageCFA, 'MainCameraCFA');
                }
                break;

              case 'MainCameraCFASource':
                if (parts.length === 2) {
                  const source = String(parts[1] || '').trim();
                  this.mainCameraCfaSource = source || 'SAVED';
                  if (source === 'SDK' || source === 'INDI') {
                    this.mainCameraDetectedCfa = this.normalizeCfaPattern(this.ImageCFA);
                  }
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
                  const adjustmentra = parseFloat(parts[15]);
                  const adjustmentdec = parseFloat(parts[16]);
                  const fakePolarRA = parseFloat(parts[17]);
                  const fakePolarDEC = parseFloat(parts[18]);
                  const realPolarRA = parseFloat(parts[19]);
                  const realPolarDEC = parseFloat(parts[20]);
                  const guideAz = Number.isFinite(adjustmentra) ? adjustmentra : offsetra;
                  const guideAlt = Number.isFinite(adjustmentdec) ? adjustmentdec : offsetdec;


                  // console.log('自动对焦绘制数据: ', ra, dec, targetra, targetdec, fakePolarRA, fakePolarDEC, realPolarRA, realPolarDEC);
                  console.log('四角点数据: ', ra0, dec0, ra1, dec1, ra2, dec2, ra3, dec3);

                  // 现有事件保持不变（使用计算的max/min值兼容）
                  this.$bus.$emit('FieldDataUpdate', [ra, dec, ra0, dec0, ra1, dec1, ra2, dec2, ra3, dec3, targetra, targetdec, fakePolarRA, fakePolarDEC, realPolarRA, realPolarDEC]);

                  // console.log('自动对焦显示更新数据: ', offsetra, offsetdec, adjustmentra, adjustmentdec);
                  this.$bus.$emit('updateCardInfo', ra, dec, targetra, targetdec, guideAz, guideAlt, adjustmentra, adjustmentdec, "deg");

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

              case 'PoleMasterAlignmentState':
                if (parts.length === 5) {
                  const isRunning = parts[1] === 'true';
                  const state = parseInt(parts[2], 10);
                  const message = parts[3];
                  const progress = parseInt(parts[4], 10);
                  console.log('PoleMasterAlignmentState: ', isRunning, state, message, progress);
                  this.$bus.$emit('PoleMasterAlignmentState', isRunning, state, message, progress);
                }
                break;

              case 'PoleMasterAlignmentGuideData':
                if (parts.length >= 11) {
                  const payload = {
                    imageW: parseInt(parts[1], 10),
                    imageH: parseInt(parts[2], 10),
                    axisX: parseFloat(parts[3]),
                    axisY: parseFloat(parts[4]),
                    poleX: parseFloat(parts[5]),
                    poleY: parseFloat(parts[6]),
                    errorPx: parseFloat(parts[7]),
                    errorArcsec: parseFloat(parts[8]),
                    frameId: parts[9] || '',
                    hint: parts.slice(10).join(':')
                  };
                  console.log('PoleMasterAlignmentGuideData:', payload);
                  this.$bus.$emit('PoleMasterAlignmentGuideData', payload);
                }
                break;

              case 'PoleMasterAlignmentFrameData':
                if (parts.length >= 5) {
                  const framePayload = {
                    fileName: parts[1],
                    imageWidth: parseInt(parts[2], 10),
                    imageHeight: parseInt(parts[3], 10),
                    frameId: parts.slice(4).join(':')
                  };
                  console.log('PoleMasterAlignmentFrameData:', framePayload);
                  this.$bus.$emit('PoleMasterAlignmentFrameData', framePayload);
                }
                break;

              case 'PoleMasterAlignmentOverlayData':
                if (parts.length >= 2) {
                  const rawJson = parts.slice(1).join(':');
                  try {
                    const overlayPayload = JSON.parse(rawJson);
                    console.log('PoleMasterAlignmentOverlayData:', {
                      frameId: overlayPayload && overlayPayload.frameId,
                      phase: overlayPayload && overlayPayload.phase,
                      imageW: overlayPayload && overlayPayload.imageW,
                      imageH: overlayPayload && overlayPayload.imageH,
                      quality: overlayPayload && overlayPayload.quality
                    });
                    this.$bus.$emit('PoleMasterAlignmentOverlayData', overlayPayload);
                  } catch (error) {
                    console.warn('PoleMasterAlignmentOverlayData parse failed:', error, rawJson);
                  }
                }
                break;

              case 'focusMoveFailed':
                if (parts.length === 2) {
                  const message = parts[1];
                  this.callShowMessageBox(message, 'error');
                  this.$bus.$emit('focusMoveFailed', message);
                }

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
                  this.updateConfigItemValue(this.MountConfigItems, 'SolveCurrentPosition', false, 'SolveCurrentPosition');
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
              case 'addSnrNow':
                if (parts.length >= 2) {
                  const snr = parseFloat(parts[1]);
                  console.log('Received addSnrNow:', snr);
                  this.$bus.$emit('addSnrNow', snr);
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

              case 'AutoFocusCoarseRetryPrompt':
                if (parts.length >= 3) {
                  const question = parts.slice(2).join(':');
                  console.log('AutoFocusCoarseRetryPrompt:', question);
                  this.ShowConfirmDialog('自动对焦', question, 'AutoFocusCoarseRetry');
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
                    if (msg.includes('当前帧未识别到可用星点')) {
                      this.$bus.$emit('showMsgBox', this.$t('GuiderNoStarAvailableWaitingNextFrame'), 'warning');
                    }
                    // 同步抛给组件（如果后续想在界面上显示导星提示）
                    this.$bus.$emit('GuiderCoreInfo', msg);
                  }
                }
                break;
              case 'GuiderCoreError':
                {
                  const raw = parts.length >= 2 ? parts.slice(1).join(':') : '';
                  if (raw) {
                    let display = raw;
                    if (/CalibrationFailed:LostStar/i.test(raw)) {
                      display = '导星校准失败：校准过程中丢失星点';
                    } else if (/RA Calibration Failed: star did not move enough/i.test(raw)) {
                      display = '导星校准失败：RA 方向星点移动不足';
                    } else if (/DEC Calibration Failed: star did not move enough/i.test(raw)) {
                      display = '导星校准失败：DEC 方向星点移动不足';
                    } else if (/Backlash Clearing Failed: star did not move enough/i.test(raw)) {
                      display = '导星校准失败：DEC 回差清除阶段星点移动不足';
                    } else if (/CalibrationQualityFailed:/i.test(raw)) {
                      display = '导星校准失败：校准质量不达标，请检查导星速率、脉冲方向和赤道仪响应';
                    } else if (/BeginCalibrationFailed:NoLock/i.test(raw)) {
                      display = '导星校准失败：当前没有锁定星点';
                    }
                    this.callShowMessageBox(display, 'error');
                    this.$bus.$emit('GuiderCoreError', raw);
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
    },
  },
}
