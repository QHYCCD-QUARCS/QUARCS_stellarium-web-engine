# 测试标识扫描报告

**生成时间**: 2026/3/26（与 `e2e-exposure-completed` 探针同步）

## 📊 统计摘要

- **总组件数**: 55
- **有标识的组件**: 55
- **总标识数**: 661
- **重复标识数**: 0

### 按前缀分类

| 前缀 | 数量 |
|------|------|
| `ui-` | 259 |
| `pa-` | 144 |
| `mcp-` | 43 |
| `imp-` | 42 |
| `cp-` | 41 |
| `scp-` | 31 |
| `fp-` | 16 |
| `gui-` | 16 |
| `hp-` | 13 |
| `tb-` | 11 |
| `bb-` | 11 |
| `
                  'ui-` | 4 |
| `dap-` | 4 |
| `dp-` | 4 |
| ``scp-` | 4 |
| `
                    'ui-` | 3 |
| `
                      'ui-` | 3 |
| ``ui-` | 3 |
| `e2e-` | 3 |
| ``imp-` | 2 |
| ``e2e-` | 1 |
| `
                        'ui-` | 1 |
| `
              'ui-` | 1 |
| `$attrs['data-` | 1 |

### 标识最多的组件（前10）

| 组件文件 | 标识数量 |
|---------|----------|
| components/AutomaticPolarAlignmentCalibration.vue | 144 |
| App.vue | 54 |
| components/ImageManagerBrowser.vue | 44 |
| components/MountControlPanel.vue | 43 |
| components/CapturePanel.vue | 41 |
| components/SchedulePanel.vue | 35 |
| components/view-settings-dialog.vue | 34 |
| components/gui.vue | 24 |
| components/FocuserPanel.vue | 16 |
| components/MeridianFlipNotifier.vue | 14 |

## 📝 详细列表

### components/AutomaticPolarAlignmentCalibration.vue (144 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `pa-root` | unknown | 4 | - |
| `pa-minimized` | unknown | 13 | - |
| `pa-minimized-header` | div | 16 | - |
| `pa-minimized-drag-handle` | unknown | 21 | - |
| `pa-minimized-icon` | v | 23 | - |
| `pa-minimized-title` | span | 24 | - |
| `pa-minimized-controls` | div | 27 | - |
| `pa-btn-close-minimized` | unknown | 32 | - |
| `pa-icon-close-minimized` | v | 34 | - |
| `pa-btn-expand-from-minimized` | unknown | 40 | - |
| `pa-icon-expand-from-minimized` | v | 42 | - |
| `pa-minimized-status` | div | 47 | - |
| `pa-connection-indicator-minimized` | unknown | 51 | - |
| `pa-connection-text-minimized` | span | 54 | - |
| `pa-widget` | unknown | 70 | - |
| `pa-header` | div | 74 | - |
| `pa-header-drag-handle` | unknown | 79 | - |
| `pa-header-left` | div | 81 | - |
| `pa-header-icon` | v | 82 | - |
| `pa-header-title` | span | 83 | - |
| `pa-connection-indicator` | div | 84 | - |
| `pa-connection-dot` | unknown | 88 | - |
| `pa-header-controls` | div | 95 | - |
| `pa-btn-close` | unknown | 100 | - |
| `pa-icon-close` | v | 102 | - |
| `pa-btn-toggle-collapse` | unknown | 108 | - |
| `pa-icon-toggle-collapse` | v | 110 | - |
| `pa-btn-toggle-trajectory` | unknown | 119 | - |
| `pa-icon-toggle-trajectory` | v | 122 | - |
| `pa-btn-minimize` | unknown | 131 | - |
| `pa-icon-minimize` | v | 133 | - |
| `pa-content-collapsed` | unknown | 143 | - |
| `pa-collapsed-info` | div | 145 | - |
| `pa-collapsed-progress` | div | 146 | - |
| `pa-collapsed-progress-circle` | unknown | 150 | - |
| `pa-collapsed-progress-text` | span | 153 | - |
| `pa-collapsed-status` | div | 159 | - |
| `pa-collapsed-azimuth` | div | 160 | - |
| `pa-collapsed-azimuth-label` | span | 161 | - |
| `pa-collapsed-azimuth-value` | unknown | 165 | - |
| `pa-collapsed-altitude` | div | 172 | - |
| `pa-collapsed-altitude-label` | span | 173 | - |
| `pa-collapsed-altitude-value` | unknown | 177 | - |
| `pa-content-expanded` | unknown | 192 | - |
| `pa-sections` | div | 194 | - |
| `pa-calibration-progress` | div | 196 | - |
| `pa-progress-header` | div | 197 | - |
| `pa-progress-title` | div | 198 | - |
| `pa-calibration-loop-info` | unknown | 202 | - |
| `pa-progress-bar` | div | 209 | - |
| `pa-progress-fill` | unknown | 213 | - |
| `pa-progress-nodes` | div | 217 | - |
| `pa-step-initialization` | div | 219 | - |
| `pa-step-initialization-circle` | div | 220 | - |
| `pa-step-initialization-label` | div | 224 | - |
| `pa-step-calibration-1` | div | 228 | - |
| `pa-step-calibration-1-circle` | div | 229 | - |
| `pa-step-calibration-1-label` | div | 233 | - |
| `pa-step-calibration-2` | div | 237 | - |
| `pa-step-calibration-2-circle` | div | 238 | - |
| `pa-step-calibration-2-label` | div | 242 | - |
| `pa-step-calibration-3` | div | 246 | - |
| `pa-step-calibration-3-circle` | div | 247 | - |
| `pa-step-calibration-3-label` | div | 251 | - |
| `pa-step-guidance-calibration` | unknown | 258 | - |
| `pa-step-guidance-calibration-circle` | div | 261 | - |
| `pa-step-guidance-calibration-label` | div | 266 | - |
| `pa-step-verification` | unknown | 273 | - |
| `pa-step-verification-circle` | div | 276 | - |
| `pa-step-verification-label` | div | 280 | - |
| `pa-log-section` | div | 287 | - |
| `pa-log-display` | div | 288 | - |
| `pa-latest-log` | unknown | 293 | - |
| `pa-latest-log-timestamp` | div | 296 | - |
| `pa-latest-log-message` | div | 299 | - |
| `pa-log-empty` | div | 304 | - |
| `pa-position-section` | div | 311 | - |
| `pa-position-grid` | div | 312 | - |
| `pa-pos-current-ra` | div | 313 | - |
| `pa-pos-current-ra-label` | div | 314 | - |
| `pa-pos-current-ra-value` | div | 315 | - |
| `pa-pos-current-dec` | div | 318 | - |
| `pa-pos-current-dec-label` | div | 319 | - |
| `pa-pos-current-dec-value` | div | 320 | - |
| `pa-pos-target-ra` | div | 323 | - |
| `pa-pos-target-ra-label` | div | 324 | - |
| `pa-pos-target-ra-value` | div | 325 | - |
| `pa-pos-target-dec` | div | 328 | - |
| `pa-pos-target-dec-label` | div | 329 | - |
| `pa-pos-target-dec-value` | div | 330 | - |
| `pa-adjustment-section` | div | 336 | - |
| `pa-adjustment-instructions` | div | 337 | - |
| `pa-adjust-azimuth` | unknown | 341 | - |
| `pa-adjust-azimuth-icon` | div | 344 | - |
| `pa-adjust-azimuth-details` | div | 348 | - |
| `pa-adjust-azimuth-header` | div | 349 | - |
| `pa-adjust-azimuth-type` | span | 350 | - |
| `pa-adjust-azimuth-value` | span | 351 | - |
| `pa-adjust-azimuth-action` | div | 356 | - |
| `pa-adjust-altitude` | unknown | 365 | - |
| `pa-adjust-altitude-icon` | div | 368 | - |
| `pa-adjust-altitude-details` | div | 372 | - |
| `pa-adjust-altitude-header` | div | 373 | - |
| `pa-adjust-altitude-type` | span | 374 | - |
| `pa-adjust-altitude-value` | span | 375 | - |
| `pa-adjust-altitude-action` | div | 380 | - |
| `pa-control-section` | div | 389 | - |
| `pa-action-buttons` | div | 390 | - |
| `pa-btn-auto-calibration` | unknown | 395 | - |
| `pa-btn-auto-calibration-text` | span | 400 | - |
| `pa-btn-test-simulation` | unknown | 411 | - |
| `pa-btn-test-simulation-text` | span | 414 | - |
| `pa-guidance-indicator` | div | 423 | - |
| `pa-guidance-circle` | unknown | 432 | - |
| `pa-guidance-svg` | svg | 436 | - |
| `pa-guidance-bg` | circle | 437 | - |
| `pa-guidance-bar` | unknown | 444 | - |
| `pa-guidance-content` | div | 448 | - |
| `pa-guidance-step-icon` | v | 449 | - |
| `pa-guidance-step-description` | div | 450 | - |
| `pa-guidance-star-count` | unknown | 456 | - |
| `pa-trajectory-overlay-fullscreen` | unknown | 472 | - |
| `pa-trajectory-canvas-fullscreen` | canvas | 474 | - |
| `pa-btn-trajectory-close` | unknown | 480 | - |
| `pa-trajectory-hint` | div | 485 | - |
| `pa-trajectory-panel` | div | 487 | - |
| `pa-trajectory-panel-current` | div | 488 | - |
| `pa-trajectory-panel-current-label` | span | 489 | - |
| `pa-trajectory-panel-current-value` | span | 490 | - |
| `pa-trajectory-panel-target` | div | 495 | - |
| `pa-trajectory-panel-target-label` | span | 496 | - |
| `pa-trajectory-panel-target-value` | span | 497 | - |
| `pa-trajectory-panel-actions` | div | 502 | - |
| `pa-btn-clear-old-trajectory` | button | 503 | - |
| `pa-btn-switch-to-windowed` | button | 506 | - |
| `pa-trajectory-overlay-windowed` | unknown | 520 | - |
| `pa-trajectory-window-header` | div | 522 | - |
| `pa-trajectory-window-title` | span | 523 | - |
| `pa-trajectory-window-actions` | div | 525 | - |
| `pa-btn-switch-to-fullscreen` | button | 526 | - |
| `pa-btn-clear-old-trajectory-windowed` | button | 529 | - |
| `pa-btn-trajectory-close-windowed` | unknown | 536 | - |
| `pa-trajectory-window-content` | div | 543 | - |
| `pa-trajectory-canvas-windowed` | canvas | 544 | - |

