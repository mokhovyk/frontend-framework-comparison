<script lang="ts">
  import type { TableRow } from 'shared-data';

  type SortDir = 'asc' | 'desc' | 'none';
  type SortKey = keyof TableRow;

  interface Props {
    rows: TableRow[];
    sortKey: SortKey | null;
    sortDir: SortDir;
    selectedIds: Set<number>;
    editingCell: { rowId: number; field: SortKey } | null;
    editingValue: string;
    onSort: (key: SortKey) => void;
    onRowClick: (rowId: number, event: MouseEvent) => void;
    onDoubleClick: (rowId: number, field: SortKey) => void;
    onCommitEdit: () => void;
    onCancelEdit: () => void;
    onEditValueChange: (value: string) => void;
  }

  let {
    rows,
    sortKey,
    sortDir,
    selectedIds,
    editingCell,
    editingValue,
    onSort,
    onRowClick,
    onDoubleClick,
    onCommitEdit,
    onCancelEdit,
    onEditValueChange,
  }: Props = $props();

  const columns: { key: SortKey; label: string }[] = [
    { key: 'id', label: 'ID' },
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'department', label: 'Department' },
    { key: 'salary', label: 'Salary' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'isActive', label: 'Active' },
  ];

  function getSortIndicator(key: SortKey): string {
    if (sortKey !== key || sortDir === 'none') return '\u2195';
    return sortDir === 'asc' ? '\u2191' : '\u2193';
  }

  function handleEditKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') onCommitEdit();
    else if (e.key === 'Escape') onCancelEdit();
  }

  function formatCell(row: TableRow, key: SortKey): string {
    const val = row[key];
    if (key === 'salary') return '$' + (val as number).toLocaleString();
    if (key === 'isActive') return '';
    return String(val);
  }

  function isEditing(rowId: number, field: SortKey): boolean {
    return editingCell?.rowId === rowId && editingCell?.field === field;
  }
</script>

<table class="data-table">
  <thead>
    <tr>
      {#each columns as col}
        <th onclick={() => onSort(col.key)}>
          {col.label}
          <span class="sort-indicator" class:active={sortKey === col.key && sortDir !== 'none'}>
            {getSortIndicator(col.key)}
          </span>
        </th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each rows as row (row.id)}
      <tr
        class:selected={selectedIds.has(row.id)}
        onclick={(e: MouseEvent) => onRowClick(row.id, e)}
      >
        {#each columns as col}
          {#if isEditing(row.id, col.key)}
            <td class="editing">
              <input
                type="text"
                value={editingValue}
                oninput={(e: Event) => onEditValueChange((e.target as HTMLInputElement).value)}
                onkeydown={handleEditKeydown}
                onblur={onCommitEdit}
              />
            </td>
          {:else}
            <td ondblclick={() => onDoubleClick(row.id, col.key)}>
              {#if col.key === 'isActive'}
                <span class="active-badge" class:active={row.isActive} class:inactive={!row.isActive}>
                  {row.isActive ? 'Active' : 'Inactive'}
                </span>
              {:else}
                {formatCell(row, col.key)}
              {/if}
            </td>
          {/if}
        {/each}
      </tr>
    {/each}
  </tbody>
</table>
