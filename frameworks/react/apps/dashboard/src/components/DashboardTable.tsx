interface DashboardTableProps {
  rows: number[][];
  flashCells: Set<string>;
}

export default function DashboardTable({ rows, flashCells }: DashboardTableProps) {
  return (
    <div className="widget" style={{ overflow: 'auto' }}>
      <div className="widget-title">Data Table</div>
      <table className="dashboard-table">
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {row.map((cell, colIdx) => (
                <td
                  key={colIdx}
                  className={flashCells.has(`${rowIdx}-${colIdx}`) ? 'flash' : ''}
                >
                  {cell.toLocaleString()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
