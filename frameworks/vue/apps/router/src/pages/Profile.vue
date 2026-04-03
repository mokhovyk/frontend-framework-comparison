<script setup lang="ts">
import { currentUser } from '../auth';
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Profile</h1>
      <p>Manage your profile settings</p>
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
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px">
        <div
          style="
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: var(--color-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 700;
            color: white;
          "
        >
          {{ (currentUser ?? 'U')[0].toUpperCase() }}
        </div>
        <div>
          <h2>{{ currentUser ?? 'User' }}</h2>
          <p style="color: var(--color-text-secondary)">{{ currentUser }}@example.com</p>
        </div>
      </div>
      <div style="display: grid; gap: 12px">
        <div class="form-group">
          <label>Display Name</label>
          <input type="text" :value="currentUser ?? ''" readonly />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" :value="(currentUser ?? '') + '@example.com'" readonly />
        </div>
        <div class="form-group">
          <label>Role</label>
          <input type="text" value="Administrator" readonly />
        </div>
        <div class="form-group">
          <label>Member Since</label>
          <input type="text" value="2024-01-15" readonly />
        </div>
      </div>
    </div>
  </div>
</template>
