import { Component, input } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import type { FormField } from 'shared-data';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="form-group" [id]="'field-' + field().name">
      @switch (field().type) {
        @case ('text') {
          <label [for]="field().name">{{ field().label }}</label>
          <input
            type="text"
            [id]="field().name"
            [formControl]="control()"
            [placeholder]="field().placeholder ?? ''"
            [class.invalid]="showError"
          />
        }
        @case ('select') {
          <label [for]="field().name">{{ field().label }}</label>
          <select
            [id]="field().name"
            [formControl]="control()"
            [class.invalid]="showError"
          >
            <option value="">-- Select --</option>
            @for (opt of field().options; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
        }
        @case ('checkbox') {
          <div class="checkbox-group">
            <label>
              <input
                type="checkbox"
                [id]="field().name"
                [formControl]="control()"
              />
              {{ field().label }}
            </label>
          </div>
        }
        @case ('radio') {
          <label>{{ field().label }}</label>
          <div class="radio-group">
            @for (opt of field().options; track opt.value) {
              <label>
                <input
                  type="radio"
                  [name]="field().name"
                  [value]="opt.value"
                  [formControl]="control()"
                />
                {{ opt.label }}
              </label>
            }
          </div>
        }
        @case ('date') {
          <label [for]="field().name">{{ field().label }}</label>
          <input
            type="date"
            [id]="field().name"
            [formControl]="control()"
            [class.invalid]="showError"
          />
        }
        @case ('textarea') {
          <label [for]="field().name">{{ field().label }}</label>
          <textarea
            [id]="field().name"
            [formControl]="control()"
            [placeholder]="field().placeholder ?? ''"
            [class.invalid]="showError"
          ></textarea>
        }
        @case ('file') {
          <label [for]="field().name">{{ field().label }}</label>
          <input
            type="file"
            [id]="field().name"
            (change)="onFileChange($event)"
            [class.invalid]="showError"
          />
        }
      }

      @if (showError) {
        @for (rule of field().validation; track rule.type) {
          @if (hasError(rule.type)) {
            <div class="error-message">{{ rule.message }}</div>
          }
        }
      }
    </div>
  `,
})
export class FormFieldComponent {
  readonly field = input.required<FormField>();
  readonly control = input.required<FormControl>();
  readonly showErrors = input(false);

  get showError(): boolean {
    const ctrl = this.control();
    return ctrl.invalid && (ctrl.touched || this.showErrors());
  }

  hasError(ruleType: string): boolean {
    const ctrl = this.control();
    const mapping: Record<string, string> = {
      required: 'required',
      minLength: 'minlength',
      maxLength: 'maxlength',
      pattern: 'pattern',
      custom: 'pattern',
    };
    return ctrl.hasError(mapping[ruleType] || ruleType);
  }

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.control().setValue(file?.name ?? '');
    this.control().markAsTouched();
  }
}
