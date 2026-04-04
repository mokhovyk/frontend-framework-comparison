import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <div class="page-header">
      <h1>Home</h1>
      <p>Angular Router Benchmark - Multi-Page Application</p>
    </div>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
      <div class="widget">
        <div class="widget-title">Dashboard</div>
        <p style="color: var(--color-text-secondary);">Real-time dashboard with 4 simplified widgets.</p>
      </div>
      <div class="widget">
        <div class="widget-title">Data Table</div>
        <p style="color: var(--color-text-secondary);">CRUD table with 1,000 rows and full functionality.</p>
      </div>
      <div class="widget">
        <div class="widget-title">Dynamic Form</div>
        <p style="color: var(--color-text-secondary);">30-field dynamic form with validation and repeatable groups.</p>
      </div>
    </div>
  `,
})
export class HomeComponent {}
