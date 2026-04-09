import { Component, signal, OnInit } from '@angular/core';
import { LevelComponent } from './components/level/level.component';
import { ThemeService } from './components/level/theme.service';
import { CounterService } from './components/level/counter.service';

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
  readonly lifecycleCount = signal(0);
  readonly lifecycleItems = (): number[] => Array.from({ length: this.lifecycleCount() }, (_, i) => i);

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

  private exposeBenchmarkHooks(): void {
    const self = this;
    (window as unknown as Record<string, unknown>)['__benchmark'] = {
      toggleTheme() {
        self.toggleTheme();
      },
      incrementCounter() {
        self.increment();
      },
      getCounter() {
        return self.counter();
      },
      getTheme() {
        return self.theme();
      },
      toggleWideMode() {
        self.toggleWideMode();
      },
      mountComponents(n: number) {
        self.lifecycleCount.set(n);
      },
      unmountComponents() {
        self.lifecycleCount.set(0);
      },
    };
  }
}
