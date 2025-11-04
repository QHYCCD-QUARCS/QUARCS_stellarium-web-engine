<template>
  <v-dialog max-width="800" v-model="$store.state.showUSBFilesDialog" scrollable>
    <v-card v-if="$store.state.showUSBFilesDialog" class="qs-settings-card" elevation="0" style="backdrop-filter: blur(5px); background-color: rgba(64, 64, 64, 0.3);">
      <v-card-title class="qs-title">
        <div>{{ $t('USB Files') }}</div>
      </v-card-title>
      <v-card-text class="qs-card-text" style="min-height: 400px; max-height: 600px;">
        <div v-if="loading" class="text-center" style="padding: 40px;">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <div style="margin-top: 16px; color: rgba(255,255,255,0.7);">{{ $t('Loading...') }}</div>
        </div>
        <div v-else-if="error" class="text-center" style="padding: 40px; color: rgba(255,100,100,0.9);">
          <div>{{ error }}</div>
        </div>
        <div v-else-if="currentPath" class="qs-usb-browser">
          <div class="qs-path-bar" style="margin-bottom: 12px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <v-btn small text @click="navigateUp" :disabled="!canNavigateUp">
                <v-icon small>mdi-arrow-up</v-icon>
              </v-btn>
              <span style="color: rgba(255,255,255,0.8); font-family: monospace; font-size: 14px; word-break: break-all;">{{ currentPath || '/' }}</span>
            </div>
          </div>
          <v-list dark class="qs-list" style="background: transparent;">
            <v-list-item
              v-for="(item, index) in fileList"
              :key="index"
              @click="handleItemClick(item)"
              :class="{ 'v-list-item--active': false }"
              style="border-bottom: 1px solid rgba(255,255,255,0.05);"
            >
              <v-list-item-avatar>
                <v-icon :color="item.isDirectory ? 'blue' : 'grey'">
                  {{ item.isDirectory ? 'mdi-folder' : 'mdi-file' }}
                </v-icon>
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title>{{ item.name }}</v-list-item-title>
                <v-list-item-subtitle v-if="!item.isDirectory && item.size">
                  {{ formatFileSize(item.size) }}
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <div v-if="fileList.length === 0" class="text-center" style="padding: 40px; color: rgba(255,255,255,0.5);">
              {{ $t('No files or folders') }}
            </div>
          </v-list>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn class="blue--text darken-1" text @click.native="$store.state.showUSBFilesDialog = false">
          {{ $t('Close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'USBFilesDialog',
  data() {
    return {
      loading: false,
      error: null,
      currentPath: '',
      fileList: [],
      pathStack: [],
      currentUSBName: null // 当前浏览的U盘名
    }
  },
  computed: {
    canNavigateUp() {
      return this.pathStack.length > 0;
    }
  },
  created() {
    this.$bus.$on('USBFilesList', this.onUSBFilesList);
    if (this.$store.state.showUSBFilesDialog) {
      this.loadUSBFiles();
    }
  },
  watch: {
    '$store.state.showUSBFilesDialog'(newVal) {
      if (newVal) {
        // 获取选中的U盘名
        this.currentUSBName = this.$store.state.selectedUSBName;
        this.loadUSBFiles();
      } else {
        this.reset();
      }
    },
    '$store.state.selectedUSBName'(newVal) {
      // 如果U盘名改变，重新加载文件列表
      if (this.$store.state.showUSBFilesDialog) {
        this.currentUSBName = newVal;
        this.reset();
        this.loadUSBFiles();
      }
    }
  },
  beforeDestroy() {
    this.$bus.$off('USBFilesList', this.onUSBFilesList);
  },
  methods: {
    loadUSBFiles(path = '') {
      this.loading = true;
      this.error = null;
      
      // U盘名是必需的
      if (!this.currentUSBName) {
        this.loading = false;
        this.error = 'USB name is required';
        return;
      }
      
      // 构建命令：GetUSBFiles:usb_name:relativePath
      // 两个参数都是必需的，根目录使用空字符串作为相对路径
      const relativePath = path || '';
      const command = `GetUSBFiles:${this.currentUSBName}:${relativePath}`;
      
      this.$bus.$emit('AppSendMessage', 'Vue_Command', command);
    },
    onUSBFilesList(data) {
      this.loading = false;
      if (data.error) {
        this.error = data.error;
        this.fileList = [];
        return;
      }
      this.currentPath = data.path || '';
      this.fileList = (data.files || []).map(file => ({
        name: file.name || file,
        isDirectory: file.isDirectory !== undefined ? file.isDirectory : false,
        size: file.size || 0
      })).sort((a, b) => {
        // 文件夹排在前面
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    },
    handleItemClick(item) {
      if (item.isDirectory) {
        // 构建新的相对路径（移除开头的 /）
        let newPath = '';
        if (this.currentPath === '/' || this.currentPath === '') {
          newPath = item.name;
        } else {
          const current = this.currentPath.startsWith('/') ? this.currentPath.substring(1) : this.currentPath;
          newPath = `${current}/${item.name}`;
        }
        this.pathStack.push(this.currentPath);
        this.loadUSBFiles(newPath);
      }
    },
    navigateUp() {
      if (this.pathStack.length > 0) {
        const parentPath = this.pathStack.pop();
        // 如果返回到根目录，使用空字符串作为相对路径
        const pathToLoad = (parentPath === '/' || parentPath === '') ? '' : (parentPath.startsWith('/') ? parentPath.substring(1) : parentPath);
        this.loadUSBFiles(pathToLoad);
      }
    },
    reset() {
      this.loading = false;
      this.error = null;
      this.currentPath = '';
      this.fileList = [];
      this.pathStack = [];
      // 不清空 currentUSBName，保持当前选中的U盘
    },
    formatFileSize(bytes) {
      if (!bytes || bytes === 0) return '';
      const ONE_GB = 1000 * 1000 * 1000;
      const ONE_MB = 1000 * 1000;
      const ONE_KB = 1000;
      if (bytes >= ONE_GB) return (bytes / ONE_GB).toFixed(2) + ' GB';
      if (bytes >= ONE_MB) return (bytes / ONE_MB).toFixed(2) + ' MB';
      if (bytes >= ONE_KB) return (bytes / ONE_KB).toFixed(2) + ' KB';
      return bytes + ' B';
    }
  }
}
</script>

<style scoped>
.qs-usb-browser {
  color: rgba(255, 255, 255, 0.9);
}
.qs-path-bar {
  word-break: break-all;
}
</style>
