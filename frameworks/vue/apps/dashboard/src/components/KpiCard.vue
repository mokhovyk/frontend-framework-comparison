<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title: string;
  value: number;
  delta: number;
}

const props = defineProps<Props>();

const deltaClass = computed(() =>
  props.delta >= 0 ? 'positive' : 'negative'
);

const deltaArrow = computed(() => (props.delta >= 0 ? '▲' : '▼'));

const deltaPercent = computed(() => {
  if (props.value === 0) return '0.0';
  return Math.abs((props.delta / props.value) * 100).toFixed(1);
});
</script>

<template>
  <div>
    <div class="widget-title">{{ title }}</div>
    <div class="kpi-value">{{ value.toLocaleString() }}</div>
    <div class="kpi-delta" :class="deltaClass">
      {{ deltaArrow }} {{ deltaPercent }}%
    </div>
  </div>
</template>
