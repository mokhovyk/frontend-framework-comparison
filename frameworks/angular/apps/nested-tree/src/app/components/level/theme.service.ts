import { Injectable, signal } from '@angular/core';

@Injectable()
export class ThemeService {
  readonly theme = signal<'light' | 'dark'>('dark');

  toggle(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }
}
