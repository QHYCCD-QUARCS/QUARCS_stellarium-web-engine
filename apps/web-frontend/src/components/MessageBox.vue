<template>
  <transition name="message-slide">
    <div class="message-box" :class="{ 'message-box-expanded': isExpanded }"
      :style="{ transform: `translateY(${5 + Pos * 50}px)`, ...messageStyle }" @click="expandMessage">
      <div class="message-content">{{ message }}</div>
    </div>
  </transition>
</template>

<script>
export default {
  props: ['message', 'type', 'Pos', 'id'],
  data() {
    return {
      isExpanded: false,
      timeout: null
    };
  },
  computed: {
    messageStyle() {
      let backgroundColor = '';
      if (this.type === 'error') {
        backgroundColor = 'rgba(255, 0, 0, 0.25)';
      } else if (this.type === 'warning') {
        backgroundColor = 'rgba(255, 255, 0, 0.25)';
      } else if (this.type === 'success') {
        backgroundColor = 'rgba(0, 255, 0, 0.25)';
      } else if (this.type === 'info') {
        backgroundColor = 'rgba(255, 255, 255, 0.25)';
      }
      return {
        backgroundColor
      };
    }
  },
  methods: {
    expandMessage() {
      this.isExpanded = !this.isExpanded; // 切换展开状态
    }
  },
  beforeDestroy() {
    clearTimeout(this.timeout);  // 组件销毁前清除定时器
  }
};
</script>

<style scoped>
.message-box {
  z-index: 10000;
  pointer-events: auto;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  backdrop-filter: blur(5px);
  color: #000;
  text-align: center;
  padding: 10px;
  cursor: pointer;
  border-radius: 10px;
  width: 40%;
  max-width: 50%;
  margin: 0 auto;
  transition: transform 0.4s ease;
}

.message-box-expanded {
  transform: scale(1.3);
  transition: transform 0.4s ease;
}

/* @keyframes showPanelAnimation {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
} */

@keyframes hidePanelAnimation {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.5);
  }
}

/* .message-slide-enter-active {
  animation: showPanelAnimation 0.4s ease;
} */

.message-slide-leave-active {
  animation: hidePanelAnimation 0.4s ease;
}
</style>
