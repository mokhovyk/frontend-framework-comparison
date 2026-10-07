import { Component, signal, computed, OnInit } from '@angular/core';
import { LoadingSkeletonComponent } from '../components/loading-skeleton/loading-skeleton.component';
import { createMockApi, type TableRow } from 'shared-data';

type SortDirection = 'asc' | 'desc' | 'none';

@Component({
  selector: 'app-table-page',
  standalone: true,
  imports: [LoadingSkeletonComponent],
  template: `
    <div class="page-header">
      <h1>Data Table</h1>
      <p>CRUD table with 1,000 rows</p>
    </div>

    @if (loading()) {
      <app-loading-skeleton></app-loading-skeleton>
    } @else {
      <div class="toolbar">
        <input
          type="text"
          placeholder="Filter rows..."
          [value]="filterText()"
          (input)="onFilterInput($any($event.target).value)"
        />
        <span style="margin-left: auto; color: var(--color-text-secondary); font-size: 13px;">
          {{ displayRows().length }} rows
        </span>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              @for (col of columns; track col.key) {
                <th (click)="toggleSort(col.key)">
                  {{ col.label }}
                  <span
                    class="sort-indicator"
                    [class.active]="sortCol() === col.key"
                  >{{ getSortIndicator(col.key) }}</span>
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of paginatedRows(); track row.id) {
              <tr [class.selected]="selectedIds().has(row.id)" (click)="toggleSelect(row, $event)">
                <td>{{ row.id }}</td>
                <td>{{ row.firstName }}</td>
                <td>{{ row.lastName }}</td>
                <td>{{ row.email }}</td>
                <td>{{ row.department }}</td>
                <td>{{ '$' + row.salary.toLocaleString() }}</td>
                <td>{{ row.startDate }}</td>
                <td>
                  <span class="active-badge" [class.active]="row.isActive" [class.inactive]="!row.isActive">
                    {{ row.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button [disabled]="page() <= 1" (click)="page.set(1)">First</button>
        <button [disabled]="page() <= 1" (click)="page.set(page() - 1)">Prev</button>
        <span class="page-info">Page {{ page() }} of {{ totalPages() }}</span>
        <button [disabled]="page() >= totalPages()" (click)="page.set(page() + 1)">Next</button>
        <button [disabled]="page() >= totalPages()" (click)="page.set(totalPages())">Last</button>
      </div>
    }
  `,
})
export class TablePageComponent implements OnInit {
  readonly loading = signal(true);
  private allRows = signal<TableRow[]>([]);
  readonly filterText = signal('');
  private debouncedFilter = signal('');
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  readonly sortCol = signal<keyof TableRow | null>(null);
  readonly sortDir = signal<SortDirection>('none');
  readonly page = signal(1);
  readonly pageSize = 50;
  readonly selectedIds = signal<Set<number>>(new Set());
  private lastClickedIdx: number | null = null;

  readonly columns: { key: keyof TableRow; label: string }[] = [
    { key: 'id', label: 'ID' },
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'department', label: 'Department' },
    { key: 'salary', label: 'Salary' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'isActive', label: 'Active' },
  ];

  readonly displayRows = computed(() => {
    let rows = this.allRows();
    const f = this.debouncedFilter().toLowerCase();
    if (f) {
      rows = rows.filter(
        (r) =>
          r.firstName.toLowerCase().includes(f) ||
          r.lastName.toLowerCase().includes(f) ||
          r.email.toLowerCase().includes(f) ||
          r.department.toLowerCase().includes(f)
      );
    }
    const col = this.sortCol();
    const dir = this.sortDir();
    if (col && dir !== 'none') {
      rows = [...rows].sort((a, b) => {
        const av = a[col];
        const bv = b[col];
        let c: number;
        if (typeof av === 'string' && typeof bv === 'string') c = av.localeCompare(bv);
        else if (typeof av === 'boolean' && typeof bv === 'boolean') c = av === bv ? 0 : av ? -1 : 1;
        else c = (av as number) - (bv as number);
        return dir === 'asc' ? c : -c;
      });
    }
    return rows;
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.displayRows().length / this.pageSize)));

  readonly paginatedRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.displayRows().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    const api = createMockApi(50);
    api.fetchTableData(1000).then((res) => {
      this.allRows.set(res.data);
      this.loading.set(false);
    });
  }

  onFilterInput(value: string): void {
    this.filterText.set(value);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debouncedFilter.set(value);
      this.page.set(1);
    }, 150);
  }

  toggleSort(col: keyof TableRow): void {
    if (this.sortCol() !== col) {
      this.sortCol.set(col);
      this.sortDir.set('asc');
    } else if (this.sortDir() === 'asc') {
      this.sortDir.set('desc');
    } else {
      this.sortCol.set(null);
      this.sortDir.set('none');
    }
  }

  getSortIndicator(col: keyof TableRow): string {
    if (this.sortCol() !== col) return '\u2195';
    return this.sortDir() === 'asc' ? '\u2191' : '\u2193';
  }

  toggleSelect(row: TableRow, event: MouseEvent): void {
    const rows = this.displayRows();
    const idx = rows.findIndex((r) => r.id === row.id);
    const selected = new Set(this.selectedIds());

    if (event.shiftKey && this.lastClickedIdx !== null) {
      const start = Math.min(this.lastClickedIdx, idx);
      const end = Math.max(this.lastClickedIdx, idx);
      for (let i = start; i <= end; i++) selected.add(rows[i].id);
    } else {
      if (selected.has(row.id)) selected.delete(row.id);
      else selected.add(row.id);
    }

    this.selectedIds.set(selected);
    this.lastClickedIdx = idx;
  }
}
