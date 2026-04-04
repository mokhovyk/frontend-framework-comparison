<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  state: Record<string, unknown>;
}

const props = defineProps<Props>();

const formattedState = computed(() => JSON.stringify(props.state, null, 2));
</script>

<template>
  <div class="debug-panel">
    <h3>Form State (Debug)</h3>
    <pre>{{ formattedState }}</pre>
  </div>
</template>
