interface StatusGridProps {
  cells: string[];
}

export default function StatusGrid({ cells }: StatusGridProps) {
  return (
    <div className="widget">
      <div className="widget-title">Status Grid</div>
      <div className="status-grid">
        {cells.map((status, i) => (
          <div key={i} className={`status-cell ${status}`} />
        ))}
      </div>
    </div>
  );
}
