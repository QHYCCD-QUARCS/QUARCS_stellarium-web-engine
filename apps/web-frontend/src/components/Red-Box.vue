<template>
  <div class="floating-box" :style="{ top: top + 'px', left: left + 'px', width: width + 'px', height: height + 'px' }">
    <div class="drag-handle" v-if="isDragging" @mousedown="startDrag" @touchstart="startDragTouch">
    
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      isDragging: true,
      top: 0, // 初始位置的垂直坐标
      left: 0, // 初始位置的水平坐标
      startX: 0,
      startY: 0,
      width: 100, // 初始宽度
      height: 100, // 初始高度
    };
  },
  mounted() {
    // 在组件挂载时，将小红框置于界面中央
    this.centerRedBox();
  },
  methods: {
    startDrag(event) {
      event.preventDefault(); // 禁止默认的拖动行为
      this.isDragging = true;
      this.startX = event.clientX - this.left;
      this.startY = event.clientY - this.top;

      document.addEventListener("mousemove", this.onMouseMove);
      document.addEventListener("mouseup", this.onMouseUp);
    },
    startDragTouch(event) {
      event.preventDefault(); // 禁止默认的拖动行为
      this.isDragging = true;
      this.startX = event.touches[0].clientX - this.left;
      this.startY = event.touches[0].clientY - this.top;

      document.addEventListener("touchmove", this.onTouchMove);
      document.addEventListener("touchend", this.onTouchEnd);
    },
    onMouseMove(event) {
      if (this.isDragging) {
        this.top = Math.max(0, Math.min(window.innerHeight - this.height, event.clientY - this.startY));
        this.left = Math.max(0, Math.min(window.innerWidth - this.width, event.clientX - this.startX));
      }
    },
    onTouchMove(event) {
      if (this.isDragging) {
        this.top = Math.max(0, Math.min(window.innerHeight - this.height, event.touches[0].clientY - this.startY));
        this.left = Math.max(0, Math.min(window.innerWidth - this.width, event.touches[0].clientX - this.startX));
      }
    },
    onMouseUp() {
      //this.isDragging = false;
      document.removeEventListener("mousemove", this.onMouseMove);
      document.removeEventListener("mouseup", this.onMouseUp);
    },
    onTouchEnd() {
      //this.isDragging = false;
      document.removeEventListener("touchmove", this.onTouchMove);
      document.removeEventListener("touchend", this.onTouchEnd);
    },
    centerRedBox() {
      // 将小红框置于界面中央
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      this.left = (windowWidth - 100) / 2; // 100是小红框的宽度
      this.top = (windowHeight - 100) / 2; // 100是小红框的高度
    },
    
  },
};
</script>

<style scoped>
.floating-box {
  position: fixed; /* 将position设置为fixed */
  background-color: rgba(0, 0, 0, 0.1);
  border: 1px solid #ccc;
  backdrop-filter: blur(5px); /* 添加毛玻璃效果 */
  border-radius: 10px; /* 添加圆角效果，根据需要调整圆角半径 */
  box-sizing: border-box; /* 设置box-sizing为border-box */
}

.drag-handle {
  cursor: grab;
  width: 100%;
  height: 100%;
  background-color: transparent; /* 使拖动模式下的样式透明 */
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.center-text {
  position: absolute;
  transform: translate(-50%, -50%);
}

.content {
  margin-top: 20px;
}

button {
  margin-right: 10px;
}
</style>

