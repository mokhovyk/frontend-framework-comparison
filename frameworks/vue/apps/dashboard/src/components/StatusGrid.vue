<script setup lang="ts">
import type { StatusUpdate } from 'shared-data';

interface Props {
  cells: StatusUpdate['status'][];
}

defineProps<Props>();
</script>

<template>
  <div class="status-grid">
    <div
      v-for="(status, index) in cells"
      :key="index"
      class="status-cell"
      :class="status"
    ></div>
  </div>
</template>
