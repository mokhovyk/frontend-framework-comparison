import { Injectable, signal } from '@angular/core';

@Injectable()
export class CounterService {
  readonly counter = signal(0);

  increment(): void {
    this.counter.update((c) => c + 1);
  }
}
