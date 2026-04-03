<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { createMockWebSocket } from 'shared-data/mock-ws';
import { renderChart } from 'shared-data/canvas-charts';
import type { DashboardBatch, KpiUpdate, StatusUpdate, ChartConfig } from 'shared-data';
import LoadingSkeleton from '../components/LoadingSkeleton.vue';

const loading = ref(true);
const ws = createMockWebSocket();
const isRunning = ref(false);

const lineChartData = reactive<number[][]>(
  Array.from({ length: 2 }, () => Array.from({ length: 100 }, () => 50))
);
const barChartData = reactive<number[][]>(
  Array.from({ length: 2 }, () => Array.from({ length: 8 }, () => 50))
);
const kpis = reactive<KpiUpdate[]>([
  { index: 0, value: 1250, delta: 0 },
  { index: 1, value: 8734, delta: 0 },
]);

const canvasRefs = ref<(HTMLCanvasElement | null)[]>([]);

function setCanvasRef(el: unknown, index: number) {
  canvasRefs.value[index] = el as HTMLCanvasElement | null;
}

function drawCharts() {
  const configs: { index: number; type: 'line' | 'bar'; data: number[]; color: string }[] = [
    { index: 0, type: 'line', data: lineChartData[0], color: '#3b82f6' },
    { index: 1, type: 'line', data: lineChartData[1], color: '#22c55e' },
    { index: 2, type: 'bar', data: barChartData[0], color: '#f59e0b' },
    { index: 3, type: 'bar', data: barChartData[1], color: '#ef4444' },
  ];

  for (const cfg of configs) {
    const canvas = canvasRefs.value[cfg.index];
    if (!canvas) continue;
    const rect = canvas.parentElement?.getBoundingClientRect();
    const chartConfig: ChartConfig = {
      type: cfg.type,
      width: rect?.width ?? 300,
      height: rect?.height ? rect.height - 30 : 150,
      data: cfg.data,
      color: cfg.color,
      backgroundColor: '#1e293b',
    };
    renderChart(canvas, chartConfig);
  }
}

function handleBatch(batch: DashboardBatch) {
  for (let i = 0; i < 2; i++) {
    if (batch.lineCharts[i]) {
      lineChartData[i] = batch.lineCharts[i].map((p) => p.value);
    }
    if (batch.barCharts[i]) {
      barChartData[i] = batch.barCharts[i];
    }
  }
  for (const kpi of batch.kpis) {
    if (kpi.index < kpis.length) {
      kpis[kpi.index] = kpi;
    }
  }
  drawCharts();
}

function toggleRunning() {
  if (isRunning.value) {
    ws.disconnect();
    isRunning.value = false;
  } else {
    ws.connect(handleBatch);
    ws.setRate(30);
    isRunning.value = true;
  }
}

onMounted(() => {
  // Simulate data fetch delay
  setTimeout(() => {
    loading.value = false;
    // Draw initial charts after DOM updates
    setTimeout(drawCharts, 50);
  }, 50);
});

onUnmounted(() => {
  ws.disconnect();
});
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Dashboard</h1>
      <p>Simplified real-time dashboard (4 widgets)</p>
    </div>

    <LoadingSkeleton v-if="loading" :lines="4" />

    <template v-else>
      <div style="margin-bottom: 12px">
        <button @click="toggleRunning">
          {{ isRunning ? 'Stop' : 'Start' }} Updates
        </button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; height: 400px">
        <div
          v-for="(cfg, i) in [
            { title: 'Line Chart 1' },
            { title: 'Line Chart 2' },
            { title: 'Bar Chart 1' },
            { title: 'Bar Chart 2' },
          ]"
          :key="i"
          style="
            background: var(--color-bg-secondary);
            border: 1px solid var(--color-border);
            border-radius: var(--radius);
            padding: 12px;
            display: flex;
            flex-direction: column;
          "
        >
          <div style="font-size: 12px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 8px">
            {{ cfg.title }}
          </div>
          <canvas :ref="(el) => setCanvasRef(el, i)" style="width: 100%; flex: 1"></canvas>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 12px">
        <div
          v-for="(kpi, i) in kpis"
          :key="i"
          style="
            background: var(--color-bg-secondary);
            border: 1px solid var(--color-border);
            border-radius: var(--radius);
            padding: 16px;
            text-align: center;
          "
        >
          <div style="font-size: 12px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 8px">
            {{ i === 0 ? 'Revenue' : 'Users' }}
          </div>
          <div style="font-size: 2rem; font-weight: 700; font-family: var(--font-mono)">
            {{ kpi.value.toLocaleString() }}
          </div>
          <div
            style="margin-top: 4px"
            :style="{ color: kpi.delta >= 0 ? 'var(--color-success)' : 'var(--color-error)' }"
          >
            {{ kpi.delta >= 0 ? '▲' : '▼' }}
            {{ Math.abs(kpi.value > 0 ? (kpi.delta / kpi.value) * 100 : 0).toFixed(1) }}%
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
