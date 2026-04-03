<script setup lang="ts">
import { ref } from 'vue';

const darkMode = ref(true);
const emailNotifications = ref(true);
const pushNotifications = ref(false);
const language = ref('en');
const timezone = ref('UTC');
const saved = ref(false);

function handleSave() {
  saved.value = true;
  setTimeout(() => { saved.value = false; }, 2000);
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Settings</h1>
      <p>Application settings and preferences</p>
    </div>
    <div style="max-width: 600px">
      <div
        style="
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          padding: 24px;
        "
      >
        <h3 style="margin-bottom: 16px">Appearance</h3>
        <div class="form-group">
          <label>
            <input type="checkbox" v-model="darkMode" />
            Dark Mode
          </label>
        </div>
        <div class="form-group">
          <label for="language">Language</label>
          <select id="language" v-model="language">
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ja">Japanese</option>
          </select>
        </div>
        <div class="form-group">
          <label for="timezone">Timezone</label>
          <select id="timezone" v-model="timezone">
            <option value="UTC">UTC</option>
            <option value="EST">Eastern Time</option>
            <option value="PST">Pacific Time</option>
            <option value="CET">Central European</option>
            <option value="JST">Japan Standard</option>
          </select>
        </div>

        <h3 style="margin: 24px 0 16px">Notifications</h3>
        <div class="form-group">
          <label>
            <input type="checkbox" v-model="emailNotifications" />
            Email Notifications
          </label>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" v-model="pushNotifications" />
            Push Notifications
          </label>
        </div>

        <div style="margin-top: 24px; display: flex; gap: 8px; align-items: center">
          <button @click="handleSave">Save Settings</button>
          <span
            v-if="saved"
            style="color: var(--color-success); font-size: 13px"
          >
            Settings saved!
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
