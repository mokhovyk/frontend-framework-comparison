import { Component, signal } from '@angular/core';
import { createMockApi } from 'shared-data';

interface SearchResult {
  id: number;
  title: string;
  snippet: string;
}

@Component({
  selector: 'app-search',
  standalone: true,
  template: `
    <div class="page-header">
      <h1>Search</h1>
      <p>Search with 200ms debounce</p>
    </div>

    <div class="search-container">
      <input
        type="text"
        placeholder="Search..."
        style="width: 100%;"
        [value]="query()"
        (input)="onInput($any($event.target).value)"
      />

      @if (searching()) {
        <p style="color: var(--color-text-secondary); margin-top: 12px;">Searching...</p>
      }

      @if (results().length > 0) {
        <div class="search-results">
          @for (r of results(); track r.id) {
            <div class="search-result-item">
              <h3>{{ r.title }}</h3>
              <p>{{ r.snippet }}</p>
            </div>
          }
        </div>
      }

      @if (!searching() && query() && results().length === 0 && searchPerformed()) {
        <p style="color: var(--color-text-secondary); margin-top: 12px;">No results found.</p>
      }
    </div>
  `,
})
export class SearchComponent {
  readonly query = signal('');
  readonly results = signal<SearchResult[]>([]);
  readonly searching = signal(false);
  readonly searchPerformed = signal(false);

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private api = createMockApi(50);

  onInput(value: string): void {
    this.query.set(value);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    if (!value.trim()) {
      this.results.set([]);
      this.searchPerformed.set(false);
      return;
    }

    this.debounceTimer = setTimeout(async () => {
      this.searching.set(true);
      const res = await this.api.search(value);
      this.results.set(res.data);
      this.searching.set(false);
      this.searchPerformed.set(true);
    }, 200);
  }
}
