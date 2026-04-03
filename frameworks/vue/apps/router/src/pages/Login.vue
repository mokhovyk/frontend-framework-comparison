<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { login } from '../auth';

const router = useRouter();
const route = useRoute();

const username = ref('admin');
const password = ref('password');
const error = ref('');
const loading = ref(false);

async function handleLogin() {
  error.value = '';
  if (!username.value.trim()) {
    error.value = 'Username is required';
    return;
  }

  loading.value = true;
  // Simulate API call
  await new Promise((r) => setTimeout(r, 50));
  loading.value = false;

  login(username.value);

  const redirect = route.query.redirect as string | undefined;
  router.push(redirect ?? '/');
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h2>Login</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="Enter username"
          />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Enter password"
          />
        </div>
        <div v-if="error" style="color: var(--color-error); font-size: 13px; margin-bottom: 12px">
          {{ error }}
        </div>
        <button type="submit" :disabled="loading" style="width: 100%">
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>
      <p
        style="
          margin-top: 16px;
          font-size: 12px;
          color: var(--color-text-muted);
          text-align: center;
        "
      >
        Use any username and password to log in.
      </p>
    </div>
  </div>
</template>
