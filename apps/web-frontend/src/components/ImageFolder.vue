<template>
  <transition name="folder-transition">
    <div
      :class="{ 'ImageFolder': !folderSelect, 'ImageFolder-select': folderSelect, 'ImageFolder-Deleted': folderSelect && DeleteBtnSelect, 'ImageFolder-Open': folderOpen, 'ImageFolder-Pressing': PressStart }"
      :style="{ top: folderOpen? '10px':PositionTop, left: folderOpen? '50%':PositionLeft }" @mousedown="startPress"
      @mouseup="endPress" @touchstart="startPress" @touchend="endPress" v-show="isShow" ref="folder" @click.stop>

      <div v-show="!folderOpen" class="no-select" style="display: flex; justify-content: center; align-items: center;">
        <img src="@/assets/images/svg/ui/folder.svg" height="80px"
          style="min-height: 80px; pointer-events: none;"></img>
      </div>

      <span class="image-data"
        style="position: absolute; top: 10px; left: 8px; color: rgba(255, 255, 255, 0.7); user-select: none; pointer-events: none;">
        {{imageDate}}
      </span>

      <span v-show="!folderOpen" class="image-name"
        style="position: absolute; top: 35px; left: 8px; color: rgba(255, 255, 255, 0.7); user-select: none; pointer-events: none;">
        {{imageName}}
      </span>

      <div v-show="folderOpen" class="image-file-list">
        <div v-for="(file, index) in displayedItems" :key="index" @mousedown="startFilesPress(index, file.imageName)"
          @mouseup="endFilesPress" @touchstart="startFilesPress(index, file.imageName)" @touchend="endFilesPress"
          :class="{ 'image-file-item': !file.isSelect, 'image-file-item-select': file.isSelect, 'ImageFolder-Pressing': file.FilesPressStart, 'image-file-item-open': file.isOpen }">
          <span class="image-file-name">{{ file.imageName }}</span>
        </div>
      </div>

      <span v-show="folderOpen && (defaultShow || DeleteBtnExpand)" class="custom-button no-select" :class="{ 'DeleteTips-show': DeleteBtnExpand, 'DeleteTips-hide': !DeleteBtnExpand }"> Confirm deletion? </span>

      <button v-show="folderOpen && (defaultShow || DeleteBtnExpand)" class="custom-button btn-SureDelete no-select" :class="{ 'btn-SureDelete-show': DeleteBtnExpand, 'btn-SureDelete-hide': !DeleteBtnExpand }" @click="DeleteImageFiles"> 
        <v-icon color="rgba(255, 0, 0)"> mdi-check-circle-outline </v-icon>
      </button>

      <button v-show="folderOpen" class="custom-button btn-Delete no-select" @click="DeleteBtnClick">
        <span v-if="DeleteBtnExpand === false">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/delete.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
          </div>
        </span>
        <span v-if="DeleteBtnExpand === true">
          <v-icon color="rgba(75, 155, 250)"> mdi-close-circle-outline </v-icon>
        </span>
      </button>


    </div>
  </transition>
</template>

