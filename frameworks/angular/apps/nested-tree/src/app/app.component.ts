import { Component, signal, OnInit } from '@angular/core';
import { LevelComponent } from './components/level/level.component';
import { ThemeService } from './components/level/theme.service';
import { CounterService } from './components/level/counter.service';

declare global {
  interface Window {
    __benchmark?: {
      incrementCounter: () => void;
      toggleTheme: () => void;
      toggleWideMode: () => void;
      mountComponents: (n: number) => void;
      unmountComponents: () => void;
      increment: () => void;
      getCounter: () => number;
      getTheme: () => string;
    };
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LevelComponent],
  templateUrl: './app.component.html',
  providers: [ThemeService, CounterService],
})
export class AppComponent implements OnInit {
  readonly wideMode = signal(false);
  readonly maxDepth = 50;
  readonly dynamicComponents = signal(0);

  constructor(
    private themeService: ThemeService,
    private counterService: CounterService
  ) {}

  get theme() {
    return this.themeService.theme;
  }

  get counter() {
    return this.counterService.counter;
  }

  ngOnInit(): void {
    this.exposeBenchmarkHooks();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  increment(): void {
    this.counterService.increment();
  }

  toggleWideMode(): void {
    this.wideMode.update((v) => !v);
  }

  get effectiveMaxDepth(): number {
    return this.wideMode() ? 10 : this.maxDepth;
  }

  get dynamicComponentIds(): number[] {
    return Array.from({ length: this.dynamicComponents() }, (_, i) => i);
  }

  private exposeBenchmarkHooks(): void {
    const self = this;
    window.__benchmark = {
      incrementCounter() {
        self.increment();
      },
      toggleTheme() {
        self.toggleTheme();
      },
      toggleWideMode() {
        self.toggleWideMode();
      },
      mountComponents(n: number) {
        self.dynamicComponents.set(n);
      },
      unmountComponents() {
        self.dynamicComponents.set(0);
      },
      increment() {
        self.increment();
      },
      getCounter() {
        return self.counter();
      },
      getTheme() {
        return self.theme();
      },
    };
  }
}
