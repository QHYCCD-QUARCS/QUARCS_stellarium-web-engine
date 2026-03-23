<template>
  <transition name="panel">
    <div
      class="ImageManager-panel"
      :class="{ 'compact-mobile': isMobileCompact }"
      :style="{ bottom: bottom + 'px', top: top + 'px', left: left + 'px', right: right + 'px' }"
      data-testid="imp-root"
      :data-state="isOpen ? 'open' : 'closed'"
    >
      <div class="panel-header">
        <div class="panel-actions">
          <button class="custom-button btn-MoveUSB no-select" @click="MoveFileToUSB" :disabled="!hasUSBDevice" data-testid="imp-btn-move-file-to-usb">
            <div class="icon-center"><img src="@/assets/images/svg/ui/USB Flash Drive.svg" height="20px" style="min-height: 20px; pointer-events: none;"></div>
          </button>
          <button class="custom-button btn-Delete no-select" @click="DeleteBtnClick" data-testid="imp-btn-delete-btn-click">
            <div class="icon-center"><img src="@/assets/images/svg/ui/delete.svg" height="20px" style="min-height: 20px; pointer-events: none;"></div>
          </button>
          <button class="custom-button btn-Download no-select" @click="DownloadSelected" data-testid="imp-btn-download-selected"><v-icon color="rgba(255, 255, 255)">mdi-download</v-icon></button>
          <span class="custom-button ImageFileTip ImageFileTip-fixed no-select" @click="ImageFileSwitch" data-testid="imp-act-image-file-switch">{{ $t(ImageFile) }}</span>
          <button class="custom-button btn-ImageFileSwitch btn-ImageFileSwitch-fixed no-select" @click="ImageFileSwitch" data-testid="imp-btn-image-file-switch"><v-icon color="rgba(255, 255, 255)">mdi-folder-sync-outline</v-icon></button>
        </div>

        <button class="btn-close no-select" @click="PanelClose" data-testid="imp-btn-panel-close"><div class="icon-center"><img src="@/assets/images/svg/ui/OFF.svg" height="12px" style="min-height: 12px; pointer-events: none;"></div></button>
      </div>

      <span v-if="displayUSBInfo" :class="{ 'span-USB-Info-Normal': !isUSBWarning, 'span-USB-Info-Warning': isUSBWarning }">{{ displayUSBInfo }}</span>

      <div class="browser-layout">
        <aside class="folder-sidebar">
          <div class="pane-header">
            <div>
              <div class="pane-title">{{ $t('Folders') }}</div>
              <div v-if="!isMobileCompact" class="pane-subtitle">{{ $t('Keep folder batch actions, but browse images directly.') }}</div>
            </div>
            <div class="pane-badge">{{ imageFolders.length }}</div>
          </div>

          <div v-if="isNoFolders" class="sidebar-empty" data-testid="imp-txt-no-folders">{{ $t('There are no image folders') }}</div>
          <div v-else class="folder-list">
            <button
              v-for="(item, index) in imageFolders"
              :key="folderKey(item)"
              class="folder-item"
              :class="{ active: isCurrentFolder(item), selected: item.isSelected }"
              :data-testid="`ui-image-folder-root-${index}`"
              :data-state="isCurrentFolder(item) ? 'open' : 'closed'"
              @click="selectFolder(item)"
            >
              <div class="folder-item-check" @click.stop><input type="checkbox" :checked="!!item.isSelected" @change.stop="toggleFolderSelection(item)"></div>
              <div class="folder-item-body">
                <div class="folder-item-title">{{ getFolderTitle(item) }}</div>
                <div class="folder-item-subtitle">{{ getFolderSubtitle(item) }}</div>
              </div>
              <div class="folder-item-meta">{{ getFolderMeta(item) }}</div>
            </button>
          </div>
          <div v-if="!isMobileCompact" class="sidebar-summary">
            <div>{{ folderSelectionSummary }}</div>
            <div>{{ fileSelectionSummary }}</div>
          </div>
        </aside>

        <section class="workspace">
          <div class="workspace-toolbar">
            <div>
              <div class="pane-title">{{ $t('Images') }}</div>
              <div class="pane-subtitle" data-testid="imp-txt-current-folder">{{ currentFolderLabel }}</div>
            </div>
            <div class="workspace-toolbar-actions">
              <span v-if="!isMobileCompact" class="toolbar-summary">{{ selectionSummary }}</span>
              <button class="secondary-action-btn" @click="refreshCurrentFolder" :disabled="!currentFolder" data-testid="imp-btn-refresh-current-folder">{{ $t('Refresh') }}</button>
            </div>
          </div>

          <div v-if="!currentFolder" class="workspace-empty">{{ isMobileCompact ? $t('Select a folder') : $t('Select a folder to load image files.') }}</div>
          <div v-else class="workspace-body">
            <div class="file-list-panel">
              <div class="list-header"><span>{{ $t('Image List') }}</span><span>{{ currentFolderFiles.length }}</span></div>
              <div v-if="currentFolderLoading" class="workspace-state">{{ isMobileCompact ? $t('Loading...') : $t('Loading image files...') }}</div>
              <div v-else-if="currentFolderFiles.length === 0" class="workspace-state">{{ isMobileCompact ? $t('No images') : $t('No image files in this folder.') }}</div>
              <div v-else class="file-list">
                <div
                  v-for="(file, index) in currentFolderFiles"
                  :key="file.id"
                  class="file-row"
                  :class="{ active: isCurrentFile(file), opened: file.isOpen, selected: file.isSelect }"
                  :data-testid="`ui-image-folder-file-${currentFolderDisplayIndex}-${index}`"
                  :data-state="file.isOpen ? 'open' : 'closed'"
                  @click="focusFile(file)"
                >
                  <div class="file-row-check" @click.stop><input type="checkbox" :checked="!!file.isSelect" @change.stop="toggleFileSelection(file)"></div>
                  <div class="file-row-main">
                    <div class="file-row-name">{{ file.label }}</div>
                    <div class="file-row-meta">{{ file.metaText }}</div>
                  </div>
                  <div class="file-row-actions">
                    <button class="file-action-btn" @click.stop="openFile(file)">{{ $t('Open') }}</button>
                    <button class="file-action-btn" @click.stop="downloadSingleFile(file)">{{ $t('Download') }}</button>
                    <button class="file-action-btn" @click.stop="moveSingleFile(file)" :disabled="!hasUSBDevice">USB</button>
                    <button class="file-action-btn danger" @click.stop="prepareDeleteFiles([file.imageName])">{{ $t('Delete') }}</button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>
      </div>

      <transition name="fade">
        <div v-if="showUSBSelectDialog" class="usb-select-overlay" @click="closeUSBSelectDialog" data-testid="imp-act-close-usbselect-dialog">
          <div class="usb-select-dialog" @click.stop data-testid="imp-act-usb-select-dialog">
            <div class="usb-select-header">
              <span class="usb-select-title">{{ $t('Select USB Drive') }}</span>
              <button class="usb-select-close" @click="closeUSBSelectDialog" data-testid="imp-btn-close-usbselect-dialog"><v-icon color="rgba(255, 255, 255, 0.7)">mdi-close</v-icon></button>
            </div>
            <div class="usb-select-content">
              <div v-for="usb in USBList" :key="usb.name" class="usb-select-item" @click="selectUSB(usb.name)" data-testid="imp-act-select-usb">
                <div class="usb-item-info">
                  <div class="usb-item-name">{{ usb.name }}</div>
                  <div class="usb-item-space">{{ $t('Free Space') }}: {{ formatSpace(usb.space) }}</div>
                </div>
                <v-icon color="rgba(75, 155, 250)">mdi-chevron-right</v-icon>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="showUSBConfirmDialog" class="usb-select-overlay" @click="closeUSBConfirmDialog" data-testid="imp-act-close-usb-confirm-dialog">
          <div class="usb-select-dialog" @click.stop data-testid="imp-usb-confirm-dialog">
            <div class="usb-select-header">
              <span class="usb-select-title">{{ $t('Confirm USB Transfer') }}</span>
              <button class="usb-select-close" @click="closeUSBConfirmDialog" data-testid="imp-btn-close-usb-confirm-dialog"><v-icon color="rgba(255, 255, 255, 0.7)">mdi-close</v-icon></button>
            </div>
            <div class="usb-select-content">
              <div class="download-confirm-row">{{ usbConfirmSummary }}</div>
              <div class="download-confirm-row">{{ $t('Target') }}: {{ usbConfirmTargetName }}</div>
              <div v-if="!isMobileCompact" class="download-confirm-hint">{{ $t('Files will be copied to the selected USB drive. This may take a while.') }}</div>
              <div class="download-confirm-actions">
                <button class="download-action-btn" @click="closeUSBConfirmDialog" data-testid="imp-btn-cancel-usb-confirm">{{ $t('Cancel') }}</button>
                <button class="download-action-btn primary" @click="confirmUSBMove" data-testid="imp-btn-confirm-usb-transfer">{{ $t('Confirm') }}</button>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="showDeleteConfirmDialog" class="usb-select-overlay" @click="closeDeleteConfirmDialog" data-testid="imp-act-close-delete-confirm-dialog">
          <div class="usb-select-dialog" @click.stop data-testid="imp-delete-confirm-dialog">
            <div class="usb-select-header">
              <span class="usb-select-title">{{ $t('Confirm Deletion') }}</span>
              <button class="usb-select-close" @click="closeDeleteConfirmDialog" data-testid="imp-btn-close-delete-confirm-dialog"><v-icon color="rgba(255, 255, 255, 0.7)">mdi-close</v-icon></button>
            </div>
            <div class="usb-select-content">
              <div class="download-confirm-row">{{ deleteConfirmationText }}</div>
              <div v-if="!isMobileCompact" class="download-confirm-hint">{{ $t('This action cannot be undone.') }}</div>
              <div class="download-confirm-actions">
                <button class="download-action-btn" @click="closeDeleteConfirmDialog" data-testid="imp-btn-cancel-delete-confirm">{{ $t('Cancel') }}</button>
                <button class="download-action-btn primary danger" @click="confirmDelete" data-testid="imp-btn-confirm-delete">{{ $t('Confirm') }}</button>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="showDownloadConfirmDialog" class="usb-select-overlay" @click="closeDownloadConfirmDialog" data-testid="imp-act-close-download-confirm-dialog">
          <div class="usb-select-dialog" @click.stop data-testid="imp-act-usb-select-dialog-2">
            <div class="usb-select-header">
              <span class="usb-select-title">{{ $t('Download') }}</span>
              <button class="usb-select-close" @click="closeDownloadConfirmDialog" data-testid="imp-btn-close-download-confirm-dialog"><v-icon color="rgba(255, 255, 255, 0.7)">mdi-close</v-icon></button>
            </div>
            <div class="usb-select-content">
              <div class="download-confirm-row">{{ $t('Total Size') }}: {{ formatBytes(pendingManifestTotalBytes) }} <span class="download-confirm-inline">{{ $t('Files') }}: {{ pendingManifestFileCount }}</span></div>
              <div class="download-confirm-controls">
                <span class="download-confirm-label">{{ $t('Concurrent Downloads') }}</span>
                <select v-model.number="downloadConcurrency" class="download-select" data-testid="imp-select-download-concurrency">
                  <option :value="1">1</option>
                  <option :value="2">2</option>
                  <option :value="3">3</option>
                </select>
              </div>
              <div v-if="!isMobileCompact" class="download-confirm-hint">{{ $t('Before downloading, the browser will try to let you choose a save location. If not supported, files fall back to the system download folder.') }}</div>
              <div class="download-confirm-actions">
                <button class="download-action-btn" @click="closeDownloadConfirmDialog" data-testid="imp-btn-close-download-confirm-dialog-2">{{ $t('Cancel') }}</button>
                <button class="download-action-btn primary" @click="confirmStartDownload" data-testid="imp-btn-confirm-start-download">{{ $t('Start Download') }}</button>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="showDownloadLocationReminderDialog" class="usb-select-overlay" @click="closeDownloadLocationReminderDialog" data-testid="imp-act-close-download-location-reminder-dialog">
          <div class="usb-select-dialog" @click.stop data-testid="imp-act-download-location-reminder-dialog">
            <div class="usb-select-header">
              <span class="usb-select-title">{{ $t('Save Location') }}</span>
              <button class="usb-select-close" @click="closeDownloadLocationReminderDialog" data-testid="imp-btn-close-download-location-reminder-dialog"><v-icon color="rgba(255, 255, 255, 0.7)">mdi-close</v-icon></button>
            </div>
            <div class="usb-select-content">
              <div v-if="!isMobileCompact" class="download-confirm-hint">{{ $t('This browser cannot choose a save path directly inside the page, so downloads will use the system default folder.') }}</div>
              <div class="download-confirm-actions">
                <button class="download-action-btn" @click="cancelDownloadLocationReminderDialog" data-testid="imp-btn-cancel-download-location-reminder-dialog">{{ $t('Cancel') }}</button>
                <button class="download-action-btn primary" @click="continueStartDownloadAfterReminder" data-testid="imp-btn-continue-download-location-reminder-dialog">{{ $t('Continue') }}</button>
              </div>
            </div>
          </div>
        </div>
      </transition>
      <div v-if="downloadTasks.length > 0 && downloadPanelVisible" class="download-panel">
        <div class="download-panel-header">
          <div class="download-panel-title">
            <span class="download-title">{{ $t('Download Queue') }}</span>
            <span class="download-subtitle">{{ formatBytes(totalDownloadedBytes) }} / {{ formatBytes(totalPlannedBytes) }}</span>
          </div>
          <div class="download-panel-controls">
            <button class="download-icon-btn" :title="$t('Hide')" @click="toggleDownloadPanel" data-testid="imp-btn-toggle-download-panel"><v-icon color="rgba(255,255,255,0.8)" small>mdi-chevron-down</v-icon></button>
            <button class="download-action-btn compact" @click="cancelAllDownloads" data-testid="imp-btn-cancel-all-downloads">{{ $t('Cancel') }}</button>
            <span class="download-subtitle">{{ $t('Concurrent Downloads') }}</span>
            <select v-model.number="downloadConcurrency" class="download-select small" data-testid="imp-select-download-concurrency-2">
              <option :value="1">1</option>
              <option :value="2">2</option>
              <option :value="3">3</option>
            </select>
          </div>
        </div>

        <div class="download-list">
          <div v-for="t in downloadTasks" :key="t.id" class="download-item">
            <div class="download-item-row">
              <span class="download-name" :title="t.name">{{ t.name }}</span>
              <div class="download-item-actions">
                <button v-if="t.status === 'downloading'" class="download-icon-btn" :title="$t('Pause')" @click="pauseDownload(t)" data-testid="imp-btn-pause-download"><v-icon color="rgba(255,255,255,0.8)" small>mdi-pause</v-icon></button>
                <button v-if="t.status === 'paused'" class="download-icon-btn" :title="$t('Resume')" @click="resumeDownload(t)" data-testid="imp-btn-resume-download"><v-icon color="rgba(255,255,255,0.8)" small>mdi-play</v-icon></button>
                <button v-if="t.status === 'downloading' || t.status === 'pending' || t.status === 'paused' || t.status === 'error'" class="download-icon-btn danger" :title="$t('Cancel')" @click="cancelDownload(t)" data-testid="imp-btn-cancel-download"><v-icon color="rgba(255,255,255,0.9)" small>mdi-close</v-icon></button>
                <span class="download-state">{{ formatTaskStatus(t.status) }}</span>
              </div>
            </div>
            <div class="download-bar"><div class="download-bar-inner" :style="{ width: t.progressPercent + '%' }"></div></div>
            <div class="download-item-row secondary">
              <span class="download-subtitle">{{ formatBytes(t.receivedBytes) }} / {{ formatBytes(t.sizeBytes || 0) }}</span>
              <span class="download-subtitle" v-if="t.error">{{ t.error }}</span>
            </div>
          </div>
        </div>
      </div>

      <button v-if="downloadTasks.length > 0 && !downloadPanelVisible" data-testid="imp-btn-auto" class="download-fab" @click="toggleDownloadPanel" :title="$t('Show')">
        <v-icon color="rgba(255,255,255,0.9)">mdi-download</v-icon>
      </button>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'ImageManagerBrowser',
  props: {
    isOpen: { type: Boolean, default: false },
  },
  data() {
    return {
      bottom: 0,
      left: 0,
      right: 0,
      top: 40,
      showDeleteConfirmDialog: false,
      isNoFolders: true,
      ImageFile: 'Capture Image',
      fileTypeIndex: 0,
      FoldersName: 'CaptureImage',
      imageFolders: [],
      CaptureImageFolders: [],
      ScheduleImageFolders: [],
      SolveFailedImageFolders: [],
      CaptureImageFoldersString_LastTime: '',
      ScheduleImageFoldersString_LastTime: '',
      SolveFailedImageFoldersString_LastTime: '',
      USB_Info: 'No USB Drive Detected',
      isUSBWarning: true,
      USBList: [],
      showUSBSelectDialog: false,
      selectedUSBName: '',
      currentFolderKey: '',
      currentFolderRequestKey: '',
      currentFolderFiles: [],
      currentFolderLoading: false,
      currentFileName: '',
      folderFilesCache: {},
      pendingDeleteScope: null,
      pendingMoveScope: null,
      showUSBConfirmDialog: false,
      usbConfirmTargetName: '',
      downloadConcurrency: 1,
      showDownloadConfirmDialog: false,
      pendingDownloadManifest: null,
      downloadTasks: [],
      downloadActiveCount: 0,
      downloadIdSeq: 1,
      cleanedDownloadTokens: {},
      downloadPanelVisible: true,
      downloadSaveMode: 'browser',
      downloadDirHandle: null,
      downloadSingleFileHandle: null,
      showDownloadLocationReminderDialog: false,
      pendingStartDownloadFiles: null,
      pendingStartDownloadToken: '',
      viewportWidth: 1024,
      viewportHeight: 768,
      screenWidth: 1024,
      screenHeight: 768,
      devicePixelRatioValue: 1,
      maxTouchPoints: 0,
    };
  },
  computed: {
    isMobileCompact() {
      const viewportShortSide = Math.min(this.viewportWidth || 0, this.viewportHeight || 0);
      const screenShortSide = Math.min(this.screenWidth || 0, this.screenHeight || 0);
      const physicalShortSide = screenShortSide * Math.max(1, this.devicePixelRatioValue || 1);
      return this.isProbablyMobile() && (viewportShortSide <= 900 || screenShortSide <= 1080 || physicalShortSide <= 1440);
    },
    selectedFolders() { return this.imageFolders.filter((folder) => folder && folder.isSelected); },
    selectedFileObjects() { return this.currentFolderFiles.filter((file) => file && file.isSelect); },
    selectedFileNames() { return this.selectedFileObjects.map((file) => file.imageName); },
    currentFolder() { return this.imageFolders.find((folder) => this.folderKey(folder) === this.currentFolderKey) || null; },
    currentFolderDisplayIndex() {
      const idx = this.imageFolders.findIndex((folder) => this.folderKey(folder) === this.currentFolderKey);
      return idx >= 0 ? idx : 0;
    },
    currentFile() { return this.currentFolderFiles.find((file) => file.imageName === this.currentFileName) || null; },
    folderSelectionSummary() {
      if (this.selectedFolders.length === 0) return this.$t('Folder batch actions: none selected');
      return this.$t('Folder batch actions: {0} selected', [this.selectedFolders.length]);
    },
    fileSelectionSummary() {
      if (this.selectedFileNames.length === 0) return this.$t('Image direct actions: focus one file or select multiple files');
      return this.$t('Image direct actions: {0} selected', [this.selectedFileNames.length]);
    },
    selectionSummary() {
      if (this.selectedFileNames.length > 0) return this.$t('{0} image(s) selected', [this.selectedFileNames.length]);
      if (this.selectedFolders.length > 0) return this.$t('{0} folder(s) selected', [this.selectedFolders.length]);
      if (this.currentFile) return this.$t('Single image actions are ready');
      return this.$t('No selection');
    },
    hasUSBDevice() {
      return this.USBList.length > 0;
    },
    displayUSBInfo() {
      if (!this.isMobileCompact) return this.$t(this.USB_Info);
      if (this.USBList.length === 0) return '';
      if (this.USBList.length === 1) return 'USB';
      return this.USBList.length + ' USB';
    },
    currentFolderLabel() {
      if (!this.currentFolder) return this.isMobileCompact ? this.$t('No folder') : this.$t('No folder loaded');
      if (this.isMobileCompact) return this.getFolderName(this.currentFolder);
      return this.ImageFile + ' / ' + this.getFolderName(this.currentFolder);
    },
    deleteConfirmationText() {
      const scope = this.pendingDeleteScope || this.buildDeleteScope();
      if (!scope) return this.$t('Confirm deletion?');
      if (scope.type === 'files') return this.$t('Delete {0} image(s)?', [scope.names.length]);
      return this.$t('Delete {0} folder(s)?', [scope.folderNames.length]);
    },
    pendingManifestTotalBytes() { return this.pendingDownloadManifest ? Number(this.pendingDownloadManifest.totalBytes) || 0 : 0; },
    pendingManifestFileCount() { return this.pendingDownloadManifest && Array.isArray(this.pendingDownloadManifest.files) ? this.pendingDownloadManifest.files.length : 0; },
    usbConfirmSummary() {
      const scope = this.pendingMoveScope;
      if (!scope) return '';
      if (scope.type === 'files') return this.$t('Transfer {0} image(s) to USB?', [scope.names.length]);
      return this.$t('Transfer {0} folder(s) to USB?', [scope.folderNames.length]);
    },
    totalPlannedBytes() { return this.downloadTasks.reduce((sum, task) => sum + (Number(task.sizeBytes) || 0), 0); },
    totalDownloadedBytes() { return this.downloadTasks.reduce((sum, task) => sum + (Number(task.receivedBytes) || 0), 0); },
  },
  watch: {
    isOpen(value) {
      if (value) {
        this.$nextTick(() => { this.ensureCurrentFolderSelection(false); });
      }
    },
    downloadConcurrency() { this.pumpDownloadQueue(); },
  },
  created() {
    this.$bus.$on('ShowAllImageFolder', this.updateImageFolders);
    this.$bus.$on('USB_Name_Sapce', this.updateUSBdata);
    this.$bus.$on('ClearUSBList', this.clearUSBList);
    this.$bus.$on('DownloadManifest', this.onDownloadManifest);
    this.$bus.$on('ImageFilesName', this.onImageFilesName);
  },
  mounted() {
    this.updateViewportWidth();
    if (typeof window !== 'undefined') window.addEventListener('resize', this.updateViewportWidth);
  },
  beforeDestroy() {
    this.$bus.$off('ShowAllImageFolder', this.updateImageFolders);
    this.$bus.$off('USB_Name_Sapce', this.updateUSBdata);
    this.$bus.$off('ClearUSBList', this.clearUSBList);
    this.$bus.$off('DownloadManifest', this.onDownloadManifest);
    this.$bus.$off('ImageFilesName', this.onImageFilesName);
    if (typeof window !== 'undefined') window.removeEventListener('resize', this.updateViewportWidth);
  },
  methods: {
    updateViewportWidth() {
      if (typeof window === 'undefined') return;
      if (typeof window.innerWidth === 'number') this.viewportWidth = window.innerWidth;
      if (typeof window.innerHeight === 'number') this.viewportHeight = window.innerHeight;
      if (window.screen) {
        const screenWidth = Number(window.screen.width) || 0;
        const screenHeight = Number(window.screen.height) || 0;
        if (screenWidth > 0) this.screenWidth = screenWidth;
        if (screenHeight > 0) this.screenHeight = screenHeight;
      }
      if (typeof window.devicePixelRatio === 'number' && window.devicePixelRatio > 0) this.devicePixelRatioValue = window.devicePixelRatio;
      if (typeof navigator !== 'undefined' && typeof navigator.maxTouchPoints === 'number') this.maxTouchPoints = navigator.maxTouchPoints;
    },
    PanelClose() {
      this.cancelDeleteState();
      this.$bus.$emit('ImageManagerPanelClose');
    },
    getCurrentFolderTypeName() {
      if (this.fileTypeIndex === 0) return 'CaptureImage';
      if (this.fileTypeIndex === 1) return 'ScheduleImage';
      return 'solveFailedImage';
    },
    getFoldersByTypeName(typeName) {
      if (typeName === 'CaptureImage') return this.CaptureImageFolders;
      if (typeName === 'ScheduleImage') return this.ScheduleImageFolders;
      return this.SolveFailedImageFolders;
    },
    syncImageFoldersFromType() {
      if (this.fileTypeIndex === 0) {
        this.ImageFile = 'Capture Image';
        this.FoldersName = 'CaptureImage';
        this.imageFolders = this.CaptureImageFolders;
      } else if (this.fileTypeIndex === 1) {
        this.ImageFile = 'Schedule Image';
        this.FoldersName = 'ScheduleImage';
        this.imageFolders = this.ScheduleImageFolders;
      } else {
        this.ImageFile = 'Solve Failed Image';
        this.FoldersName = 'solveFailedImage';
        this.imageFolders = this.SolveFailedImageFolders;
      }
      this.isNoFolders = this.imageFolders.length === 0;
    },
    ImageFileSwitch() {
      this.fileTypeIndex = (this.fileTypeIndex + 1) % 3;
      this.syncImageFoldersFromType();
      this.ensureCurrentFolderSelection(true);
      this.cancelDeleteState();
    },
    folderKey(folder, folderTypeName) {
      return (folderTypeName || this.FoldersName) + '::' + this.getFolderName(folder);
    },
    extractFolderTypeFromKey(key) {
      const parts = String(key || '').split('::');
      return parts[0] || '';
    },
    extractFolderNameFromKey(key) {
      const parts = String(key || '').split('::');
      return parts.length < 2 ? '' : parts.slice(1).join('::');
    },
    getFolderName(folder) {
      return (folder && folder.imageDate ? folder.imageDate : '') + (folder && folder.imageName ? folder.imageName : '');
    },
    getFolderTitle(folder) {
      return folder ? (folder.imageDate || folder.imageName || 'Folder') : '';
    },
    getFolderSubtitle(folder) {
      if (!folder) return '';
      return folder.imageName || this.getFolderName(folder);
    },
    getFolderMeta(folder) {
      if (!folder) return '-';
      return typeof folder.fileCount === 'number' ? folder.fileCount + ' img' : 'load';
    },
    isCurrentFolder(folder) { return this.folderKey(folder) === this.currentFolderKey; },
    isCurrentFile(file) { return !!file && file.imageName === this.currentFileName; },
    cloneFileList(list) { return (Array.isArray(list) ? list : []).map((file) => Object.assign({}, file)); },
    getFileExtension(name) {
      const parts = String(name || '').split('.');
      return parts.length < 2 ? '' : parts.pop().toLowerCase();
    },
    buildFileMetaText(name, folderName) {
      const chunks = [];
      if (folderName) chunks.push(folderName);
      const extension = this.getFileExtension(name);
      if (extension) chunks.push(extension.toUpperCase());
      return chunks.join(' • ');
    },
    parseImageFileList(fileList, folderKey) {
      const previousSelection = this.selectedFileNames.slice();
      const openedName = this.currentFile ? this.currentFile.imageName : '';
      const typeName = this.extractFolderTypeFromKey(folderKey);
      const folderName = this.extractFolderNameFromKey(folderKey);
      const targetFolder = this.getFoldersByTypeName(typeName).find((folder) => this.getFolderName(folder) === folderName);
      const folderSelected = !!(targetFolder && targetFolder.isSelected);
      return String(fileList || '')
        .split(';')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({
          id: folderKey + '::' + name,
          imageName: name,
          label: name,
          extension: this.getFileExtension(name),
          relativePath: folderName ? folderName + '/' + name : name,
          metaText: this.buildFileMetaText(name, folderName),
          isSelect: folderSelected || previousSelection.indexOf(name) >= 0,
          isOpen: openedName === name,
        }));
    },
    updateFolderFileCount(folderKey, count) {
      const typeName = this.extractFolderTypeFromKey(folderKey);
      const folderName = this.extractFolderNameFromKey(folderKey);
      const targetFolder = this.getFoldersByTypeName(typeName).find((folder) => this.getFolderName(folder) === folderName);
      if (targetFolder) targetFolder.fileCount = count;
    },
    clearCurrentFolder() {
      this.currentFolderKey = '';
      this.currentFolderRequestKey = '';
      this.currentFolderFiles = [];
      this.currentFolderLoading = false;
      this.currentFileName = '';
    },
    selectFolder(folder) {
      if (!folder) return;
      const typeName = this.getCurrentFolderTypeName();
      const key = this.folderKey(folder, typeName);
      this.currentFolderKey = key;
      this.currentFolderRequestKey = key;
      this.currentFolderLoading = true;
      this.currentFileName = '';
      this.cancelDeleteState();
      if (Array.isArray(this.folderFilesCache[key])) {
        this.currentFolderFiles = this.cloneFileList(this.folderFilesCache[key]);
        this.currentFolderLoading = false;
        if (this.currentFolderFiles.length > 0) this.currentFileName = this.currentFolderFiles[0].imageName;
      } else {
        this.currentFolderFiles = [];
      }
      const folderName = this.getFolderName(folder);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GetImageFiles:' + typeName + '/' + folderName);
      this.$bus.$emit('SendConsoleLogMsg', 'Get Image Files:' + typeName + '/' + folderName, 'info');
    },
    ensureCurrentFolderSelection(forceReload) {
      if (this.imageFolders.length === 0) {
        this.clearCurrentFolder();
        return;
      }
      if (!forceReload && this.currentFolder) {
        if (this.currentFolderFiles.length === 0 && !this.currentFolderLoading) this.selectFolder(this.currentFolder);
        return;
      }
      const typeName = this.getCurrentFolderTypeName();
      const existing = this.imageFolders.find((folder) => this.folderKey(folder, typeName) === this.currentFolderKey);
      if (existing) {
        this.selectFolder(existing);
        return;
      }
      const first = this.imageFolders[0];
      if (first) this.selectFolder(first);
    },
    onImageFilesName(fileList) {
      const key = this.currentFolderRequestKey || this.currentFolderKey;
      if (!key) return;
      const parsedFiles = this.parseImageFileList(fileList, key);
      this.folderFilesCache = Object.assign({}, this.folderFilesCache, { [key]: this.cloneFileList(parsedFiles) });
      this.updateFolderFileCount(key, parsedFiles.length);
      if (key === this.currentFolderKey) {
        this.currentFolderFiles = this.cloneFileList(parsedFiles);
        this.currentFolderLoading = false;
        if (this.currentFolderFiles.length === 0) {
          this.currentFileName = '';
        } else if (!this.currentFileName || !this.currentFolderFiles.find((file) => file.imageName === this.currentFileName)) {
          this.currentFileName = this.currentFolderFiles[0].imageName;
        }
      }
      this.currentFolderRequestKey = '';
    },
    toggleFolderSelection(folder) {
      folder.isSelected = !folder.isSelected;
      const typeName = this.getCurrentFolderTypeName();
      const key = this.folderKey(folder, typeName);
      const selected = !!folder.isSelected;
      if (key === this.currentFolderKey) {
        this.currentFolderFiles.forEach((f) => { f.isSelect = selected; });
        this.syncCurrentFolderCache();
      } else if (Array.isArray(this.folderFilesCache[key])) {
        const list = this.folderFilesCache[key].map((f) => Object.assign({}, f, { isSelect: selected }));
        this.folderFilesCache = Object.assign({}, this.folderFilesCache, { [key]: list });
      }
      if (selected && key !== this.currentFolderKey) {
        this.selectFolder(folder);
        return;
      }
      this.cancelDeleteState();
    },
    toggleFileSelection(file) {
      file.isSelect = !file.isSelect;
      this.syncCurrentFolderCache();
      if (this.currentFolder) this.$set(this.currentFolder, 'isSelected', this.currentFolderFiles.every((f) => f.isSelect));
      this.cancelDeleteState();
    },
    syncCurrentFolderCache() {
      if (!this.currentFolderKey) return;
      this.folderFilesCache = Object.assign({}, this.folderFilesCache, { [this.currentFolderKey]: this.cloneFileList(this.currentFolderFiles) });
    },
    refreshCurrentFolder() {
      if (this.currentFolder) this.selectFolder(this.currentFolder);
    },
    focusFile(file) {
      if (!file || !this.currentFolder) return;
      this.currentFileName = file.imageName;
      this.currentFolderFiles = this.currentFolderFiles.map((item) => Object.assign({}, item, { isOpen: item.imageName === file.imageName }));
      this.syncCurrentFolderCache();
    },
    openFile(file) {
      if (!file || !this.currentFolder) return;
      this.currentFileName = file.imageName;
      this.currentFolderFiles = this.currentFolderFiles.map((item) => Object.assign({}, item, { isOpen: item.imageName === file.imageName }));
      this.syncCurrentFolderCache();
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ReadImageFile:' + this.getCurrentFolderTypeName() + '/' + this.getFolderName(this.currentFolder) + '/' + file.imageName);
      this.$bus.$emit('SendConsoleLogMsg', 'Read Image File:' + this.getCurrentFolderTypeName() + '/' + this.getFolderName(this.currentFolder) + '/' + file.imageName, 'info');
    },
    cancelDeleteState() {
      this.pendingDeleteScope = null;
      this.showDeleteConfirmDialog = false;
    },
    buildDeleteScope() {
      if (this.selectedFolders.length > 0) return { type: 'folders', folderNames: this.selectedFolders.map((folder) => this.getFolderName(folder)) };
      if (this.selectedFileNames.length > 0) return { type: 'files', names: this.selectedFileNames.slice() };
      return null;
    },
    DeleteBtnClick() {
      const scope = this.buildDeleteScope();
      if (!scope) {
        this.$bus.$emit('SendConsoleLogMsg', this.$t('No items selected for deletion.'), 'warning');
        return;
      }
      this.pendingDeleteScope = scope;
      this.showDeleteConfirmDialog = true;
    },
    prepareDeleteFiles(names) {
      if (!Array.isArray(names) || names.length === 0) return;
      this.pendingDeleteScope = { type: 'files', names: names.slice() };
      this.showDeleteConfirmDialog = true;
    },
    confirmDelete() {
      const scope = this.pendingDeleteScope || this.buildDeleteScope();
      if (!scope) {
        this.closeDeleteConfirmDialog();
        return;
      }
      if (scope.type === 'files') this.deleteFiles(scope.names);
      else this.deleteFolderGroups(scope.folderNames);
      this.closeDeleteConfirmDialog();
    },
    closeDeleteConfirmDialog() {
      this.showDeleteConfirmDialog = false;
      this.pendingDeleteScope = null;
    },
    DeleteFolders() {
      this.confirmDelete();
    },
    buildFolderPayload(folderNames) {
      return '{' + folderNames.join(';') + ';}';
    },
    buildFilePayload(fileNames) {
      if (!this.currentFolder) return '{}';
      const folderName = this.getFolderName(this.currentFolder);
      return '{' + fileNames.map((name) => folderName + '/' + name).join(';') + ';}';
    },
    deleteFiles(fileNames) {
      if (!this.currentFolder || !Array.isArray(fileNames) || fileNames.length === 0) return;
      const uniqueNames = Array.from(new Set(fileNames));
      const payload = this.buildFilePayload(uniqueNames);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'DeleteFile:' + this.getCurrentFolderTypeName() + payload);
      this.$bus.$emit('SendConsoleLogMsg', 'Delete File:' + this.getCurrentFolderTypeName() + payload, 'info');
      this.currentFolderFiles = this.currentFolderFiles.filter((file) => uniqueNames.indexOf(file.imageName) === -1);
      if (!this.currentFolderFiles.find((file) => file.imageName === this.currentFileName)) {
        this.currentFileName = this.currentFolderFiles.length > 0 ? this.currentFolderFiles[0].imageName : '';
      }
      this.syncCurrentFolderCache();
      this.updateFolderFileCount(this.currentFolderKey, this.currentFolderFiles.length);
    },
    deleteFolderGroups(folderNames) {
      if (!Array.isArray(folderNames) || folderNames.length === 0) return;
      const uniqueNames = Array.from(new Set(folderNames));
      const typeName = this.getCurrentFolderTypeName();
      const payload = this.buildFolderPayload(uniqueNames);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'DeleteFile:' + typeName + payload);
      this.$bus.$emit('SendConsoleLogMsg', 'Deleted folders:' + uniqueNames.join(','), 'info');
      const targetList = this.getFoldersByTypeName(typeName).filter((folder) => uniqueNames.indexOf(this.getFolderName(folder)) === -1);
      if (typeName === 'CaptureImage') this.CaptureImageFolders = targetList;
      else if (typeName === 'ScheduleImage') this.ScheduleImageFolders = targetList;
      else this.SolveFailedImageFolders = targetList;
      this.syncImageFoldersFromType();
      if (uniqueNames.indexOf(this.extractFolderNameFromKey(this.currentFolderKey)) >= 0) this.clearCurrentFolder();
      this.ensureCurrentFolderSelection(false);
    },
    buildMoveScope() {
      if (this.selectedFolders.length > 0) return { type: 'folders', folderNames: this.selectedFolders.map((folder) => this.getFolderName(folder)) };
      if (this.selectedFileNames.length > 0) return { type: 'files', names: this.selectedFileNames.slice() };
      return null;
    },
    MoveFileToUSB() {
      this.cancelDeleteState();
      const scope = this.buildMoveScope();
      if (!scope) {
        this.$bus.$emit('SendConsoleLogMsg', this.$t('No items selected for USB transfer.'), 'warning');
        return;
      }
      if (this.USBList.length === 0) {
        this.$bus.$emit('SendConsoleLogMsg', this.$t('No USB drive available.'), 'warning');
        return;
      }
      this.pendingMoveScope = scope;
      if (this.USBList.length === 1) {
        this.usbConfirmTargetName = this.USBList[0].name;
        this.showUSBConfirmDialog = true;
      } else {
        this.showUSBSelectDialog = true;
      }
    },
    moveSingleFile(file) {
      if (!file) return;
      this.pendingMoveScope = { type: 'files', names: [file.imageName] };
      if (this.USBList.length === 0) {
        this.$bus.$emit('SendConsoleLogMsg', this.$t('No USB drive available.'), 'warning');
        return;
      }
      if (this.USBList.length === 1) {
        this.usbConfirmTargetName = this.USBList[0].name;
        this.showUSBConfirmDialog = true;
      } else {
        this.showUSBSelectDialog = true;
      }
    },
    sendMoveFileToUSB(usbName) {
      const scope = this.pendingMoveScope || this.buildMoveScope();
      if (!scope) return;
      const payload = scope.type === 'files' ? this.buildFilePayload(scope.names) : this.buildFolderPayload(scope.folderNames);
      const folderType = this.getCurrentFolderTypeName();
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MoveFileToUSB:' + folderType + payload + ':' + usbName);
      this.$bus.$emit('SendConsoleLogMsg', this.$t('Transfer started to USB: {0}', [usbName]), 'info');
      this.pendingMoveScope = null;
      this.closeUSBSelectDialog();
      this.closeUSBConfirmDialog();
    },
    openUSBConfirmDialog(usbName) {
      this.usbConfirmTargetName = usbName;
      this.closeUSBSelectDialog();
      this.showUSBConfirmDialog = true;
    },
    confirmUSBMove() {
      if (!this.usbConfirmTargetName) {
        this.closeUSBConfirmDialog();
        return;
      }
      if (this.USBList.length > 0 && !this.USBList.some((u) => u.name === this.usbConfirmTargetName)) {
        this.$bus.$emit('SendConsoleLogMsg', this.$t('Selected USB drive is no longer available.'), 'warning');
        this.closeUSBConfirmDialog();
        return;
      }
      this.sendMoveFileToUSB(this.usbConfirmTargetName);
      this.closeUSBConfirmDialog();
    },
    closeUSBConfirmDialog() {
      this.showUSBConfirmDialog = false;
      this.usbConfirmTargetName = '';
    },
    selectUSB(usbName) {
      this.selectedUSBName = usbName;
      this.openUSBConfirmDialog(usbName);
    },
    closeUSBSelectDialog() {
      this.showUSBSelectDialog = false;
      this.selectedUSBName = '';
    },
    DownloadSelected() {
      if (this.selectedFolders.length > 0) {
        this.requestDownloadFolders(this.selectedFolders.map((folder) => this.getFolderName(folder)));
        return;
      }
      if (this.selectedFileNames.length > 0) {
        this.requestDownloadFiles(this.selectedFileNames);
        return;
      }
      this.$bus.$emit('SendConsoleLogMsg', this.$t('No items selected for download.'), 'warning');
    },
    downloadSingleFile(file) {
      if (file) this.requestDownloadFiles([file.imageName]);
    },
    requestDownloadFolders(folderNames) {
      if (!Array.isArray(folderNames) || folderNames.length === 0) return;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GetDownloadManifest:' + this.getCurrentFolderTypeName() + this.buildFolderPayload(folderNames));
    },
    requestDownloadFiles(fileNames) {
      if (!this.currentFolder || !Array.isArray(fileNames) || fileNames.length === 0) return;
      const folderName = this.getFolderName(this.currentFolder);
      const payload = '{' + fileNames.map((name) => folderName + '/' + name).join(';') + ';}';
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GetDownloadManifest:' + this.getCurrentFolderTypeName() + payload);
    },
    onDownloadManifest(manifest) {
      if (!manifest || manifest.error) {
        this.$bus.$emit('SendConsoleLogMsg', this.$t('Download manifest error: {0}', [manifest && manifest.error ? manifest.error : 'unknown']), 'error');
        return;
      }
      const files = Array.isArray(manifest.files) ? manifest.files : [];
      if (files.length === 0) {
        this.$bus.$emit('SendConsoleLogMsg', this.$t('Download manifest is empty.'), 'warning');
        return;
      }
      this.pendingDownloadManifest = manifest;
      this.showDownloadConfirmDialog = true;
    },
    closeDownloadConfirmDialog() {
      this.showDownloadConfirmDialog = false;
      this.pendingDownloadManifest = null;
    },
    async confirmStartDownload() {
      if (!this.pendingDownloadManifest || !Array.isArray(this.pendingDownloadManifest.files)) {
        this.closeDownloadConfirmDialog();
        return;
      }
      const manifest = this.pendingDownloadManifest;
      const files = manifest.files;
      const token = manifest.token || '';
      this.downloadSaveMode = 'browser';
      this.downloadDirHandle = null;
      this.downloadSingleFileHandle = null;
      const pickResult = await this.pickDownloadSaveTarget(files);
      if (pickResult && pickResult.type === 'cancel') return;
      if (pickResult && (pickResult.type === 'fs-dir' || pickResult.type === 'fs-file')) {
        if (pickResult.type === 'fs-dir') {
          this.downloadSaveMode = 'fs-dir';
          this.downloadDirHandle = pickResult.dirHandle || null;
        } else {
          this.downloadSaveMode = 'fs-file';
          this.downloadSingleFileHandle = pickResult.fileHandle || null;
        }
        this.enqueueDownloadTasks(files, token, pickResult);
        this.closeDownloadConfirmDialog();
        this.pumpDownloadQueue();
        return;
      }
      this.pendingStartDownloadFiles = files;
      this.pendingStartDownloadToken = token;
      this.showDownloadLocationReminderDialog = true;
      this.closeDownloadConfirmDialog();
    },
    closeDownloadLocationReminderDialog() { this.showDownloadLocationReminderDialog = false; },
    cancelDownloadLocationReminderDialog() {
      this.showDownloadLocationReminderDialog = false;
      this.pendingStartDownloadFiles = null;
      this.pendingStartDownloadToken = '';
    },
    continueStartDownloadAfterReminder() {
      const files = Array.isArray(this.pendingStartDownloadFiles) ? this.pendingStartDownloadFiles : [];
      const token = this.pendingStartDownloadToken || '';
      this.showDownloadLocationReminderDialog = false;
      this.pendingStartDownloadFiles = null;
      this.pendingStartDownloadToken = '';
      if (files.length === 0) return;
      if (this.isProbablyMobile() && this.downloadConcurrency > 1) this.downloadConcurrency = 1;
      this.downloadSaveMode = 'browser';
      this.downloadDirHandle = null;
      this.downloadSingleFileHandle = null;
      this.enqueueDownloadTasks(files, token, null);
      this.pumpDownloadQueue();
    },
    isProbablyMobile() {
      try {
        const ua = typeof navigator !== 'undefined' && navigator && navigator.userAgent ? navigator.userAgent : '';
        const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
        const touchDevice = this.maxTouchPoints > 0 || (typeof window !== 'undefined' && 'ontouchstart' in window);
        const viewportShortSide = Math.min(this.viewportWidth || 0, this.viewportHeight || 0);
        const viewportLongSide = Math.max(this.viewportWidth || 0, this.viewportHeight || 0);
        const screenShortSide = Math.min(this.screenWidth || 0, this.screenHeight || 0);
        const screenLongSide = Math.max(this.screenWidth || 0, this.screenHeight || 0);
        const physicalShortSide = screenShortSide * Math.max(1, this.devicePixelRatioValue || 1);
        const physicalLongSide = screenLongSide * Math.max(1, this.devicePixelRatioValue || 1);
        const smallViewport = viewportShortSide > 0 && viewportShortSide <= 900 && viewportLongSide <= 1600;
        const smallScreen = screenShortSide > 0 && screenShortSide <= 1080 && screenLongSide <= 2560;
        const compactPhysicalScreen = physicalShortSide > 0 && physicalShortSide <= 1440 && physicalLongSide <= 3200;
        const touchCompactScreen = touchDevice && (smallViewport || smallScreen || compactPhysicalScreen);
        return mobileUA || touchCompactScreen;
      } catch (error) {
        return false;
      }
    },
    async pickDownloadSaveTarget(files) {
      const list = Array.isArray(files) ? files : [];
      const canDir = typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
      const canFile = typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
      const secure = typeof window !== 'undefined' ? !!window.isSecureContext : false;
      if (!secure) return { type: 'browser', reason: 'insecure_context' };
      if (canDir) {
        try {
          const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
          return { type: 'fs-dir', dirHandle, dirName: dirHandle && dirHandle.name ? dirHandle.name : '' };
        } catch (error) {
          if (error && (error.name === 'AbortError' || String(error).includes('AbortError'))) return { type: 'cancel' };
          return { type: 'browser', reason: 'dir_picker_failed' };
        }
      }
      if (list.length === 1 && canFile) {
        const first = list[0] || {};
        const suggestedName = String(first.name || first.relPath || 'download').split('/').pop();
        try {
          const fileHandle = await window.showSaveFilePicker({ suggestedName });
          return { type: 'fs-file', fileHandle, fileName: suggestedName };
        } catch (error) {
          if (error && (error.name === 'AbortError' || String(error).includes('AbortError'))) return { type: 'cancel' };
          return { type: 'browser', reason: 'file_picker_failed' };
        }
      }
      return { type: 'browser', reason: 'unsupported' };
    },
    enqueueDownloadTasks(files, token, pickResult) {
      const list = Array.isArray(files) ? files : [];
      list.forEach((file, idx) => {
        const id = this.downloadIdSeq++;
        this.downloadTasks.push({
          id,
          name: file.name || file.relPath || ('file-' + id),
          relPath: file.relPath || '',
          url: file.url || '',
          sizeBytes: typeof file.size === 'number' ? file.size : (parseInt(file.size, 10) || 0),
          receivedBytes: 0,
          status: 'pending',
          progressPercent: 0,
          error: '',
          token,
          abortController: null,
          fsFileHandle: pickResult && pickResult.type === 'fs-file' && idx === 0 ? (pickResult.fileHandle || null) : null,
        });
      });
    },
    async pumpDownloadQueue() {
      const limit = Math.max(1, Math.min(3, parseInt(this.downloadConcurrency || 1, 10)));
      while (this.downloadActiveCount < limit) {
        const next = this.downloadTasks.find((task) => task.status === 'pending');
        if (!next) break;
        this.downloadActiveCount += 1;
        this.downloadOne(next).catch(() => {}).finally(() => {
          this.downloadActiveCount -= 1;
          this.$nextTick(() => this.pumpDownloadQueue());
        });
      }
    },
    async downloadOne(task) {
      if (!task.url) {
        task.status = 'error';
        task.error = 'Empty URL';
        return;
      }
      task.status = 'downloading';
      task.error = '';
      const ctrl = new AbortController();
      task.abortController = ctrl;
      let res;
      try {
        res = await fetch(encodeURI(task.url), { cache: 'no-store', signal: ctrl.signal });
      } catch (error) {
        if (error && (error.name === 'AbortError' || String(error).includes('AbortError'))) {
          task.status = 'cancelled';
          task.error = this.$t('Cancelled');
        } else {
          task.status = 'error';
          task.error = error && error.message ? error.message : String(error);
        }
        task.abortController = null;
        this.checkAndCleanupToken(task.token);
        return;
      }
      if (!res.ok) {
        task.status = 'error';
        task.error = 'HTTP ' + res.status;
        task.abortController = null;
        this.checkAndCleanupToken(task.token);
        return;
      }
      const contentLen = res.headers.get('Content-Length');
      const total = task.sizeBytes || (contentLen ? parseInt(contentLen, 10) : 0);
      if (total && !task.sizeBytes) task.sizeBytes = total;
      if (!res.body || !res.body.getReader) {
        let buf;
        try {
          buf = await res.arrayBuffer();
        } catch (error) {
          if (error && (error.name === 'AbortError' || String(error).includes('AbortError'))) {
            task.status = 'cancelled';
            task.error = this.$t('Cancelled');
          } else {
            task.status = 'error';
            task.error = error && error.message ? error.message : String(error);
          }
          task.abortController = null;
          this.checkAndCleanupToken(task.token);
          return;
        }
        task.receivedBytes = buf.byteLength;
        task.progressPercent = 100;
        try {
          await this.saveDownloadedBlob(new Blob([buf]), task);
          task.status = 'done';
        } catch (error) {
          task.status = 'error';
          task.error = error && error.message ? error.message : String(error);
        }
        task.abortController = null;
        this.checkAndCleanupToken(task.token);
        return;
      }
      const reader = res.body.getReader();
      let received = 0;
      const chunks = [];
      try {
        while (true) {
          const result = await reader.read();
          if (result.done) break;
          if (result.value) {
            chunks.push(result.value);
            received += result.value.length;
            task.receivedBytes = received;
            task.progressPercent = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : Math.min(95, task.progressPercent + 1);
          }
        }
        task.progressPercent = 100;
        await this.saveDownloadedBlob(new Blob(chunks), task);
        task.status = 'done';
      } catch (error) {
        if (error && (error.name === 'AbortError' || String(error).includes('AbortError'))) {
          task.status = 'cancelled';
          task.error = this.$t('Cancelled');
        } else {
          task.status = 'error';
          task.error = error && error.message ? error.message : String(error);
        }
      } finally {
        task.abortController = null;
        this.checkAndCleanupToken(task.token);
      }
    },
    async saveDownloadedBlob(blob, task) {
      if (this.downloadSaveMode === 'fs-dir' && this.downloadDirHandle && blob) {
        const rel = task && task.relPath ? String(task.relPath) : (task && task.name ? String(task.name) : 'download');
        const parts = rel.split('/').filter(Boolean);
        const fileName = parts.length > 0 ? parts.pop() : (task && task.name ? String(task.name) : 'download');
        let dir = this.downloadDirHandle;
        for (const part of parts) dir = await dir.getDirectoryHandle(part, { create: true });
        const fh = await dir.getFileHandle(fileName, { create: true });
        const writable = await fh.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      }
      if (this.downloadSaveMode === 'fs-file' && blob) {
        const fh = task && task.fsFileHandle ? task.fsFileHandle : this.downloadSingleFileHandle;
        if (fh) {
          const writable = await fh.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        }
      }
      this.triggerBrowserDownload(blob, task && task.name ? task.name : 'download');
    },
    toggleDownloadPanel() { this.downloadPanelVisible = !this.downloadPanelVisible; },
    formatTaskStatus(status) {
      const s = String(status || '');
      if (s === 'pending') return '等待';
      if (s === 'downloading') return '下载中';
      if (s === 'paused') return '已暂停';
      if (s === 'done') return '完成';
      if (s === 'cancelled') return '已取消';
      if (s === 'error') return '错误';
      return s;
    },
    pauseDownload(task) {
      if (!task || task.status !== 'downloading') return;
      if (task.abortController) {
        try { task.abortController.abort(); } catch (error) {}
      }
      task.status = 'paused';
      task.error = '';
      task.abortController = null;
    },
    resumeDownload(task) {
      if (!task || task.status !== 'paused') return;
      task.receivedBytes = 0;
      task.progressPercent = 0;
      task.error = '';
      task.status = 'pending';
      task.abortController = null;
      this.pumpDownloadQueue();
    },
    cancelDownload(task) {
      if (!task) return;
      if (task.status === 'downloading' && task.abortController) {
        try { task.abortController.abort(); } catch (error) {}
      }
      if (task.status === 'pending' || task.status === 'paused' || task.status === 'downloading' || task.status === 'error') {
        task.status = 'cancelled';
        task.error = this.$t('Cancelled');
        task.abortController = null;
        this.checkAndCleanupToken(task.token);
      }
    },
    cancelAllDownloads() {
      this.downloadTasks.forEach((task) => {
        if (task && task.status === 'downloading' && task.abortController) {
          try { task.abortController.abort(); } catch (error) {}
        } else if (task && (task.status === 'pending' || task.status === 'paused' || task.status === 'error')) {
          task.status = 'cancelled';
          task.error = this.$t('Cancelled');
          this.checkAndCleanupToken(task.token);
        }
      });
      const tokens = Array.from(new Set(this.downloadTasks.map((task) => task && task.token).filter(Boolean)));
      tokens.forEach((token) => this.checkAndCleanupToken(token));
    },
    checkAndCleanupToken(token) {
      const tok = String(token || '');
      if (!tok || this.cleanedDownloadTokens[tok]) return;
      const remain = this.downloadTasks.some((task) => task && task.token === tok && (task.status === 'pending' || task.status === 'downloading' || task.status === 'paused'));
      if (remain) return;
      const hasError = this.downloadTasks.some((task) => task && task.token === tok && task.status === 'error');
      if (hasError) return;
      this.cleanedDownloadTokens[tok] = true;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ClearDownloadLinks:' + tok);
    },
    triggerBrowserDownload(blob, filename) {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename || 'download';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    },
    formatBytes(bytes) {
      const b = Number(bytes) || 0;
      const oneGB = 1024 * 1024 * 1024;
      const oneMB = 1024 * 1024;
      if (b >= oneGB) return (b / oneGB).toFixed(2) + ' GB';
      if (b >= oneMB) return (b / oneMB).toFixed(2) + ' MB';
      return (b / 1024).toFixed(2) + ' KB';
    },
    updateImageFolders(captureFoldersString, scheduleFoldersString, solveFailedFoldersString) {
      const unchanged = this.CaptureImageFoldersString_LastTime === captureFoldersString && this.ScheduleImageFoldersString_LastTime === scheduleFoldersString && this.SolveFailedImageFoldersString_LastTime === solveFailedFoldersString;
      if (!unchanged) {
        this.CaptureImageFoldersString_LastTime = captureFoldersString;
        this.ScheduleImageFoldersString_LastTime = scheduleFoldersString;
        this.SolveFailedImageFoldersString_LastTime = solveFailedFoldersString;
        const parsedData = this.parseImageData(captureFoldersString, scheduleFoldersString, solveFailedFoldersString);
        this.CaptureImageFolders = this.mergeFolderSelection(parsedData.CaptureFolderList, this.CaptureImageFolders);
        this.ScheduleImageFolders = this.mergeFolderSelection(parsedData.ScheduleFolderList, this.ScheduleImageFolders);
        this.SolveFailedImageFolders = this.mergeFolderSelection(parsedData.SolveFailedFolderList, this.SolveFailedImageFolders);
      }
      this.syncImageFoldersFromType();
      this.ensureCurrentFolderSelection(!unchanged);
    },
    mergeFolderSelection(newList, oldList) {
      if (!Array.isArray(oldList) || oldList.length === 0) return newList;
      return (newList || []).map((folder) => {
        const name = this.getFolderName(folder);
        const prev = oldList.find((f) => this.getFolderName(f) === name);
        return prev && !!prev.isSelected ? Object.assign({}, folder, { isSelected: true }) : folder;
      });
    },
    parseImageData(captureFoldersString, scheduleFoldersString, solveFailedFoldersString) {
      const captureFolders = captureFoldersString.split('{');
      const scheduleFolders = scheduleFoldersString.split('{');
      const solveFailedFolders = solveFailedFoldersString.split('{');
      const captureFolder = captureFolders.length > 1 ? captureFolders[1].split(';') : [];
      const scheduleFolder = scheduleFolders.length > 1 ? scheduleFolders[1].split(';') : [];
      const solveFailedFolder = solveFailedFolders.length > 1 ? solveFailedFolders[1].split(';') : [];
      const captureFolderList = [];
      const scheduleFolderList = [];
      const solveFailedFolderList = [];
      for (let i = 0; i < captureFolder.length - 1; i += 1) captureFolderList.push({ imageDate: captureFolder[i], imageName: '', isSelected: false, fileCount: null });
      for (let i = 0; i < scheduleFolder.length - 1; i += 1) {
        const data = scheduleFolder[i].split('(');
        scheduleFolderList.push({ imageDate: data[0], imageName: data[1] ? '(' + data[1] : '', isSelected: false, fileCount: null });
      }
      for (let i = 0; i < solveFailedFolder.length - 1; i += 1) solveFailedFolderList.push({ imageDate: solveFailedFolder[i], imageName: '', isSelected: false, fileCount: null });
      captureFolderList.sort((a, b) => parseFloat(a.imageDate) - parseFloat(b.imageDate));
      scheduleFolderList.sort((a, b) => parseFloat(a.imageDate) - parseFloat(b.imageDate));
      solveFailedFolderList.sort((a, b) => parseFloat(a.imageDate) - parseFloat(b.imageDate));
      return { CaptureFolderList: captureFolderList, ScheduleFolderList: scheduleFolderList, SolveFailedFolderList: solveFailedFolderList };
    },
    updateUSBdata(name, space) {
      if (name === 'Null') {
        this.isUSBWarning = true;
        this.USB_Info = 'No USB Drive Detected';
        this.USBList = [];
        return;
      }
      const existingIndex = this.USBList.findIndex((usb) => usb.name === name);
      if (existingIndex === -1) this.USBList.push({ name, space: parseInt(space, 10) || 0 });
      else this.USBList[existingIndex].space = parseInt(space, 10) || 0;
      this.updateUSBInfo();
    },
    clearUSBList() {
      this.USBList = [];
      this.updateUSBInfo();
    },
    updateUSBInfo() {
      if (this.USBList.length === 0) {
        this.isUSBWarning = true;
        this.USB_Info = 'No USB Drive Detected';
      } else if (this.USBList.length === 1) {
        const usb = this.USBList[0];
        this.isUSBWarning = false;
        this.USB_Info = 'USB Drive: ' + usb.name + '    Free Space: ' + this.formatSpace(usb.space);
      } else {
        this.isUSBWarning = false;
        this.USB_Info = 'Multiple USB drives detected, please select the USB drive to move the files';
      }
    },
    formatSpace(bytes) {
      const oneGB = 1024 * 1024 * 1024;
      const oneMB = 1024 * 1024;
      if (bytes >= oneGB) return (bytes / oneGB).toFixed(2) + ' GB';
      if (bytes >= oneMB) return (bytes / oneMB).toFixed(2) + ' MB';
      return (bytes / 1024).toFixed(2) + ' KB';
    },
  },
};
</script>

