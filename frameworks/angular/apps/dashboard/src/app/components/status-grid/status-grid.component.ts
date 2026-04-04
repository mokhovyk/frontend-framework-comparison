import { Component, input } from '@angular/core';

@Component({
  selector: 'app-status-grid',
  standalone: true,
  template: `
    <div class="widget">
      <div class="widget-title">Status Grid</div>
      <div class="status-grid">
        @for (cell of cells(); track $index) {
          <div class="status-cell" [class]="cell"></div>
        }
      </div>
    </div>
  `,
})
export class StatusGridComponent {
  readonly cells = input.required<('ok' | 'warning' | 'error' | 'idle')[]>();
}
