<template>
  <transition name="dialog">
    <div class="indiDebugDialog" :style="{ bottom: bottom + 'px', top: top + 'px'}">
      <div class="debug-messages" ref="messageContainer" @scroll="checkIfScrolledToBottom">
        <p v-for="(msg, index) in ShowMessages" :key="index" :style="getMsgStyle(msg.msgtype)">
          {{ msg.msgtext }}
        </p>
      </div>

      <button @click="scrollToBottom" :class="{ 'ToBottom-button-show': !isAtBottom, 'ToBottom-button-hide': isAtBottom }">
        <v-icon style="font-size: 15px;">mdi-chevron-down</v-icon>
      </button>

      <button @click="clearMessages" class="clear-button">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/delete.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button>

      <button @click="saveMessages" class="save-button">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/Share.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button>

      <button @click="toggleErrorDebug" class="ErrorMsg-button">
        <template v-if="isErrorDebugActive">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/ErrorMsg_ON.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </template>
        <template v-else>
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/ErrorMsg_OFF.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </template>
      </button>

      <button @click="toggleServerDebug" class="ServerMsg-button">
        <template v-if="isServerDebugActive">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/ServerMsg_ON.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </template>
        <template v-else>
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/ServerMsg_OFF.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </template>
      </button>

      <button @click="toggleClientDebug" class="ClientMsg-button">
        <template v-if="isClientDebugActive">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/ClientMsg_ON.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </template>
        <template v-else>
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/ClientMsg_OFF.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </template>
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
import Clipboard from 'clipboard';

export default {
  name: 'indiDebugDialog',
  data() {
    return {
      bottom: 50,
      top: 50,
      AllMessages: [],  // 保存消息的数组
      maxMessages: 500,  // 限制保存的消息数量
      isClientDebugActive: true,  // 前端按钮激活状态
      isServerDebugActive: true,  // 后端按钮激活状态
      isErrorDebugActive: false,
      isAtBottom: true,
    };
  },
  created() {
    this.$bus.$on('SendConsoleLog', this.InsertClientDebug);
    this.$bus.$on('SendDebugMessage', this.InsertServerDebug);
  },
  methods: {
    InsertClientDebug(type, message) {
      // 如果超过最大数量，则移除最早的消息
      if (this.AllMessages.length >= this.maxMessages) {
        this.AllMessages.shift();
      }
      // 获取当前时间戳并构造消息对象
      const timestamp = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      const msg = { msgtype: type, msgtext: `[Client] ${timestamp} | ${message}`, msgfrom: 'Client' };
      this.AllMessages.push(msg);
    },

    InsertServerDebug(type, message) {
      // 如果超过最大数量，则移除最早的消息
      if (this.AllMessages.length >= this.maxMessages) {
        this.AllMessages.shift();
      }
      // 获取当前时间戳并构造消息对象
      const timestamp = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      const msg = { msgtype: type, msgtext: `[Server] ${timestamp} | ${message}`, msgfrom: 'Server' };
      this.AllMessages.push(msg);
    },

    toggleClientDebug() {
      this.isClientDebugActive = !this.isClientDebugActive;
    },

    toggleServerDebug() {
      this.isServerDebugActive = !this.isServerDebugActive;
    },

    toggleErrorDebug() {
      this.isErrorDebugActive = !this.isErrorDebugActive;
    },

    clearMessages() {
      this.AllMessages = [];  // 清空消息数组
    },

    saveMessages() {
      const messagesToSave = this.ShowMessages.map(msg => msg.msgtext).join('\n');
      
      // 创建一个按钮并绑定到 Clipboard.js
      const button = document.createElement('button');
      button.setAttribute('data-clipboard-text', messagesToSave);
      document.body.appendChild(button);
      
      // 初始化 Clipboard.js 实例
      const clipboard = new Clipboard(button);
      
      clipboard.on('success', () => {
        // this.$emit('showToast', 'Messages copied to clipboard!');
        console.log('Messages copied to clipboard!');
        this.$bus.$emit('showMsgBox', 'Messages copied to clipboard!', 'success');
        document.body.removeChild(button);
      });
      
      clipboard.on('error', (err) => {
        console.error('Clipboard.js error: ', err);
        // this.$emit('showToast', 'Failed to copy messages!');
        console.log('Failed to copy messages!');
        this.$bus.$emit('showMsgBox', 'Failed to copy messages!', 'error');
        document.body.removeChild(button);
      });
      
      // 触发点击事件
      button.click();
    },

    dialogClose() {
      this.$bus.$emit('toggleINDIDebugDialog');
    },

    getMsgStyle(msgtype) {
      if (msgtype === 'info') {
        return { color: 'white' };
      } else if (msgtype === 'error') {
        return { color: 'rgb(206, 14, 14)' };
      }
      return {};
    },

    // 检查是否滚动到底部
    checkIfScrolledToBottom() {
      const container = this.$refs.messageContainer;
      this.isAtBottom = container.scrollHeight - container.scrollTop === container.clientHeight;
    },

    // 滚动到底部
    scrollToBottom() {
      const container = this.$refs.messageContainer;
      container.scrollTop = container.scrollHeight;
    },

  },
  computed: {
    ShowMessages() {
      this.$nextTick(() => {
        this.checkIfScrolledToBottom();
      });

      return this.AllMessages.filter(msg => {
        // 仅显示符合条件的消息
        if (this.isClientDebugActive && msg.msgfrom === 'Client') {
          if (this.isErrorDebugActive && msg.msgtype != 'error') {
            return false;
          } else {
            return true;
          }
        }
        if (this.isServerDebugActive && msg.msgfrom === 'Server') {
          if (this.isErrorDebugActive && msg.msgtype != 'error') {
            return false;
          } else {
            return true;
          }
        }
        return false;
      });
    },
  },
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
  width: 70%;
  transform: translateX(-50%);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  user-select: none;
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
  left: 55px;
  right: 55px;

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
  line-height: 1;  /* 设置适当的行间距（小于默认值） */
  scroll-behavior: smooth;
  font-family: 'Droid Sans Mono', 'monospace', monospace;
  user-select: none;
}