<script>
export default {
  name: 'ImageFolder',
  props: {
    imageDate: {
      type: String,
      default: ''
    },
    imageName: {
      type: String,
      default: ''
    },
    folderSelect: {
      type: Boolean,
      default: false
    },
    folderIndex: {
      type: Number,
      default: 0
    },
    DeleteBtnSelect: {
      type: Boolean,
      default: false
    },
    PositionTop: {
      type: String,
      default: ''
    },
    PositionLeft: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      isShow: true,

      folderOpen: false,

      pressTimer: null,
      longPressThreshold: 1000,
      isLongPress: false, // 标记是否为长按
      PressStart: false,
      canClick: true,

      ImageFiles:[

      ],

      CurrentFolderType: '',

      SelectFilesName: '',
      SelectFilesIndex: 0,

      FilesPressTimer: null,
      isFilesLongPress: false,

      LastImageFilesList: '',

      DeleteBtnExpand: false,
      defaultShow: false,
    };
  },
  created() {
    this.$bus.$on('currentFolderType', this.GetImageFiles);
    this.$bus.$on('ImageFilesName', this.ImageFilesName);
  },
  methods: {
    startPress() {
      this.isLongPress = false; // 重置长按标记
      if(!this.folderOpen) {
        this.PressStart = true;
      }
      this.pressTimer = setTimeout(() => {
        this.PressStart = false;
        this.isLongPress = true; // 标记为长按
        this.handleLongPress();
      }, this.longPressThreshold);
    },
    
    endPress() {
      clearTimeout(this.pressTimer); // 清除定时器
      this.PressStart = false;
      if (!this.isLongPress) {
        this.handleClick(); // 如果不是长按，则触发点击事件
      }
      this.pressTimer = null; // 重置定时器
    },

    handleClick() {
      if (!this.canClick) return; // 如果不可点击，直接返回
      this.canClick = false; // 设置为不可点击
      // console.log("Button clicked");

      this.toggleFolder();

      // 恢复点击权限
      setTimeout(() => {
        this.canClick = true;
      }, 100); // 1秒后恢复
    },

    handleLongPress() {
      if(!this.folderOpen) {
        this.folderOpen = true;
        this.$bus.$emit('ImageFolderOpen', 'true');
      }
    },

    startFilesPress(index, FilesName) {
      this.isFilesLongPress = false;
      this.SelectFilesIndex = index;
      this.ImageFiles[index].FilesPressStart = true;
      this.SelectFilesName = FilesName;
      this.FilesPressTimer = setTimeout(() => {
        this.isFilesLongPress = true;
        this.ImageFiles[this.SelectFilesIndex].FilesPressStart = false;
        this.handleFilesLongPress();
      }, this.longPressThreshold);
    },
    
    endFilesPress() {
      clearTimeout(this.FilesPressTimer);
      this.ImageFiles[this.SelectFilesIndex].FilesPressStart = false;
      if (!this.isFilesLongPress) {
        this.handleFilesClick();
      }
      this.FilesPressTimer = null;
    },

    handleFilesClick() {
      if (!this.canClick) return;
      this.canClick = false;

      // this.toggleFolder();
      console.log('Click File Name:', this.SelectFilesName);
      this.ImageFiles[this.SelectFilesIndex].isSelect = !this.ImageFiles[this.SelectFilesIndex].isSelect;

      // 恢复点击权限
      setTimeout(() => {
        this.canClick = true;
      }, 100); // 1秒后恢复
    },

    handleFilesLongPress() {
      console.log('LongPress File Name:', this.SelectFilesName);
      for (let i = 0; i < this.ImageFiles.length; i++) {
        this.ImageFiles[i].isOpen = false;
      }
      this.ImageFiles[this.SelectFilesIndex].isOpen = true;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ReadImageFile:' + this.CurrentFolderType + '/' + this.imageDate + this.imageName + '/' + this.SelectFilesName);
      this.$bus.$emit('SendConsoleLogMsg', 'Read Image File:' + this.CurrentFolderType + '/' + this.imageDate + this.imageName + '/' + this.SelectFilesName, 'info');
    },

    toggleFolder() {
      // this.folderSelect = !this.folderSelect; // Toggle folder state
      if(!this.folderOpen) {
        this.$bus.$emit('SelectFolderIndex', this.folderIndex);
      }
    },
    updateShow(show) {
      this.isShow = show;
    },
    updateData(imageDate, imageName) {
      this.imageDate = imageDate;
      this.imageName = imageName;
    },

    GetImageFiles(type) {
      this.CurrentFolderType = type;
      if(this.folderOpen) {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GetImageFiles:' + type + '/' + this.imageDate + this.imageName);
        this.$bus.$emit('SendConsoleLogMsg', 'Get Image Files:' + type + '/' + this.imageDate + this.imageName, 'info');
      }
    },

    ImageFilesName(FileList) {
      if(this.folderOpen) {
        if(this.LastImageFilesList != FileList) {
          this.LastImageFilesList = FileList;
          const File = FileList.split(';');
          console.log('FileNum:', File.length-1);

          this.ImageFiles = [];
          for (let i = 0; i < File.length-1; i++) {
            console.log('File[',i,']',File[i]);
            this.ImageFiles.push({imageName: File[i], isSelect: false, FilesPressStart: false, isOpen: false});
          }
        }
      }
    },

    closeFolder() {
      this.folderOpen = false;
      this.$bus.$emit('ImageFolderOpen', 'false');
    },

    DeleteBtnClick() {
      if(this.isAnySelected) {
        if(this.DeleteBtnExpand) {
          this.DeleteBtnExpand = false;
        } else {
          this.DeleteBtnExpand = true;
          this.defaultShow = true;
        }
      } else {
        console.log('N');
      }
    },

    DeleteImageFiles() {
      this.DeleteBtnExpand = false;
      const deletedImageFiles = this.ImageFiles.filter(File => File.isSelect);
      const resultString = this.convertImageDataToString(deletedImageFiles)
      // this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ReadImageFile:' + this.CurrentFolderType + '/' + this.imageDate + this.imageName + '/' + this.SelectFilesName);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'DeleteFile:'+this.CurrentFolderType+resultString);
      this.$bus.$emit('SendConsoleLogMsg', 'Delete File:'+this.CurrentFolderType+resultString, 'info');
      this.ImageFiles = this.ImageFiles.filter(File => !File.isSelect);
    },

    convertImageDataToString(imageDataArray) {
      let resultString = '{';

      imageDataArray.forEach(item => {
        const filename = item.imageName;
        resultString += `${this.imageDate + this.imageName}/${filename};`;
      });

      resultString += '}';

      return resultString;
    },

    handleOutsideClick(event) {
      const folderElement = this.$refs.folder; // 获取组件的 DOM 元素
      if (folderElement && !folderElement.contains(event.target)) {
        // 如果点击发生在组件外部，关闭文件夹
        if(this.folderOpen) {
          this.closeFolder();
        }
      }
    }
  },

  computed: {
    displayedItems() {
      return this.ImageFiles;
    },
    isAnySelected() {
      return this.ImageFiles.some(file => file.isSelect);
    },
  },

  mounted() {
    // 在组件挂载时添加事件监听器
    document.addEventListener('mousedown', this.handleOutsideClick);
    document.addEventListener('touchstart', this.handleOutsideClick);
    document.addEventListener('click', this.handleOutsideClick);
  },

  beforeDestroy() {
    // 在组件销毁时移除事件监听器
    document.removeEventListener('mousedown', this.handleOutsideClick);
    document.removeEventListener('touchstart', this.handleOutsideClick);
    document.removeEventListener('click', this.handleOutsideClick);
  }
}
</script>

