import { Component, input, output } from '@angular/core';
import { type TableRow } from 'shared-data';

@Component({
  selector: 'app-data-table',
  standalone: true,
  templateUrl: './data-table.component.html',
})
export class DataTableComponent {
  readonly rows = input.required<TableRow[]>();
  readonly sortColumn = input<keyof TableRow | null>(null);
  readonly sortDirection = input<'asc' | 'desc' | 'none'>('none');
  readonly selectedIds = input<Set<number>>(new Set());
  readonly editingCell = input<{ rowId: number; column: keyof TableRow } | null>(null);

  readonly sort = output<keyof TableRow>();
  readonly rowClick = output<{ row: TableRow; event: MouseEvent }>();
  readonly startEdit = output<{ rowId: number; column: keyof TableRow }>();
  readonly commitEdit = output<{ rowId: number; column: keyof TableRow; value: string }>();
  readonly cancelEdit = output<void>();

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

  getSortIndicator(column: keyof TableRow): string {
    if (this.sortColumn() !== column) return '\u2195';
    return this.sortDirection() === 'asc' ? '\u2191' : '\u2193';
  }

  isSortActive(column: keyof TableRow): boolean {
    return this.sortColumn() === column && this.sortDirection() !== 'none';
  }

  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  isEditing(rowId: number, column: keyof TableRow): boolean {
    const cell = this.editingCell();
    return cell !== null && cell.rowId === rowId && cell.column === column;
  }

  onHeaderClick(column: keyof TableRow): void {
    this.sort.emit(column);
  }

  onRowClick(row: TableRow, event: MouseEvent): void {
    this.rowClick.emit({ row, event });
  }

  onCellDblClick(rowId: number, column: keyof TableRow): void {
    this.startEdit.emit({ rowId, column });
  }

  onEditKeydown(event: KeyboardEvent, rowId: number, column: keyof TableRow): void {
    if (event.key === 'Enter') {
      this.commitEdit.emit({
        rowId,
        column,
        value: (event.target as HTMLInputElement).value,
      });
    } else if (event.key === 'Escape') {
      this.cancelEdit.emit();
    }
  }

  formatCell(row: TableRow, column: keyof TableRow): string {
    const val = row[column];
    if (column === 'salary') return '$' + (val as number).toLocaleString();
    if (column === 'isActive') return '';
    return String(val);
  }
}
