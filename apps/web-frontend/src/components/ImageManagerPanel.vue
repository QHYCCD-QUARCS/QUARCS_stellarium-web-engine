<template>
  <div class="ImageManager-panel" :style="{ bottom: bottom + 'px', top: top + 'px' , left: left + 'px', right: right + 'px', height: height + 'px' }">
    <div>
      <button class="custom-button btn-MoveUSB no-select" @click="toggleFocuserPanel"> 
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/download.svg" height="25px" style="min-height: 25px"></img>
        </div>
      </button>
      <button class="custom-button btn-Delete no-select" @click="toggleHistogramPanel"> 
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/delete.svg" height="20px" style="min-height: 20px"></img>
        </div> 
      </button>
    </div>

    <div>
      <button class="btn-close no-select" @click="PanelClose"><v-icon> mdi-close-circle-outline </v-icon></button>
    </div>

    <!-- <div>
      <ImageFolder :imageDate="imageDate" :imageName="imageName" class="image-folder no-select" ></ImageFolder>
    </div> -->
    <div v-for="(item, index) in imageFolders" :key="index">
      <ImageFolder :imageDate="item.imageDate" :imageName="item.imageName" class="image-folder no-select" :style="{ top: item.top , left: item.left }" ></ImageFolder>
    </div>
     
  </div>
</template>

<script>
import ImageFolder from './ImageFolder.vue'


export default {
  name: 'ImageManagerPanel',
  data() {
    return {
      bottom: 10,
      left: 10,
      right: 10,
      top: 50,
      imageDate: '2024-4-11',
      // imageName: '[ Kochab, Dubhe, Spica, Arcturus, Dubhe, Polaris]'
      imageFolders: [
        { imageDate: '2024-4-11 10h', imageName: '[ Kochab, Dubhe, Spica, Arcturus, Dubhe, Polaris]', top: '10%', left: '2.5%'},
        { imageDate: '2024-4-12 14h', imageName: '[ Kochab, Dubhe, Spica]', top: '10%', left: '18.5%'},
        { imageDate: '2024-4-12 16h', imageName: '[ Kochab, Dubhe, Spica]', top: '10%', left: '34.5%'},
        { imageDate: '2024-4-12 08h', imageName: '[ Kochab, Dubhe, Spica]', top: '10%', left: '50.5%'},
        { imageDate: '2024-4-12 20h', imageName: '[ Kochab, Dubhe, Spica]', top: '10%', left: '66.5%'},
        { imageDate: '2024-4-12', imageName: '[ Kochab, Dubhe, Spica]', top: '10%', left: '82.5%'},
        
        { imageDate: '2024-4-11', imageName: '[ Kochab, Dubhe, Spica, Arcturus, Dubhe, Polaris]', top: '45%', left: '2.5%'},
        { imageDate: '2024-4-12', imageName: '[ Kochab, Dubhe, Spica]', top: '45%', left: '18.5%'},
        { imageDate: '2024-4-12', imageName: '[ Kochab, Dubhe, Spica]', top: '45%', left: '34.5%'},
        { imageDate: '2024-4-12', imageName: '[ Kochab, Dubhe, Spica]', top: '45%', left: '50.5%'},
        { imageDate: '2024-4-12', imageName: '[ Kochab, Dubhe, Spica]', top: '45%', left: '66.5%'},
        { imageDate: '2024-4-12', imageName: '[ Kochab, Dubhe, Spica]', top: '45%', left: '82.5%'},
        // 添加更多的 ImageFolder 数据项
      ]
    };
  },
  components: {
    ImageFolder,
  },
  created() {
    // this.$bus.$on('AutoHistogramNum', this.setAutoHistogramNum);
  },
  methods: {
    // AutoHistogram() {
    //   this.$bus.$emit('HandleHistogramNum', this.histogram_min, this.histogram_max);
    // },
    PanelClose() {
      this.$bus.$emit('ImageManagerPanelClose');
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
  bottom: 20px;
  left: 40%;

  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;
}

.btn-Delete {
  position:absolute;
  bottom: 20px;
  right: 40%;

  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;
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

.btn-close:active,
.btn-MoveUSB:active,
.btn-Delete:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

.image-folder {
  position: absolute;
  /* top: 10px;
  left: 10px; */
}

</style>

