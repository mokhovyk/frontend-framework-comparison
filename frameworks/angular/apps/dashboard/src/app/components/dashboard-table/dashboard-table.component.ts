import { Component, input } from '@angular/core';

@Component({
  selector: 'app-dashboard-table',
  standalone: true,
  template: `
    <div class="widget">
      <div class="widget-title">Data Table</div>
      <div style="overflow: auto; flex: 1;">
        <table class="dashboard-table">
          <tbody>
            @for (row of data(); track $index; let rowIdx = $index) {
              <tr>
                @for (cell of row; track $index; let colIdx = $index) {
                  <td [class.flash]="isFlashing(rowIdx, colIdx)">
                    {{ cell }}
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class DashboardTableComponent {
  readonly data = input.required<number[][]>();
  readonly flashingCells = input.required<Set<string>>();

  isFlashing(row: number, col: number): boolean {
    return this.flashingCells().has(`${row}-${col}`);
  }
}
