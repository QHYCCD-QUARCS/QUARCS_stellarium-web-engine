<template>
  <transition name="dialog">
    <div class="indiDebugDialog" :style="{ bottom: bottom + 'px', top: top + 'px'}">
      <div class="debug-messages" ref="messageContainer">
        <p v-for="(msg, index) in messages" :key="index">{{ msg }}</p>
      </div>

      <button @click="clearMessages" class="clear-button">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/delete.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button>

      <button @click="clearMessages" class="save-button">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/download.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button>

      <button @click="dialogClose" class="btn-close">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/OFF.svg" height="12px" style="min-height: 12px; pointer-events: none;"></img>
        </div>
      </button>

    </div>
  </transition>
</template>

<script>
export default {
  name: 'indiDebugDialog',
  data() {
    return {
      bottom: 70,
      top: 50,
      messages: [],  // 保存消息的数组
      maxMessages: 200  // 限制保存的消息数量
    };
  },
  created() {
    this.$bus.$on('INDIServerDebug', this.InsertDebug);
  },
  methods: {
    InsertDebug(message) {
      // 如果超过最大数量，则移除最早的消息
      if (this.messages.length >= this.maxMessages) {
        this.messages.shift();
      }
      this.messages.push(message);

      // 等待DOM更新完成后滚动到底部
      this.$nextTick(() => {
        const container = this.$refs.messageContainer;
        container.scrollTop = container.scrollHeight;
      });
    },
    clearMessages() {
      this.messages = [];  // 清空消息数组
    },

    saveMessages() {
      
    },

    dialogClose() {
      this.$bus.$emit('toggleINDIDebugDialog');
    }
  }
};
</script>

<style scoped>
.indiDebugDialog {
  pointer-events: auto;
  position: fixed;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  overflow: hidden;
  left: 50%;
  width: 60%;
  transform: translateX(-50%);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.dialog-enter-active {
  animation: showPanelAnimation 0.3s forwards;
}
.dialog-leave-active {
  animation: hidePanelAnimation 0.3s forwards;
}

@keyframes showPanelAnimation {
  from {
    bottom: 100%;
    backdrop-filter: blur(0px);
    background-color: rgba(64, 64, 64, 0.0);
  }

  to {
    bottom: 70px;
    backdrop-filter: blur(5px);
    background-color: rgba(64, 64, 64, 0.3);
  }
}

@keyframes hidePanelAnimation {
  from {
    bottom: 70px;
    backdrop-filter: blur(5px);
    background-color: rgba(64, 64, 64, 0.3);
  }

  to {
    bottom: 100%;
    backdrop-filter: blur(0px);
    background-color: rgba(64, 64, 64, 0.0);
  }
}

.debug-messages {
  position:absolute;
  top: 10px;
  bottom: 10px;
  left: 10px;
  right: 45px;

  background-color: rgba(0, 0, 0, 0.3);
  box-sizing: border-box;
  border: 1px solid rgba(0, 0, 0, 0.5);
  border-radius: 5px;

  pointer-events: auto;
  color: white;
  overflow: hidden;
  overflow-y: auto;
  padding: 5px;  /* 去掉内边距 */
  margin: 0;   /* 去掉外边距 */
  line-height: 0.6;  /* 设置适当的行间距（小于默认值） */
}


.clear-button {
  position:absolute;
  bottom: 10px;
  right: 5px;
  width: 35px;
  height: 35px;

  background-color: rgba(255, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  /* border: 1px solid rgba(255, 255, 255, 0.8); */
  border-radius: 10px;
}

.save-button {
  position:absolute;
  bottom: 50px;
  right: 5px;
  width: 35px;
  height: 35px;

  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  /* border: 1px solid rgba(255, 255, 255, 0.8); */
  border-radius: 10px;
}

.btn-close {
  position: absolute;
  width: 25px;
  height: 25px;
  top: 5px;
  right: 5px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border: none;
  border-radius: 50%;
}

.save-button:active,
.btn-close:active,
.clear-button:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

</style>
