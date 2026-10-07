import { Component, input, signal, forwardRef } from '@angular/core';
import { ThemeService } from './theme.service';
import { CounterService } from './counter.service';

@Component({
  selector: 'app-level',
  standalone: true,
  imports: [forwardRef(() => LevelComponent)],
  templateUrl: './level.component.html',
})
export class LevelComponent {
  readonly depth = input.required<number>();
  readonly maxDepth = input.required<number>();
  readonly wideMode = input(false);

  readonly expanded = signal(true);

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

  get isLeaf(): boolean {
    return this.depth() >= this.maxDepth();
  }

  get childCount(): number {
    return this.wideMode() ? 3 : 1;
  }

  get children(): number[] {
    return Array.from({ length: this.childCount }, (_, i) => i);
  }

  get timestamp(): number {
    return performance.now();
  }

  toggle(): void {
    this.expanded.update((v) => !v);
  }
}