<style scoped>
.ImageManager-panel { pointer-events: auto; position: fixed; background: linear-gradient(180deg, rgb(18, 18, 18) 0%, rgb(18, 18, 18) 100%); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.14); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.55); box-sizing: border-box; overflow: hidden; z-index: 820; }
.panel-enter-active { animation: showPanelAnimation 0.3s forwards; }
.panel-leave-active { animation: hidePanelAnimation 0.3s forwards; }
@keyframes showPanelAnimation { from { bottom: 100%; backdrop-filter: blur(0px); background-color: rgba(64, 64, 64, 0); } to { bottom: 0; backdrop-filter: blur(5px); background-color: rgba(64, 64, 64, 0.3); } }
@keyframes hidePanelAnimation { from { bottom: 0; backdrop-filter: blur(5px); background-color: rgba(64, 64, 64, 0.3); } to { bottom: 100%; backdrop-filter: blur(0px); background-color: rgba(64, 64, 64, 0); } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter, .fade-leave-to { opacity: 0; }
.icon-center { display: flex; justify-content: center; align-items: center; }
.no-select { user-select: none; }
.panel-header { position: absolute; top: 8px; left: 10px; right: 10px; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; z-index: 2; }
.panel-actions { position: relative; min-width: 290px; height: 36px; }
.custom-button, .secondary-action-btn, .primary-action-btn, .file-action-btn, .download-action-btn, .download-icon-btn, .usb-select-close, .btn-close { border: none; border-radius: 10px; cursor: pointer; color: rgba(255, 255, 255, 0.9); background: rgba(255, 255, 255, 0.08); transition: background 0.2s ease; }
.custom-button:hover, .secondary-action-btn:hover, .primary-action-btn:hover, .file-action-btn:hover, .download-action-btn:hover, .download-icon-btn:hover, .btn-close:hover { background: rgba(255, 255, 255, 0.16); }
.custom-button:disabled, .file-action-btn:disabled { cursor: not-allowed; background: rgba(255, 255, 255, 0.04); color: rgba(255, 255, 255, 0.35); opacity: 0.7; }
.custom-button:disabled:hover, .file-action-btn:disabled:hover { background: rgba(255, 255, 255, 0.04); }
.btn-MoveUSB, .btn-Delete, .btn-Download, .btn-ImageFileSwitch, .btn-close { position: absolute; width: 35px; height: 35px; }
.btn-MoveUSB { left: 0; top: 0; } .btn-Delete { left: 45px; top: 0; } .btn-Download { left: 90px; top: 0; } .btn-ImageFileSwitch { left: 255px; top: 0; }
.btn-close { position: static; }
.ImageFileTip { position: absolute; left: 135px; top: 0; min-width: 110px; height: 35px; line-height: 35px; text-align: center; padding: 0 12px; font-size: 12px; }
.span-USB-Info-Normal, .span-USB-Info-Warning { position: absolute; top: 56px; left: 20px; right: 20px; font-size: 12px; user-select: none; }
.span-USB-Info-Normal { color: rgba(130, 220, 180, 0.92); } .span-USB-Info-Warning { color: rgba(255, 196, 120, 0.92); }
.browser-layout { position: absolute; top: 84px; left: 20px; right: 20px; bottom: 20px; display: grid; grid-template-columns: minmax(220px, 31%) minmax(360px, 69%); gap: 18px; min-width: 0; }
.folder-sidebar, .workspace, .detail-card, .file-list-panel { background: rgb(28, 28, 28); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; backdrop-filter: blur(10px); }
.folder-sidebar { padding: 16px; display: flex; flex-direction: column; min-height: 0; }
.pane-header, .workspace-toolbar, .list-header, .download-panel-header, .download-item-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pane-title { color: rgba(255, 255, 255, 0.92); font-size: 16px; font-weight: 600; }
.pane-subtitle, .toolbar-summary, .sidebar-summary, .workspace-state, .detail-meta, .detail-hint, .protocol-note, .download-subtitle, .download-state, .file-row-meta, .folder-item-subtitle, .usb-item-space, .download-confirm-row, .download-confirm-label, .download-confirm-hint { color: rgba(255, 255, 255, 0.62); font-size: 12px; line-height: 1.4; }
.pane-badge { min-width: 28px; height: 28px; line-height: 28px; border-radius: 999px; text-align: center; background: rgba(75, 155, 250, 0.18); color: rgba(255, 255, 255, 0.9); }
.folder-list { margin-top: 14px; overflow: auto; display: flex; flex-direction: column; gap: 8px; min-height: 0; }
.folder-item, .file-row { width: 100%; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; background: rgba(255, 255, 255, 0.03); color: rgba(255, 255, 255, 0.9); cursor: pointer; text-align: left; }
.folder-item { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 10px 12px; }
.folder-item.active { border-color: rgba(75, 155, 250, 0.66); background: rgba(75, 155, 250, 0.12); } .folder-item.selected, .file-row.selected { box-shadow: inset 0 0 0 1px rgba(255, 196, 120, 0.45); }
.folder-item-title, .file-row-name, .detail-name, .usb-item-name, .download-title, .download-name { color: rgba(255, 255, 255, 0.94); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.folder-item-meta { font-size: 11px; color: rgba(255, 255, 255, 0.6); }
.sidebar-summary { margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.08); display: grid; gap: 6px; }
.sidebar-empty, .workspace-empty, .workspace-state, .detail-empty { display: flex; align-items: center; justify-content: center; text-align: center; padding: 24px; min-height: 140px; }
.workspace { padding: 16px; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.workspace-toolbar-actions, .detail-actions, .file-row-actions, .download-panel-controls, .download-item-actions, .download-confirm-actions, .download-confirm-controls { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; }
.workspace-body { margin-top: 14px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; min-height: 0; flex: 1; }
.file-list-panel, .detail-card { padding: 14px; min-height: 0; }
.file-list-panel { display: flex; flex-direction: column; }
.file-list { margin-top: 12px; overflow: auto; display: flex; flex-direction: column; gap: 8px; min-height: 0; flex: 1; max-height: none; }
.file-row { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px 12px; }
.file-row.active { border-color: rgba(75, 155, 250, 0.66); background: rgba(75, 155, 250, 0.11); } .file-row.opened { box-shadow: inset 0 0 0 1px rgba(120, 220, 180, 0.45); }
.detail-panel { display: grid; gap: 16px; } .detail-content, .protocol-note { margin-top: 12px; display: grid; gap: 10px; } .detail-actions { flex-wrap: wrap; }
.primary-action-btn, .secondary-action-btn, .file-action-btn, .download-action-btn { padding: 8px 12px; font-size: 12px; } .primary-action-btn { background: rgba(75, 155, 250, 0.24); } .danger { background: rgba(255, 80, 80, 0.18); }
.usb-select-overlay { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.42); display: flex; align-items: center; justify-content: center; z-index: 6; }
.usb-select-dialog { width: min(420px, calc(100% - 24px)); background: rgba(28, 28, 28, 0.96); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden; }
.usb-select-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
.usb-select-title { color: rgba(255, 255, 255, 0.94); font-weight: 600; }
.usb-select-content { padding: 12px 16px 16px; display: grid; gap: 10px; }
.usb-select-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.05); cursor: pointer; }
.download-confirm-inline { margin-left: 12px; }
.download-select { min-width: 56px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(28, 28, 28, 0.98); color: rgba(255, 255, 255, 0.95); padding: 4px 8px; font-size: 13px; cursor: pointer; appearance: auto; }
.download-select option { background: rgba(28, 28, 28, 0.98); color: rgba(255, 255, 255, 0.95); }
.download-select.small { min-width: 48px; padding: 2px 6px; font-size: 12px; }
.download-panel { position: absolute; left: 20px; right: 20px; bottom: 20px; background: rgba(18, 18, 18, 0.96); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 14px; z-index: 5; }
.download-panel-title, .download-list { display: grid; gap: 10px; } .download-list { margin-top: 12px; max-height: 180px; overflow: auto; }
.download-item { padding: 10px 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.04); }
.download-item-row.secondary { margin-top: 4px; }
.download-bar { width: 100%; height: 6px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); margin-top: 8px; overflow: hidden; }
.download-bar-inner { height: 100%; background: linear-gradient(90deg, rgba(75, 155, 250, 0.9), rgba(120, 220, 180, 0.9)); }
.download-fab { position: absolute; right: 20px; bottom: 20px; width: 48px; height: 48px; border: none; border-radius: 999px; background: rgba(75, 155, 250, 0.85); cursor: pointer; }
.compact { padding: 6px 10px; }
.compact-mobile .pane-subtitle,
.compact-mobile .folder-item-subtitle,
.compact-mobile .file-row-meta,
.compact-mobile .download-subtitle { display: none; }
.compact-mobile .panel-header { top: 6px; left: 8px; right: 8px; gap: 10px; }
.compact-mobile .panel-actions { min-width: 250px; height: 35px; }
.compact-mobile .span-USB-Info-Normal,
.compact-mobile .span-USB-Info-Warning { top: 46px; left: 12px; right: 12px; font-size: 11px; }
.compact-mobile .browser-layout { top: 64px; left: 12px; right: 12px; bottom: 12px; gap: 10px; }
.compact-mobile .folder-sidebar,
.compact-mobile .workspace { padding: 12px; background: rgb(28, 28, 28); }
.compact-mobile .workspace-toolbar { gap: 8px; }
.compact-mobile .workspace-body { margin-top: 6px; gap: 8px; }
.compact-mobile .file-list-panel { padding: 0; background: transparent; border: none; border-radius: 0; backdrop-filter: none; }
.compact-mobile .list-header { display: none; }
.compact-mobile .folder-list,
.compact-mobile .file-list { margin-top: 6px; }
.compact-mobile .sidebar-empty,
.compact-mobile .workspace-empty,
.compact-mobile .workspace-state { min-height: 88px; padding: 16px; }
.compact-mobile .folder-item,
.compact-mobile .file-row { padding-top: 8px; padding-bottom: 8px; }
code { color: rgba(130, 220, 255, 0.92); }
@media (max-width: 768px) {
  .ImageManager-panel {
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .panel-header {
    position: static;
    padding: 6px 10px 0;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
    min-width: 0;
  }
  .panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    height: auto;
    flex-wrap: wrap;
    flex: 1 1 auto;
  }
  .btn-MoveUSB, .btn-Delete, .btn-Download, .btn-ImageFileSwitch, .btn-close {
    position: static;
    flex: 0 0 35px;
  }
  .ImageFileTip {
    position: static;
    min-width: 0;
    height: auto;
    line-height: 1.4;
  }
  .ImageFileTip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 35px;
    padding: 8px 12px;
  }
  .span-USB-Info-Normal, .span-USB-Info-Warning {
    position: static;
    display: block;
    margin: 2px 12px 0;
    min-width: 0;
    flex: 0 0 auto;
  }
  .browser-layout {
    position: static;
    left: auto;
    right: auto;
    top: auto;
    bottom: auto;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    align-items: stretch;
    gap: 8px;
    margin: 4px 12px 12px;
    min-width: 0;
    min-height: 0;
    flex: 1 1 auto;
    overflow: hidden;
  }
  .folder-sidebar {
    min-width: 0;
    padding: 12px;
    max-height: 34vh;
  }
  .workspace {
    min-width: 0;
    padding: 12px;
  }
  .pane-header, .workspace-toolbar, .list-header, .download-panel-header, .download-item-row {
    flex-wrap: wrap;
    align-items: center;
  }
  .pane-badge {
    margin-left: auto;
  }
  .workspace-toolbar-actions, .file-row-actions, .download-panel-controls, .download-item-actions, .download-confirm-actions, .download-confirm-controls {
    flex-wrap: wrap;
  }
  .workspace-toolbar {
    gap: 8px;
  }
  .workspace-body {
    margin-top: 6px;
    gap: 8px;
  }
  .file-list-panel {
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 0;
    backdrop-filter: none;
  }
  .folder-list, .file-list {
    margin-top: 8px;
  }
  .list-header {
    padding: 0 2px;
  }
  .file-row {
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 10px;
  }
  .file-row-actions {
    grid-column: 1 / -1;
    width: 100%;
    overflow-x: auto;
  }
  .file-action-btn {
    flex: 0 0 auto;
    min-width: 78px;
    text-align: center;
  }
  .download-panel {
    left: 12px;
    right: 12px;
    bottom: 12px;
    min-width: 0;
  }
}
</style>
