import { Component, input, output } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import type { RepeatableGroupField } from 'shared-data';

@Component({
  selector: 'app-repeatable-group',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="repeatable-group" [formGroup]="group()">
      <button
        type="button"
        class="remove-btn danger"
        (click)="remove.emit()"
      >Remove</button>

      @for (field of fields(); track field.name) {
        <div class="form-group">
          <label [for]="fieldId(field.name)">{{ field.label }}</label>
          @if (field.type === 'textarea') {
            <textarea
              [id]="fieldId(field.name)"
              [formControlName]="field.name"
              [placeholder]="field.placeholder ?? ''"
              [class.invalid]="isInvalid(field.name)"
            ></textarea>
          } @else {
            <input
              type="text"
              [id]="fieldId(field.name)"
              [formControlName]="field.name"
              [placeholder]="field.placeholder ?? ''"
              [class.invalid]="isInvalid(field.name)"
            />
          }
          @if (isInvalid(field.name)) {
            @for (rule of field.validation; track rule.type) {
              @if (hasError(field.name, rule.type)) {
                <div class="error-message">{{ rule.message }}</div>
              }
            }
          }
        </div>
      }
    </div>
  `,
})
export class RepeatableGroupComponent {
  readonly group = input.required<FormGroup>();
  readonly index = input.required<number>();
  readonly fields = input.required<RepeatableGroupField[]>();
  readonly showErrors = input(false);

  readonly remove = output<void>();

  fieldId(fieldName: string): string {
    return `ref-${this.index()}-${fieldName}`;
  }

  isInvalid(fieldName: string): boolean {
    const ctrl = this.group().get(fieldName);
    return ctrl !== null && ctrl.invalid && (ctrl.touched || this.showErrors());
  }

  hasError(fieldName: string, ruleType: string): boolean {
    const ctrl = this.group().get(fieldName);
    if (!ctrl) return false;
    const mapping: Record<string, string> = {
      required: 'required',
      minLength: 'minlength',
      maxLength: 'maxlength',
      pattern: 'pattern',
    };
    return ctrl.hasError(mapping[ruleType] || ruleType);
  }
}
