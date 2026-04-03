<script setup lang="ts">
import { ref, watch } from 'vue';
import { createMockApi } from 'shared-data/mock-api';

const api = createMockApi(50);
const query = ref('');
const results = ref<{ id: number; title: string; snippet: string }[]>([]);
const searching = ref(false);

let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

watch(query, (val) => {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  if (!val.trim()) {
    results.value = [];
    searching.value = false;
    return;
  }
  searching.value = true;
  debounceTimeout = setTimeout(async () => {
    const resp = await api.search(val);
    results.value = resp.data;
    searching.value = false;
  }, 200);
});
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Search</h1>
      <p>Search with 200ms debounced API mock</p>
    </div>
    <div class="search-container">
      <input
        v-model="query"
        type="text"
        placeholder="Type to search..."
        style="width: 100%; font-size: 16px; padding: 10px 14px"
      />
      <div v-if="searching" style="margin-top: 12px; color: var(--color-text-secondary)">
        Searching...
      </div>
      <div v-else-if="query && results.length === 0" style="margin-top: 12px; color: var(--color-text-secondary)">
        No results found.
      </div>
      <div v-else class="search-results">
        <div
          v-for="result in results"
          :key="result.id"
          class="search-result-item"
        >
          <h3>{{ result.title }}</h3>
          <p>{{ result.snippet }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
