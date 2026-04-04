<script lang="ts">
  interface Props {
    data: number[][];
    flashCells: Set<string>;
  }

  let { data, flashCells }: Props = $props();

  function shouldFlash(row: number, col: number): boolean {
    return flashCells.has(`${row}-${col}`);
  }
</script>

<div class="widget" style="overflow-y: auto;">
  <div class="widget-title">Live Table</div>
  <table class="dashboard-table">
    <tbody>
      {#each data as row, rowIndex (rowIndex)}
        <tr>
          {#each row as cell, colIndex (colIndex)}
            <td class:flash={shouldFlash(rowIndex, colIndex)}>
              {cell}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
