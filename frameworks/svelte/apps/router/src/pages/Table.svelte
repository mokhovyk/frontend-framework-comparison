<script lang="ts">
  import { onMount } from 'svelte';
  import { createMockApi } from 'shared-data';
  import type { TableRow } from 'shared-data';
  import LoadingSkeleton from '../components/LoadingSkeleton.svelte';

  const api = createMockApi();

  let loading = $state(true);
  let rows = $state<TableRow[]>([]);
  let sortKey = $state<keyof TableRow | null>(null);
  let sortDir = $state<'asc' | 'desc' | 'none'>('none');
  let filterText = $state('');
  let debouncedFilter = $state('');
  let currentPage = $state(1);
  let selectedIds = $state<Set<number>>(new Set());
  let lastClickedIndex = $state<number | null>(null);
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
    if (!debouncedFilter) return rows;
    const lower = debouncedFilter.toLowerCase();
    return rows.filter(
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

  function handleSort(key: keyof TableRow) {
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
    const idx = sortedRows.findIndex((r) => r.id === rowId);
    if (event.shiftKey && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, idx);
      const end = Math.max(lastClickedIndex, idx);
      const ns = new Set(selectedIds);
      for (let i = start; i <= end; i++) ns.add(sortedRows[i].id);
      selectedIds = ns;
    } else {
      const ns = new Set(selectedIds);
      if (ns.has(rowId)) ns.delete(rowId);
      else ns.add(rowId);
      selectedIds = ns;
    }
    lastClickedIndex = idx;
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

  function getSortIndicator(key: keyof TableRow): string {
    if (sortKey !== key || sortDir === 'none') return '\u2195';
    return sortDir === 'asc' ? '\u2191' : '\u2193';
  }

  onMount(async () => {
    const response = await api.fetchTableData(1000);
    rows = response.data;
    loading = false;
  });
</script>

<div class="page-header">
  <h1>Table</h1>
  <p>CRUD data table with 1,000 rows.</p>
</div>

{#if loading}
  <LoadingSkeleton lines={10} showBlock />
{:else}
  <div class="toolbar">
    <input
      type="text"
      placeholder="Filter rows..."
      value={filterText}
      oninput={onFilterInput}
    />
    <span style="margin-left: auto; color: var(--color-text-secondary); font-size: 13px;">
      {sortedRows.length} rows | Page {currentPage}/{totalPages}
    </span>
  </div>

  <div class="table-container">
    <table class="data-table">
      <thead>
        <tr>
          {#each columns as col}
            <th onclick={() => handleSort(col.key)}>
              {col.label}
              <span class="sort-indicator" class:active={sortKey === col.key && sortDir !== 'none'}>
                {getSortIndicator(col.key)}
              </span>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each pageRows as row (row.id)}
          <tr
            class:selected={selectedIds.has(row.id)}
            onclick={(e: MouseEvent) => handleRowClick(row.id, e)}
          >
            <td>{row.id}</td>
            <td>{row.firstName}</td>
            <td>{row.lastName}</td>
            <td>{row.email}</td>
            <td>{row.department}</td>
            <td>${row.salary.toLocaleString()}</td>
            <td>{row.startDate}</td>
            <td>
              <span class="active-badge" class:active={row.isActive} class:inactive={!row.isActive}>
                {row.isActive ? 'Active' : 'Inactive'}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="pagination">
    <button onclick={() => currentPage = 1} disabled={currentPage <= 1}>First</button>
    <button onclick={() => currentPage--} disabled={currentPage <= 1}>Prev</button>
    <span class="page-info">Page {currentPage} of {totalPages}</span>
    <button onclick={() => currentPage++} disabled={currentPage >= totalPages}>Next</button>
    <button onclick={() => currentPage = totalPages} disabled={currentPage >= totalPages}>Last</button>
  </div>
{/if}
