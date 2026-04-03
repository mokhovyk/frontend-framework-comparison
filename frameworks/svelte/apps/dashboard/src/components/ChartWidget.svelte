<script lang="ts">
  import { renderChart } from 'shared-data';
  import type { ChartConfig } from 'shared-data';

  interface Props {
    type: 'line' | 'bar';
    title: string;
    data: number[];
    color?: string;
  }

  let { type, title, data, color = '#3b82f6' }: Props = $props();

  let canvasEl: HTMLCanvasElement | undefined = $state();

  $effect(() => {
    if (!canvasEl || data.length === 0) return;
    const config: ChartConfig = {
      type,
      width: canvasEl.clientWidth || 300,
      height: canvasEl.clientHeight || 180,
      data,
      color,
    };
    renderChart(canvasEl, config);
  });
</script>

<div class="widget">
  <div class="widget-title">{title}</div>
  <canvas bind:this={canvasEl}></canvas>
</div>
