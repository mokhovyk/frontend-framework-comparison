import { Component, signal, computed, effect, OnInit } from '@angular/core';
import { DataTableComponent } from './components/data-table/data-table.component';
import { PaginationComponent } from './components/pagination/pagination.component';
import { generateTableData, type TableRow, type BenchmarkHooks } from 'shared-data';

type SortDirection = 'asc' | 'desc' | 'none';

interface SortState {
  column: keyof TableRow | null;
  direction: SortDirection;
}

declare global {
  interface Window {
    __benchmark?: BenchmarkHooks;
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DataTableComponent, PaginationComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  private allRows = signal<TableRow[]>([]);

  readonly filterText = signal('');
  readonly sortState = signal<SortState>({ column: null, direction: 'none' });
  readonly currentPage = signal(1);
  readonly pageSize = 50;
  readonly selectedIds = signal<Set<number>>(new Set());
  readonly lastClickedIndex = signal<number | null>(null);
  readonly editingCell = signal<{ rowId: number; column: keyof TableRow } | null>(null);

  private filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debouncedFilter = signal('');

  readonly filteredRows = computed(() => {
    const rows = this.allRows();
    const filter = this.debouncedFilter().toLowerCase();
    if (!filter) return rows;
    return rows.filter(
      (row) =>
        row.firstName.toLowerCase().includes(filter) ||
        row.lastName.toLowerCase().includes(filter) ||
        row.email.toLowerCase().includes(filter) ||
        row.department.toLowerCase().includes(filter)
    );
  });

  readonly sortedRows = computed(() => {
    const rows = [...this.filteredRows()];
    const { column, direction } = this.sortState();
    if (!column || direction === 'none') return rows;

    return rows.sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];
      let cmp: number;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        cmp = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        cmp = (aVal === bVal) ? 0 : aVal ? -1 : 1;
      } else {
        cmp = (aVal as number) - (bVal as number);
      }
      return direction === 'asc' ? cmp : -cmp;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.sortedRows().length / this.pageSize)));

  readonly paginatedRows = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.sortedRows().slice(start, start + this.pageSize);
  });

  readonly selectedCount = computed(() => this.selectedIds().size);

  constructor() {
    effect(() => {
      const totalPages = this.totalPages();
      if (this.currentPage() > totalPages) {
        this.currentPage.set(totalPages);
      }
    });
  }

  ngOnInit(): void {
    this.allRows.set(generateTableData(10000, 42));
    this.exposeBenchmarkHooks();
  }

  onFilterChange(value: string): void {
    this.filterText.set(value);
    if (this.filterDebounceTimer) {
      clearTimeout(this.filterDebounceTimer);
    }
    this.filterDebounceTimer = setTimeout(() => {
      this.debouncedFilter.set(value);
      this.currentPage.set(1);
    }, 150);
  }

  onSort(column: keyof TableRow): void {
    const current = this.sortState();
    let newDirection: SortDirection;
    if (current.column !== column) {
      newDirection = 'asc';
    } else if (current.direction === 'asc') {
      newDirection = 'desc';
    } else if (current.direction === 'desc') {
      newDirection = 'none';
    } else {
      newDirection = 'asc';
    }
    this.sortState.set({
      column: newDirection === 'none' ? null : column,
      direction: newDirection,
    });
  }

  onRowClick(row: TableRow, event: MouseEvent): void {
    const currentRows = this.sortedRows();
    const clickedIndex = currentRows.findIndex((r) => r.id === row.id);
    const selected = new Set(this.selectedIds());

    if (event.shiftKey && this.lastClickedIndex() !== null) {
      const start = Math.min(this.lastClickedIndex()!, clickedIndex);
      const end = Math.max(this.lastClickedIndex()!, clickedIndex);
      for (let i = start; i <= end; i++) {
        selected.add(currentRows[i].id);
      }
    } else {
      if (selected.has(row.id)) {
        selected.delete(row.id);
      } else {
        selected.add(row.id);
      }
    }

    this.selectedIds.set(selected);
    this.lastClickedIndex.set(clickedIndex);
  }

  onDeleteSelected(): void {
    const selected = this.selectedIds();
    this.allRows.update((rows) => rows.filter((r) => !selected.has(r.id)));
    this.selectedIds.set(new Set());
    this.lastClickedIndex.set(null);
  }

  onToggleActive(): void {
    const selected = this.selectedIds();
    this.allRows.update((rows) =>
      rows.map((r) => (selected.has(r.id) ? { ...r, isActive: !r.isActive } : r))
    );
  }

  onStartEdit(rowId: number, column: keyof TableRow): void {
    this.editingCell.set({ rowId, column });
  }

  onCommitEdit(rowId: number, column: keyof TableRow, value: string): void {
    this.allRows.update((rows) =>
      rows.map((r) => {
        if (r.id !== rowId) return r;
        const updated = { ...r };
        if (column === 'salary') {
          (updated as Record<string, unknown>)[column] = Number(value) || r.salary;
        } else if (column === 'isActive') {
          (updated as Record<string, unknown>)[column] = value === 'true';
        } else {
          (updated as Record<string, unknown>)[column] = value;
        }
        return updated as TableRow;
      })
    );
    this.editingCell.set(null);
  }

  onCancelEdit(): void {
    this.editingCell.set(null);
  }

  onPageChange(page: number): void {
    this.currentPage.set(Math.max(1, Math.min(page, this.totalPages())));
  }

  private exposeBenchmarkHooks(): void {
    const self = this;
    window.__benchmark = {
      createRows(count: number) {
        self.allRows.set(generateTableData(count, 42));
      },
      updateEveryNthRow(n: number) {
        self.allRows.update((rows) =>
          rows.map((r, i) => (i % n === 0 ? { ...r, lastName: r.lastName + '!' } : r))
        );
      },
      replaceAllRows() {
        self.allRows.set(generateTableData(10000, 99));
      },
      selectRow(index: number) {
        const rows = self.allRows();
        if (rows[index]) {
          const selected = new Set(self.selectedIds());
          if (selected.has(rows[index].id)) {
            selected.delete(rows[index].id);
          } else {
            selected.add(rows[index].id);
          }
          self.selectedIds.set(selected);
        }
      },
      swapRows(a: number, b: number) {
        self.allRows.update((rows) => {
          const newRows = [...rows];
          [newRows[a], newRows[b]] = [newRows[b], newRows[a]];
          return newRows;
        });
      },
      removeRow(index: number) {
        self.allRows.update((rows) => {
          const newRows = [...rows];
          newRows.splice(index, 1);
          return newRows;
        });
      },
      clearRows() {
        self.allRows.set([]);
      },
      appendRows(count: number) {
        const existing = self.allRows();
        const maxId = existing.reduce((max, r) => Math.max(max, r.id), 0);
        const newRows = generateTableData(count, 77).map((r, i) => ({
          ...r,
          id: maxId + i + 1,
        }));
        self.allRows.update((rows) => [...rows, ...newRows]);
      },
      getRowCount() {
        return self.allRows().length;
      },
    };
  }
}
