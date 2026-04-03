<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { generateTableData } from 'shared-data';
import type { TableRow, BenchmarkHooks } from 'shared-data';
import DataTable from './components/DataTable.vue';
import Pagination from './components/Pagination.vue';

const PAGE_SIZE = 50;

const allRows = ref<TableRow[]>(generateTableData(10000));
const filterText = ref('');
const debouncedFilter = ref('');
const sortColumn = ref<keyof TableRow | null>(null);
const sortDirection = ref<'asc' | 'desc' | null>(null);
const selectedIds = ref<Set<number>>(new Set());
const lastSelectedIndex = ref<number | null>(null);
const currentPage = ref(1);
const editingCell = ref<{ rowId: number; column: keyof TableRow } | null>(null);

// Debounce filter
let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
watch(filterText, (val) => {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    debouncedFilter.value = val;
    currentPage.value = 1;
  }, 150);
});

// Filtered rows
const filteredRows = computed(() => {
  const text = debouncedFilter.value.toLowerCase();
  if (!text) return allRows.value;
  return allRows.value.filter((row) =>
    row.firstName.toLowerCase().includes(text) ||
    row.lastName.toLowerCase().includes(text) ||
    row.email.toLowerCase().includes(text) ||
    row.department.toLowerCase().includes(text)
  );
});

// Sorted rows
const sortedRows = computed(() => {
  const rows = [...filteredRows.value];
  if (!sortColumn.value || !sortDirection.value) return rows;
  const col = sortColumn.value;
  const dir = sortDirection.value === 'asc' ? 1 : -1;
  return rows.sort((a, b) => {
    const aVal = a[col];
    const bVal = b[col];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal) * dir;
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * dir;
    }
    if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
      return (Number(aVal) - Number(bVal)) * dir;
    }
    return 0;
  });
});

// Pagination
const totalPages = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / PAGE_SIZE)));
const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return sortedRows.value.slice(start, start + PAGE_SIZE);
});

// Ensure current page stays in bounds
watch(totalPages, (tp) => {
  if (currentPage.value > tp) currentPage.value = tp;
});

function handleSort(column: keyof TableRow) {
  if (sortColumn.value === column) {
    if (sortDirection.value === 'asc') {
      sortDirection.value = 'desc';
    } else if (sortDirection.value === 'desc') {
      sortColumn.value = null;
      sortDirection.value = null;
    }
  } else {
    sortColumn.value = column;
    sortDirection.value = 'asc';
  }
}

function handleRowClick(rowId: number, event: MouseEvent) {
  const rowsOnPage = paginatedRows.value;
  const clickedIndex = rowsOnPage.findIndex((r) => r.id === rowId);

  if (event.shiftKey && lastSelectedIndex.value !== null) {
    const start = Math.min(lastSelectedIndex.value, clickedIndex);
    const end = Math.max(lastSelectedIndex.value, clickedIndex);
    const newSet = new Set(selectedIds.value);
    for (let i = start; i <= end; i++) {
      newSet.add(rowsOnPage[i].id);
    }
    selectedIds.value = newSet;
  } else {
    const newSet = new Set(selectedIds.value);
    if (newSet.has(rowId)) {
      newSet.delete(rowId);
    } else {
      newSet.add(rowId);
    }
    selectedIds.value = newSet;
    lastSelectedIndex.value = clickedIndex;
  }
}

function handleCellEdit(rowId: number, column: keyof TableRow, value: string) {
  const idx = allRows.value.findIndex((r) => r.id === rowId);
  if (idx === -1) return;
  const row = { ...allRows.value[idx] };
  if (column === 'salary') {
    row[column] = Number(value) || 0;
  } else if (column === 'isActive') {
    row[column] = value === 'true';
  } else if (column === 'id') {
    row[column] = Number(value) || 0;
  } else {
    (row as Record<string, unknown>)[column as string] = value;
  }
  allRows.value[idx] = row;
  editingCell.value = null;
}

function handleCellDoubleClick(rowId: number, column: keyof TableRow) {
  editingCell.value = { rowId, column };
}

function handleEditCancel() {
  editingCell.value = null;
}

function deleteSelected() {
  allRows.value = allRows.value.filter((r) => !selectedIds.value.has(r.id));
  selectedIds.value = new Set();
  lastSelectedIndex.value = null;
}

function toggleActiveSelected() {
  const ids = selectedIds.value;
  allRows.value = allRows.value.map((r) =>
    ids.has(r.id) ? { ...r, isActive: !r.isActive } : r
  );
}

// Benchmark hooks
onMounted(() => {
  const hooks: BenchmarkHooks = {
    createRows(count: number) {
      allRows.value = generateTableData(count);
    },
    updateEveryNthRow(n: number) {
      allRows.value = allRows.value.map((row, i) =>
        i % n === 0 ? { ...row, lastName: row.lastName + ' !' } : row
      );
    },
    replaceAllRows() {
      allRows.value = generateTableData(10000, 99);
    },
    selectRow(index: number) {
      if (index < allRows.value.length) {
        const id = allRows.value[index].id;
        selectedIds.value = new Set([id]);
      }
    },
    swapRows(a: number, b: number) {
      const rows = [...allRows.value];
      if (a < rows.length && b < rows.length) {
        [rows[a], rows[b]] = [rows[b], rows[a]];
        allRows.value = rows;
      }
    },
    removeRow(index: number) {
      if (index < allRows.value.length) {
        const rows = [...allRows.value];
        rows.splice(index, 1);
        allRows.value = rows;
      }
    },
    clearRows() {
      allRows.value = [];
      selectedIds.value = new Set();
    },
    appendRows(count: number) {
      const maxId = allRows.value.length > 0
        ? Math.max(...allRows.value.map((r) => r.id))
        : 0;
      const newRows = generateTableData(count, 123).map((r, i) => ({
        ...r,
        id: maxId + i + 1,
      }));
      allRows.value = [...allRows.value, ...newRows];
    },
    getRowCount() {
      return allRows.value.length;
    },
  };
  (window as unknown as Record<string, unknown>).__benchmark = hooks;
});
</script>

<template>
  <div style="padding: 16px">
    <h1 style="margin-bottom: 12px">Vue - CRUD Data Table</h1>
    <div class="toolbar">
      <input
        v-model="filterText"
        type="text"
        placeholder="Filter by name, email, department..."
      />
      <button
        class="danger"
        :disabled="selectedIds.size === 0"
        @click="deleteSelected"
      >
        Delete Selected ({{ selectedIds.size }})
      </button>
      <button
        class="secondary"
        :disabled="selectedIds.size === 0"
        @click="toggleActiveSelected"
      >
        Toggle Active
      </button>
      <span style="color: var(--color-text-secondary); font-size: 13px">
        {{ filteredRows.length }} rows
      </span>
    </div>

    <DataTable
      :rows="paginatedRows"
      :sort-column="sortColumn"
      :sort-direction="sortDirection"
      :selected-ids="selectedIds"
      :editing-cell="editingCell"
      @sort="handleSort"
      @row-click="handleRowClick"
      @cell-double-click="handleCellDoubleClick"
      @cell-edit="handleCellEdit"
      @edit-cancel="handleEditCancel"
    />

    <Pagination
      :current-page="currentPage"
      :total-pages="totalPages"
      @update:current-page="currentPage = $event"
    />
  </div>
</template>
