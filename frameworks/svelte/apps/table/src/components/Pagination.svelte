<script lang="ts">
  interface Props {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }

  let { currentPage, totalPages, onPageChange }: Props = $props();

  let pageInputValue = $state('');

  $effect(() => {
    pageInputValue = String(currentPage);
  });

  function goToFirst() { onPageChange(1); }
  function goToPrev() { if (currentPage > 1) onPageChange(currentPage - 1); }
  function goToNext() { if (currentPage < totalPages) onPageChange(currentPage + 1); }
  function goToLast() { onPageChange(totalPages); }

  function handlePageInput(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      const val = parseInt(pageInputValue, 10);
      if (!isNaN(val) && val >= 1 && val <= totalPages) {
        onPageChange(val);
      } else {
        pageInputValue = String(currentPage);
      }
    }
  }
</script>

<div class="pagination">
  <button onclick={goToFirst} disabled={currentPage <= 1}>First</button>
  <button onclick={goToPrev} disabled={currentPage <= 1}>Prev</button>
  <span class="page-info">
    Page
    <input
      type="text"
      value={pageInputValue}
      oninput={(e: Event) => pageInputValue = (e.target as HTMLInputElement).value}
      onkeydown={handlePageInput}
    />
    of {totalPages}
  </span>
  <button onclick={goToNext} disabled={currentPage >= totalPages}>Next</button>
  <button onclick={goToLast} disabled={currentPage >= totalPages}>Last</button>
</div>
