import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  template: `
    <div class="widget kpi-card">
      <div class="widget-title">{{ title() }}</div>
      <div class="kpi-value">{{ formattedValue() }}</div>
      <div class="kpi-delta" [class.positive]="delta() >= 0" [class.negative]="delta() < 0">
        {{ delta() >= 0 ? '\u2191' : '\u2193' }}
        {{ formattedDelta() }}
      </div>
    </div>
  `,
})
export class KpiCardComponent {
  readonly title = input.required<string>();
  readonly value = input.required<number>();
  readonly delta = input.required<number>();

  readonly formattedValue = computed(() => this.value().toLocaleString());

  readonly formattedDelta = computed(() => {
    const d = this.delta();
    const pct = this.value() !== 0 ? Math.abs((d / this.value()) * 100).toFixed(1) : '0.0';
    return `${Math.abs(d).toLocaleString()} (${pct}%)`;
  });
}