### App.vue (55 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-app-root` | v | 10 | - |
| `e2e-probes` | unknown | 18 | - |
| ``e2e-device-${d && d.driverType ? d.driverType : UNKNOWN_DRIVER_TYPE}-conn`` | unknown | 25 | - |
| `e2e-tilegpm` | unknown | 33 | - |
| `e2e-exposure-completed` | unknown | 37 | - |
| `ui-app-submenu-drawer` | unknown | 43 | - |
| `ui-app-submenu-device-page` | div | 49 | isOpenDevicePage ? 'open' : 'closed' |
| `ui-app-submenu-params-container` | unknown | 52 | - |
| `ui-app-device-connection-panel` | unknown | 60 | - |
| `ui-app-select-confirm-driver` | unknown | 69 | - |
| `
                    'ui-app-select-confirm-driver-option-'
                    + String((item && item.value) || item || 'unknown').replace(/[^A-Za-z0-9]+/g, '')
                  ` | unknown | 74 | - |
| `ui-app-select-on-connection-mode-change` | unknown | 98 | - |
| `
                        'ui-app-select-connection-mode-option-'
                        + String((item && item.value) || item || 'unknown').replace(/[^A-Za-z0-9]+/g, '')
                      ` | unknown | 103 | - |
| `ui-app-select-confirm-driver-2` | unknown | 120 | - |
| `ui-app-select-auto` | unknown | 126 | - |
| `ui-app-select-auto-2` | unknown | 137 | - |
| `ui-app-btn-clear-driver` | button | 149 | - |
| `ui-app-btn-connect-driver` | unknown | 158 | - |
| `
              'ui-app-config-item-'
              + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
              + '-'
              + String(item.label || 'Field').replace(/[^A-Za-z0-9]+/g, '')
              + '-'
              + index
            ` | unknown | 175 | - |
| `
                  'ui-config-'
                  + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
                  + '-'
                  + String(item.label || 'Field').replace(/[^A-Za-z0-9]+/g, '')
                  + '-text-'
                  + index
                ` | unknown | 199 | - |
| `
                  'ui-config-'
                  + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
                  + '-' 
                  + String(item.label || 'Field').replace(/[^A-Za-z0-9]+/g, '')
                  + '-number-'
                  + index
                ` | unknown | 224 | - |
| `
                    'ui-config-'
                    + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
                    + '-'
                    + String(item.label || 'Field').replace(/[^A-Za-z0-9]+/g, '')
                    + '-slider-label-'
                    + index
                  ` | unknown | 237 | - |
