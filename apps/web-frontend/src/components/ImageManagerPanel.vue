<template>
  <transition name="panel">
  <div class="ImageManager-panel" :style="{ bottom: bottom + 'px', top: top + 'px' , left: left + 'px', right: right + 'px' }">
    <div>
      <button class="custom-button btn-MoveUSB no-select" @click="MoveFileToUSB"> 
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/USB Flash Drive.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button>

      <!-- <span v-show="DeleteBtnSelect" class="custom-button DeleteTips no-select"> Confirm deletion? </span> -->
      <span v-show="defaultShow || DeleteBtnSelect" class="custom-button no-select" :class="{ 'DeleteTips-show': DeleteBtnSelect, 'DeleteTips-hide': !DeleteBtnSelect }"> Confirm deletion? </span>

      <button v-show="defaultShow || DeleteBtnSelect" class="custom-button btn-SureDelete no-select" :class="{ 'btn-SureDelete-show': DeleteBtnSelect, 'btn-SureDelete-hide': !DeleteBtnSelect }" @click="DeleteFolders"> 
        <v-icon color="rgba(255, 0, 0)"> mdi-check-circle-outline </v-icon>
      </button>
      
      <button class="custom-button btn-Delete no-select" @click="DeleteBtnClick"> 
        <span v-if="DeleteBtnSelect === false">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/delete.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
          </div> 
        </span>
        <span v-if="DeleteBtnSelect === true">
          <v-icon color="rgba(75, 155, 250)"> mdi-close-circle-outline </v-icon>
        </span>
      </button>

      <span class="custom-button ImageFileTip ImageFileTip-fixed no-select" @click="ImageFileSwitch"> {{ $t(ImageFile) }} </span>

      <button class="custom-button btn-ImageFileSwitch btn-ImageFileSwitch-fixed no-select" @click="ImageFileSwitch"> 
        <!-- <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/USB Flash Drive.svg" height="20px" style="min-height: 20px"></img>
        </div> -->
        <v-icon color="rgba(255, 255, 255)"> mdi-folder-sync-outline </v-icon>
      </button>

    </div>

    <div>
      <button class="custom-button btn-PrevPage no-select" @click="prevPage">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/arrow-left.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button>
      <button class="custom-button btn-NextPage no-select" @click="nextPage">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/arrow-right.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button>

      <span style="position: absolute; top: 8px; left: 50%; transform: translateX(-50%); color: rgba(255, 255, 255, 0.5); user-select: none;">
        Page {{ currentPage + 1 }} / {{ totalPage + 1 }}
      </span>
      
    </div>

    <div>
      <button class="btn-close no-select" @click="PanelClose">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/OFF.svg" height="12px" style="min-height: 12px; pointer-events: none;"></img>
        </div>
      </button>
    </div>

    <span :class="{ 'span-USB-Info-Normal': !isUSBWarning, 'span-USB-Info-Warning': isUSBWarning }"> 
      <!-- USB Flash Drive: {{ USB_Name }}, Free Space: {{ USB_Space }} -->
      {{ $t(USB_Info) }}
    </span>

    <div v-for="(item, index) in displayedItems" :key="index">
      <!-- <ImageFolder :folderIndex="index" :imageDate="item.imageDate" :imageName="item.imageName" :folderSelect="item.isSelected" :DeleteBtnSelect="DeleteBtnSelect" class="image-folder no-select" :style="{ top: Position[index].top, left: Position[index].left }"></ImageFolder> -->
      <ImageFolder :folderIndex="index" :imageDate="item.imageDate" :imageName="item.imageName" :folderSelect="item.isSelected" :DeleteBtnSelect="DeleteBtnSelect" :PositionTop="Position[index].top" :PositionLeft="Position[index].left" class="image-folder no-select"></ImageFolder>
    </div>

    <span v-show="isNoFolders" style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); font-size: 20px; color: rgba(255, 255, 255, 0.5); user-select: none;"> 
      {{ $t('There are no image folders') }}
    </span>

    <transition name="overlay">
      <div v-if="isImageFolderOpen" class="overlay"></div>
    </transition>

    <!-- U盘选择对话框 -->
    <transition name="fade">
      <div v-if="showUSBSelectDialog" class="usb-select-overlay" @click="closeUSBSelectDialog">
        <div class="usb-select-dialog" @click.stop>
          <div class="usb-select-header">
            <span class="usb-select-title">{{ $t('Select USB Drive') }}</span>
            <button class="usb-select-close" @click="closeUSBSelectDialog">
              <v-icon color="rgba(255, 255, 255, 0.7)">mdi-close</v-icon>
            </button>
          </div>
          <div class="usb-select-content">
            <div 
              v-for="usb in USBList" 
              :key="usb.name" 
              class="usb-select-item"
              @click="selectUSB(usb.name)"
            >
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

  </div>
  </transition>
