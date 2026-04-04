<script lang="ts">
  import { onMount } from 'svelte';
  import { createMockApi, createMockWebSocket, renderChart } from 'shared-data';
  import type { DashboardBatch, ChartConfig } from 'shared-data';
  import LoadingSkeleton from '../components/LoadingSkeleton.svelte';

  const api = createMockApi();
  const ws = createMockWebSocket(42);

  let loading = $state(true);
  let running = $state(false);

  // Simplified dashboard: 4 widgets (2 line charts, 1 KPI, 1 status)
  let lineChartData = $state<number[][]>([[], []]);
  let kpiValue = $state(0);
  let kpiDelta = $state(0);
  let statusCells = $state<string[]>(Array.from({ length: 25 }, () => 'idle'));

  let canvas1: HTMLCanvasElement | undefined = $state();
  let canvas2: HTMLCanvasElement | undefined = $state();

  function handleBatch(batch: DashboardBatch) {
    lineChartData = [
      batch.lineCharts[0]?.map((p) => p.value) ?? [],
      batch.lineCharts[1]?.map((p) => p.value) ?? [],
    ];

    if (batch.kpis[0]) {
      kpiValue = batch.kpis[0].value;
      kpiDelta = batch.kpis[0].delta;
    }

    const newStatus = [...statusCells];
    for (const update of batch.statusCells.slice(0, 5)) {
      if (update.cellIndex < 25) {
        newStatus[update.cellIndex] = update.status;
      }
    }
    statusCells = newStatus;
  }

  $effect(() => {
    if (!canvas1 || lineChartData[0].length === 0) return;
    renderChart(canvas1, {
      type: 'line',
      width: canvas1.clientWidth || 300,
      height: canvas1.clientHeight || 180,
      data: lineChartData[0],
      color: '#3b82f6',
    });
  });

  $effect(() => {
    if (!canvas2 || lineChartData[1].length === 0) return;
    renderChart(canvas2, {
      type: 'bar',
      width: canvas2.clientWidth || 300,
      height: canvas2.clientHeight || 180,
      data: lineChartData[1],
      color: '#f59e0b',
    });
  });

  function toggleRunning() {
    if (running) {
      ws.disconnect();
      running = false;
    } else {
      ws.connect(handleBatch);
      ws.setRate(30);
      running = true;
    }
  }

  onMount(async () => {
    await api.fetchDashboardData();
    loading = false;
    return () => {
      ws.disconnect();
    };
  });
</script>

<div class="page-header">
  <h1>Dashboard</h1>
  <p>Simplified real-time dashboard with 4 widgets.</p>
</div>

{#if loading}
  <LoadingSkeleton lines={6} showBlock />
{:else}
  <div style="margin-bottom: 12px;">
    <button onclick={toggleRunning}>
      {running ? 'Stop' : 'Start'}
    </button>
  </div>

  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
    <div style="background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 12px;">
      <div style="font-size: 12px; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 8px;">Line Chart</div>
      <canvas bind:this={canvas1} style="width: 100%; height: 180px;"></canvas>
    </div>

    <div style="background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 12px;">
      <div style="font-size: 12px; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 8px;">Bar Chart</div>
      <canvas bind:this={canvas2} style="width: 100%; height: 180px;"></canvas>
    </div>

    <div style="background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
      <div style="font-size: 12px; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 8px;">KPI</div>
      <div style="font-size: 2rem; font-weight: 700; font-family: var(--font-mono);">{kpiValue.toLocaleString()}</div>
      <div style="font-size: 0.9rem; color: {kpiDelta >= 0 ? 'var(--color-success)' : 'var(--color-error)'};">
        {kpiDelta >= 0 ? '\u2191' : '\u2193'} {Math.abs(kpiDelta)}
      </div>
    </div>

    <div style="background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 12px;">
      <div style="font-size: 12px; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 8px;">Status</div>
      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 3px;">
        {#each statusCells as status, i (i)}
          <div
            style="aspect-ratio: 1; border-radius: 2px; background: {
              status === 'ok' ? 'var(--color-success)' :
              status === 'warning' ? 'var(--color-warning)' :
              status === 'error' ? 'var(--color-error)' :
              'var(--color-bg-tertiary)'
            };"
          ></div>
        {/each}
      </div>
    </div>
  </div>
{/if}
