import { Component, input } from '@angular/core';

@Component({
  selector: 'app-debug-panel',
  standalone: true,
  template: `
    <div class="debug-panel">
      <h3>Form State (Debug)</h3>
      <pre>{{ data() }}</pre>
    </div>
  `,
})
export class DebugPanelComponent {
  readonly data = input.required<string>();
}