| `
                      'ui-config-'
                      + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
                      + '-'
                      + String(item.label || 'Field').replace(/[^A-Za-z0-9]+/g, '')
                      + '-slider-dec-'
                      + index
                    ` | unknown | 255 | - |
| `
                      'ui-config-'
                      + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
                      + '-'
                      + String(item.label || 'Field').replace(/[^A-Za-z0-9]+/g, '')
                      + '-slider-'
                      + index
                    ` | unknown | 279 | - |
| `
                      'ui-config-'
                      + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
                      + '-'
                      + String(item.label || 'Field').replace(/[^A-Za-z0-9]+/g, '')
                      + '-slider-inc-'
                      + index
                    ` | unknown | 295 | - |
| `
                  'ui-config-'
                  + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
                  + '-'
                  + String(item.label || 'Field').replace(/[^A-Za-z0-9]+/g, '')
                  + '-select-'
                  + index
                ` | unknown | 320 | - |
| `
                  'ui-config-'
                  + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
                  + '-'
                  + String(item.label || 'Field').replace(/[^A-Za-z0-9]+/g, '')
                  + '-switch-'
                  + index
                ` | unknown | 338 | - |
| `
                    'ui-config-'
                    + String(item.driverType || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
                    + '-'
                    + String(item.label || item.buttonText || 'Button').replace(/[^A-Za-z0-9]+/g, '')
                    + '-button-'
                    + index
                  ` | unknown | 369 | - |
| `ui-app-btn-disconnect-driver` | unknown | 405 | - |
| `ui-power-manager-root` | unknown | 418 | - |
| `ui-power-manager-btn-close` | unknown | 424 | - |
| `ui-app-power-page-output-power-1` | unknown | 438 | - |
| `ui-app-power-page-output-power-2` | unknown | 458 | - |
| `ui-app-power-page-restart-quarcs-server` | v | 479 | - |
| `ui-app-power-page-restart` | v | 491 | - |
| `ui-app-power-page-shutdown` | v | 503 | - |
| `ui-app-power-page-force-update` | v | 515 | - |
| `ui-app-menu-drawer` | unknown | 543 | - |
| `ui-app-menu-quit` | v | 577 | - |
| `ui-app-menu-general-settings` | v | 591 | - |
| `ui-app-menu-open-power-manager` | v | 605 | - |
| ``ui-app-menu-device-${device && device.driverType ? device.driverType : UNKNOWN_DRIVER_TYPE}`` | unknown | 626 | - |
| `ui-app-menu-connect-all` | unknown | 660 | - |
| `ui-app-menu-disconnect-all` | v | 679 | - |
| `ui-app-menu-device-allocation` | v | 693 | - |
| `ui-app-menu-calibrate-polar-axis` | v | 707 | - |
| `ui-app-menu-open-image-manager` | v | 721 | - |
| `ui-app-menu-open-debug-log` | v | 735 | - |
| `ui-app-menu-location` | v | 751 | - |
| `ui-app-menu-refresh-page` | unknown | 770 | - |
| `ui-app-menu-data-credits` | v | 786 | - |
| `tb-act-toggle-navigation-drawer-overlay` | unknown | 847 | - |
| `ui-app-disconnect-driver-dialog-root` | unknown | 857 | - |
| `ui-app-disconnect-driver-dialog-btn-cancel` | v | 863 | - |
| `ui-app-disconnect-driver-dialog-btn-confirm` | v | 864 | - |

### components/ImageManagerBrowser.vue (44 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `imp-root` | unknown | 7 | - |
| `imp-btn-move-file-to-usb` | button | 12 | - |
| `imp-btn-delete-btn-click` | button | 15 | - |
| `imp-btn-download-selected` | button | 18 | - |
| `imp-act-image-file-switch` | span | 19 | - |
| `imp-btn-image-file-switch` | button | 20 | - |
| `imp-btn-panel-close` | button | 23 | - |
| `imp-txt-no-folders` | div | 38 | - |
| ``imp-sidebar-folder-${index}`` | unknown | 45 | - |
| `imp-txt-current-folder` | div | 67 | - |
| `imp-btn-refresh-current-folder` | button | 71 | - |
| ``imp-file-row-${currentFolderDisplayIndex}-${index}`` | unknown | 87 | - |
| `imp-act-close-usbselect-dialog` | div | 111 | - |
| `imp-act-usb-select-dialog` | div | 112 | - |
| `imp-btn-close-usbselect-dialog` | button | 115 | - |
| `imp-act-select-usb` | div | 118 | - |
| `imp-act-close-usb-confirm-dialog` | div | 131 | - |
| `imp-usb-confirm-dialog` | div | 132 | - |
| `imp-btn-close-usb-confirm-dialog` | button | 135 | - |
| `imp-btn-cancel-usb-confirm` | button | 142 | - |
| `imp-btn-confirm-usb-transfer` | button | 143 | - |
| `imp-act-close-delete-confirm-dialog` | div | 151 | - |
| `imp-delete-confirm-dialog` | div | 152 | - |
| `imp-btn-close-delete-confirm-dialog` | button | 155 | - |
| `imp-btn-cancel-delete-confirm` | button | 161 | - |
| `imp-btn-confirm-delete` | button | 162 | - |
| `imp-act-close-download-confirm-dialog` | div | 170 | - |
| `imp-act-usb-select-dialog-2` | div | 171 | - |
| `imp-btn-close-download-confirm-dialog` | button | 174 | - |
| `imp-select-download-concurrency` | select | 180 | - |
| `imp-btn-close-download-confirm-dialog-2` | button | 188 | - |
| `imp-btn-confirm-start-download` | button | 189 | - |
| `imp-act-close-download-location-reminder-dialog` | div | 197 | - |
| `imp-act-download-location-reminder-dialog` | div | 198 | - |
| `imp-btn-close-download-location-reminder-dialog` | button | 201 | - |
| `imp-btn-cancel-download-location-reminder-dialog` | button | 206 | - |
| `imp-btn-continue-download-location-reminder-dialog` | button | 207 | - |
| `imp-btn-toggle-download-panel` | button | 220 | - |
| `imp-btn-cancel-all-downloads` | button | 221 | - |
| `imp-select-download-concurrency-2` | select | 223 | - |
| `imp-btn-pause-download` | button | 236 | - |
| `imp-btn-resume-download` | button | 237 | - |
| `imp-btn-cancel-download` | button | 238 | - |
| `imp-btn-auto` | button | 251 | - |

