import { useState, useEffect, useMemo } from 'react';
import { createMockApi } from 'shared-data/mock-api';
import type { TableRow } from 'shared-data';
import LoadingSkeleton from '../components/LoadingSkeleton';

const api = createMockApi();

type SortDir = 'asc' | 'desc' | 'none';

export default function Table() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [sortCol, setSortCol] = useState<keyof TableRow | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('none');
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 50;

  useEffect(() => {
    let cancelled = false;
    api.fetchTableData(1000).then((res) => {
      if (cancelled) return;
      setRows(res.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const sortedRows = useMemo(() => {
    if (sortDir === 'none' || !sortCol) return rows;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      if (typeof av === 'boolean' && typeof bv === 'boolean') return (Number(av) - Number(bv)) * dir;
      return 0;
    });
  }, [rows, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (col: keyof TableRow) => {
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortCol(null);
      setSortDir('none');
    }
  };

  if (loading) return <LoadingSkeleton />;

  const columns: { key: keyof TableRow; label: string }[] = [
    { key: 'id', label: 'ID' },
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'department', label: 'Department' },
    { key: 'salary', label: 'Salary' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'isActive', label: 'Active' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Table</h1>
        <p>{rows.length} rows loaded</p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} onClick={() => handleSort(col.key)}>
                  {col.label}
                  <span className={`sort-indicator${sortCol === col.key && sortDir !== 'none' ? ' active' : ''}`}>
                    {sortCol === col.key ? (sortDir === 'asc' ? '\u2191' : sortDir === 'desc' ? '\u2193' : '\u2195') : '\u2195'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.firstName}</td>
                <td>{row.lastName}</td>
                <td>{row.email}</td>
                <td>{row.department}</td>
                <td>${row.salary.toLocaleString()}</td>
                <td>{row.startDate}</td>
                <td>
                  <span className={`active-badge ${row.isActive ? 'active' : 'inactive'}`}>
                    {row.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button onClick={() => setPage(1)} disabled={page <= 1}>First</button>
        <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>Prev</button>
        <span className="page-info">Page {page} of {totalPages}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>Next</button>
        <button onClick={() => setPage(totalPages)} disabled={page >= totalPages}>Last</button>
      </div>
    </div>
  );
}
