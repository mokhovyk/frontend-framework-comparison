<script lang="ts">
  import type { StatusUpdate } from 'shared-data';

  interface Props {
    cells: StatusUpdate['status'][];
  }

  let { cells }: Props = $props();
</script>

<div class="widget">
  <div class="widget-title">Status Grid</div>
  <div class="status-grid">
    {#each cells as status, i (i)}
      <div class="status-cell {status}"></div>
    {/each}
  </div>
</div>