<style scoped>
.ImageFolder {
  pointer-events: auto;
  position: fixed;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 5px;
  box-sizing: border-box;
  
  width: 100px;
  height: 80px;
  transition: top 0.4s ease, left 0.4s ease, width 0.4s ease, height 0.4s ease, transform 0.4s ease;

  user-select: none; 
}

.ImageFolder-select {
  pointer-events: auto;
  position: fixed;
  background-color: rgba(75, 155, 250, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 5px;
  box-sizing: border-box;
  
  width: 100px;
  height: 80px;
  transition: top 0.4s ease, left 0.4s ease, width 0.4s ease, height 0.4s ease, transform 0.4s ease;
}

.ImageFolder-Deleted {
  pointer-events: auto;
  position: fixed;
  background-color: rgba(255, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 5px;
  box-sizing: border-box;
  
  width: 100px;
  height: 80px;
  transition: top 0.4s ease, left 0.4s ease, width 0.4s ease, height 0.4s ease, transform 0.4s ease;
}

.ImageFolder-Open {
  pointer-events: auto;
  position: absolute;
  left: 50%;
  width: 60%;
  height: 80%;
  top: 10px;
  transform: translateX(-50%);
  transition: top 0.4s ease, left 0.4s ease, width 0.4s ease, height 0.4s ease, transform 0.4s ease;

  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.8);

  z-index: 9999;
}

.ImageFolder-Pressing {
  transform: scale(1.2); /* 放大1.2倍 */
  transition: transform 1s ease; /* 平滑动画效果 */
}

.image-data {
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.image-name {
  font-size: 10px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* .image-file-list {
  position:absolute;
  top: 30px; 
  left: 8px; 
  right: 8px; 
  bottom: 8px; 

  background-color: rgba(0, 0, 0, 0);
  box-sizing: border-box;
  border: 1px solid rgba(0, 0, 0, 0.5);
  border-radius: 5px;

  pointer-events: auto;
  overflow: hidden;
  overflow-y: auto;
  padding: 10px;  
  margin: 0;   
}

.image-file-item {
  display: flex;
  align-items: center;
  justify-content: start;
  padding: 5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}

.image-file-thumbnail {
  width: 50px;
  height: 50px;
  object-fit: cover;
  margin-right: 10px;
}

.image-file-name {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
} */

.image-file-list {
  position: absolute;
  top: 40px; 
  left: 8px; 
  right: 8px; 
  bottom: 8px; 

  background-color: rgba(0, 0, 0, 0);
  box-sizing: border-box;
  border: 1px solid rgba(0, 0, 0, 0.5);
  border-radius: 5px;

  pointer-events: auto;
  overflow-y: auto;
  padding: 10px;
  margin: 0;

  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  grid-gap: 10px;
  justify-items: center;

  height: calc(100% - 50px);
}

.image-file-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border-radius: 5px;
  background-color: rgba(255, 255, 255, 0.3);
  text-align: center;

  width: 70px;
  height: 50px;

  overflow: hidden;
  position: relative;
}

.image-file-item-select {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border-radius: 5px;
  background-color: rgba(75, 155, 250, 0.4);
  text-align: center;

  width: 70px;
  height: 50px;

  overflow: hidden;
  position: relative;
}

.image-file-item-open {
  border: 1px solid rgba(51, 218, 121, 1);
}

.image-file-name {
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  word-wrap: break-word;

  position: absolute;
  top: 2px;
  left: 2px; 
  right: 2px;

  width: calc(100% - 4px);
  line-height: 1;
  text-align: center;
  padding: 0;

  user-select: none; 
  pointer-events: none;
}

.btn-Delete {
  position:absolute;
  top: 5px;
  right: 5px;

  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;
}

.btn-Delete:active,
.btn-SureDelete:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

.btn-SureDelete-show {
  position:absolute;
  top: 5px;
  right: 5px;

  width: 30px;
  height: 30px;

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
    right: 5px;
  }
  to {
    right: 130px;
  }
}

.btn-SureDelete-hide {
  position:absolute;
  top: 5px;
  right: 5px;

  width: 30px;
  height: 30px;

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
    right: 130px;
    opacity: 1;
  }
  to {
    right: 5px;
    opacity: 0;
  }
}

.DeleteTips-show {
  position:absolute;
  top: 5px;
  right: 5px;

  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border-radius: calc(30px / 2);
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
    width: 30px;
    opacity: 0;
  }
  to {
    width: 155px;
    opacity: 1;
  }
}

.DeleteTips-hide {
  position:absolute;
  top: 5px;
  right: 5px;

  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border-radius: calc(30px / 2);
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
    width: 30px;
    opacity: 0;
  }
}
</style>
