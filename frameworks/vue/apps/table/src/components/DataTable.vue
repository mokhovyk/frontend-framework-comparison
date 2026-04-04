<script setup lang="ts">
import { ref, nextTick } from 'vue';
import type { TableRow } from 'shared-data';

interface Props {
  rows: TableRow[];
  sortColumn: keyof TableRow | null;
  sortDirection: 'asc' | 'desc' | null;
  selectedIds: Set<number>;
  editingCell: { rowId: number; column: keyof TableRow } | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  sort: [column: keyof TableRow];
  'row-click': [rowId: number, event: MouseEvent];
  'cell-double-click': [rowId: number, column: keyof TableRow];
  'cell-edit': [rowId: number, column: keyof TableRow, value: string];
  'edit-cancel': [];
}>();

const editValue = ref('');
const editInputRef = ref<HTMLInputElement | null>(null);

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

function sortIndicator(column: keyof TableRow): string {
  if (props.sortColumn !== column) return '↕';
  if (props.sortDirection === 'asc') return '↑';
  if (props.sortDirection === 'desc') return '↓';
  return '↕';
}

function onCellDoubleClick(row: TableRow, column: keyof TableRow) {
  editValue.value = String(row[column]);
  emit('cell-double-click', row.id, column);
  nextTick(() => {
    editInputRef.value?.focus();
    editInputRef.value?.select();
  });
}

function onEditKeydown(event: KeyboardEvent, rowId: number, column: keyof TableRow) {
  if (event.key === 'Enter') {
    emit('cell-edit', rowId, column, editValue.value);
  } else if (event.key === 'Escape') {
    emit('edit-cancel');
  }
}

function formatCellValue(row: TableRow, column: keyof TableRow): string {
  const value = row[column];
  if (column === 'salary' && typeof value === 'number') {
    return '$' + value.toLocaleString();
  }
  return String(value);
}
</script>

<template>
  <div class="table-container">
    <table class="data-table">
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            @click="emit('sort', col.key)"
          >
            {{ col.label }}
            <span
              class="sort-indicator"
              :class="{ active: sortColumn === col.key }"
            >
              {{ sortIndicator(col.key) }}
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.id"
          :class="{ selected: selectedIds.has(row.id) }"
          @click="emit('row-click', row.id, $event)"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            :class="{
              editing:
                editingCell?.rowId === row.id && editingCell?.column === col.key,
            }"
            @dblclick="onCellDoubleClick(row, col.key)"
          >
            <template
              v-if="
                editingCell?.rowId === row.id && editingCell?.column === col.key
              "
            >
              <input
                ref="editInputRef"
                v-model="editValue"
                type="text"
                @keydown="onEditKeydown($event, row.id, col.key)"
                @blur="emit('edit-cancel')"
              />
            </template>
            <template v-else-if="col.key === 'isActive'">
              <span
                class="active-badge"
                :class="row.isActive ? 'active' : 'inactive'"
              >
                {{ row.isActive ? 'Active' : 'Inactive' }}
              </span>
            </template>
            <template v-else>
              {{ formatCellValue(row, col.key) }}
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
