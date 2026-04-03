<script lang="ts">
  import { generateTableData } from 'shared-data';
  import type { TableRow, BenchmarkHooks } from 'shared-data';
  import DataTable from './components/DataTable.svelte';
  import Pagination from './components/Pagination.svelte';

  type SortDir = 'asc' | 'desc' | 'none';
  type SortKey = keyof TableRow;

  let allRows = $state<TableRow[]>(generateTableData(10000));
  let filterText = $state('');
  let debouncedFilter = $state('');
  let sortKey = $state<SortKey | null>(null);
  let sortDir = $state<SortDir>('none');
  let selectedIds = $state<Set<number>>(new Set());
  let lastClickedIndex = $state<number | null>(null);
  let editingCell = $state<{ rowId: number; field: SortKey } | null>(null);
  let editingValue = $state('');
  let currentPage = $state(1);
  const pageSize = 50;

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  function onFilterInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    filterText = value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debouncedFilter = value;
      currentPage = 1;
    }, 150);
  }

  let filteredRows = $derived.by(() => {
    if (!debouncedFilter) return allRows;
    const lower = debouncedFilter.toLowerCase();
    return allRows.filter(
      (row) =>
        row.firstName.toLowerCase().includes(lower) ||
        row.lastName.toLowerCase().includes(lower) ||
        row.email.toLowerCase().includes(lower) ||
        row.department.toLowerCase().includes(lower)
    );
  });

  let sortedRows = $derived.by(() => {
    if (!sortKey || sortDir === 'none') return filteredRows;
    const key = sortKey;
    const dir = sortDir;
    return [...filteredRows].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal < bVal) return dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  });

  let totalPages = $derived(Math.max(1, Math.ceil(sortedRows.length / pageSize)));

  let pageRows = $derived.by(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      if (sortDir === 'asc') sortDir = 'desc';
      else if (sortDir === 'desc') { sortDir = 'none'; sortKey = null; }
      else sortDir = 'asc';
    } else {
      sortKey = key;
      sortDir = 'asc';
    }
  }

  function handleRowClick(rowId: number, event: MouseEvent) {
    const currentIndex = sortedRows.findIndex((r) => r.id === rowId);
    if (event.shiftKey && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, currentIndex);
      const end = Math.max(lastClickedIndex, currentIndex);
      const newSelected = new Set(selectedIds);
      for (let i = start; i <= end; i++) {
        newSelected.add(sortedRows[i].id);
      }
      selectedIds = newSelected;
    } else {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(rowId)) {
        newSelected.delete(rowId);
      } else {
        newSelected.add(rowId);
      }
      selectedIds = newSelected;
    }
    lastClickedIndex = currentIndex;
  }

  function handleDoubleClick(rowId: number, field: SortKey) {
    const row = allRows.find((r) => r.id === rowId);
    if (!row) return;
    editingCell = { rowId, field };
    editingValue = String(row[field]);
  }

  function commitEdit() {
    if (!editingCell) return;
    const { rowId, field } = editingCell;
    allRows = allRows.map((row) => {
      if (row.id !== rowId) return row;
      const updated = { ...row };
      if (field === 'salary') {
        updated[field] = Number(editingValue) || 0;
      } else if (field === 'isActive') {
        updated[field] = editingValue === 'true';
      } else if (field === 'id') {
        updated[field] = Number(editingValue) || 0;
      } else {
        (updated as any)[field] = editingValue;
      }
      return updated;
    });
    editingCell = null;
  }

  function cancelEdit() {
    editingCell = null;
  }

  function deleteSelected() {
    allRows = allRows.filter((row) => !selectedIds.has(row.id));
    selectedIds = new Set();
    lastClickedIndex = null;
  }

  function toggleActiveSelected() {
    allRows = allRows.map((row) =>
      selectedIds.has(row.id) ? { ...row, isActive: !row.isActive } : row
    );
  }

  // Benchmark hooks
  const benchmarkHooks: BenchmarkHooks = {
    createRows(count: number) {
      allRows = generateTableData(count);
      selectedIds = new Set();
      currentPage = 1;
    },
    updateEveryNthRow(n: number) {
      allRows = allRows.map((row, i) =>
        i % n === 0 ? { ...row, lastName: row.lastName + ' !' } : row
      );
    },
    replaceAllRows() {
      allRows = generateTableData(10000, 99);
      selectedIds = new Set();
      currentPage = 1;
    },
    selectRow(index: number) {
      if (index >= 0 && index < allRows.length) {
        const newSelected = new Set<number>();
        newSelected.add(allRows[index].id);
        selectedIds = newSelected;
      }
    },
    swapRows(a: number, b: number) {
      if (a >= 0 && a < allRows.length && b >= 0 && b < allRows.length) {
        const newRows = [...allRows];
        [newRows[a], newRows[b]] = [newRows[b], newRows[a]];
        allRows = newRows;
      }
    },
    removeRow(index: number) {
      if (index >= 0 && index < allRows.length) {
        allRows = [...allRows.slice(0, index), ...allRows.slice(index + 1)];
      }
    },
    clearRows() {
      allRows = [];
      selectedIds = new Set();
      currentPage = 1;
    },
    appendRows(count: number) {
      const maxId = allRows.reduce((max, r) => Math.max(max, r.id), 0);
      const newRows = generateTableData(count, 77).map((r, i) => ({
        ...r,
        id: maxId + i + 1,
      }));
      allRows = [...allRows, ...newRows];
    },
    getRowCount() {
      return allRows.length;
    },
  };

  (window as any).__benchmark = benchmarkHooks;
</script>

<div class="table-container" style="padding: 16px;">
  <div class="toolbar">
    <input
      type="text"
      placeholder="Filter rows..."
      value={filterText}
      oninput={onFilterInput}
    />
    <button
      class="danger"
      disabled={selectedIds.size === 0}
      onclick={deleteSelected}
    >
      Delete Selected ({selectedIds.size})
    </button>
    <button
      class="secondary"
      disabled={selectedIds.size === 0}
      onclick={toggleActiveSelected}
    >
      Toggle Active
    </button>
    <span style="margin-left: auto; color: var(--color-text-secondary); font-size: 13px;">
      {sortedRows.length} rows
    </span>
  </div>

  <DataTable
    rows={pageRows}
    {sortKey}
    {sortDir}
    {selectedIds}
    {editingCell}
    {editingValue}
    onSort={handleSort}
    onRowClick={handleRowClick}
    onDoubleClick={handleDoubleClick}
    onCommitEdit={commitEdit}
    onCancelEdit={cancelEdit}
    onEditValueChange={(v: string) => editingValue = v}
  />

  <Pagination
    {currentPage}
    {totalPages}
    onPageChange={(p: number) => currentPage = p}
  />
</div>
