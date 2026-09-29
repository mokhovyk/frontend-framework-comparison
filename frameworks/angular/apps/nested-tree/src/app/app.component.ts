import { ApplicationRef, Component, inject, signal, OnInit } from '@angular/core';
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
  private readonly appRef = inject(ApplicationRef);
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
    // Each mutating hook runs change detection synchronously (see BenchmarkHooks contract).
    const commit = (update: () => void) => {
      update();
      this.appRef.tick();
    };
    (window as unknown as Record<string, unknown>)['__benchmark'] = {
      toggleTheme: () => commit(() => this.toggleTheme()),
      incrementCounter: () => commit(() => this.increment()),
      getCounter: () => this.counter(),
      getTheme: () => this.theme(),
      toggleWideMode: () => commit(() => this.toggleWideMode()),
      mountComponents: (n: number) => commit(() => this.lifecycleCount.set(n)),
      unmountComponents: () => commit(() => this.lifecycleCount.set(0)),
    };
  }
}
