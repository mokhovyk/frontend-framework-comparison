<script setup lang="ts">
</script>

<template>
  <div>
    <div class="page-header">
      <h1>About</h1>
      <p>About this benchmark application</p>
    </div>
    <div
      style="
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius);
        padding: 24px;
        max-width: 600px;
      "
    >
      <h2 style="margin-bottom: 12px">Vue Router Benchmark</h2>
      <p style="margin-bottom: 12px; color: var(--color-text-secondary)">
        This application is part of a frontend framework benchmark suite
        comparing React, Angular, and Vue. It tests routing, code
        splitting, lazy loading, and page transition performance.
      </p>
      <h3 style="margin-bottom: 8px">Features</h3>
      <ul style="padding-left: 20px; color: var(--color-text-secondary); line-height: 1.8">
        <li>10 lazy-loaded pages</li>
        <li>Vue Router with navigation guards</li>
        <li>CSS fade transitions (200ms)</li>
        <li>Auth guard on protected routes</li>
        <li>Data fetching with loading skeletons</li>
        <li>Debounced search</li>
      </ul>
      <h3 style="margin: 16px 0 8px">Tech Stack</h3>
      <ul style="padding-left: 20px; color: var(--color-text-secondary); line-height: 1.8">
        <li>Vue 3.5 (Composition API)</li>
        <li>Vue Router 4</li>
        <li>TypeScript (strict mode)</li>
        <li>Vite 6</li>
      </ul>
    </div>
  </div>
</template>
