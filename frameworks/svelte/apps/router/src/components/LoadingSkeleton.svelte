<script lang="ts">
  interface Props {
    lines?: number;
    showBlock?: boolean;
  }

  let { lines = 5, showBlock = false }: Props = $props();

  let lineArray = $derived(Array.from({ length: lines }, (_, i) => i));
</script>

<div>
  {#if showBlock}
    <div class="skeleton skeleton-block"></div>
  {/if}
  {#each lineArray as i (i)}
    <div class="skeleton skeleton-line" style="width: {i === lines - 1 ? '60%' : '100%'};"></div>
  {/each}
</div>
