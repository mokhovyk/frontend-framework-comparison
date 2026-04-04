<script setup lang="ts">
interface Props {
  lines?: number;
  showBlock?: boolean;
}

withDefaults(defineProps<Props>(), {
  lines: 5,
  showBlock: true,
});
</script>

<template>
  <div>
    <div v-if="showBlock" class="skeleton skeleton-block"></div>
    <div
      v-for="i in lines"
      :key="i"
      class="skeleton skeleton-line"
      :style="{ width: i === lines ? '60%' : '100%' }"
    ></div>
  </div>
</template>
