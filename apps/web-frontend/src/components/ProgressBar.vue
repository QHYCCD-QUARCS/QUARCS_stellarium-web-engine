<template>
  <div class="progress-container" v-if="progress > 0 && progress < 100 && isShow">
    <div class="progress-description" v-if="showDescription">{{ description }}</div>
    <div class="progress-bar">
      <div class="progress-fill" :style="{width: `${progress}%`}"></div>
    </div>
    <div class="progress-text">{{ progress }}%</div>
  </div>
</template>

<script>
export default {
  name: 'ProgressBar',
  props: {
    progress: {
      type: Number,
      default: 0
    },
    description: {
      type: String,
      default: '加载中...'
    },
    showDescription: {
      type: Boolean,
      default: true
    },
    isShow: {
      type: Boolean,
      default: true
    }
  }
}
</script>

<style scoped>
.progress-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 999;
  background: rgba(0, 0, 0, 0.7);
  padding: 20px;
  border-radius: 8px;
  width: 300px;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background: #333;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4CAF50;
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  color: white;
  margin-top: 10px;
}

.progress-description {
  text-align: center;
  color: white;
  margin-bottom: 10px;
}
</style>
