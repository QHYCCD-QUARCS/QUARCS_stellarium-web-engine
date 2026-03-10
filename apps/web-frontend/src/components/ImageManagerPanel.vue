<template>
  <ImageManagerBrowser :isOpen="isOpen" />
</template>

<script>
import ImageManagerBrowser from './ImageManagerBrowser.vue'

export default {
  name: 'ImageManagerPanel',
  components: {
    ImageManagerBrowser,
  },
  props: {
    isOpen: {
      type: Boolean,
      default: false,
    },
  },
}
</script>
