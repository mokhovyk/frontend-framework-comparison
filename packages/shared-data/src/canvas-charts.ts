import type { ChartConfig } from './types.js';

/**
 * Framework-agnostic canvas chart renderer.
 * All frameworks call this same module — only the data-passing overhead differs.
 */
export function renderChart(canvas: HTMLCanvasElement, config: ChartConfig): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = config.width;
  canvas.height = config.height;

  const { type, data, color = '#3b82f6', backgroundColor = '#1e293b' } = config;

  // Clear canvas
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, config.width, config.height);

  if (data.length === 0) return;

  const padding = { top: 10, right: 10, bottom: 20, left: 40 };
  const chartWidth = config.width - padding.left - padding.right;
  const chartHeight = config.height - padding.top - padding.bottom;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Draw grid lines
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartWidth, y);
    ctx.stroke();

    // Y-axis labels
    const labelValue = max - (range / 4) * i;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(labelValue.toFixed(0), padding.left - 4, y + 3);
  }

  if (type === 'line') {
    renderLineChart(ctx, data, chartWidth, chartHeight, padding, min, range, color);
  } else {
    renderBarChart(ctx, data, chartWidth, chartHeight, padding, min, range, color);
  }
}

function renderLineChart(
  ctx: CanvasRenderingContext2D,
  data: number[],
  chartWidth: number,
  chartHeight: number,
  padding: { top: number; right: number; bottom: number; left: number },
  min: number,
  range: number,
  color: string,
): void {
  const stepX = chartWidth / (data.length - 1 || 1);

  // Draw area fill
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + chartHeight);
  for (let i = 0; i < data.length; i++) {
    const x = padding.left + i * stepX;
    const y = padding.top + chartHeight - ((data[i] - min) / range) * chartHeight;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(padding.left + (data.length - 1) * stepX, padding.top + chartHeight);
  ctx.closePath();
  ctx.fillStyle = color + '20';
  ctx.fill();

  // Draw line
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let i = 0; i < data.length; i++) {
    const x = padding.left + i * stepX;
    const y = padding.top + chartHeight - ((data[i] - min) / range) * chartHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function renderBarChart(
  ctx: CanvasRenderingContext2D,
  data: number[],
  chartWidth: number,
  chartHeight: number,
  padding: { top: number; right: number; bottom: number; left: number },
  min: number,
  range: number,
  color: string,
): void {
  const barWidth = (chartWidth / data.length) * 0.8;
  const gap = (chartWidth / data.length) * 0.2;

  for (let i = 0; i < data.length; i++) {
    const barHeight = ((data[i] - min) / range) * chartHeight;
    const x = padding.left + i * (barWidth + gap) + gap / 2;
    const y = padding.top + chartHeight - barHeight;

    ctx.fillStyle = color;
    ctx.fillRect(x, y, barWidth, barHeight);
  }
}

/**
 * Create a chart renderer bound to a specific canvas.
 * Returns an update function for efficient re-rendering.
 */
export function createChartRenderer(canvas: HTMLCanvasElement, baseConfig: Omit<ChartConfig, 'data'>) {
  return function update(data: number[]) {
    renderChart(canvas, { ...baseConfig, data });
  };
}
