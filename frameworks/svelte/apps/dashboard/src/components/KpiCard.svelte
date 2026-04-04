<script lang="ts">
  interface Props {
    title: string;
    value: number;
    delta: number;
  }

  let { title, value, delta }: Props = $props();

  let deltaClass = $derived(delta >= 0 ? 'positive' : 'negative');
  let deltaArrow = $derived(delta >= 0 ? '\u2191' : '\u2193');
  let deltaPercent = $derived(
    value !== 0 ? ((Math.abs(delta) / Math.abs(value)) * 100).toFixed(1) : '0.0'
  );
</script>

<div class="widget kpi-card">
  <div class="widget-title">{title}</div>
  <div class="kpi-value">{value.toLocaleString()}</div>
  <div class="kpi-delta {deltaClass}">
    {deltaArrow} {Math.abs(delta).toLocaleString()} ({deltaPercent}%)
  </div>
</div>
