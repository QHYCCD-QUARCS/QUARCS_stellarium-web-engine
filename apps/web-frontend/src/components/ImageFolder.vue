<template>
  <div :class="{ 'ImageFolder': !folderSelect, 'ImageFolder-select': folderSelect}"
       :style="{ width: width + 'px', height: height + 'px' }"
       @click="toggleFolder">

    <div class="no-select" style="display: flex; justify-content: center; align-items: center;">
      <img src="@/assets/images/svg/ui/folder.svg" height="80px" style="min-height: 80px"></img>
    </div> 

    <span class="image-data" style="position: absolute; top: 10px; left: 8px; color: rgba(255, 255, 255, 0.7); user-select: none;"> {{ imageDate }}</span>

    <span class="image-name" style="position: absolute; top: 35px; left: 8px; color: rgba(255, 255, 255, 0.7); user-select: none;"> {{ imageName }}</span>
     
  </div>
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
    }
  },
  data() {
    return {
      width: 100,
      height: 80,
      folderSelect: false
    };
  },
  methods: {
    toggleFolder() {
      console.log("Clicked");
      this.folderSelect = !this.folderSelect; // Toggle folder state

      // const windowWidth = window.innerWidth;
      // const windowHeight = window.innerHeight;

      // this.$bus.$emit('AppSendMessage', 'Vue_Command', 'windowSize:' + windowWidth + ',' + windowHeight);
    }
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
  /* transition: background-color 0.5s ease; */
}

.ImageFolder-select {
  pointer-events: auto;
  position: fixed;
  background-color: rgba(75, 155, 250, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 5px;
  box-sizing: border-box;
  /* transition: background-color 0.5s ease; */
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
</style>
