<script setup lang="ts">
import { isAuthenticated } from '../auth';
</script>

<template>
  <div v-if="isAuthenticated">
    <slot />
  </div>
  <div v-else>
    <div class="page-header">
      <h1>Access Denied</h1>
      <p>You must be logged in to view this page.</p>
    </div>
    <router-link to="/login">
      <button>Go to Login</button>
    </router-link>
  </div>
</template>