.clear-button {
  position: fixed;
  top: 66%;
  right: 10px;
  width: 40px;
  height: 40px;
  transform: translateY(-50%);

  background-color: rgba(255, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border-radius: 10px;

  user-select: none;
}

.ToBottom-button-show {
  position:absolute;
  height: 0;
  bottom: 11px;
  left: 56px;
  right: 56px;
  opacity: 0;

  background-color: rgba(125, 125, 125, 0.4);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border-radius: 5px;
  color: white;

  user-select: none;

  animation: expandAnimation 0.3s forwards;
}

@keyframes expandAnimation {
  from {
    height: 0;
    opacity: 0;
  }
  to {
    height: 20px;
    opacity: 1;
  }
}

.ToBottom-button-hide {
  position:absolute;
  height: 20px;
  bottom: 11px;
  left: 56px;
  right: 56px;
  opacity: 1;

  background-color: rgba(125, 125, 125, 0.4);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border-radius: 5px;
  color: rgba(0, 0, 0, 0);

  animation: collapseAnimation 0.3s forwards;
}

@keyframes collapseAnimation {
  from {
    height: 20px;
    opacity: 1;
  }
  to {
    height: 0;
    opacity: 0;
  }
}

.save-button {
  position: fixed;
  top: 33%;
  right: 10px;
  width: 40px;
  height: 40px;
  transform: translateY(-50%);

  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border-radius: 10px;

  user-select: none;
}

.btn-close {
  position: absolute;
  width: 25px;
  height: 25px;
  top: 10px;
  right: 10px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border: none;
  border-radius: 50%;
}

.save-button:active,
.btn-close:active,
.ClientMsg-button:active,
.ServerMsg-button:active,
.ErrorMsg-button:active,
.ToBottom-button-show:active,
.clear-button:active {
  background-color: rgba(255, 255, 255, 0.7);
}

.ErrorMsg-button {
  position: fixed;
  top: 25%;
  left: 10px;
  width: 40px;
  height: 40px;
  transform: translateY(-50%);

  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 10px;

  user-select: none;
}

.ServerMsg-button {
  position: fixed;
  top: 50%;
  left: 10px;
  width: 40px;
  height: 40px;
  transform: translateY(-50%);

  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 10px;

  user-select: none;
}

.ClientMsg-button {
  position: fixed;
  top: 75%;
  left: 10px;
  width: 40px;
  height: 40px;
  transform: translateY(-50%);

  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 10px;

  user-select: none;
}

</style>