### components/MountControlPanel.vue (43 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `mcp-panel` | unknown | 5 | - |
| `mcp-display` | div | 6 | - |
| `mcp-combined-text` | div | 8 | - |
| `mcp-pier-side-text` | div | 9 | - |
| `mcp-separator` | div | 10 | - |
| `mcp-radec-text` | div | 11 | - |
| `mcp-value-ra` | span | 12 | - |
| `mcp-value-dec` | span | 13 | - |
| `mcp-direction-controls` | div | 18 | - |
| `mcp-btn-ra-plus` | unknown | 20 | - |
| `mcp-img-ra-plus` | unknown | 23 | - |
| `mcp-btn-ra-minus` | unknown | 27 | - |
| `mcp-img-ra-minus` | unknown | 30 | - |
| `mcp-btn-dec-plus` | unknown | 34 | - |
| `mcp-img-dec-plus` | unknown | 37 | - |
| `mcp-btn-dec-minus` | unknown | 41 | - |
| `mcp-img-dec-minus` | unknown | 44 | - |
| `mcp-stop-container` | div | 49 | - |
| `mcp-btn-stop` | button | 50 | - |
| `mcp-icon-stop` | button | 50 | - |
| `mcp-speed-container` | div | 53 | - |
| `mcp-btn-speed` | button | 54 | - |
| `mcp-speed-value` | span | 55 | - |
| `mcp-img-speed` | unknown | 59 | - |
| `mcp-function-buttons` | div | 64 | - |
| `mcp-btn-park` | unknown | 66 | ParkSwitch ? 'on' : 'off' |
| `mcp-img-park` | unknown | 69 | - |
| `mcp-btn-track` | v | 73 | TrackSwitch ? 'on' : 'off' |
| `mcp-icon-track` | v | 73 | TrackSwitch ? 'on' : 'off' |
| `mcp-btn-home` | unknown | 75 | - |
| `mcp-img-home` | unknown | 78 | - |
| `mcp-btn-sync` | unknown | 82 | - |
| `mcp-img-sync` | unknown | 85 | - |
| `mcp-btn-solve` | unknown | 90 | - |
| `mcp-img-solve` | unknown | 93 | - |
| `mcp-status` | div | 98 | - |
| `mcp-status-indicator-idle` | span | 99 | idle |
| `mcp-img-status-idle` | unknown | 102 | - |
| `mcp-status-indicator-busy` | span | 105 | busy |
| `mcp-img-status-busy` | unknown | 108 | - |
| `mcp-close-container` | div | 113 | - |
| `mcp-btn-close` | button | 114 | - |
| `mcp-img-close` | unknown | 117 | - |

### components/CapturePanel.vue (41 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `cp-panel` | unknown | 6 | - |
| `cp-camera-temperature` | unknown | 10 | - |
| `cp-direction-controls` | div | 15 | - |
| `cp-btn-exptime-minus` | unknown | 19 | - |
| `cp-icon-exptime-minus` | span | 21 | - |
| `cp-btn-exptime-plus` | unknown | 29 | - |
| `cp-icon-exptime-plus` | span | 31 | - |
| `cp-btn-cfw-minus` | unknown | 40 | - |
| `cp-icon-cfw-minus` | span | 43 | - |
| `cp-btn-cfw-plus` | unknown | 52 | - |
| `cp-icon-cfw-plus` | span | 55 | - |
| `cp-exptime-value` | unknown | 63 | - |
| `cp-cfw-display` | unknown | 72 | - |
| `cp-cfw-moving-dots` | div | 76 | - |
| `cp-cfw-moving-rotor` | div | 77 | - |
| `cp-cfw-dot-0` | span | 78 | - |
| `cp-cfw-dot-1` | span | 79 | - |
| `cp-cfw-dot-2` | span | 80 | - |
| `cp-cfw-dot-3` | span | 81 | - |
| `cp-cfw-dot-4` | span | 82 | - |
| `cp-cfw-dot-5` | span | 83 | - |
| `cp-cfw-dot-6` | span | 84 | - |
| `cp-cfw-dot-7` | span | 85 | - |
| `cp-cfw-value` | unknown | 92 | - |
| `cp-capture` | div | 100 | - |
| `cp-btn-capture` | CircularProgressButton | 101 | - |
| `cp-secondary-panels` | div | 104 | - |
| `cp-btn-toggle-focuser` | unknown | 108 | - |
| `cp-btn-toggle-focuser-content` | div | 110 | - |
| `cp-img-focuser` | unknown | 115 | - |
| `cp-btn-toggle-histogram` | unknown | 123 | - |
| `cp-btn-toggle-histogram-content` | div | 125 | - |
| `cp-img-histogram` | unknown | 130 | - |
| `cp-status` | unknown | 137 | - |
| `cp-status-icon` | span | 140 | - |
| `cp-status-icon-content` | div | 141 | - |
| `cp-img-status` | unknown | 146 | - |
| `cp-save` | div | 152 | - |
| `cp-btn-save` | button | 153 | - |
| `cp-btn-save-content` | div | 154 | - |
| `cp-img-save` | unknown | 159 | - |

### components/SchedulePanel.vue (35 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `scp-root` | unknown | 5 | - |
| `scp-btn-toggle-left-toolbar` | unknown | 15 | - |
| `scp-btn-add-row` | button | 22 | - |
| `scp-btn-delete-selected-row` | unknown | 31 | - |
| `scp-btn-toggle-schedule` | unknown | 39 | - |
| `scp-btn-open-save-preset-dialog` | button | 50 | - |
| `scp-btn-open-load-preset-dialog` | button | 55 | - |
| `scp-btn-close-panel` | unknown | 67 | - |
| `scp-act-select-cell` | unknown | 114 | - |
| `scp-editor-clock-now` | unknown | 268 | - |
| `scp-editor-clock-hour` | unknown | 289 | - |
| `scp-editor-clock-minute` | unknown | 313 | - |
| `scp-editor-exposure-preset` | unknown | 339 | - |
| ``scp-editor-filter-pill-${idx}`` | unknown | 375 | - |
| ``scp-editor-type-pill-${idx}`` | unknown | 396 | - |
| ``scp-editor-refocus-pill-${idx}`` | unknown | 417 | - |
| `scp-editor-reps-value` | div | 428 | - |
| `scp-editor-target-input` | unknown | 441 | - |
| `scp-editor-target-cycle-prefix` | button | 445 | - |
| `scp-editor-target-search-center` | button | 448 | - |
| `scp-editor-target-use-selected-object` | button | 452 | - |
| `scp-editor-target-current-position` | unknown | 460 | - |
| `scp-editor-coordinate-ra` | unknown | 477 | - |
| `scp-editor-coordinate-dec` | unknown | 487 | - |
| ``scp-keypad-key-${k}`` | unknown | 534 | - |
| `scp-keypad-unit-toggle` | unknown | 544 | - |
| `scp-preset-dialog-root` | unknown | 561 | - |
| `scp-preset-btn-close` | unknown | 573 | - |
| `scp-preset-list` | div | 580 | - |
| `scp-preset-item` | unknown | 587 | - |
| `scp-preset-empty` | div | 592 | - |
| `scp-preset-input-name` | unknown | 602 | - |
| `scp-preset-btn-save` | unknown | 612 | - |
| `scp-preset-btn-delete` | unknown | 622 | - |
| `scp-preset-btn-ok` | unknown | 630 | - |