</template>

<script>
import ImageFolder from './ImageFolder.vue';

export default {
  name: 'ImageManagerPanel',
  components: {
    ImageFolder,
  },
  data() {
    return {
      bottom: 0,
      left: 0,
      right: 0,
      top: 40,
      itemsPerPage: 12,
      currentPage: 0,
      totalPage: 0,
      DeleteBtnSelect: false,
      defaultShow: false,
      isNoFolders: true,
      ImageFile: 'Capture Image',
      isCaptureFile: true,
      fileTypeIndex: 0, // 0: CaptureImage, 1: ScheduleImage, 2: SolveFailedImage
      previousFileTypeIndex: 0, // 记录上一个状态，用于动画
      FoldersName: 'CaptureImage',
      Position: [
        { top: '10%', left: '2.5%' },
        { top: '10%', left: '18.5%' },
        { top: '10%', left: '34.5%' },
        { top: '10%', left: '50.5%' },
        { top: '10%', left: '66.5%' },
        { top: '10%', left: '82.5%' },

        { top: '45%', left: '2.5%' },
        { top: '45%', left: '18.5%' },
        { top: '45%', left: '34.5%' },
        { top: '45%', left: '50.5%' },
        { top: '45%', left: '66.5%' },
        { top: '45%', left: '82.5%' },
        // Add more positions here...
      ],
      imageFolders: [
        // { imageDate: '2024-4-11 10h', imageName: '[ Kochab, Dubhe, Spica, Arcturus, Dubhe, Polaris]', isSelected: false},
        // { imageDate: '2024-4-12 14h', imageName: '[ Kochab, Dubhe, Spica]', isSelected: false},
        // { imageDate: '2024-4-12 16h', imageName: '[ Kochab, Dubhe, Spica]', isSelected: false},
        // { imageDate: '2024-4-12 08h', imageName: '[ Kochab, Dubhe, Spica]', isSelected: false},
        // { imageDate: '2024-4-12 20h', imageName: '[ Kochab, Dubhe, Spica]', isSelected: false},
        // { imageDate: '2024-4-12 20h', imageName: '[ Kochab, Dubhe, Spica]', isSelected: false},
      ],
      CaptureImageFolders: [],
      ScheduleImageFolders: [],
      SolveFailedImageFolders: [],
      CaptureImageFoldersString_LastTime: '', 
      ScheduleImageFoldersString_LastTime: '',
      SolveFailedImageFoldersString_LastTime: '', 
      USB_Info: '',
      isUSBWarning: true,
      isImageFolderOpen: false,
      USBList: [], // 存储所有U盘信息 [{name: 'USB1', space: 1000000}, ...]
      showUSBSelectDialog: false, // 是否显示U盘选择对话框
      selectedUSBName: '', // 选中的U盘名
    };
  },
  created() {
    this.$bus.$on('SelectFolderIndex', this.SelectFolderIndex);
    this.$bus.$on('calculateTotalPage', this.calculateTotalPage);
    this.$bus.$on('ShowAllImageFolder', this.updateImageFolders);
    this.$bus.$on('USB_Name_Sapce', this.updateUSBdata);
    this.$bus.$on('ImageFolderOpen', this.ImageFolderOpen);
    this.$bus.$on('ClearUSBList', this.clearUSBList);
  },
  methods: {
    nextPage() {
      this.totalPage = Math.ceil(this.imageFolders.length / this.itemsPerPage) - 1;
      if (this.currentPage < this.totalPage) {
        this.currentPage++;
      }
    },

    prevPage() {
      if (this.currentPage > 0) {
        this.currentPage--;
      }
    },

    calculateTotalPage() {
      this.totalPage = Math.ceil(this.imageFolders.length / this.itemsPerPage) - 1;
    },

    PanelClose() {
      this.$bus.$emit('ImageManagerPanelClose');
      this.defaultShow = false;
    },

    SelectFolderIndex(num) {
      console.log('Select Folder Index:', num);
      this.imageFolders[this.currentPage * this.itemsPerPage + num].isSelected = !this.imageFolders[this.currentPage * this.itemsPerPage + num].isSelected;
    },

    DeleteBtnClick() {
      if(this.isAnySelected) {
        if(this.DeleteBtnSelect) {
          this.DeleteBtnSelect = false;
        } else {
          this.DeleteBtnSelect = true;
          this.defaultShow = true;
        }
      } else {
        console.log('N');
      }
    },

    ImageFileSwitch() {
      // 记录上一个状态
      this.previousFileTypeIndex = this.fileTypeIndex;
      
      // 循环切换：Capture Image -> Schedule Image -> Solve Failed Image -> Capture Image
      if(this.fileTypeIndex === 0) {
        // 从 Capture Image 切换到 Schedule Image
        this.fileTypeIndex = 1;
        this.isCaptureFile = false;
        this.ImageFile = 'Schedule Image';
        this.imageFolders = this.ScheduleImageFolders;
        this.FoldersName = 'ScheduleImage';
      }
      else if(this.fileTypeIndex === 1) {
        // 从 Schedule Image 切换到 Solve Failed Image
        this.fileTypeIndex = 2;
        this.isCaptureFile = false;
        this.ImageFile = 'Solve Failed Image';
        this.imageFolders = this.SolveFailedImageFolders;
        this.FoldersName = 'solveFailedImage';
      }
      else {
        // 从 Solve Failed Image 切换回 Capture Image
        this.fileTypeIndex = 0;
        this.isCaptureFile = true;
        this.ImageFile = 'Capture Image';
        this.imageFolders = this.CaptureImageFolders;
        this.FoldersName = 'CaptureImage';
      }
    },

    DeleteFolders() {
      this.DeleteBtnSelect = false;
      // 根据当前文件类型设置 FoldersName
      if(this.fileTypeIndex === 0)
      {
        this.FoldersName = 'CaptureImage';
      }
      else if(this.fileTypeIndex === 1)
      {
        this.FoldersName = 'ScheduleImage';
      }
      else
      {
        this.FoldersName = 'solveFailedImage';
      }
      const deletedFolders = this.imageFolders.filter(folder => folder.isSelected); // 被删除的文件夹
      const resultString = this.convertImageDataToString(deletedFolders)
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'DeleteFile:'+this.FoldersName+resultString);
      this.imageFolders = this.imageFolders.filter(folder => !folder.isSelected);
      this.calculateTotalPage();

      console.log('Deleted folders:', deletedFolders);
      this.$bus.$emit('SendConsoleLogMsg', 'Deleted folders:'+deletedFolders, 'info');
    },
    convertImageDataToString(imageDataArray) {
      let resultString = '{';

      imageDataArray.forEach(item => {
        const { imageDate, imageName } = item;
        resultString += `${imageDate}${imageName};`;
      });

      resultString += '}';

      return resultString;
    },
    MoveFileToUSB() {
      this.DeleteBtnSelect = false;
      
      // 检查U盘数量
      if (this.USBList.length === 0) {
        console.log('No USB drive available');
        return;
      } else if (this.USBList.length === 1) {
        // 单个U盘，直接发送
        this.sendMoveFileToUSB(this.USBList[0].name);
      } else {
        // 多个U盘，显示选择对话框
        this.showUSBSelectDialog = true;
      }
    },
    
    sendMoveFileToUSB(usbName) {
      // 根据当前文件类型设置 FoldersName
      if(this.fileTypeIndex === 0)
      {
        this.FoldersName = 'CaptureImage';
      }
      else if(this.fileTypeIndex === 1)
      {
        this.FoldersName = 'ScheduleImage';
      }
      else
      {
        this.FoldersName = 'solveFailedImage';
      }
      const moveFolders = this.imageFolders.filter(folder => folder.isSelected);
      const resultString = this.convertImageDataToString(moveFolders);
      // 在消息中包含U盘名
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MoveFileToUSB:'+this.FoldersName+resultString+':'+usbName);
      console.log('move folders:', moveFolders, 'to USB:', usbName);
      this.$bus.$emit('SendConsoleLogMsg', 'Move folders:'+moveFolders+' to USB:'+usbName, 'info');
    },
    
    selectUSB(usbName) {
      this.selectedUSBName = usbName;
      this.sendMoveFileToUSB(usbName);
      this.closeUSBSelectDialog();
    },
    
    closeUSBSelectDialog() {
      this.showUSBSelectDialog = false;
      this.selectedUSBName = '';
    },

    updateImageFolders(CaptureImageFoldersString, ScheduleImageFoldersString, SolveFailedImageFoldersString) {
      if (this.CaptureImageFoldersString_LastTime === CaptureImageFoldersString && 
          this.ScheduleImageFoldersString_LastTime === ScheduleImageFoldersString &&
          this.SolveFailedImageFoldersString_LastTime === SolveFailedImageFoldersString) 
      {
        console.log('ImageFolders no update');
      } 
      else 
      {
        this.imageFolders=[];
        this.CaptureImageFolders=[];
        this.ScheduleImageFolders=[];
        this.SolveFailedImageFolders=[];
        this.CaptureImageFoldersString_LastTime = CaptureImageFoldersString;
        this.ScheduleImageFoldersString_LastTime = ScheduleImageFoldersString;
        this.SolveFailedImageFoldersString_LastTime = SolveFailedImageFoldersString;
        const parsedData = this.parseImageData(CaptureImageFoldersString, ScheduleImageFoldersString, SolveFailedImageFoldersString)
        console.log('Capture Image Foladers:', parsedData.CaptureFolderList);
        console.log('Schedule Image Foladers:', parsedData.ScheduleFolderList);
        console.log('Solve Failed Image Foladers:', parsedData.SolveFailedFolderList);

        // 按照imageDate（时间）排序parsedData.captureSaveImageList
        parsedData.CaptureFolderList.sort((a, b) => {
          // 假设imageDate为数字格式
          return parseFloat(a.imageDate) - parseFloat(b.imageDate);
        });
        // 将排序后的parsedData.captureSaveImageList中的元素依次复制到imageFolders中
        parsedData.CaptureFolderList.forEach(item => {
          this.CaptureImageFolders.push(item);
        });

        // 按照imageDate（时间）排序parsedData.captureSaveImageList
        parsedData.ScheduleFolderList.sort((a, b) => {
          // 假设imageDate为数字格式
          return parseFloat(a.imageDate) - parseFloat(b.imageDate);
        });
        // 将排序后的parsedData.captureSaveImageList中的元素依次复制到imageFolders中
        parsedData.ScheduleFolderList.forEach(item => {
          this.ScheduleImageFolders.push(item);
        });

        // 按照imageDate（时间）排序parsedData.SolveFailedFolderList
        parsedData.SolveFailedFolderList.sort((a, b) => {
          // 假设imageDate为数字格式
          return parseFloat(a.imageDate) - parseFloat(b.imageDate);
        });
        // 将排序后的parsedData.SolveFailedFolderList中的元素依次复制到imageFolders中
        parsedData.SolveFailedFolderList.forEach(item => {
          this.SolveFailedImageFolders.push(item);
        });

        // 根据当前文件类型显示对应的文件夹列表
        if(this.fileTypeIndex === 0)
        {
          this.imageFolders = this.CaptureImageFolders;
        }
        else if(this.fileTypeIndex === 1)
        {
          this.imageFolders = this.ScheduleImageFolders;
        }
        else
        {
          this.imageFolders = this.SolveFailedImageFolders;
        }
        
        this.calculateTotalPage();

      }
    },
    
    parseImageData(CaptureImageFoldersString, ScheduleImageFoldersString, SolveFailedImageFoldersString) {
      const CaptureFolders = CaptureImageFoldersString.split('{');
      const ScheduleFolders = ScheduleImageFoldersString.split('{');
      const SolveFailedFolders = SolveFailedImageFoldersString.split('{');

      const CaptureFolder = CaptureFolders.length > 1 ? CaptureFolders[1].split(';') : [];
      const ScheduleFolder = ScheduleFolders.length > 1 ? ScheduleFolders[1].split(';') : [];
      const SolveFailedFolder = SolveFailedFolders.length > 1 ? SolveFailedFolders[1].split(';') : [];

      const CaptureFolderList = [];
      const ScheduleFolderList = [];
      const SolveFailedFolderList = [];

      for(let i = 0; i < (CaptureFolder.length - 1); i++) {
        CaptureFolderList.push({imageDate: CaptureFolder[i], imageName: '', isSelected: false });
      }

      for(let i = 0; i < (ScheduleFolder.length -1); i++) {
        const Data = ScheduleFolder[i].split('(');
        ScheduleFolderList.push({imageDate: Data[0], imageName: '('+Data[1], isSelected: false });
      }

      for(let i = 0; i < (SolveFailedFolder.length - 1); i++) {
        SolveFailedFolderList.push({imageDate: SolveFailedFolder[i], imageName: '', isSelected: false });
      }

      return {
        CaptureFolderList,
        ScheduleFolderList,
        SolveFailedFolderList
      };
    },

    updateUSBdata(Name, Space) {
      if(Name === 'Null')
      {
        this.isUSBWarning = true;
        this.USB_Info = 'No USB Drive Detected';
        this.USBList = [];
      }
      else {
        // 检查U盘是否已存在于列表中
        const existingIndex = this.USBList.findIndex(usb => usb.name === Name);
        if (existingIndex === -1) {
          // 添加新的U盘信息
          this.USBList.push({
            name: Name,
            space: parseInt(Space) || 0
          });
        } else {
          // 更新已存在的U盘信息
          this.USBList[existingIndex].space = parseInt(Space) || 0;
        }
        
        // 更新显示信息
        this.updateUSBInfo();
      }
    },
    
    clearUSBList() {
      this.USBList = [];
    },
    
    updateUSBInfo() {
      if (this.USBList.length === 0) {
        this.isUSBWarning = true;
        this.USB_Info = 'No USB Drive Detected';
      } else if (this.USBList.length === 1) {
        // 单个U盘
        const usb = this.USBList[0];
        const USB_Space = this.formatSpace(usb.space);
        this.USB_Info = 'USB Drive: ' + usb.name + '  ' + '  ' + '  ' + '  ' + 'Free Space: ' + USB_Space;
        this.isUSBWarning = false;
      } else {
        // 多个U盘
        this.isUSBWarning = false;
        this.USB_Info = 'Multiple USB drives detected, please select the USB drive to move the files';
      }
    },

    formatSpace(bytes) {
      const ONE_GB = 1024 * 1024 * 1024;
      const ONE_MB = 1024 * 1024;
      
      if (bytes >= ONE_GB) {
        return (bytes / ONE_GB).toFixed(2) + ' GB';
      } else if (bytes >= ONE_MB) {
        return (bytes / ONE_MB).toFixed(2) + ' MB';
      } else {
        return (bytes / 1024).toFixed(2) + ' KB';
      }
    },

    ImageFolderOpen(value) {
      console.log('ImageFolderOpen:'+value);
      if(value === 'true') {
        this.isImageFolderOpen = true;
        if(this.fileTypeIndex === 0)
        {
          this.$bus.$emit('currentFolderType', 'CaptureImage');
        }
        else if(this.fileTypeIndex === 1)
        {
          this.$bus.$emit('currentFolderType', 'ScheduleImage');
        }
        else
        {
          this.$bus.$emit('currentFolderType', 'solveFailedImage');
        }
      } else {
        this.isImageFolderOpen = false;
      }
    }


    
  },
  computed: {
    displayedItems() {
      const startIndex = this.currentPage * this.itemsPerPage;
      const endIndex = Math.min(startIndex + this.itemsPerPage, this.imageFolders.length);
      return this.imageFolders.slice(startIndex, endIndex);
    },
    isAnySelected() {
      return this.imageFolders.some(folder => folder.isSelected);
    },
    isAllunSelected() {
      return this.imageFolders.every(folder => !folder.isSelected);
    },
    isImageFoldersEmpty() {
      return this.imageFolders.length === 0;
    }
  },
  watch: {
    isAllunSelected() {
      this.DeleteBtnSelect = false;
    },
    isImageFoldersEmpty(newVal) {
      this.isNoFolders = newVal;
    },
  }
}
</script>

