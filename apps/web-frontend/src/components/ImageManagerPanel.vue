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

      <span class="custom-button ImageFileTip no-select" @click="ImageFileSwitch"> {{ ImageFile }} </span>

      <button class="custom-button btn-ImageFileSwitch no-select" :class="{ 'btn-ImageFileSwitch-1': isCaptureFile, 'btn-ImageFileSwitch-2': !isCaptureFile }" @click="ImageFileSwitch"> 
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
      {{ USB_Info }}
    </span>

    <div v-for="(item, index) in displayedItems" :key="index">
      <ImageFolder :folderIndex="index" :imageDate="item.imageDate" :imageName="item.imageName" :folderSelect="item.isSelected" :DeleteBtnSelect="DeleteBtnSelect" class="image-folder no-select" :style="{ top: Position[index].top, left: Position[index].left }"></ImageFolder>
    </div>

    <span v-show="isNoFolders" style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); font-size: 20px; color: rgba(255, 255, 255, 0.5); user-select: none;"> 
      There are no image folders.
    </span>

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
      CaptureImageFoldersString_LastTime: '', 
      ScheduleImageFoldersString_LastTime: '', 
      USB_Info: '',
      isUSBWarning: true,
    };
  },
  created() {
    this.$bus.$on('SelectFolderIndex', this.SelectFolderIndex);
    this.$bus.$on('calculateTotalPage', this.calculateTotalPage);
    this.$bus.$on('ShowAllImageFolder', this.updateImageFolders);
    this.$bus.$on('USB_Name_Sapce', this.updateUSBdata);
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
      // console.log('Select Folder Index:', num);
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
      if(this.ImageFile === 'Capture Image')
      {
        this.isCaptureFile = false;
        this.ImageFile = 'Schedule Image';
        this.imageFolders = this.ScheduleImageFolders;
      }
      else 
      {
        this.isCaptureFile = true;
        this.ImageFile = 'Capture Image';
        this.imageFolders = this.CaptureImageFolders;
      }
    },

    DeleteFolders() {
      this.DeleteBtnSelect = false;
      if(this.isCaptureFile)
      {
        this.FoldersName = 'CaptureImage';
      }
      else
      {
        this.FoldersName = 'ScheduleImage';
      }
      const deletedFolders = this.imageFolders.filter(folder => folder.isSelected); // 被删除的文件夹
      const resultString = this.convertImageDataToString(deletedFolders)
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'DeleteFile:'+this.FoldersName+resultString);
      this.imageFolders = this.imageFolders.filter(folder => !folder.isSelected);
      this.calculateTotalPage();

      console.log('Deleted folders:', deletedFolders);
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
      if(this.isCaptureFile)
      {
        this.FoldersName = 'CaptureImage';
      }
      else
      {
        this.FoldersName = 'ScheduleImage';
      }
      const moveFolders = this.imageFolders.filter(folder => folder.isSelected); // 被删除的文件夹
      const resultString = this.convertImageDataToString(moveFolders)
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MoveFileToUSB:'+this.FoldersName+resultString);
      console.log('Deleted folders:', moveFolders)
    },

    updateImageFolders(CaptureImageFoldersString, ScheduleImageFoldersString) {
      if (this.CaptureImageFoldersString_LastTime === CaptureImageFoldersString && 
          this.ScheduleImageFoldersString_LastTime === ScheduleImageFoldersString) 
      {
        console.log('ImageFolders no update');
      } 
      else 
      {
        this.imageFolders=[];
        this.CaptureImageFolders=[];
        this.ScheduleImageFolders=[];
        this.CaptureImageFoldersString_LastTime = CaptureImageFoldersString;
        this.ScheduleImageFoldersString_LastTime = ScheduleImageFoldersString;
        const parsedData = this.parseImageData(CaptureImageFoldersString, ScheduleImageFoldersString)
        console.log('Capture Image Foladers:', parsedData.CaptureFolderList);
        console.log('Schedule Image Foladers:', parsedData.ScheduleFolderList);

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

        if(this.isCaptureFile)
        {
          this.imageFolders = this.CaptureImageFolders;
        }
        else
        {
          this.imageFolders = this.ScheduleImageFolders;
        }
        
        this.calculateTotalPage();

      }
    },
    
    parseImageData(CaptureImageFoldersString, ScheduleImageFoldersString) {
      const CaptureFolders = CaptureImageFoldersString.split('{');
      const ScheduleFolders = ScheduleImageFoldersString.split('{');

      const CaptureFolder = CaptureFolders[1].split(';');
      const ScheduleFolder = ScheduleFolders[1].split(';');

      const CaptureFolderList = [];
      const ScheduleFolderList = [];

      for(let i = 0; i < (CaptureFolder.length - 1); i++) {
        CaptureFolderList.push({imageDate: CaptureFolder[i], imageName: '', isSelected: false });
      }

      for(let i = 0; i < (ScheduleFolder.length -1); i++) {
        const Data = ScheduleFolder[i].split('[');
        ScheduleFolderList.push({imageDate: Data[0], imageName: '['+Data[1], isSelected: false });
      }

      return {
        CaptureFolderList,
        ScheduleFolderList
      };
    },

    updateUSBdata(Name, Space) {
      if(Name === 'Null')
      {
        this.isUSBWarning = true;
        this.USB_Info = 'No USB Drive Detected.';
      }
      else if (Name === 'Multiple')
      {
        this.isUSBWarning = true;
        this.USB_Info = 'Multiple USB drives detected, please remove excess USB drives.';
      }
      else {
        const USB_Name = Name;
        const USB_Space = this.formatSpace(Space);
        this.USB_Info = 'USB Drive: ' + USB_Name + '  ' + '  ' + '  ' + '  ' + 'Free Space: ' + USB_Space;
        this.isUSBWarning = false;
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
  right: calc(65% - 35px);

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

.btn-ImageFileSwitch-1 {
  position:absolute;
  bottom: 30px;
  left: 35%;

  width: 35px;
  height: 35px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;

  animation: showImageFileAnimation 0.3s forwards;
}

@keyframes showImageFileAnimation {
  from {
    left: 35%;
    transform: rotate(360deg);
  }
  to {
    left: calc(35% - 120px);
    transform: rotate(0deg);
  }
}

.btn-ImageFileSwitch-2 {
  position:absolute;
  bottom: 30px;
  left: 35%;

  width: 35px;
  height: 35px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;

  animation: hideImageFileAnimation 0.3s forwards;
}

@keyframes hideImageFileAnimation {
  from {
    left: calc(35% - 120px);
    transform: rotate(0deg);
  }
  to {
    left: 35%;
    transform: rotate(360deg);
  }
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
</style>

