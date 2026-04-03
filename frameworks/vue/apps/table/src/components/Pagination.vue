<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  currentPage: number;
  totalPages: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:current-page': [page: number];
}>();

const pageInput = ref(String(props.currentPage));

watch(
  () => props.currentPage,
  (val) => {
    pageInput.value = String(val);
  }
);

function goToPage(page: number) {
  const clamped = Math.max(1, Math.min(page, props.totalPages));
  emit('update:current-page', clamped);
}

function onPageInputKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    const parsed = parseInt(pageInput.value, 10);
    if (!isNaN(parsed)) {
      goToPage(parsed);
    } else {
      pageInput.value = String(props.currentPage);
    }
  }
}
</script>

<template>
  <div class="pagination">
    <button :disabled="currentPage <= 1" @click="goToPage(1)">
      First
    </button>
    <button :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
      Prev
    </button>
    <span class="page-info">
      Page
      <input
        v-model="pageInput"
        type="text"
        @keydown="onPageInputKeydown"
      />
      of {{ totalPages }}
    </span>
    <button
      :disabled="currentPage >= totalPages"
      @click="goToPage(currentPage + 1)"
    >
      Next
    </button>
    <button
      :disabled="currentPage >= totalPages"
      @click="goToPage(totalPages)"
    >
      Last
    </button>
  </div>
</template>
