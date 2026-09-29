import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { generateTableData, resolvePageSize, APPEND_ROWS_SEED, REPLACE_ROWS_SEED } from 'shared-data';
import type { TableRow, BenchmarkHooks } from 'shared-data';
import DataTable from './components/DataTable';
import Pagination from './components/Pagination';

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

const PAGE_SIZE = resolvePageSize(50);

export default function App() {
  const [rows, setRows] = useState<TableRow[]>(() => generateTableData(10000));
  const [filterText, setFilterText] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');
  const [sort, setSort] = useState<SortState>({ column: null, direction: 'none' });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const lastSelectedIndexRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounced filter
  const handleFilterChange = useCallback((value: string) => {
    setFilterText(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedFilter(value);
      setCurrentPage(1);
    }, 150);
  }, []);

  // Filter rows
  const filteredRows = useMemo(() => {
    if (!debouncedFilter) return rows;
    const lower = debouncedFilter.toLowerCase();
    return rows.filter(
      (r) =>
        r.firstName.toLowerCase().includes(lower) ||
        r.lastName.toLowerCase().includes(lower) ||
        r.email.toLowerCase().includes(lower) ||
        r.department.toLowerCase().includes(lower)
    );
  }, [rows, debouncedFilter]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (sort.direction === 'none' || !sort.column) return filteredRows;
    const col = sort.column;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      const av = a[col];
      const bv = b[col];
      if (typeof av === 'string' && typeof bv === 'string') {
        return av.localeCompare(bv) * dir;
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir;
      }
      if (typeof av === 'boolean' && typeof bv === 'boolean') {
        return (Number(av) - Number(bv)) * dir;
      }
      return 0;
    });
  }, [filteredRows, sort]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Sort handler
  const handleSort = useCallback((column: SortColumn) => {
    setSort((prev) => {
      if (prev.column !== column) return { column, direction: 'asc' };
      if (prev.direction === 'asc') return { column, direction: 'desc' };
      return { column: null, direction: 'none' };
    });
  }, []);

  // Row selection
  const handleRowClick = useCallback(
    (rowId: number, shiftKey: boolean) => {
      const rowIndex = sortedRows.findIndex((r) => r.id === rowId);

      if (shiftKey && lastSelectedIndexRef.current !== null) {
        const start = Math.min(lastSelectedIndexRef.current, rowIndex);
        const end = Math.max(lastSelectedIndexRef.current, rowIndex);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (let i = start; i <= end; i++) {
            next.add(sortedRows[i].id);
          }
          return next;
        });
      } else {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(rowId)) {
            next.delete(rowId);
          } else {
            next.add(rowId);
          }
          return next;
        });
      }
      lastSelectedIndexRef.current = rowIndex;
    },
    [sortedRows]
  );

  // Inline editing
  const handleCellDoubleClick = useCallback((rowId: number, column: keyof TableRow, value: string) => {
    setEditingCell({ rowId, column, value });
  }, []);

  const handleEditChange = useCallback((value: string) => {
    setEditingCell((prev) => (prev ? { ...prev, value } : null));
  }, []);

  const handleEditCommit = useCallback(() => {
    if (!editingCell) return;
    const { rowId, column, value } = editingCell;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated = { ...r };
        if (column === 'salary') {
          updated.salary = Number(value) || r.salary;
        } else if (column === 'isActive') {
          updated.isActive = value === 'true';
        } else {
          (updated as Record<string, unknown>)[column] = value;
        }
        return updated;
      })
    );
    setEditingCell(null);
  }, [editingCell]);

  const handleEditCancel = useCallback(() => {
    setEditingCell(null);
  }, []);

  // Bulk actions
  const handleDeleteSelected = useCallback(() => {
    setRows((prev) => prev.filter((r) => !selectedIds.has(r.id)));
    setSelectedIds(new Set());
  }, [selectedIds]);

  const handleToggleActive = useCallback(() => {
    setRows((prev) =>
      prev.map((r) => (selectedIds.has(r.id) ? { ...r, isActive: !r.isActive } : r))
    );
  }, [selectedIds]);

  // Benchmark hooks — each commits synchronously (see BenchmarkHooks contract)
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    const resetView = () => {
      setSelectedIds(new Set());
      setCurrentPage(1);
    };
    const hooks: BenchmarkHooks = {
      createRows: (count) =>
        flushSync(() => {
          setRows(generateTableData(count));
          resetView();
        }),
      updateEveryNthRow: (n) =>
        flushSync(() => {
          setRows((prev) =>
            prev.map((r, i) => (i % n === 0 ? { ...r, lastName: r.lastName + ' !' } : r))
          );
        }),
      replaceAllRows: () =>
        flushSync(() => {
          setRows(generateTableData(10000, REPLACE_ROWS_SEED));
          resetView();
        }),
      selectRow: (index) =>
        flushSync(() => {
          const row = rowsRef.current[index];
          if (row) setSelectedIds(new Set([row.id]));
        }),
      swapRows: (a, b) =>
        flushSync(() => {
          setRows((prev) => {
            if (a < 0 || b < 0 || a >= prev.length || b >= prev.length) return prev;
            const next = [...prev];
            [next[a], next[b]] = [next[b], next[a]];
            return next;
          });
        }),
      removeRow: (index) =>
        flushSync(() => {
          setRows((prev) => {
            if (index < 0 || index >= prev.length) return prev;
            const next = [...prev];
            next.splice(index, 1);
            return next;
          });
        }),
      clearRows: () =>
        flushSync(() => {
          setRows([]);
          resetView();
        }),
      appendRows: (count) =>
        flushSync(() => {
          setRows((prev) => {
            const maxId = prev.reduce((max, r) => Math.max(max, r.id), 0);
            const newRows = generateTableData(count, APPEND_ROWS_SEED).map((r, i) => ({
              ...r,
              id: maxId + i + 1,
            }));
            return [...prev, ...newRows];
          });
        }),
      getRowCount: () => rowsRef.current.length,
    };
    (window as unknown as Record<string, unknown>).__benchmark = hooks;
    return () => {
      delete (window as unknown as Record<string, unknown>).__benchmark;
    };
  }, []);

  return (
    <div style={{ padding: '16px' }}>
      <h1 style={{ marginBottom: '8px' }}>CRUD Data Table</h1>
      <div className="toolbar">
        <input
          type="text"
          placeholder="Filter by name, email, department..."
          value={filterText}
          onChange={(e) => handleFilterChange(e.target.value)}
        />
        <button
          className="danger"
          onClick={handleDeleteSelected}
          disabled={selectedIds.size === 0}
        >
          Delete Selected ({selectedIds.size})
        </button>
        <button
          className="secondary"
          onClick={handleToggleActive}
          disabled={selectedIds.size === 0}
        >
          Toggle Active
        </button>
        <span style={{ marginLeft: 'auto', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
          {sortedRows.length} rows
        </span>
      </div>
      <div className="table-container">
        <DataTable
          rows={pageRows}
          sort={sort}
          selectedIds={selectedIds}
          editingCell={editingCell}
          onSort={handleSort}
          onRowClick={handleRowClick}
          onCellDoubleClick={handleCellDoubleClick}
          onEditChange={handleEditChange}
          onEditCommit={handleEditCommit}
          onEditCancel={handleEditCancel}
        />
      </div>
      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
