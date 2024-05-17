<template>
  <div class="schedule-keyboard" :style="{ bottom: '0px', right: '100px', left: BoardLeft + 'px', height: '50px' }">
    <button v-for="button in modeButtons" :key="button.value" @click="handleButtonClick(button)">
      {{ button.label }}
    </button>
  </div>
</template>

<script>
export default {
  name: 'ScheduleKeyBoard',
  props: {
    initialMode: {
      type: String,
      default: 'Target'
    }
  },
  data() {
    return {
      BoardLeft: window.innerWidth - 100,

      mode: this.initialMode,

      isExpanded: false,

      CFWkeys: [
        { label: '1', value: '1' },
        { label: '2', value: '2' },
        { label: '3', value: '3' },
        { label: '4', value: '4' },
        { label: '5', value: '5' },
        { label: '6', value: '6' },
        { label: '7', value: '7' },
      ],
    };
  },
  computed: {
    modeButtons() {
      switch (this.mode) {
        case 'Target':
          return [
            { label: 'Prefix', value: 'Prefix' },
            { label: '1', value: '1' },
            { label: '2', value: '2' },
            { label: '3', value: '3' },
            { label: '4', value: '4' },
            { label: '5', value: '5' },
            { label: '6', value: '6' },
            { label: '7', value: '7' },
            { label: '8', value: '8' },
            { label: '9', value: '9' },
            { label: '0', value: '0' },
            { label: 'Delete', value: 'Delete' }
          ];
        case 'Time':
          return [
            { label: '1', value: '1' },
            { label: '2', value: '2' },
            { label: '3', value: '3' },
            { label: '4', value: '4' },
            { label: '5', value: '5' },
            { label: '6', value: '6' },
            { label: '7', value: '7' },
            { label: '8', value: '8' },
            { label: '9', value: '9' },
            { label: '0', value: '0' },
            { label: 'Delete', value: 'Delete' }

          ];
        case 'ExpTime':
          return [
            { label: 's/ms', value: 's/ms' },
            { label: '1', value: '1' },
            { label: '2', value: '2' },
            { label: '3', value: '3' },
            { label: '4', value: '4' },
            { label: '5', value: '5' },
            { label: '6', value: '6' },
            { label: '7', value: '7' },
            { label: '8', value: '8' },
            { label: '9', value: '9' },
            { label: '0', value: '0' },
            { label: 'Delete', value: 'Delete' }
          ];
        case 'CFW':
          return this.CFWkeys;
        case 'Repeat':
          return [
            { label: '1', value: '1' },
            { label: '2', value: '2' },
            { label: '3', value: '3' },
            { label: '4', value: '4' },
            { label: '5', value: '5' },
            { label: '6', value: '6' },
            { label: '7', value: '7' },
            { label: '8', value: '8' },
            { label: '9', value: '9' },
            { label: '0', value: '0' },
            { label: 'Delete', value: 'Delete' }
          ];
        case 'Type':
          return [
            { label: 'Light', value: 'Light' },
            { label: 'Dark', value: 'Dark' },
            { label: 'Bias', value: 'Bias' },
            { label: 'Flat', value: 'Flat' },
          ];
        case 'Focus':
          return [
            { label: 'ON', value: 'ON' },
            { label: 'OFF', value: 'OFF' },
          ];
        default:
          return [];
      }
    }
  },
  created() {
    this.$bus.$on('KeyBoardMode',this.changeMode);
    this.$bus.$on('toggleScheduleKeyBoard', this.toggleMore);
    this.$bus.$on('toggleSchedulePanel', this.setWeith);
    this.$bus.$on('initCFWList', this.initCFWList);
  },
  methods: {
    handleButtonClick(button) {
      console.log('Clicked button:', button);
      this.$bus.$emit('EditContent',button.value);
    },
    changeMode(newMode) {
      // console.log('changeMode:', newMode);
      this.$set(this, 'mode', newMode); // 更新 mode 并确保它是响应式的
    },
    toggleMore() {
      this.isExpanded = !this.isExpanded;
      if (this.isExpanded) {
        this.BoardLeft = 0;
      } else {
        this.BoardLeft = window.innerWidth - 100;
      }
    },
    setWeith() {
      this.isExpanded = false;
      this.BoardLeft = window.innerWidth - 100;
    },
    initCFWList(list) {
      console.log('Replace keys');
      this.CFWkeys.splice(0, this.CFWkeys.length);
      const parts = list.split(',');
      for(let i = 0; i < parts.length; i++)
      {
        const newItem = { label: parts[i], value: (i+1) };
        this.CFWkeys.push(newItem);
      }
    },
  }
};
</script>

<style scoped>
.schedule-keyboard {
  display: flex;
  flex-wrap: nowrap; /* Prevent wrapping */
  gap: 5px; /* Adjust the space between buttons */
  padding: 5px;

  pointer-events: auto;
  position: fixed;
  background-color: rgba(128, 128, 128, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 10px;
  box-sizing: border-box;
  transition: left 0.2s ease;
}

.schedule-keyboard button {
  flex: 1; /* Each button takes up equal space */
  height: 40px;
  font-size: 1.2em;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 5px;
  box-sizing: border-box;
}

.schedule-keyboard button:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

</style>
