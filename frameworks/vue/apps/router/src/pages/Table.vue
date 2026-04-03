<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { createMockApi } from 'shared-data/mock-api';
import type { TableRow } from 'shared-data';
import LoadingSkeleton from '../components/LoadingSkeleton.vue';

const PAGE_SIZE = 50;
const api = createMockApi(50);

const loading = ref(true);
const allRows = ref<TableRow[]>([]);
const filterText = ref('');
const debouncedFilter = ref('');
const sortColumn = ref<keyof TableRow | null>(null);
const sortDirection = ref<'asc' | 'desc' | null>(null);
const selectedIds = ref<Set<number>>(new Set());
const lastSelectedIndex = ref<number | null>(null);
const currentPage = ref(1);

// Debounce
let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
watch(filterText, (val) => {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    debouncedFilter.value = val;
    currentPage.value = 1;
  }, 150);
});

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

const sortedRows = computed(() => {
  const rows = [...filteredRows.value];
  if (!sortColumn.value || !sortDirection.value) return rows;
  const col = sortColumn.value;
  const dir = sortDirection.value === 'asc' ? 1 : -1;
  return rows.sort((a, b) => {
    const aVal = a[col];
    const bVal = b[col];
    if (typeof aVal === 'string' && typeof bVal === 'string') return aVal.localeCompare(bVal) * dir;
    if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
    if (typeof aVal === 'boolean' && typeof bVal === 'boolean') return (Number(aVal) - Number(bVal)) * dir;
    return 0;
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / PAGE_SIZE)));
const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return sortedRows.value.slice(start, start + PAGE_SIZE);
});

watch(totalPages, (tp) => {
  if (currentPage.value > tp) currentPage.value = tp;
});

function handleSort(column: keyof TableRow) {
  if (sortColumn.value === column) {
    if (sortDirection.value === 'asc') sortDirection.value = 'desc';
    else if (sortDirection.value === 'desc') { sortColumn.value = null; sortDirection.value = null; }
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
    for (let i = start; i <= end; i++) newSet.add(rowsOnPage[i].id);
    selectedIds.value = newSet;
  } else {
    const newSet = new Set(selectedIds.value);
    if (newSet.has(rowId)) newSet.delete(rowId);
    else newSet.add(rowId);
    selectedIds.value = newSet;
    lastSelectedIndex.value = clickedIndex;
  }
}

function deleteSelected() {
  allRows.value = allRows.value.filter((r) => !selectedIds.value.has(r.id));
  selectedIds.value = new Set();
}

function toggleActive() {
  const ids = selectedIds.value;
  allRows.value = allRows.value.map((r) =>
    ids.has(r.id) ? { ...r, isActive: !r.isActive } : r
  );
}

const columns: { key: keyof TableRow; label: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'salary', label: 'Salary' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'isActive', label: 'Active' },
];

function sortIndicator(col: keyof TableRow): string {
  if (sortColumn.value !== col) return '↕';
  return sortDirection.value === 'asc' ? '↑' : '↓';
}

function formatCell(row: TableRow, col: keyof TableRow): string {
  const val = row[col];
  if (col === 'salary' && typeof val === 'number') return '$' + val.toLocaleString();
  if (col === 'isActive') return val ? 'Active' : 'Inactive';
  return String(val);
}

onMounted(async () => {
  const resp = await api.fetchTableData(1000);
  allRows.value = resp.data;
  loading.value = false;
});
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Table</h1>
      <p>CRUD data table with 1,000 rows</p>
    </div>

    <LoadingSkeleton v-if="loading" :lines="8" />

    <template v-else>
      <div class="toolbar">
        <input v-model="filterText" type="text" placeholder="Filter..." />
        <button class="danger" :disabled="selectedIds.size === 0" @click="deleteSelected">
          Delete ({{ selectedIds.size }})
        </button>
        <button class="secondary" :disabled="selectedIds.size === 0" @click="toggleActive">
          Toggle Active
        </button>
        <span style="color: var(--color-text-secondary); font-size: 13px">
          {{ filteredRows.length }} rows
        </span>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th v-for="col in columns" :key="col.key" @click="handleSort(col.key)">
                {{ col.label }}
                <span class="sort-indicator" :class="{ active: sortColumn === col.key }">
                  {{ sortIndicator(col.key) }}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in paginatedRows"
              :key="row.id"
              :class="{ selected: selectedIds.has(row.id) }"
              @click="handleRowClick(row.id, $event)"
            >
              <td v-for="col in columns" :key="col.key">
                <template v-if="col.key === 'isActive'">
                  <span class="active-badge" :class="row.isActive ? 'active' : 'inactive'">
                    {{ row.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </template>
                <template v-else>{{ formatCell(row, col.key) }}</template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button :disabled="currentPage <= 1" @click="currentPage = 1">First</button>
        <button :disabled="currentPage <= 1" @click="currentPage--">Prev</button>
        <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
        <button :disabled="currentPage >= totalPages" @click="currentPage++">Next</button>
        <button :disabled="currentPage >= totalPages" @click="currentPage = totalPages">Last</button>
      </div>
    </template>
  </div>
</template>
