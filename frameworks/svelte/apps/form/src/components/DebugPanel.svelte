<script lang="ts">
  interface Props {
    data: Record<string, string | boolean>;
    groups: { id: number; values: Record<string, string> }[];
  }

  let { data, groups }: Props = $props();

  let isOpen = $state(false);

  let debugJson = $derived(
    JSON.stringify(
      {
        ...data,
        references: groups.map((g) => g.values),
      },
      null,
      2
    )
  );
</script>

<div class="debug-panel">
  <h3>
    <button
      type="button"
      class="secondary"
      style="padding: 2px 8px; font-size: 12px;"
      onclick={() => isOpen = !isOpen}
    >
      {isOpen ? 'Hide' : 'Show'} Debug Panel
    </button>
  </h3>
  {#if isOpen}
    <pre>{debugJson}</pre>
  {/if}
</div>
