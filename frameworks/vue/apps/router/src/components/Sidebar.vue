<script setup lang="ts">
import { isAuthenticated, logout } from '../auth';

const navLinks = [
  { path: '/', label: 'Home' },
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/table', label: 'Table' },
  { path: '/form', label: 'Form' },
  { path: '/profile', label: 'Profile' },
  { path: '/settings', label: 'Settings' },
  { path: '/notifications', label: 'Notifications' },
  { path: '/search', label: 'Search' },
  { path: '/about', label: 'About' },
];
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-brand">Vue Router</div>
    <nav>
      <router-link
        v-for="link in navLinks"
        :key="link.path"
        :to="link.path"
        :active-class="link.path === '/' ? '' : 'active'"
        exact-active-class="active"
      >
        {{ link.label }}
      </router-link>
    </nav>
    <div style="padding: 16px; margin-top: auto; border-top: 1px solid var(--color-border)">
      <template v-if="isAuthenticated">
        <button class="secondary" style="width: 100%" @click="logout">
          Logout
        </button>
      </template>
      <template v-else>
        <router-link to="/login">
          <button class="secondary" style="width: 100%">Login</button>
        </router-link>
      </template>
    </div>
  </aside>
</template>
