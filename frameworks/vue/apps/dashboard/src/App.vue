<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { createMockWebSocket } from 'shared-data/mock-ws';
import type {
  DashboardBatch,
  DashboardBenchmarkHooks,
  DashboardBenchmarkResult,
  KpiUpdate,
  StatusUpdate,
} from 'shared-data';
import ChartWidget from './components/ChartWidget.vue';
import KpiCard from './components/KpiCard.vue';
import StatusGrid from './components/StatusGrid.vue';
import DashboardTable from './components/DashboardTable.vue';

const ws = createMockWebSocket();
const isRunning = ref(false);
const speed = ref(60);
const benchmarkMode = ref(false);
const benchmarkResult = ref<DashboardBenchmarkResult | null>(null);

// Chart data: 4 line charts, 4 bar charts
const lineChartData = reactive<number[][]>(
  Array.from({ length: 4 }, () => Array.from({ length: 100 }, () => 50))
);
const barChartData = reactive<number[][]>(
  Array.from({ length: 4 }, () => Array.from({ length: 8 }, () => 50))
);

// KPI state
const kpis = reactive<KpiUpdate[]>([
  { index: 0, value: 1250, delta: 0 },
  { index: 1, value: 8734, delta: 0 },
]);

// Table state: 50 rows x 5 columns
const tableData = reactive<number[][]>(
  Array.from({ length: 50 }, (_, i) =>
    Array.from({ length: 5 }, (_, j) => (i + 1) * 100 + j)
  )
);
const flashingCells = ref<Set<string>>(new Set());

// Status grid: 100 cells
const statusCells = reactive<StatusUpdate['status'][]>(
  Array.from({ length: 100 }, () => 'idle' as StatusUpdate['status'])
);

function handleBatch(batch: DashboardBatch) {
  // Update line charts
  for (let i = 0; i < 4; i++) {
    const points = batch.lineCharts[i];
    if (points) {
      lineChartData[i] = points.map((p) => p.value);
    }
  }

  // Update bar charts
  for (let i = 0; i < 4; i++) {
    if (batch.barCharts[i]) {
      barChartData[i] = batch.barCharts[i];
    }
  }

  // Update KPIs
  for (const kpi of batch.kpis) {
    if (kpi.index < kpis.length) {
      kpis[kpi.index] = kpi;
    }
  }

  // Update table rows with flash
  const newFlashing = new Set<string>();
  for (const update of batch.tableRows) {
    if (update.rowIndex < tableData.length) {
      tableData[update.rowIndex] = update.values;
      for (let c = 0; c < update.values.length; c++) {
        newFlashing.add(`${update.rowIndex}-${c}`);
      }
    }
  }
  flashingCells.value = newFlashing;
  setTimeout(() => {
    flashingCells.value = new Set();
  }, 300);

  // Update status cells
  for (const update of batch.statusCells) {
    if (update.cellIndex < statusCells.length) {
      statusCells[update.cellIndex] = update.status;
    }
  }
}

function start() {
  ws.connect(handleBatch);
  ws.setRate(speed.value);
  isRunning.value = true;
}

function stop() {
  ws.disconnect();
  isRunning.value = false;
}

function toggleRunning() {
  if (isRunning.value) {
    stop();
  } else {
    start();
  }
}

function onSpeedChange(event: Event) {
  const val = Number((event.target as HTMLInputElement).value);
  speed.value = val;
  if (isRunning.value) {
    ws.setRate(val);
  }
}

function runBenchmark(): Promise<DashboardBenchmarkResult> {
  return new Promise((resolve) => {
    benchmarkMode.value = true;
    benchmarkResult.value = null;

    const frameTimes: number[] = [];
    let frameCount = 0;
    let lastFrameTime = performance.now();
    let rafId: number;

    function countFrame() {
      const now = performance.now();
      frameTimes.push(now - lastFrameTime);
      lastFrameTime = now;
      frameCount++;
      rafId = requestAnimationFrame(countFrame);
    }

    ws.connect(handleBatch);
    ws.setRate(60);
    isRunning.value = true;
    rafId = requestAnimationFrame(countFrame);

    setTimeout(() => {
      cancelAnimationFrame(rafId);
      ws.disconnect();
      isRunning.value = false;
      benchmarkMode.value = false;

      const sorted = [...frameTimes].sort((a, b) => a - b);
      const avg = frameTimes.reduce((s, t) => s + t, 0) / frameTimes.length;
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
      const expectedFrames = 10 * 60;
      const dropped = Math.max(0, expectedFrames - frameCount);

      const result: DashboardBenchmarkResult = {
        framesRendered: frameCount,
        droppedFrames: dropped,
        avgFrameTime: Math.round(avg * 100) / 100,
        p99FrameTime: Math.round(p99 * 100) / 100,
        duration: 10000,
      };

      benchmarkResult.value = result;
      resolve(result);
    }, 10000);
  });
}

onMounted(() => {
  const hooks: DashboardBenchmarkHooks = {
    start,
    stop,
    setSpeed(batchesPerSecond: number) {
      speed.value = batchesPerSecond;
      if (isRunning.value) {
        ws.setRate(batchesPerSecond);
      }
    },
    runBenchmark,
  };
  (window as unknown as Record<string, unknown>).__benchmark = hooks;
});

onUnmounted(() => {
  ws.disconnect();
});

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];
</script>

<template>
  <div class="dashboard">
    <h1 style="margin-bottom: 8px">Vue - Real-Time Dashboard</h1>
    <div class="dashboard-controls">
      <button @click="toggleRunning">
        {{ isRunning ? 'Stop' : 'Start' }}
      </button>
      <div class="speed-slider">
        <label>Speed: {{ speed }} batches/sec</label>
        <input
          type="range"
          min="1"
          max="60"
          :value="speed"
          @input="onSpeedChange"
        />
      </div>
      <button class="secondary" @click="runBenchmark">
        Benchmark (10s)
      </button>
      <span
        v-if="benchmarkResult"
        style="font-size: 12px; font-family: var(--font-mono); color: var(--color-text-secondary)"
      >
        Frames: {{ benchmarkResult.framesRendered }} |
        Dropped: {{ benchmarkResult.droppedFrames }} |
        Avg: {{ benchmarkResult.avgFrameTime }}ms |
        P99: {{ benchmarkResult.p99FrameTime }}ms
      </span>
    </div>

    <div class="dashboard-grid">
      <!-- Row 1: 4 line charts -->
      <ChartWidget
        v-for="i in 4"
        :key="'line-' + i"
        :title="'Line Chart ' + i"
        type="line"
        :data="lineChartData[i - 1]"
        :color="CHART_COLORS[i - 1]"
      />
      <!-- Row 2: 4 bar charts -->
      <ChartWidget
        v-for="i in 4"
        :key="'bar-' + i"
        :title="'Bar Chart ' + i"
        type="bar"
        :data="barChartData[i - 1]"
        :color="CHART_COLORS[i - 1]"
      />
      <!-- Row 3: 2 KPIs, data table, status grid -->
      <div class="widget kpi-card">
        <KpiCard title="Revenue" :value="kpis[0].value" :delta="kpis[0].delta" />
      </div>
      <div class="widget kpi-card">
        <KpiCard title="Users" :value="kpis[1].value" :delta="kpis[1].delta" />
      </div>
      <div class="widget">
        <div class="widget-title">Live Data</div>
        <DashboardTable :data="tableData" :flashing-cells="flashingCells" />
      </div>
      <div class="widget">
        <div class="widget-title">Status Grid</div>
        <StatusGrid :cells="statusCells" />
      </div>
    </div>
  </div>
</template>
