<script lang="ts">
  import { navigate } from 'svelte-routing';
  import type { Snippet } from 'svelte';

  interface Props {
    isAuthenticated: boolean;
    children: Snippet;
  }

  let { isAuthenticated, children }: Props = $props();

  $effect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  });
</script>

{#if isAuthenticated}
  {@render children()}
{/if}
