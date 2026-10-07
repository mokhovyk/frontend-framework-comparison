import { Component, signal, OnInit, OnDestroy, ElementRef, viewChild, AfterViewInit } from '@angular/core';
import { LoadingSkeletonComponent } from '../components/loading-skeleton/loading-skeleton.component';
import {
  createMockApi,
  createMockWebSocket,
  renderChart,
  type MockWebSocket,
  type DashboardBatch,
  type ChartConfig,
} from 'shared-data';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [LoadingSkeletonComponent],
  template: `
    <div class="page-header">
      <h1>Dashboard</h1>
      <p>Simplified real-time dashboard with 4 widgets</p>
    </div>

    @if (loading()) {
      <app-loading-skeleton></app-loading-skeleton>
    } @else {
      <div class="dashboard-controls">
        <button (click)="toggleRunning()">
          {{ isRunning() ? 'Stop' : 'Start' }}
        </button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
        <div class="widget">
          <div class="widget-title">Line Chart</div>
          <canvas #chart1></canvas>
        </div>
        <div class="widget">
          <div class="widget-title">Bar Chart</div>
          <canvas #chart2></canvas>
        </div>
        <div class="widget kpi-card">
          <div class="widget-title">Revenue</div>
          <div class="kpi-value">{{ kpi1Value().toLocaleString() }}</div>
          <div class="kpi-delta" [class.positive]="kpi1Delta() >= 0" [class.negative]="kpi1Delta() < 0">
            {{ kpi1Delta() >= 0 ? '\u2191' : '\u2193' }} {{ Math.abs(kpi1Delta()) }}
          </div>
        </div>
        <div class="widget kpi-card">
          <div class="widget-title">Users</div>
          <div class="kpi-value">{{ kpi2Value().toLocaleString() }}</div>
          <div class="kpi-delta" [class.positive]="kpi2Delta() >= 0" [class.negative]="kpi2Delta() < 0">
            {{ kpi2Delta() >= 0 ? '\u2191' : '\u2193' }} {{ Math.abs(kpi2Delta()) }}
          </div>
        </div>
      </div>
    }
  `,
})
export class DashboardPageComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly Math = Math;
  private ws: MockWebSocket | null = null;
  readonly loading = signal(true);
  readonly isRunning = signal(false);
  readonly kpi1Value = signal(0);
  readonly kpi1Delta = signal(0);
  readonly kpi2Value = signal(0);
  readonly kpi2Delta = signal(0);

  private lineData: number[] = [];
  private barData: number[] = [];

  readonly chart1Ref = viewChild<ElementRef<HTMLCanvasElement>>('chart1');
  readonly chart2Ref = viewChild<ElementRef<HTMLCanvasElement>>('chart2');

  private viewReady = false;

  ngOnInit(): void {
    const api = createMockApi(50);
    api.fetchDashboardData().then((res) => {
      this.kpi1Value.set(res.data.kpis[0]);
      this.kpi2Value.set(res.data.kpis[1]);
      this.loading.set(false);
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
  }

  ngOnDestroy(): void {
    this.stop();
  }

  toggleRunning(): void {
    if (this.isRunning()) {
      this.stop();
    } else {
      this.start();
    }
  }

  start(): void {
    if (this.isRunning()) return;
    this.ws = createMockWebSocket(42);
    this.isRunning.set(true);
    this.ws.connect((batch: DashboardBatch) => {
      if (batch.lineCharts[0]) {
        this.lineData = batch.lineCharts[0].map((dp) => dp.value);
      }
      if (batch.barCharts[0]) {
        this.barData = batch.barCharts[0];
      }
      if (batch.kpis[0]) {
        this.kpi1Value.set(batch.kpis[0].value);
        this.kpi1Delta.set(batch.kpis[0].delta);
      }
      if (batch.kpis[1]) {
        this.kpi2Value.set(batch.kpis[1].value);
        this.kpi2Delta.set(batch.kpis[1].delta);
      }
      this.drawCharts();
    });
    this.ws.setRate(30);
  }

  stop(): void {
    if (this.ws) {
      this.ws.disconnect();
      this.ws = null;
    }
    this.isRunning.set(false);
  }

  private drawCharts(): void {
    if (!this.viewReady) return;
    const c1 = this.chart1Ref();
    const c2 = this.chart2Ref();

    if (c1 && this.lineData.length > 0) {
      const canvas = c1.nativeElement;
      const rect = canvas.parentElement!.getBoundingClientRect();
      const cfg: ChartConfig = {
        type: 'line',
        width: Math.max(rect.width - 24, 100),
        height: Math.max(150, 100),
        data: this.lineData,
        color: '#3b82f6',
      };
      renderChart(canvas, cfg);
    }

    if (c2 && this.barData.length > 0) {
      const canvas = c2.nativeElement;
      const rect = canvas.parentElement!.getBoundingClientRect();
      const cfg: ChartConfig = {
        type: 'bar',
        width: Math.max(rect.width - 24, 100),
        height: Math.max(150, 100),
        data: this.barData,
        color: '#22c55e',
      };
      renderChart(canvas, cfg);
    }
  }
}
