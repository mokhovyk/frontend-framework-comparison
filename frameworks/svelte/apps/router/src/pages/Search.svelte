<script lang="ts">
  import { createMockApi } from 'shared-data';

  const api = createMockApi();

  let query = $state('');
  let results = $state<{ id: number; title: string; snippet: string }[]>([]);
  let searching = $state(false);

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  function handleInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    query = value;

    clearTimeout(debounceTimer);
    if (!value.trim()) {
      results = [];
      searching = false;
      return;
    }

    searching = true;
    debounceTimer = setTimeout(async () => {
      const response = await api.search(value);
      results = response.data;
      searching = false;
    }, 200);
  }
</script>

<div class="page-header">
  <h1>Search</h1>
  <p>Search with 200ms debounced API mock.</p>
</div>

<div class="search-container">
  <input
    type="text"
    placeholder="Search..."
    value={query}
    oninput={handleInput}
    style="width: 100%; padding: 10px 14px; font-size: 16px;"
  />

  {#if searching}
    <div style="margin-top: 16px; color: var(--color-text-secondary);">Searching...</div>
  {/if}

  {#if results.length > 0 && !searching}
    <div class="search-results">
      {#each results as result (result.id)}
        <div class="search-result-item">
          <h3>{result.title}</h3>
          <p>{result.snippet}</p>
        </div>
      {/each}
    </div>
  {/if}

  {#if query.trim() && results.length === 0 && !searching}
    <div style="margin-top: 16px; color: var(--color-text-secondary);">No results found.</div>
  {/if}
</div>
