import { useState, useRef, useEffect } from 'react';
import { createMockApi } from 'shared-data/mock-api';

const api = createMockApi();

interface SearchResult {
  id: number;
  title: string;
  snippet: string;
}

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      api.search(query).then((res) => {
        setResults(res.data);
        setSearching(false);
      });
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div>
      <div className="page-header">
        <h1>Search</h1>
        <p>Search with 200ms debounced API mock</p>
      </div>
      <div className="search-container">
        <input
          type="text"
          placeholder="Type to search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: '100%' }}
        />
        {searching && (
          <div style={{ padding: '12px 0', color: 'var(--color-text-secondary)' }}>
            Searching...
          </div>
        )}
        <div className="search-results">
          {results.map((r) => (
            <div key={r.id} className="search-result-item">
              <h3>{r.title}</h3>
              <p>{r.snippet}</p>
            </div>
          ))}
        </div>
        {!searching && query.trim() && results.length === 0 && (
          <div style={{ padding: '12px 0', color: 'var(--color-text-secondary)' }}>
            No results found.
          </div>
        )}
      </div>
    </div>
  );
}
