import { Component, input } from '@angular/core';

@Component({
  selector: 'app-error-summary',
  standalone: true,
  template: `
    <div class="error-summary">
      <h3>Please fix the following errors:</h3>
      <ul>
        @for (error of errors(); track error.field) {
          <li>
            <a [href]="'#field-' + error.field" (click)="scrollToField($event, error.field)">
              {{ error.message }}
            </a>
          </li>
        }
      </ul>
    </div>
  `,
})
export class ErrorSummaryComponent {
  readonly errors = input.required<{ field: string; message: string }[]>();

  scrollToField(event: Event, fieldName: string): void {
    event.preventDefault();
    const el = document.getElementById('field-' + fieldName) ?? document.getElementById(fieldName);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = el.querySelector('input, select, textarea') as HTMLElement | null;
      if (input) input.focus();
    }
  }
}