### components/view-settings-dialog.vue (34 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-view-settings-dialog-root` | unknown | 13 | - |
| `ui-view-settings-dialog-tab-display-settings` | v | 20 | - |
| `ui-view-settings-dialog-tab-version-info` | v | 21 | - |
| `ui-view-settings-dialog-tab-memory-settings` | v | 22 | - |
| `ui-view-settings-dialog-checkbox-milky-way-on` | v | 32 | - |
| `ui-view-settings-dialog-checkbox-milky-way-on-label` | span | 34 | - |
| `ui-view-settings-dialog-checkbox-dss-on` | v | 37 | - |
| `ui-view-settings-dialog-checkbox-dss-on-label` | span | 39 | - |
| `ui-view-settings-dialog-checkbox-meridian-on` | v | 44 | - |
| `ui-view-settings-dialog-checkbox-meridian-on-label` | span | 46 | - |
| `ui-view-settings-dialog-checkbox-ecliptic-on` | v | 49 | - |
| `ui-view-settings-dialog-checkbox-ecliptic-on-label` | span | 51 | - |
| `ui-view-settings-dialog-checkbox-highfps-on` | v | 64 | - |
| `ui-view-settings-dialog-checkbox-highfps-on-label` | span | 66 | - |
| `ui-view-settings-dialog-select-switch-language` | v | 73 | - |
| `ui-system-version-total` | div | 90 | - |
| `ui-system-version-qt` | div | 94 | - |
| `ui-system-version-vue` | div | 98 | - |
| `ui-system-version-app` | div | 102 | - |
| `ui-view-settings-dialog-btn-refresh-devices` | v | 137 | - |
| `ui-view-settings-dialog-btn-open-usbbrowser` | v | 163 | - |
| `ui-view-settings-dialog-btn-open-usbbrowser-2` | v | 177 | - |
| `ui-view-settings-dialog-btn-open-clear-box-dialog` | v | 192 | - |
| `ui-view-settings-dialog-btn-clear-logs` | v | 193 | - |
| `ui-view-settings-dialog-btn-refresh-storage` | v | 198 | - |
| `ui-view-settings-dialog-checkbox-cache` | unknown | 222 | - |
| `ui-view-settings-dialog-checkbox-cache-label` | span | 224 | - |
| `ui-view-settings-dialog-checkbox-update-pack` | unknown | 233 | - |
| `ui-view-settings-dialog-checkbox-update-pack-label` | span | 235 | - |
| `ui-view-settings-dialog-checkbox-backup` | unknown | 244 | - |
| `ui-view-settings-dialog-checkbox-backup-label` | span | 246 | - |
| `ui-view-settings-dialog-btn-on-cancel-clear-box` | v | 254 | - |
| `ui-view-settings-dialog-btn-on-confirm-clear-box` | unknown | 261 | - |
| `ui-view-settings-dialog-btn-blue-text` | v | 269 | - |

### components/gui.vue (24 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `gui-root` | unknown | 11 | - |
| `gui-btn-toggle-image-manager-panel` | button | 52 | - |
| `gui-btn-recalibrate-polar-axis` | button | 58 | - |
| `gui-btn-single-solve-image` | unknown | 68 | - |
| `gui-btn-loop-solve-image` | unknown | 86 | - |
| `gui-btn-toggle-mount-panel` | unknown | 100 | - |
| `gui-btn-switch-main-page` | unknown | 135 | - |
| `gui-btn-toggle-charts-panel` | unknown | 165 | - |
| `gui-btn-quit-polar-axis-mode` | unknown | 184 | - |
| `gui-btn-hide-capture-ui` | unknown | 201 | - |
| `gui-btn-show-capture-ui` | unknown | 213 | - |
| `gui-btn-get-original-image` | unknown | 225 | - |
| `gui-btn-scale-plus` | unknown | 244 | - |
| `gui-btn-scale-minus` | unknown | 256 | - |
| `ui-confirm-dialog-root` | unknown | 316 | - |
| `ui-confirm-dialog-title` | span | 335 | - |
| `ui-confirm-dialog-btn-close` | unknown | 344 | - |
| `ui-confirm-dialog-text` | span | 351 | - |
| `ui-confirm-dialog-btn-autofocus-coarse` | unknown | 367 | - |
| `ui-confirm-dialog-btn-autofocus-fine` | unknown | 374 | - |
| `ui-confirm-dialog-btn-cancel` | unknown | 385 | - |
| `ui-confirm-dialog-btn-confirm` | unknown | 392 | - |
| `gui-dslr-btn-toggle-tips` | unknown | 436 | - |
| `gui-dslr-btn-confirm` | unknown | 444 | - |

### components/FocuserPanel.vue (16 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `fp-root` | unknown | 4 | - |
| `fp-buttons-container` | div | 8 | - |
| `fp-btn-start-calibration` | button | 10 | - |
| `fp-btn-toggle-loop-shooting` | button | 22 | - |
| `fp-btn-speed-change` | button | 30 | - |
| `fp-btn-speed-change-2` | button | 31 | - |
| `fp-btn-roichange` | button | 52 | - |
| `fp-btn-focus-left-move` | button | 73 | - |
| `fp-btn-focus-move` | unknown | 79 | - |
| `fp-btn-auto-focus` | button | 86 | - |
| `fp-btn-auto-focus-2` | button | 87 | - |
| `fp-btn-focus-goto` | button | 102 | - |
| `fp-btn-focus-right-move` | button | 108 | - |
| `fp-btn-focus-move-2` | unknown | 116 | - |
| `fp-act-state-bar` | div | 133 | - |
| `fp-state-current` | div | 134 | - |

