import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { ChartWidgetComponent } from './components/chart-widget/chart-widget.component';
import { KpiCardComponent } from './components/kpi-card/kpi-card.component';
import { StatusGridComponent } from './components/status-grid/status-grid.component';
import { DashboardTableComponent } from './components/dashboard-table/dashboard-table.component';
import {
  createMockWebSocket,
  type MockWebSocket,
  type DashboardBatch,
  type DashboardBenchmarkHooks,
  type DashboardBenchmarkResult,
} from 'shared-data';

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ChartWidgetComponent, KpiCardComponent, StatusGridComponent, DashboardTableComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {
  private ws: MockWebSocket | null = null;

  readonly isRunning = signal(false);
  readonly speed = signal(60);

  // Chart data: 4 line charts, 4 bar charts
  readonly lineChartData = signal<number[][]>([[], [], [], []]);
  readonly barChartData = signal<number[][]>([[], [], [], []]);

  // KPIs
  readonly kpis = signal<{ value: number; delta: number }[]>([
    { value: 0, delta: 0 },
    { value: 0, delta: 0 },
  ]);

  // Table data: 50 rows x 5 columns
  readonly tableData = signal<number[][]>(
    Array.from({ length: 50 }, (_, i) =>
      Array.from({ length: 5 }, (_, j) => (i + 1) * 100 + j)
    )
  );
  readonly flashingCells = signal<Set<string>>(new Set());

  // Status grid: 100 cells
  readonly statusCells = signal<('ok' | 'warning' | 'error' | 'idle')[]>(
    Array.from({ length: 100 }, () => 'idle' as const)
  );

  readonly chartColors = CHART_COLORS;

  // Benchmark
  readonly benchmarkResult = signal<DashboardBenchmarkResult | null>(null);

  ngOnInit(): void {
    this.ws = createMockWebSocket(42);
    this.exposeBenchmarkHooks();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  start(): void {
    if (this.isRunning()) return;
    this.isRunning.set(true);
    this.ws!.connect((batch: DashboardBatch) => this.handleBatch(batch));
    this.ws!.setRate(this.speed());
  }

  stop(): void {
    if (!this.isRunning()) return;
    this.ws!.disconnect();
    this.isRunning.set(false);
  }

  toggleRunning(): void {
    if (this.isRunning()) {
      this.stop();
    } else {
      this.start();
    }
  }

  onSpeedChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.speed.set(value);
    if (this.isRunning()) {
      this.ws!.setRate(value);
    }
  }

  private handleBatch(batch: DashboardBatch): void {
    // Update line charts
    this.lineChartData.set(
      batch.lineCharts.map((chart) => chart.map((dp) => dp.value))
    );

    // Update bar charts
    this.barChartData.set(batch.barCharts);

    // Update KPIs
    this.kpis.set(
      batch.kpis.map((kpi) => ({ value: kpi.value, delta: kpi.delta }))
    );

    // Update table data with flashing
    const newTable = this.tableData().map((row) => [...row]);
    const newFlashing = new Set<string>();
    for (const update of batch.tableRows) {
      newTable[update.rowIndex] = update.values;
      for (let col = 0; col < update.values.length; col++) {
        newFlashing.add(`${update.rowIndex}-${col}`);
      }
    }
    this.tableData.set(newTable);
    this.flashingCells.set(newFlashing);

    // Clear flash after animation
    setTimeout(() => {
      this.flashingCells.set(new Set());
    }, 300);

    // Update status grid
    const cells = [...this.statusCells()];
    for (const update of batch.statusCells) {
      cells[update.cellIndex] = update.status;
    }
    this.statusCells.set(cells);
  }

  async runBenchmark(): Promise<void> {
    this.benchmarkResult.set(null);

    // Stop if already running
    if (this.isRunning()) {
      this.stop();
    }

    const duration = 10000;
    const targetRate = 60;
    let framesRendered = 0;
    let lastFrameTime = performance.now();
    const frameTimes: number[] = [];
    let rafId: number;

    const countFrames = () => {
      const now = performance.now();
      frameTimes.push(now - lastFrameTime);
      lastFrameTime = now;
      framesRendered++;
      rafId = requestAnimationFrame(countFrames);
    };

    rafId = requestAnimationFrame(countFrames);

    // Start the dashboard
    this.ws = createMockWebSocket(42);
    this.ws.connect((batch: DashboardBatch) => this.handleBatch(batch));
    this.ws.setRate(targetRate);
    this.isRunning.set(true);

    const startTime = performance.now();

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        cancelAnimationFrame(rafId);
        this.stop();
        resolve();
      }, duration);
    });

    const elapsed = performance.now() - startTime;
    const expectedFrames = Math.round((elapsed / 1000) * 60);
    const droppedFrames = Math.max(0, expectedFrames - framesRendered);

    frameTimes.sort((a, b) => a - b);
    const avgFrameTime =
      frameTimes.length > 0
        ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
        : 0;
    const p99Index = Math.floor(frameTimes.length * 0.99);
    const p99FrameTime = frameTimes.length > 0 ? frameTimes[p99Index] : 0;

    this.benchmarkResult.set({
      framesRendered,
      droppedFrames,
      avgFrameTime: Math.round(avgFrameTime * 100) / 100,
      p99FrameTime: Math.round(p99FrameTime * 100) / 100,
      duration: Math.round(elapsed),
    });
  }

  private exposeBenchmarkHooks(): void {
    const self = this;
    (window as unknown as { __benchmark: DashboardBenchmarkHooks }).__benchmark = {
      start() {
        self.start();
      },
      stop() {
        self.stop();
      },
      setSpeed(bps: number) {
        self.speed.set(bps);
        if (self.isRunning()) {
          self.ws!.setRate(bps);
        }
      },
      runBenchmark() {
        return self.runBenchmark();
      },
    };
  }
}
