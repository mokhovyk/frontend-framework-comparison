import type { DashboardBatch, DataPoint, KpiUpdate, TableRowUpdate, StatusUpdate } from '../types.js';

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STATUS_VALUES: StatusUpdate['status'][] = ['ok', 'warning', 'error', 'idle'];

export interface DashboardStream {
  start: (onBatch: (batch: DashboardBatch) => void) => void;
  stop: () => void;
  setRate: (batchesPerSecond: number) => void;
}

/**
 * Creates a simulated WebSocket-like data stream for the dashboard.
 * Emits batches of data updates at a configurable rate.
 */
export function createDashboardStream(seed: number = 42): DashboardStream {
  const rand = mulberry32(seed);
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let rate = 60;
  let callback: ((batch: DashboardBatch) => void) | null = null;
  let tick = 0;

  // Line chart state: 4 charts, each with a rolling window of 100 points
  const lineChartState: number[][] = Array.from({ length: 4 }, () =>
    Array.from({ length: 100 }, () => rand() * 100)
  );

  // Bar chart state: 4 charts, each with 8 bars
  const barChartState: number[][] = Array.from({ length: 4 }, () =>
    Array.from({ length: 8 }, () => rand() * 100)
  );

  // KPI state
  const kpiState = [
    { value: 1250, delta: 0 },
    { value: 8734, delta: 0 },
  ];

  function generateBatch(): DashboardBatch {
    tick++;

    // Update line charts: shift left, add new point
    const lineCharts: DataPoint[][] = lineChartState.map((chart) => {
      chart.shift();
      const newValue = chart[chart.length - 1] + (rand() - 0.5) * 20;
      chart.push(Math.max(0, Math.min(100, newValue)));
      return chart.map((value, i) => ({ timestamp: tick * 1000 + i, value }));
    });

    // Update bar charts: randomly adjust bars
    const barCharts: number[][] = barChartState.map((chart) => {
      const idx = Math.floor(rand() * chart.length);
      chart[idx] = Math.max(0, Math.min(100, chart[idx] + (rand() - 0.5) * 30));
      return [...chart];
    });

    // Update KPIs
    const kpis: KpiUpdate[] = kpiState.map((kpi, index) => {
      const change = Math.floor((rand() - 0.5) * 100);
      kpi.delta = change;
      kpi.value += change;
      return { index, value: kpi.value, delta: change };
    });

    // Update 5 random table rows (50 rows, 5 columns)
    const tableRows: TableRowUpdate[] = [];
    for (let i = 0; i < 5; i++) {
      tableRows.push({
        rowIndex: Math.floor(rand() * 50),
        values: Array.from({ length: 5 }, () => Math.floor(rand() * 10000)),
      });
    }

    // Update 10 random status cells (100 total)
    const statusCells: StatusUpdate[] = [];
    for (let i = 0; i < 10; i++) {
      statusCells.push({
        cellIndex: Math.floor(rand() * 100),
        status: STATUS_VALUES[Math.floor(rand() * STATUS_VALUES.length)],
      });
    }

    return { lineCharts, barCharts, kpis, tableRows, statusCells };
  }

  function startInterval() {
    if (intervalId !== null) clearInterval(intervalId);
    if (callback && rate > 0) {
      intervalId = setInterval(() => {
        callback!(generateBatch());
      }, 1000 / rate);
    }
  }

  return {
    start(onBatch) {
      callback = onBatch;
      startInterval();
    },
    stop() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      callback = null;
    },
    setRate(batchesPerSecond) {
      rate = batchesPerSecond;
      if (callback) startInterval();
    },
  };
}
