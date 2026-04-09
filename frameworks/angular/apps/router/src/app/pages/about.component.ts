import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  standalone: true,
  template: `
    <div class="page-header">
      <h1>About</h1>
      <p>Frontend Framework Benchmark Suite</p>
    </div>
    <div class="widget" style="max-width: 700px; padding: 24px;">
      <p style="margin-bottom: 16px;">
        This application is part of a benchmark suite comparing React, Angular, and Vue
        across identical real-world scenarios.
      </p>
      <p style="margin-bottom: 16px;">
        <strong>Framework:</strong> Angular 19<br/>
        <strong>State Management:</strong> Signals + RxJS<br/>
        <strong>Routing:</strong> Angular Router with lazy loading<br/>
        <strong>Forms:</strong> Reactive Forms (FormGroup / FormArray)
      </p>
      <p style="color: var(--color-text-secondary);">
        All implementations share the same data generators, CSS, and measurement harness
        to ensure a fair comparison.
      </p>
    </div>
  `,
})
export class AboutComponent {}
