<script lang="ts">
  interface Props {
    errors: Record<string, string>;
  }

  let { errors }: Props = $props();

  let errorEntries = $derived(Object.entries(errors));
</script>

{#if errorEntries.length > 0}
  <div class="error-summary">
    <h3>Please fix the following errors ({errorEntries.length}):</h3>
    <ul>
      {#each errorEntries as [field, message] (field)}
        <li>
          <a href="#field-{field}" onclick={(e: MouseEvent) => {
            e.preventDefault();
            document.getElementById(`field-${field}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}>
            {message}
          </a>
        </li>
      {/each}
    </ul>
  </div>
{/if}
