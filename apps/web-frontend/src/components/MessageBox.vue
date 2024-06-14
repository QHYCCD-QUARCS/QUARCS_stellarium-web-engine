<template>
  <transition ref="messageBox" name="message-slide">
    <div v-if="showMessage" class="message-box" :class="{ 'message-box-expanded': isExpanded }" :style="messageStyle"
      @click="expandMessage" key="message-box">
      <div class="message-content">
        {{ message }}
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  data() {
    return {
      showMessage: false,
      isExpanded: false,
      message: "", // 初始化为空字符串
      messageType: "", // 消息类型属性
    };
  },
  computed: {
    messageStyle() {
      // 根据消息类型设置背景颜色
      let backgroundColor = "";
      if (this.messageType === "error") {
        backgroundColor = "rgba(255, 0, 0, 0.25)";
      } else if (this.messageType === "warning") {
        backgroundColor = "rgba(255, 255, 0, 0.25)";
      } else if (this.messageType === "success") {
        backgroundColor = "rgba(0, 255, 0, 0.25)";
      } else if (this.messageType === "msg") {
        backgroundColor = "rgba(255, 255, 255, 0.25)";
      }
      return {
        backgroundColor,
      };
    },
  },
  methods: {
    expandMessage() {
      if (!this.isExpanded) {
        this.isExpanded = true;
        clearTimeout(this.timeout);
      }
    },
    show(message, type) {
      this.message = message; // 设置消息内容
      this.messageType = type; // 设置消息类型
      this.showMessage = true;
      this.timeout = setTimeout(() => {
        this.hide();
      }, 3000);

      // 监听点击消息框外部的事件
      document.addEventListener("click", this.handleClickOutside);
    },
    hide() {
      this.showMessage = false;
      this.isExpanded = false;
      // 移除事件监听器
      document.removeEventListener("click", this.handleClickOutside);
    },
    handleClickOutside(event) {
      // 点击消息框外部时恢复消息框大小并重新启动自动关闭定时器
      if (this.showMessage && !this.$el.contains(event.target)) {
        this.isExpanded = false;
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
          this.hide();
        }, 3000);
      }
    },
  },
};
</script>

<style scoped>
@keyframes showPanelAnimation {
  from {
    top: -40px;
  }
  to {
    top: 5px;
  }
}

@keyframes hidePanelAnimation {
  from {
    top: 5px;
  }
  to {
    top: -40px;
  }
}

.message-slide-enter-active {
  animation: showPanelAnimation 0.3s forwards;
}

.message-slide-leave-active {
  animation: hidePanelAnimation 0.3s forwards;
}

.message-box {
  z-index: 10000;
  pointer-events: auto;
  position: fixed;
  top: 5px;
  left: 0;
  right: 0;
  backdrop-filter: blur(5px);
  color: #000;
  text-align: center;
  padding: 10px;
  cursor: pointer;
  transition: transform 0.3s ease-in-out;
  border-radius: 10px;
  width: 40%;
  max-width: 50%;
  margin: 0 auto;
}

.message-box-expanded {
  transform: scale(1.3);
}
</style>
