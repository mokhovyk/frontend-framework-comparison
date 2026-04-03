import { useRef, useEffect } from 'react';
import { renderChart } from 'shared-data/canvas-charts';
import type { ChartConfig } from 'shared-data';

interface WidgetProps {
  title: string;
  type: 'line' | 'bar';
  data: number[];
  color: string;
}

export default function Widget({ title, type, data, color }: WidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const config: ChartConfig = {
      type,
      width: container.clientWidth || 300,
      height: container.clientHeight - 30 || 150,
      data,
      color,
    };

    renderChart(canvas, config);
  }, [data, type, color]);

  return (
    <div className="widget" ref={containerRef}>
      <div className="widget-title">{title}</div>
      <canvas ref={canvasRef} />
    </div>
  );
}
