<script setup lang="ts">
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Home</h1>
      <p>Welcome to the Vue Router benchmark application.</p>
    </div>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px">
      <router-link
        v-for="link in [
          { path: '/dashboard', title: 'Dashboard', desc: 'Real-time data widgets' },
          { path: '/table', title: 'Table', desc: 'CRUD data table with 1k rows' },
          { path: '/form', title: 'Form', desc: 'Dynamic form with validation' },
          { path: '/profile', title: 'Profile', desc: 'User profile (auth required)' },
          { path: '/settings', title: 'Settings', desc: 'App settings (auth required)' },
          { path: '/notifications', title: 'Notifications', desc: '500 notification items (auth required)' },
          { path: '/search', title: 'Search', desc: 'Debounced search with API' },
          { path: '/about', title: 'About', desc: 'About this application' },
        ]"
        :key="link.path"
        :to="link.path"
        style="
          padding: 16px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          text-decoration: none;
        "
      >
        <h3 style="margin-bottom: 4px">{{ link.title }}</h3>
        <p style="font-size: 13px; color: var(--color-text-secondary)">
          {{ link.desc }}
        </p>
      </router-link>
    </div>
  </div>
</template>
