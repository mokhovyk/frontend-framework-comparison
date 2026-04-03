<script setup lang="ts">
interface Props {
  errors: { key: string; message: string }[];
}

defineProps<Props>();

function scrollToField(key: string) {
  const el = document.getElementById(`field-${key}`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
</script>

<template>
  <div class="error-summary">
    <h3>Please fix the following errors ({{ errors.length }}):</h3>
    <ul>
      <li v-for="error in errors" :key="error.key">
        <a href="#" @click.prevent="scrollToField(error.key)">
          {{ error.message }}
        </a>
      </li>
    </ul>
  </div>
</template>
