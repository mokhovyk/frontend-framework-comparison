<script lang="ts">
  import { createMockWebSocket } from 'shared-data';
  import type { DashboardBatch, DashboardBenchmarkHooks, DashboardBenchmarkResult, StatusUpdate } from 'shared-data';
  import ChartWidget from './components/ChartWidget.svelte';
  import KpiCard from './components/KpiCard.svelte';
  import StatusGrid from './components/StatusGrid.svelte';
  import DashboardTable from './components/DashboardTable.svelte';

  const ws = createMockWebSocket(42);

  let running = $state(false);
  let speed = $state(60);

  // Chart data: 4 line charts, 4 bar charts
  let lineChartData = $state<number[][]>([[], [], [], []]);
  let barChartData = $state<number[][]>([[], [], [], []]);

  // KPI data
  let kpiValues = $state<{ value: number; delta: number }[]>([
    { value: 1250, delta: 0 },
    { value: 8734, delta: 0 },
  ]);

  // Table data: 50 rows x 5 columns
  let tableData = $state<number[][]>(
    Array.from({ length: 50 }, (_, i) =>
      Array.from({ length: 5 }, (_, j) => (i + 1) * 100 + j)
    )
  );
  let flashCells = $state<Set<string>>(new Set());

  // Status grid: 100 cells
  let statusCells = $state<StatusUpdate['status'][]>(
    Array.from({ length: 100 }, () => 'idle' as const)
  );

  // Benchmark state
  let benchmarkRunning = $state(false);
  let benchmarkResult = $state<DashboardBenchmarkResult | null>(null);

  function handleBatch(batch: DashboardBatch) {
    // Update line charts
    lineChartData = batch.lineCharts.map((chart) => chart.map((p) => p.value));

    // Update bar charts
    barChartData = batch.barCharts.map((chart) => [...chart]);

    // Update KPIs
    kpiValues = batch.kpis.map((kpi) => ({ value: kpi.value, delta: kpi.delta }));

    // Update table with flash tracking
    const newTable = tableData.map((row) => [...row]);
    const newFlash = new Set<string>();
    for (const update of batch.tableRows) {
      newTable[update.rowIndex] = update.values;
      for (let col = 0; col < update.values.length; col++) {
        newFlash.add(`${update.rowIndex}-${col}`);
      }
    }
    tableData = newTable;
    flashCells = newFlash;

    // Update status grid
    const newStatus = [...statusCells];
    for (const update of batch.statusCells) {
      newStatus[update.cellIndex] = update.status;
    }
    statusCells = newStatus;
  }

  function toggleRunning() {
    if (running) {
      ws.disconnect();
      running = false;
    } else {
      ws.connect(handleBatch);
      ws.setRate(speed);
      running = true;
    }
  }

  function handleSpeedChange(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    speed = val;
    if (running) {
      ws.setRate(val);
    }
  }

  function runBenchmark(): Promise<DashboardBenchmarkResult> {
    return new Promise((resolve) => {
      benchmarkRunning = true;
      benchmarkResult = null;

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

      // Start the dashboard at 60 batches/sec
      if (!running) {
        ws.connect(handleBatch);
        running = true;
      }
      ws.setRate(60);

      rafId = requestAnimationFrame(countFrame);

      setTimeout(() => {
        cancelAnimationFrame(rafId);
        ws.disconnect();
        running = false;
        benchmarkRunning = false;

        frameTimes.sort((a, b) => a - b);
        const avgFrameTime = frameTimes.reduce((s, t) => s + t, 0) / frameTimes.length;
        const p99Index = Math.floor(frameTimes.length * 0.99);
        const p99FrameTime = frameTimes[p99Index] || 0;
        const expectedFrames = Math.round(10 * 60); // 10s at ~60fps
        const droppedFrames = Math.max(0, expectedFrames - frameCount);

        const result: DashboardBenchmarkResult = {
          framesRendered: frameCount,
          droppedFrames,
          avgFrameTime,
          p99FrameTime,
          duration: 10000,
        };

        benchmarkResult = result;
        resolve(result);
      }, 10000);
    });
  }

  const benchmarkHooks: DashboardBenchmarkHooks = {
    start() { if (!running) toggleRunning(); },
    stop() { if (running) toggleRunning(); },
    setSpeed(bps: number) {
      speed = bps;
      if (running) ws.setRate(bps);
    },
    runBenchmark,
  };

  (window as any).__benchmark = benchmarkHooks;

  const lineColors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981'];
  const barColors = ['#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];
</script>

<div class="dashboard">
  <div class="dashboard-controls">
    <button onclick={toggleRunning}>
      {running ? 'Stop' : 'Start'}
    </button>
    <div class="speed-slider">
      <label>Speed: {speed} batch/s</label>
      <input
        type="range"
        min="1"
        max="60"
        value={speed}
        oninput={handleSpeedChange}
      />
    </div>
    <button class="secondary" onclick={runBenchmark} disabled={benchmarkRunning}>
      {benchmarkRunning ? 'Running...' : 'Benchmark (10s)'}
    </button>
    {#if benchmarkResult}
      <span style="font-size: 12px; font-family: var(--font-mono); color: var(--color-text-secondary);">
        Frames: {benchmarkResult.framesRendered} | Dropped: {benchmarkResult.droppedFrames} |
        Avg: {benchmarkResult.avgFrameTime.toFixed(1)}ms | P99: {benchmarkResult.p99FrameTime.toFixed(1)}ms
      </span>
    {/if}
  </div>

  <div class="dashboard-grid">
    {#each [0, 1, 2, 3] as i}
      <ChartWidget
        type="line"
        title="Line Chart {i + 1}"
        data={lineChartData[i]}
        color={lineColors[i]}
      />
    {/each}

    {#each [0, 1, 2, 3] as i}
      <ChartWidget
        type="bar"
        title="Bar Chart {i + 1}"
        data={barChartData[i]}
        color={barColors[i]}
      />
    {/each}

    {#each kpiValues as kpi, i}
      <KpiCard
        title={i === 0 ? 'Revenue' : 'Users'}
        value={kpi.value}
        delta={kpi.delta}
      />
    {/each}

    <DashboardTable data={tableData} {flashCells} />

    <StatusGrid cells={statusCells} />
  </div>
</div>