<style scoped>
.ImageManager-panel {
  pointer-events: auto;
  position: fixed;
  background-color: rgba(64, 64, 64, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  overflow: hidden;
}

@keyframes showPanelAnimation {
  from {
    bottom: 100%;
    backdrop-filter: blur(0px);
    background-color: rgba(64, 64, 64, 0.0);
  }
  to {
    bottom: 0;
    backdrop-filter: blur(5px);
    background-color: rgba(64, 64, 64, 0.3);
  }
}

@keyframes hidePanelAnimation {
  from {
    bottom: 0;
    backdrop-filter: blur(5px);
    background-color: rgba(64, 64, 64, 0.3);
  }
  to {
    bottom: 100%;
    backdrop-filter: blur(0px);
    background-color: rgba(64, 64, 64, 0.0);
  }
}

.panel-enter-active {
  animation: showPanelAnimation 0.3s forwards;
}

.panel-leave-active {
  animation: hidePanelAnimation 0.3s forwards;
}

.btn-MoveUSB {
  position:absolute;
  bottom: 30px;
  left: calc(50% - 17.5px);

  width: 35px;
  height: 35px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;
}

.btn-Delete {
  position:absolute;
  bottom: 30px;
  right: 35%;

  width: 35px;
  height: 35px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;
}

.btn-SureDelete-show {
  position:absolute;
  bottom: 30px;
  right: 35%;

  width: 35px;
  height: 35px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;

  animation: showAnimation 0.3s forwards;
}

@keyframes showAnimation {
  from {
    right: 35%;
  }
  to {
    right: calc(35% - 120px);
  }
}

.btn-SureDelete-hide {
  position:absolute;
  bottom: 30px;
  right: 35%;

  width: 35px;
  height: 35px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;

  animation: hideAnimation 0.3s forwards;
}

@keyframes hideAnimation {
  from {
    right: calc(35% - 120px);
    opacity: 1;
  }
  to {
    right: 35%;
    opacity: 0;
  }
}

.DeleteTips-show {
  position:absolute;
  bottom: 30px;
  left: calc(65% - 35px);

  width: 35px;
  height: 35px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border-radius: calc(35px / 2);
  box-sizing: border-box;
  border: none;

  opacity: 0;
  overflow: hidden;

  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;

  animation: expandAnimation 0.3s forwards;
}

@keyframes expandAnimation {
  from {
    width: 35px;
    opacity: 0;
  }
  to {
    width: 155px;
    opacity: 1;
  }
}

.DeleteTips-hide {
  position:absolute;
  bottom: 30px;
  left: calc(65% - 35px);

  width: 35px;
  height: 35px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border-radius: calc(35px / 2);
  box-sizing: border-box;
  border: none;

  opacity: 1;
  overflow: hidden;

  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;

  animation: collapseAnimation 0.3s forwards;
}

@keyframes collapseAnimation {
  from {
    width: 155px;
    opacity: 1;
  }
  to {
    width: 35px;
    opacity: 0;
  }
}

.ImageFileTip {
  position:absolute;
  bottom: 30px;
  width: 155px;
  height: 35px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border-radius: calc(35px / 2);
  box-sizing: border-box;
  border: none;

  opacity: 1;
  overflow: hidden;

  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.ImageFileTip-fixed {
  left: calc(25% + 40px);
  animation: none !important;
}

.btn-ImageFileSwitch-fixed {
  position:absolute;
  bottom: 30px;
  left: 25%;

  width: 35px;
  height: 35px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;
  animation: none !important;
  transform: none !important;
}

.btn-close {
  position: absolute;
  width: 25px;
  height: 25px;
  top: 3px;
  right: 3px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border: none;
  border-radius: 50%;
}

.btn-PrevPage {
  position:absolute;
  bottom: 30px;
  left: 10%;

  width: 35px;
  height: 35px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;
}

.btn-NextPage {
  position:absolute;
  bottom: 30px;
  right: 10%;

  width: 35px;
  height: 35px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;
}

.btn-PrevPage:active,
.btn-NextPage:active,
.btn-close:active,
.btn-MoveUSB:active,
.btn-Delete:active,
.btn-SureDelete:active,
.btn-ImageFileSwitch:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

.image-folder {
  position: absolute;
}

.span-USB-Info-Normal {
  position: absolute; 
  bottom: 8px; 
  left: 50%; 
  transform: translateX(-50%); 
  color: rgba(255, 255, 255, 0.5); 
  user-select: none;
  white-space: pre;
}

.span-USB-Info-Warning {
  position: absolute; 
  bottom: 8px; 
  left: 50%; 
  transform: translateX(-50%); 
  color: rgba(255, 0, 0, 0.5); 
  user-select: none;
  white-space: pre;
}

.overlay {
  position:absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 800;
  backdrop-filter: blur(20px); 
}

@keyframes showOverlayAnimation {
  from {
    backdrop-filter: blur(0px);
  }
  to {
    backdrop-filter: blur(20px); 
  }
}

@keyframes hideOverlayAnimation {
  from {
    backdrop-filter: blur(20px); 
  }
  to {
    backdrop-filter: blur(0px);
  }
}

.overlay-enter-active {
  animation: showOverlayAnimation 0.3s forwards;
}

.overlay-leave-active {
  animation: hideOverlayAnimation 0.3s forwards;
}

/* U盘选择对话框样式 */
.usb-select-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(5px);
}

.usb-select-dialog {
  background-color: rgba(40, 40, 40, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  min-width: 400px;
  max-width: 600px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.usb-select-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.usb-select-title {
  font-size: 18px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  user-select: none;
}

.usb-select-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.usb-select-close:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.usb-select-close:active {
  transform: scale(0.95);
}

.usb-select-content {
  padding: 10px;
  overflow-y: auto;
  max-height: calc(70vh - 80px);
}

.usb-select-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  margin: 5px 0;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.usb-select-item:hover {
  background-color: rgba(75, 155, 250, 0.2);
  transform: translateX(5px);
}

.usb-select-item:active {
  transform: translateX(3px) scale(0.98);
}

.usb-item-info {
  flex: 1;
}

.usb-item-name {
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 5px;
}

.usb-item-space {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}

</style>

