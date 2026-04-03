import {
  Component,
  input,
  effect,
  ElementRef,
  viewChild,
  AfterViewInit,
} from '@angular/core';
import { renderChart, type ChartConfig } from 'shared-data';

@Component({
  selector: 'app-chart-widget',
  standalone: true,
  template: `
    <div class="widget">
      <div class="widget-title">{{ title() }}</div>
      <canvas #chartCanvas></canvas>
    </div>
  `,
})
export class ChartWidgetComponent implements AfterViewInit {
  readonly title = input.required<string>();
  readonly type = input.required<'line' | 'bar'>();
  readonly data = input.required<number[]>();
  readonly color = input('#3b82f6');

  readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');

  private initialized = false;

  constructor() {
    effect(() => {
      const data = this.data();
      if (this.initialized && data && data.length > 0) {
        this.draw(data);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initialized = true;
    const data = this.data();
    if (data && data.length > 0) {
      this.draw(data);
    }
  }

  private draw(data: number[]): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.parentElement!.getBoundingClientRect();
    const config: ChartConfig = {
      type: this.type(),
      width: Math.max(rect.width - 24, 100),
      height: Math.max(rect.height - 40, 60),
      data,
      color: this.color(),
    };
    renderChart(canvas, config);
  }
}