### components/MeridianFlipNotifier.vue (14 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-meridian-flip-notifier-root` | div | 2 | - |
| `ui-meridian-flip-notifier-btn-select-mode` | button | 9 | - |
| `ui-meridian-flip-notifier-btn-select-mode-2` | button | 10 | - |
| `ui-meridian-flip-notifier-btn-trigger-flip-now` | button | 11 | - |
| `ui-meridian-flip-notifier-btn-close-banner` | button | 13 | - |
| `ui-components-meridian-flip-notifier-act-close-center` | div | 21 | - |
| `ui-meridian-flip-notifier-btn-select-mode-3` | button | 26 | - |
| `ui-meridian-flip-notifier-btn-select-mode-4` | button | 27 | - |
| `ui-meridian-flip-notifier-btn-trigger-flip-now-2` | button | 28 | - |
| `ui-meridian-flip-notifier-btn-close-center` | button | 29 | - |
| `ui-meridian-flip-notifier-btn-select-mode-5` | button | 51 | - |
| `ui-meridian-flip-notifier-btn-select-mode-6` | button | 53 | - |
| `ui-meridian-flip-notifier-btn-trigger-flip-now-3` | button | 54 | - |
| `ui-meridian-flip-notifier-btn-close-mini` | button | 55 | - |

### components/HistogramPanel.vue (13 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `hp-panel` | unknown | 13 | - |
| `hp-chart` | HistogramChart | 15 | - |
| `hp-dial-knob` | DialKnob | 16 | - |
| `hp-buttons-container` | div | 17 | - |
| `hp-btn-white-balance` | button | 18 | - |
| `hp-img-white-balance` | img | 20 | - |
| `hp-btn-auto` | button | 24 | - |
| `hp-icon-auto` | button | 24 | - |
| `hp-btn-reset` | button | 26 | - |
| `hp-img-reset` | img | 28 | - |
| `hp-btn-toggle-range` | unknown | 34 | showEffectiveRange ? 'range' : 'full' |
| `hp-range-label-range` | span | 35 | - |
| `hp-range-label-full` | span | 36 | - |

### components/Settings-Dialog-Guider.vue (11 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-settings-dialog-guider-root` | v | 2 | $store.state.showDeviceSettingsDialog_Guider ? 'open' : 'closed' |
| `ui-settings-dialog-guider-btn-switch-page` | v | 7 | - |
| `ui-settings-dialog-guider-select-selected-driver` | v | 13 | - |
| `ui-settings-dialog-guider-btn-confirm-driver` | v | 15 | - |
| `ui-settings-dialog-guider-btn-connect-indi-server` | v | 16 | - |
| `ui-settings-dialog-guider-select-selected-device` | v | 17 | - |
| `ui-settings-dialog-guider-btn-confirm-device` | v | 19 | - |
| `ui-settings-dialog-guider-btn-clear-calibration-data` | v | 24 | - |
| `ui-settings-dialog-guider-input-value` | v | 26 | - |
| `ui-settings-dialog-guider-btn-confirm-configuration` | v | 27 | - |
| `ui-settings-dialog-guider-btn-close-dialog` | v | 33 | - |

### components/bottom-bar.vue (11 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `bb-btnbar` | unknown | 13 | - |
| `bb-spacer-left` | v | 16 | - |
| `bb-btn-constellations-lines` | unknown | 19 | - |
| `bb-btn-constellations-art` | unknown | 31 | - |
| `bb-btn-atmosphere` | unknown | 43 | - |
| `bb-btn-landscape` | unknown | 55 | - |
| `bb-btn-grid-azimuthal` | unknown | 67 | - |
| `bb-btn-grid-equatorial-jnow` | unknown | 79 | - |
| `bb-btn-grid-equatorial-j2000` | unknown | 91 | - |
| `bb-btn-dsos` | unknown | 103 | - |
| `bb-spacer-right` | v | 115 | - |

### components/Settings-Dialog-CFW.vue (10 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-settings-dialog-cfw-root` | v | 2 | $store.state.showDeviceSettingsDialog_CFW ? 'open' : 'closed' |
| `ui-settings-dialog-cfw-btn-switch-page` | v | 7 | - |
| `ui-settings-dialog-cfw-select-selected-driver` | v | 13 | - |
| `ui-settings-dialog-cfw-btn-confirm-driver` | v | 15 | - |
| `ui-settings-dialog-cfw-btn-connect-indi-server` | v | 16 | - |
| `ui-settings-dialog-cfw-select-selected-device` | v | 17 | - |
| `ui-settings-dialog-cfw-btn-confirm-device` | v | 19 | - |
| `ui-settings-dialog-cfw-input-value` | v | 25 | - |
| `ui-settings-dialog-cfw-btn-confirm-configuration` | v | 26 | - |
| `ui-settings-dialog-cfw-btn-close-dialog` | v | 32 | - |

### components/Settings-Dialog-Focuser.vue (10 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-settings-dialog-focuser-root` | v | 2 | $store.state.showDeviceSettingsDialog_Focuser ? 'open' : 'closed' |
| `ui-settings-dialog-focuser-btn-switch-page` | v | 7 | - |
| `ui-settings-dialog-focuser-select-selected-driver` | v | 13 | - |
| `ui-settings-dialog-focuser-btn-confirm-driver` | v | 15 | - |
| `ui-settings-dialog-focuser-btn-connect-indi-server` | v | 16 | - |
| `ui-settings-dialog-focuser-select-selected-device` | v | 17 | - |
| `ui-settings-dialog-focuser-btn-confirm-device` | v | 19 | - |
| `ui-settings-dialog-focuser-input-value` | v | 25 | - |
| `ui-settings-dialog-focuser-btn-confirm-configuration` | v | 26 | - |
| `ui-settings-dialog-focuser-btn-close-dialog` | v | 32 | - |

### components/Settings-Dialog-MainCamera.vue (10 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-settings-dialog-main-camera-root` | v | 2 | $store.state.showDeviceSettingsDialog_MainCamera ? 'open' : 'closed' |
| `ui-settings-dialog-main-camera-btn-switch-page` | v | 7 | - |
| `ui-settings-dialog-main-camera-select-selected-driver` | v | 13 | - |
| `ui-settings-dialog-main-camera-btn-confirm-driver` | v | 15 | - |
| `ui-settings-dialog-main-camera-btn-connect-indi-server` | v | 16 | - |
| `ui-settings-dialog-main-camera-select-selected-device` | v | 17 | - |
| `ui-settings-dialog-main-camera-btn-confirm-device` | v | 19 | - |
| `ui-settings-dialog-main-camera-input-value` | v | 25 | - |
| `ui-settings-dialog-main-camera-btn-confirm-configuration` | v | 26 | - |
| `ui-settings-dialog-main-camera-btn-close-dialog` | v | 32 | - |

