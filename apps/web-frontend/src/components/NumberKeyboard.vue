<template>
  <transition name="keyboard-fade">
    <div v-if="visible" class="number-keyboard-overlay" @click="handleOverlayClick">
      <div 
        class="number-keyboard" 
        :style="keyboardStyle"
        @click.stop
        @mousedown="handleDragStart"
        @touchstart="handleDragStart"
      >
        <div class="keyboard-header" @click.stop>
          <div class="keyboard-header-left">
            <span class="keyboard-title">{{ title }}</span>
            <div class="keyboard-value-display">
              <span class="value-content">{{ displayValue }}</span>
            </div>
          </div>
          <v-btn icon small @click.stop="handleClose" class="close-btn" @mousedown.stop @touchstart.stop>
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
        <div class="keyboard-body">
          <div class="keyboard-row" v-for="(row, rowIndex) in keyboardLayout" :key="rowIndex">
            <button
              v-for="(key, keyIndex) in row"
              :key="keyIndex"
              :class="['keyboard-key', key.class, { 'key-active': activeKey === `${rowIndex}-${keyIndex}` }]"
              @click="handleKeyPress(key)"
              @touchstart.prevent="handleTouchStart(key, rowIndex, keyIndex, $event)"
              @touchend.prevent="handleTouchEnd(rowIndex, keyIndex)"
              @touchcancel.prevent="handleTouchEnd(rowIndex, keyIndex)"
              @mousedown="handleMouseDown(key, rowIndex, keyIndex)"
              @mouseup="handleMouseUp(rowIndex, keyIndex)"
              @mouseleave="handleMouseUp(rowIndex, keyIndex)"
            >
              <v-icon v-if="key.icon" size="24">{{ key.icon }}</v-icon>
              <span v-else>{{ key.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'NumberKeyboard',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    allowDecimal: {
      type: Boolean,
      default: false
    },
    allowNegative: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: ''
    },
    currentValue: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      activeKey: null, // 当前按下的按钮标识
      // 拖拽相关
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      keyboardX: 0,
      keyboardY: 0,
      keyboardWidth: 0,
      keyboardHeight: 0
    };
  },
  computed: {
    keyboardStyle() {
      const style = {};
      
      // 如果正在拖拽，使用计算的位置
      if (this.isDragging || (this.keyboardX !== 0 || this.keyboardY !== 0)) {
        style.position = 'fixed';
        style.left = `${this.keyboardX}px`;
        style.top = `${this.keyboardY}px`;
        style.transform = 'none';
      }
      
      // 根据屏幕分辨率自动调整大小
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      if (screenWidth <= 360) {
        // 超小屏幕
        style.width = '85vw';
        style.maxWidth = '320px';
      } else if (screenWidth <= 480) {
        // 小屏幕
        style.width = '80vw';
        style.maxWidth = '380px';
      } else if (screenWidth <= 768) {
        // 中等屏幕
        style.width = '75vw';
        style.maxWidth = '500px';
      } else {
        // 大屏幕
        style.width = 'auto';
        style.maxWidth = '600px';
      }
      
      return style;
    },
    displayValue() {
      // 显示当前输入的值，如果为空则显示占位符
      let value = this.currentValue !== '' && this.currentValue !== null && this.currentValue !== undefined 
        ? String(this.currentValue) 
        : '0';
      
      // 如果值太长，从前面省略（保留后面部分）
      // 由于CSS的text-overflow: ellipsis默认从后面省略，我们需要反转字符串
      // 这样省略会发生在前面，然后通过direction: rtl反转显示回来
      if (value.length > 15) {
        // 如果超过15个字符，从前面截取，保留后面部分
        return '...' + value.slice(-12);
      }
      return value;
    },
    keyboardLayout() {
      const layout = [];
      
      // 第一行：负号（如果允许）、数字 1-3
      const row1 = [];
      if (this.allowNegative) {
        row1.push({ label: '−', value: '-', class: 'key-negative' });
      }
      row1.push(
        { label: '1', value: '1', class: 'key-number' },
        { label: '2', value: '2', class: 'key-number' },
        { label: '3', value: '3', class: 'key-number' }
      );
      layout.push(row1);
      
      // 第二行：数字 4-6
      layout.push([
        { label: '4', value: '4', class: 'key-number' },
        { label: '5', value: '5', class: 'key-number' },
        { label: '6', value: '6', class: 'key-number' }
      ]);
      
      // 第三行：数字 7-9
      layout.push([
        { label: '7', value: '7', class: 'key-number' },
        { label: '8', value: '8', class: 'key-number' },
        { label: '9', value: '9', class: 'key-number' }
      ]);
      
      // 第四行：小数点（如果允许）、数字 0、删除
      const row4 = [];
      if (this.allowDecimal) {
        row4.push({ label: '.', value: '.', class: 'key-decimal' });
      }
      row4.push({ label: '0', value: '0', class: 'key-number' });
      row4.push({ 
        label: '', 
        value: 'backspace', 
        class: 'key-backspace',
        icon: 'mdi-backspace-outline'
      });
      layout.push(row4);
      
      // 第五行：确认按钮
      layout.push([
        { 
          label: this.$t('Done') || '完成', 
          value: 'confirm', 
          class: 'key-confirm' 
        }
      ]);
      
      return layout;
    }
  },
  methods: {
    handleTouchStart(key, rowIndex, keyIndex, event) {
      this.activeKey = `${rowIndex}-${keyIndex}`;
      // 触觉反馈（如果设备支持）
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      // 立即触发按键事件
      this.handleKeyPress(key);
    },
    handleTouchEnd(rowIndex, keyIndex) {
      // 延迟移除active状态，让用户看到反馈
      setTimeout(() => {
        if (this.activeKey === `${rowIndex}-${keyIndex}`) {
          this.activeKey = null;
        }
      }, 100);
    },
    handleMouseDown(key, rowIndex, keyIndex) {
      this.activeKey = `${rowIndex}-${keyIndex}`;
    },
    handleMouseUp(rowIndex, keyIndex) {
      setTimeout(() => {
        if (this.activeKey === `${rowIndex}-${keyIndex}`) {
          this.activeKey = null;
        }
      }, 100);
    },
    handleKeyPress(key) {
      if (key.value === 'backspace') {
        this.$emit('backspace');
      } else if (key.value === 'confirm') {
        this.$emit('confirm');
      } else {
        this.$emit('input', key.value);
      }
    },
    handleClose() {
      this.$emit('close');
    },
    handleOverlayClick(event) {
      // 只有点击 overlay 本身（不是键盘）才关闭
      if (event.target === event.currentTarget) {
        this.$emit('close');
      }
    },
    // 拖拽相关方法
    handleDragStart(event) {
      const target = event.target;
      const keyboard = event.currentTarget;
      
      // 如果点击的是按钮，不拖拽
      if (target.closest('.keyboard-key')) {
        return;
      }
      
      // 如果点击的是关闭按钮，不拖拽
      if (target.closest('.close-btn') || target.closest('button')) {
        return;
      }
      
      this.isDragging = true;
      
      // 获取初始位置
      const rect = keyboard.getBoundingClientRect();
      this.keyboardX = rect.left;
      this.keyboardY = rect.top;
      this.keyboardWidth = rect.width;
      this.keyboardHeight = rect.height;
      
      // 获取触摸或鼠标位置
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches ? event.touches[0].clientY : event.clientY;
      
      this.dragStartX = clientX - this.keyboardX;
      this.dragStartY = clientY - this.keyboardY;
      
      // 添加全局事件监听
      if (event.touches) {
        document.addEventListener('touchmove', this.handleDragMove, { passive: false });
        document.addEventListener('touchend', this.handleDragEnd);
        document.addEventListener('touchcancel', this.handleDragEnd);
      } else {
        document.addEventListener('mousemove', this.handleDragMove);
        document.addEventListener('mouseup', this.handleDragEnd);
      }
      
      event.preventDefault();
      event.stopPropagation();
    },
    handleDragMove(event) {
      if (!this.isDragging) return;
      
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches ? event.touches[0].clientY : event.clientY;
      
      // 计算新位置
      let newX = clientX - this.dragStartX;
      let newY = clientY - this.dragStartY;
      
      // 限制在屏幕范围内
      const maxX = window.innerWidth - this.keyboardWidth;
      const maxY = window.innerHeight - this.keyboardHeight;
      
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));
      
      this.keyboardX = newX;
      this.keyboardY = newY;
      
      event.preventDefault();
    },
    handleDragEnd(event) {
      if (!this.isDragging) return;
      
      this.isDragging = false;
      
      // 移除全局事件监听
      document.removeEventListener('touchmove', this.handleDragMove);
      document.removeEventListener('touchend', this.handleDragEnd);
      document.removeEventListener('touchcancel', this.handleDragEnd);
      document.removeEventListener('mousemove', this.handleDragMove);
      document.removeEventListener('mouseup', this.handleDragEnd);
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        // 键盘显示时，重置位置（如果需要）
        // 可以保存用户上次的位置，这里先重置到底部居中
        this.$nextTick(() => {
          const keyboard = this.$el?.querySelector('.number-keyboard');
          if (keyboard && (this.keyboardX === 0 && this.keyboardY === 0)) {
            const rect = keyboard.getBoundingClientRect();
            this.keyboardWidth = rect.width;
            this.keyboardHeight = rect.height;
          }
        });
      } else {
        // 键盘隐藏时，可以选择保持位置或重置
        // 这里选择保持位置，下次打开时在相同位置
      }
    }
  }
};
</script>

