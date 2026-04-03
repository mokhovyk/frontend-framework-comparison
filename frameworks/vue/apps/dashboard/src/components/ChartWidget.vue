<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { renderChart } from 'shared-data/canvas-charts';
import type { ChartConfig } from 'shared-data';

interface Props {
  title: string;
  type: 'line' | 'bar';
  data: number[];
  color?: string;
}

const props = withDefaults(defineProps<Props>(), {
  color: '#3b82f6',
});

const canvasRef = ref<HTMLCanvasElement | null>(null);

function draw() {
  if (!canvasRef.value) return;
  const rect = canvasRef.value.parentElement?.getBoundingClientRect();
  const config: ChartConfig = {
    type: props.type,
    width: rect?.width ?? 300,
    height: rect?.height ? rect.height - 30 : 150,
    data: props.data,
    color: props.color,
    backgroundColor: '#1e293b',
  };
  renderChart(canvasRef.value, config);
}

onMounted(draw);
watch(() => props.data, draw, { deep: true });
watch(() => props.type, draw);
</script>

<template>
  <div class="widget">
    <div class="widget-title">{{ title }}</div>
    <canvas ref="canvasRef"></canvas>
  </div>
</template>