### components/Settings-Dialog-Mount.vue (10 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-settings-dialog-mount-root` | v | 2 | $store.state.showDeviceSettingsDialog_Mount ? 'open' : 'closed' |
| `ui-settings-dialog-mount-btn-switch-page` | v | 7 | - |
| `ui-settings-dialog-mount-select-selected-driver` | v | 13 | - |
| `ui-settings-dialog-mount-btn-confirm-driver` | v | 15 | - |
| `ui-settings-dialog-mount-btn-connect-indi-server` | v | 16 | - |
| `ui-settings-dialog-mount-select-selected-device` | v | 17 | - |
| `ui-settings-dialog-mount-btn-confirm-device` | v | 19 | - |
| `ui-settings-dialog-mount-input-value` | v | 25 | - |
| `ui-settings-dialog-mount-btn-confirm-configuration` | v | 26 | - |
| `ui-settings-dialog-mount-btn-close-dialog` | v | 32 | - |

### components/toolbar.vue (10 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `tb-root` | div | 10 | - |
| `tb-act-toggle-navigation-drawer` | v | 12 | - |
| `tb-btn-transparent` | v | 40 | - |
| `tb-btn-timer-pick-btn` | button | 43 | - |
| `tb-status-card` | unknown | 76 | - |
| `tb-status-maincamera` | unknown | 83 | - |
| `tb-status-mount` | unknown | 112 | - |
| `tb-status-guider` | unknown | 140 | - |
| `tb-status-focuser` | unknown | 173 | - |
| `tb-btn-toggle-schedule-panel` | button | 201 | - |

### components/date-time-picker.vue (8 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-date-time-picker-root` | v | 10 | - |
| `ui-date-time-picker-btn-inc-time` | v | 14 | - |
| `ui-date-time-picker-btn-inc-time-2` | v | 15 | - |
| `ui-date-time-picker-btn-inc-time-3` | v | 16 | - |
| `ui-date-time-picker-btn-dec-time` | v | 18 | - |
| `ui-date-time-picker-btn-dec-time-2` | v | 19 | - |
| `ui-date-time-picker-btn-dec-time-3` | v | 20 | - |
| `ui-date-time-picker-btn-reset-time` | v | 26 | - |

### components/indiDebugDialog.vue (8 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-indi-debug-dialog-root` | unknown | 6 | - |
| `ui-indi-debug-dialog-btn-scroll-to-bottom` | button | 15 | - |
| `ui-indi-debug-dialog-btn-clear-messages` | button | 19 | - |
| `ui-indi-debug-dialog-btn-save-messages` | button | 25 | - |
| `ui-indi-debug-dialog-btn-toggle-error-debug` | button | 31 | - |
| `ui-indi-debug-dialog-btn-toggle-server-debug` | button | 44 | - |
| `ui-indi-debug-dialog-btn-toggle-client-debug` | button | 57 | - |
| `ui-indi-debug-dialog-btn-close` | button | 70 | - |

### components/selected-object-info.vue (8 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-selected-object-info-root` | v | 12 | - |
| `ui-selected-object-info-btn-auto` | v | 13 | - |
| `ui-selected-object-info-btn-grey-text` | unknown | 32 | - |
| `ui-selected-object-info-action-buttons` | div | 75 | - |
| `ui-selected-object-info-btn-point-to` | unknown | 82 | - |
| `ui-selected-object-info-img-point-to` | unknown | 88 | - |
| `ui-selected-object-info-btn-goto` | unknown | 102 | - |
| `ui-selected-object-info-img-goto` | unknown | 108 | - |

### components/LocationFocalInputs.vue (7 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-location-focal-inputs-root` | div | 2 | - |
| `ui-components-location-focal-inputs-act-expand-inputs` | div | 4 | - |
| `ui-location-focal-inputs-input-t` | unknown | 29 | - |
| `ui-location-focal-inputs-input-t-2` | unknown | 44 | - |
| `ui-location-focal-inputs-input-t-3` | unknown | 59 | - |
| `ui-location-focal-inputs-btn-collapse-inputs` | v | 60 | - |
| `ui-components-location-focal-inputs-act-handle-keyboard-input` | unknown | 76 | - |

### components/RaDecDialog.vue (7 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-ra-dec-dialog-root` | unknown | 11 | - |
| `ui-ra-dec-dialog-input-ra-str` | unknown | 33 | - |
| `ui-ra-dec-dialog-btn-auto` | v | 41 | - |
| `ui-ra-dec-dialog-btn-auto-2` | v | 42 | - |
| `ui-ra-dec-dialog-input-dec-str` | unknown | 60 | - |
| `ui-ra-dec-dialog-btn-on-cancel` | v | 70 | - |
| `ui-ra-dec-dialog-btn-on-ok` | v | 71 | - |

### components/Settings-Dialog-PoleCamera.vue (7 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-settings-dialog-pole-camera-root` | v | 2 | $store.state.showDeviceSettingsDialog_PoleCamera ? 'open' : 'closed' |
| `ui-settings-dialog-pole-camera-select-selected-driver` | v | 10 | - |
| `ui-settings-dialog-pole-camera-btn-confirm-driver` | v | 12 | - |
| `ui-settings-dialog-pole-camera-btn-connect-indi-server` | v | 13 | - |
| `ui-settings-dialog-pole-camera-select-selected-device` | v | 14 | - |
| `ui-settings-dialog-pole-camera-btn-confirm-device` | v | 16 | - |
| `ui-settings-dialog-pole-camera-btn-close-dialog` | v | 25 | - |

### components/ChartComponent.vue (6 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-chart-component-root` | unknown | 6 | - |
| `ui-chart-component-btn-loop-exp-switch` | unknown | 22 | - |
| `ui-chart-component-btn-start-press` | unknown | 34 | - |
| `ui-chart-component-btn-exp-time-switch` | unknown | 47 | - |
| `ui-chart-component-btn-data-clear` | button | 67 | - |
| `ui-chart-component-btn-range-switch` | button | 73 | - |

