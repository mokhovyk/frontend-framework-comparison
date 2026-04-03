import type { TableRow } from 'shared-data';

type SortDirection = 'asc' | 'desc' | 'none';
type SortColumn = keyof TableRow;

interface SortState {
  column: SortColumn | null;
  direction: SortDirection;
}

interface EditingCell {
  rowId: number;
  column: keyof TableRow;
  value: string;
}

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'salary', label: 'Salary' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'isActive', label: 'Active' },
];

interface DataTableProps {
  rows: TableRow[];
  sort: SortState;
  selectedIds: Set<number>;
  editingCell: EditingCell | null;
  onSort: (column: SortColumn) => void;
  onRowClick: (rowId: number, shiftKey: boolean) => void;
  onCellDoubleClick: (rowId: number, column: keyof TableRow, value: string) => void;
  onEditChange: (value: string) => void;
  onEditCommit: () => void;
  onEditCancel: () => void;
}

function getSortIndicator(column: SortColumn, sort: SortState): string {
  if (sort.column !== column || sort.direction === 'none') return '\u2195';
  return sort.direction === 'asc' ? '\u2191' : '\u2193';
}

function formatCellValue(row: TableRow, column: keyof TableRow): string {
  const value = row[column];
  if (column === 'salary') return `$${(value as number).toLocaleString()}`;
  if (column === 'isActive') return '';
  return String(value);
}

export default function DataTable({
  rows,
  sort,
  selectedIds,
  editingCell,
  onSort,
  onRowClick,
  onCellDoubleClick,
  onEditChange,
  onEditCommit,
  onEditCancel,
}: DataTableProps) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          {COLUMNS.map((col) => (
            <th key={col.key} onClick={() => onSort(col.key)}>
              {col.label}
              <span
                className={`sort-indicator${sort.column === col.key && sort.direction !== 'none' ? ' active' : ''}`}
              >
                {getSortIndicator(col.key, sort)}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            className={selectedIds.has(row.id) ? 'selected' : ''}
            onClick={(e) => onRowClick(row.id, e.shiftKey)}
          >
            {COLUMNS.map((col) => {
              const isEditing =
                editingCell?.rowId === row.id && editingCell?.column === col.key;

              if (isEditing) {
                return (
                  <td key={col.key} className="editing">
                    <input
                      type="text"
                      value={editingCell!.value}
                      onChange={(e) => onEditChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onEditCommit();
                        if (e.key === 'Escape') onEditCancel();
                      }}
                      onBlur={onEditCommit}
                      autoFocus
                    />
                  </td>
                );
              }

              if (col.key === 'isActive') {
                return (
                  <td
                    key={col.key}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onCellDoubleClick(row.id, col.key, String(row.isActive));
                    }}
                  >
                    <span className={`active-badge ${row.isActive ? 'active' : 'inactive'}`}>
                      {row.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                );
              }

              return (
                <td
                  key={col.key}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onCellDoubleClick(row.id, col.key, String(row[col.key]));
                  }}
                >
                  {formatCellValue(row, col.key)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
