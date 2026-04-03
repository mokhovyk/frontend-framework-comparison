interface KpiCardProps {
  title: string;
  value: number;
  delta: number;
}

export default function KpiCard({ title, value, delta }: KpiCardProps) {
  const isPositive = delta >= 0;
  const arrow = isPositive ? '\u2191' : '\u2193';
  const percentage = value !== 0 ? ((delta / Math.abs(value - delta)) * 100).toFixed(1) : '0.0';

  return (
    <div className="widget kpi-card">
      <div className="widget-title">{title}</div>
      <div className="kpi-value">{value.toLocaleString()}</div>
      <div className={`kpi-delta ${isPositive ? 'positive' : 'negative'}`}>
        {arrow} {Math.abs(delta).toLocaleString()} ({isPositive ? '+' : ''}{percentage}%)
      </div>
    </div>
  );
}