### components/location-dialog.vue (6 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-location-dialog-root` | unknown | 13 | - |
| `ui-location-dialog-input-latitude` | unknown | 30 | - |
| `ui-location-dialog-input-longitude` | unknown | 44 | - |
| `ui-location-dialog-btn-save-manual-coordinates` | v | 48 | - |
| `ui-location-dialog-switch-handle-auto-location-change` | v | 52 | - |
| `ui-components-location-dialog-act-handle-keyboard-input` | unknown | 66 | - |

### components/NumberKeyboard.vue (5 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-number-keyboard-root` | div | 3 | - |
| `ui-components-number-keyboard-act-handle-drag-start` | unknown | 10 | - |
| `ui-components-number-keyboard-act-keyboard-header` | div | 11 | - |
| `ui-number-keyboard-btn-handle-close` | v | 18 | - |
| `ui-number-keyboard-btn-handle-key-press` | unknown | 35 | - |

### components/RPI-Hotspot.vue (5 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-rpi-hotspot-root` | div | 3 | - |
| `ui-rpi-hotspot-input-input-text` | v | 4 | - |
| `ui-rpi-hotspot-btn-update-hotspot-name` | button | 8 | - |
| `ui-rpi-hotspot-btn-save-btn-click` | button | 12 | - |
| `ui-rpi-hotspot-btn-redo-hotspot-name` | button | 23 | - |

### components/UpdateProgressDialog.vue (5 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-update-progress-dialog-root` | div | 2 | - |
| `ui-components-update-progress-dialog-act-update-dialog` | div | 3 | - |
| `ui-update-progress-dialog-btn-toggle-log-expand` | button | 25 | - |
| `ui-update-progress-dialog-btn-close-dialog` | button | 43 | - |
| `ui-update-progress-dialog-btn-retry-update` | button | 44 | - |

### components/DeviceAllocationPanel.vue (4 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `dap-root` | unknown | 8 | - |
| `dap-act-selected-device-name` | li | 12 | - |
| `dap-act-selected-device-name-2` | li | 28 | - |
| `dap-act-close-panel` | unknown | 35 | - |

### components/DevicePicker.vue (4 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `dp-picker` | unknown | 5 | - |
| `dp-device-type` | span | 9 | - |
| `dp-device-name` | span | 11 | - |
| `dp-btn-toggle-bind` | unknown | 20 | - |

### components/ImageFolder.vue (4 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| ``ui-image-folder-root-${folderIndex}`` | unknown | 7 | - |
| ``ui-image-folder-file-${folderIndex}-${index}`` | unknown | 31 | - |
| `ui-imagefolder-btn-delete-confirm` | unknown | 45 | - |
| `ui-imagefolder-btn-delete` | unknown | 55 | - |

### components/USBFilesDialog.vue (4 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-usbfiles-dialog-root` | v | 2 | $store.state.showUSBFilesDialog ? 'open' : 'closed' |
| `ui-usbfiles-dialog-btn-navigate-up` | v | 18 | - |
| `ui-components-usbfiles-dialog-act-handle-item-click` | unknown | 31 | - |
| `ui-usbfiles-dialog-btn-blue-text` | v | 52 | - |

### components/Chart-Focus.vue (3 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-chart-focus-root` | div | 2 | - |
| `ui-components-chart-focus-act-start-drag` | unknown | 13 | - |
| `ui-chart-focus-btn-close-panel` | v | 24 | - |

### components/Dial-Knob.vue (3 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-dial-knob-root` | div | 2 | - |
| `ui-components-dial-knob-act-start-drag` | div | 3 | - |
| `ui-components-dial-knob-act-start-second-drag` | div | 4 | - |

### components/location-mgr.vue (3 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-location-mgr-root` | div | 51 | - |
| `ui-components-location-mgr-act-select-known-location` | v | 56 | - |
| `ui-location-mgr-switch-on-map-type-toggle` | unknown | 105 | - |

### components/skysource-search.vue (3 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-skysource-search-root` | div | 10 | - |
| `ui-skysource-search-input-search-field` | v | 11 | - |
| `ui-components-skysource-search-act-source-clicked` | v | 13 | - |

### components/CFWSelectBtnBar.vue (2 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-cfwselect-btn-bar-root` | div | 2 | - |
| `ui-cfwselect-btn-bar-btn-select-cfw` | unknown | 6 | - |

### components/Chart-Scatter.vue (2 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-chart-scatter-root` | div | 2 | - |
| `ui-chart-scatter-btn-clear-chart-data` | button | 4 | - |

### components/CircularButton.vue (2 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `$attrs['data-testid'] || 'ui-circular-button-root'` | div | 2 | - |
| `ui-components-circular-button-act-handle-mouse-down` | unknown | 11 | - |

### components/Red-Box.vue (2 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-red-box-root` | div | 2 | - |
| `ui-components-red-box-act-start-drag` | div | 3 | - |

### components/data-credits-dialog.vue (2 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-data-credits-dialog-root` | unknown | 14 | - |
| `ui-data-credits-dialog-btn-blue-text` | unknown | 152 | - |

### components/observing-panel-root-toolbar.vue (2 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-observing-panel-root-toolbar-root` | v | 11 | - |
| `ui-observing-panel-root-toolbar-btn-auto` | v | 12 | - |

### components/observing-panel.vue (2 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-observing-panel-root` | div | 11 | - |
| `ui-observing-panel-btn-tab-bt` | v | 13 | - |

### components/planets-visibility.vue (2 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-planets-visibility-root` | v | 10 | $store.state.showPlanetsVisibilityDialog ? 'open' : 'closed' |
| `ui-planets-visibility-btn-close` | v | 40 | - |

### components/Chart-FocusImage.vue (1 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-chart-focus-image-root` | div | 2 | - |

### components/Chart-Histogram.vue (1 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-chart-histogram-root` | div | 2 | - |

### components/Chart-Line.vue (1 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-chart-line-root` | div | 2 | - |

### components/MessageBox.vue (1 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-message-box-root` | unknown | 4 | - |

### components/PolarAlignmentInfoPanel.vue (1 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-polar-alignment-info-panel-root` | div | 2 | - |

### components/ProgressBar.vue (1 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-progress-bar-root` | unknown | 5 | - |

### components/bottom-button.vue (1 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-bottom-button-root` | div | 10 | - |

### components/gui-loader.vue (1 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-gui-loader-root` | div | 11 | - |

### components/progress-bars.vue (1 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-progress-bars-root` | div | 10 | - |

### components/target-search.vue (1 个标识)

| 标识 | 元素 | 行号 | 状态属性 |
|------|------|------|----------|
| `ui-target-search-root` | div | 10 | - |

