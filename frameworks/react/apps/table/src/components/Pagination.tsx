import { useState, useEffect, useRef } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const [pageInput, setPageInput] = useState(String(currentPage));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input when page changes externally (but not while user is editing)
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setPageInput(String(currentPage));
    }
  }, [currentPage]);

  const handleInputCommit = () => {
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      setPageInput(String(currentPage));
    }
  };

  return (
    <div className="pagination">
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage <= 1}
      >
        First
      </button>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Prev
      </button>
      <span className="page-info">
        Page{' '}
        <input
          ref={inputRef}
          type="text"
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleInputCommit();
          }}
          onBlur={handleInputCommit}
        />{' '}
        of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        Next
      </button>
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage >= totalPages}
      >
        Last
      </button>
    </div>
  );
}