<style scoped>
.number-keyboard-overlay {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  top: 0;
  background-color: rgba(0, 0, 0, 0.2);
  z-index: 3000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  /* 移除 backdrop-filter 以保持背景清晰 */
}

.number-keyboard {
  width: 100%;
  max-width: 600px;
  min-width: 250px;
  background-color: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 10px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  cursor: move;
  user-select: none;
  /* 响应式大小 */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
  max-height: 90vh;
}

.number-keyboard.dragging {
  cursor: grabbing;
  transition: none;
}

.keyboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 10px 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 10px;
  cursor: move;
  user-select: none;
  flex-shrink: 0;
}

.keyboard-header-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.keyboard-title {
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.keyboard-value-display {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 4px 8px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.value-content {
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  font-family: 'Courier New', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  display: block;
  text-align: right;
  /* 值过长时，JavaScript已处理从前面省略，这里只需要正常显示 */
}

.close-btn {
  color: rgba(255, 255, 255, 0.7);
}

.keyboard-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.keyboard-row {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.keyboard-key {
  flex: 1;
  height: 50px;
  min-width: 0;
  border: 2px solid transparent;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  font-size: 20px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  touch-action: manipulation;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  position: relative;
  /* 确保内容在伪元素之上 */
  z-index: 2;
}

.keyboard-key:active,
.keyboard-key.key-active {
  background-color: rgba(255, 255, 255, 0.6) !important;
  /* 移除 transform: scale() 避免布局波动 */
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.6), inset 0 2px 6px rgba(0, 0, 0, 0.3);
  transition: all 0.08s ease;
  border: 2px solid rgba(255, 255, 255, 0.7);
}

/* 添加触摸反馈的伪元素 - 使用内部缩放效果，不影响布局 */
.keyboard-key::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  transform: translate(-50%, -50%) scale(1);
  border-radius: 8px;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.5) 0%, transparent 70%);
  opacity: 0;
  transition: all 0.1s ease;
  pointer-events: none;
  z-index: 1;
}

