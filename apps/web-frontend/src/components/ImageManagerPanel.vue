<template>
  <div class="ImageManager-panel" :style="{ bottom: bottom + 'px', top: top + 'px' , left: left + 'px', right: right + 'px' }">
    <div>
      <button class="custom-button btn-MoveUSB no-select" @click="MoveFileToUSB"> 
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/USB Flash Drive.svg" height="20px" style="min-height: 20px"></img>
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
            <img src="@/assets/images/svg/ui/delete.svg" height="20px" style="min-height: 20px"></img>
          </div> 
        </span>
        <span v-if="DeleteBtnSelect === true">
          <v-icon color="rgba(75, 155, 250)"> mdi-close-circle-outline </v-icon>
        </span>
      </button>

    </div>

    <div>
      <button class="custom-button btn-PrevPage no-select" @click="prevPage">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/arrow-left.svg" height="20px" style="min-height: 20px"></img>
        </div>
      </button>
      <button class="custom-button btn-NextPage no-select" @click="nextPage">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/arrow-right.svg" height="20px" style="min-height: 20px"></img>
        </div>
      </button>

      <span style="position: absolute; top: 8px; left: 50%; transform: translateX(-50%); color: rgba(255, 255, 255, 0.5); user-select: none;">
        Page {{ currentPage + 1 }} / {{ totalPage + 1 }}
      </span>
      
    </div>

    <div>
      <button class="btn-close no-select" @click="PanelClose">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/OFF.svg" height="12px" style="min-height: 12px"></img>
        </div>
      </button>
    </div>

    <span style="position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); color: rgba(255, 255, 255, 0.5); user-select: none;"> 
      USB Flash Drive Free Space: {{ FreeSpace }} GB
    </span>

    <div v-for="(item, index) in displayedItems" :key="index">
      <ImageFolder :folderIndex="index" :imageDate="item.imageDate" :imageName="item.imageName" :folderSelect="item.isSelected" :DeleteBtnSelect="DeleteBtnSelect" class="image-folder no-select" :style="{ top: Position[index].top, left: Position[index].left }"></ImageFolder>
    </div>

    <span v-show="isNoFolders" style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); font-size: 20px; color: rgba(255, 255, 255, 0.5); user-select: none;"> 
      There are no image folders.
    </span>

  </div>
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
      bottom: 10,
      left: 10,
      right: 10,
      top: 50,
      itemsPerPage: 12,
      currentPage: 0,
      totalPage: 0,
      FreeSpace: 0,
      DeleteBtnSelect: false,
      defaultShow: false,
      isNoFolders: true,
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
        
        // // 添加更多的 ImageFolder 数据项

        // { imageDate: '2024-5-11', imageName: '[ Kochab, Dubhe, Spica, Arcturus, Dubhe, Polaris]', isSelected: false},
        // { imageDate: '2024-5-11', imageName: '[ Kochab, Dubhe, Spica]', isSelected: false},
        // { imageDate: '2024-5-11', imageName: '[ Kochab, Dubhe, Spica]', isSelected: false},
        // { imageDate: '2024-5-11', imageName: '[ Kochab, Dubhe, Spica]', isSelected: false},
        // { imageDate: '2024-5-11', imageName: '[ Kochab, Dubhe, Spica]', isSelected: false},
        // { imageDate: '2024-5-11', imageName: '[ Kochab, Dubhe, Spica]', isSelected: false},

        // { imageDate: '2024-5-11', imageName: '[ Kochab, Dubhe, Spica]', isSelected: false},
        // { imageDate: '2024-5-11', imageName: '[ Kochab, Dubhe, Spica]', isSelected: false},
        // { imageDate: '2024-5-11', imageName: '[ Kochab, Dubhe, Spica]', isSelected: false},
      ],
    };
  },
  created() {
    this.$bus.$on('SelectFolderIndex', this.SelectFolderIndex);
    this.$bus.$on('calculateTotalPage', this.calculateTotalPage);
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

    DeleteFolders() {
      this.DeleteBtnSelect = false;
      console.log('DeleteFolders');
      this.imageFolders = this.imageFolders.filter(folder => !folder.isSelected);
      this.calculateTotalPage();
    },

    MoveFileToUSB() {
      this.updateImageFolders();
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MoveFileToUSB');
    },

    updateImageFolders() {
      let newFolder = { imageDate: '2024-5-12', imageName: '[ Kochab, Dubhe, Spica]', isSelected: false };

      this.imageFolders.push(newFolder);

      this.calculateTotalPage();
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
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 10px;
  border: 4px solid rgba(128, 128, 128, 0.5);
  box-sizing: border-box;
  transition: height 0.2s ease;
}

.btn-MoveUSB {
  position:absolute;
  bottom: 30px;
  left: 40%;

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
  right: 40%;

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
  right: 40%;

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
    right: 40%;
  }
  to {
    right: calc(40% - 120px);
  }
}

.btn-SureDelete-hide {
  position:absolute;
  bottom: 30px;
  right: 40%;

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
    right: calc(40% - 120px);
    opacity: 1;
  }
  to {
    right: 40%;
    opacity: 0;
  }
}

.DeleteTips-show {
  position:absolute;
  bottom: 30px;
  left: calc(60% - 35px);

  width: 35px;
  height: 35px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
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
  left: calc(60% - 35px);

  width: 35px;
  height: 35px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
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
.btn-SureDelete:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

.image-folder {
  position: absolute;
}
</style>