.keyboard-key:active::before,
.keyboard-key.key-active::before {
  opacity: 1;
  transform: translate(-50%, -50%) scale(0.92);
  /* 伪元素缩放不影响布局 */
}

.keyboard-key:focus {
  outline: none;
}

.key-number {
  background-color: rgba(255, 255, 255, 0.15);
}

.key-number.key-active {
  background-color: rgba(255, 255, 255, 0.7) !important;
  border-color: rgba(255, 255, 255, 0.6);
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.5), inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.key-decimal {
  background-color: rgba(255, 255, 255, 0.12);
}

.key-decimal.key-active {
  background-color: rgba(255, 255, 255, 0.5) !important;
  border-color: rgba(255, 255, 255, 0.5);
}

.key-negative {
  background-color: rgba(255, 255, 255, 0.12);
}

.key-negative.key-active {
  background-color: rgba(255, 255, 255, 0.5) !important;
  border-color: rgba(255, 255, 255, 0.5);
}

.key-backspace {
  background-color: rgba(255, 100, 100, 0.3);
}

.key-backspace.key-active {
  background-color: rgba(255, 100, 100, 0.8) !important;
  border-color: rgba(255, 100, 100, 0.7);
  box-shadow: 0 0 12px rgba(255, 100, 100, 0.6), inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.key-confirm {
  background-color: rgba(76, 175, 80, 0.6);
  font-weight: 600;
  height: 55px;
}

.key-confirm.key-active {
  background-color: rgba(76, 175, 80, 1) !important;
  border-color: rgba(76, 175, 80, 0.8);
  box-shadow: 0 0 12px rgba(76, 175, 80, 0.7), inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.keyboard-fade-enter-active,
.keyboard-fade-leave-active {
  transition: opacity 0.08s ease;
}

.keyboard-fade-enter,
.keyboard-fade-leave-to {
  opacity: 0;
}

.keyboard-fade-enter-active .number-keyboard,
.keyboard-fade-leave-active .number-keyboard {
  transition: transform 0.08s ease;
}

.keyboard-fade-enter .number-keyboard,
.keyboard-fade-leave-to .number-keyboard {
  transform: translateY(100%);
}

/* 移动设备优化 - 根据分辨率自适应 */
@media (max-width: 768px) {
  .number-keyboard {
    width: 75vw !important;
    max-width: 500px !important;
    min-width: 280px;
    max-height: 70vh !important;
    padding: 6px;
  }
  
  .keyboard-key {
    height: 48px;
    font-size: 18px;
  }
  
  .key-confirm {
    height: 52px;
  }
  
  .keyboard-header {
    padding: 6px 10px;
    margin-bottom: 6px;
  }
  
  .keyboard-title {
    font-size: 14px;
  }
  
  .keyboard-value-display {
    padding: 2px 6px;
  }
  
  .value-content {
    font-size: 14px;
  }
  
  .keyboard-body {
    gap: 6px;
  }
  
  .keyboard-row {
    gap: 6px;
  }
}

/* 小屏幕设备 */
@media (max-width: 480px) {
  .number-keyboard {
    width: 80vw !important;
    max-width: 380px !important;
    min-width: 250px;
    max-height: 65vh !important;
    padding: 5px;
  }
  
  .keyboard-key {
    height: 42px;
    font-size: 16px;
  }
  
  .key-confirm {
    height: 46px;
    font-size: 14px;
  }
  
  .keyboard-header {
    padding: 5px 8px;
    margin-bottom: 5px;
  }
  
  .keyboard-header-left {
    gap: 4px;
  }
  
  .keyboard-title {
    font-size: 13px;
  }
  
  .keyboard-value-display {
    padding: 2px 4px;
  }
  
  .value-content {
    font-size: 13px;
  }
  
  .keyboard-body {
    gap: 4px;
  }
  
  .keyboard-row {
    gap: 4px;
  }
}

/* 超小屏幕设备 */
@media (max-width: 360px) {
  .number-keyboard {
    width: 85vw !important;
    max-width: 320px !important;
    min-width: 250px;
    max-height: 60vh !important;
    padding: 4px;
  }
  
  .keyboard-key {
    height: 38px;
    font-size: 15px;
  }
  
  .key-confirm {
    height: 42px;
    font-size: 13px;
  }
  
  .keyboard-header {
    padding: 4px 6px;
    margin-bottom: 4px;
  }
  
  .keyboard-title {
    font-size: 12px;
  }
  
  .keyboard-value-display {
    padding: 2px 4px;
  }
  
  .value-content {
    font-size: 12px;
  }
  
  .keyboard-body {
    gap: 3px;
  }
  
  .keyboard-row {
    gap: 3px;
  }
}
</style>

