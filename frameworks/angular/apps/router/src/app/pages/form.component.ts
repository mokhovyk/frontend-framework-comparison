import { Component, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, FormArray, Validators, ValidatorFn } from '@angular/forms';
import { formSchema, type FormField, type FormSchema } from 'shared-data';

@Component({
  selector: 'app-form-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-header">
      <h1>Dynamic Form</h1>
      <p>30-field form with validation</p>
    </div>

    <div class="form-container" style="padding: 0;">
      @if (submitted() && allErrors.length > 0) {
        <div class="error-summary">
          <h3>Please fix the following errors:</h3>
          <ul>
            @for (err of allErrors; track err.field) {
              <li>{{ err.message }}</li>
            }
          </ul>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        @for (field of schema.fields; track field.name) {
          @if (isFieldVisible(field)) {
            <div class="form-group" [id]="'field-' + field.name">
              @switch (field.type) {
                @case ('text') {
                  <label [for]="field.name">{{ field.label }}</label>
                  <input type="text" [id]="field.name" [formControlName]="field.name" [placeholder]="field.placeholder ?? ''" />
                }
                @case ('select') {
                  <label [for]="field.name">{{ field.label }}</label>
                  <select [id]="field.name" [formControlName]="field.name">
                    <option value="">-- Select --</option>
                    @for (opt of field.options; track opt.value) {
                      <option [value]="opt.value">{{ opt.label }}</option>
                    }
                  </select>
                }
                @case ('checkbox') {
                  <div class="checkbox-group">
                    <label><input type="checkbox" [formControlName]="field.name" /> {{ field.label }}</label>
                  </div>
                }
                @case ('radio') {
                  <label>{{ field.label }}</label>
                  <div class="radio-group">
                    @for (opt of field.options; track opt.value) {
                      <label><input type="radio" [value]="opt.value" [formControlName]="field.name" /> {{ opt.label }}</label>
                    }
                  </div>
                }
                @case ('date') {
                  <label [for]="field.name">{{ field.label }}</label>
                  <input type="date" [id]="field.name" [formControlName]="field.name" />
                }
                @case ('textarea') {
                  <label [for]="field.name">{{ field.label }}</label>
                  <textarea [id]="field.name" [formControlName]="field.name" [placeholder]="field.placeholder ?? ''"></textarea>
                }
                @case ('file') {
                  <label [for]="field.name">{{ field.label }}</label>
                  <input type="file" [id]="field.name" />
                }
              }
            </div>
          }
        }

        <!-- Repeatable groups -->
        <div class="repeatable-section">
          <h3>{{ schema.repeatableGroup.label }} ({{ groups.length }})</h3>
          @for (group of groups.controls; track $index; let i = $index) {
            <div class="repeatable-group" [formGroup]="$any(group)">
              <button type="button" class="remove-btn danger" (click)="removeGroup(i)">Remove</button>
              @for (f of schema.repeatableGroup.fields; track f.name) {
                <div class="form-group">
                  <label>{{ f.label }}</label>
                  @if (f.type === 'textarea') {
                    <textarea [formControlName]="f.name" [placeholder]="f.placeholder ?? ''"></textarea>
                  } @else {
                    <input type="text" [formControlName]="f.name" [placeholder]="f.placeholder ?? ''" />
                  }
                </div>
              }
            </div>
          }
          <button type="button" class="secondary" (click)="addGroup()"
            [disabled]="groups.length >= schema.repeatableGroup.maxCount">
            + Add Reference
          </button>
        </div>

        <div class="form-actions">
          <button type="submit">Submit</button>
          <button type="button" class="secondary" (click)="onReset()">Reset</button>
        </div>
      </form>

      @if (submitResult(); as result) {
        <div class="submit-result"><pre>{{ result }}</pre></div>
      }
    </div>
  `,
})
export class FormPageComponent implements OnInit {
  readonly schema: FormSchema = formSchema;
  form!: FormGroup;
  readonly submitted = signal(false);
  readonly submitResult = signal<string | null>(null);

  get groups(): FormArray {
    return this.form.get('references') as FormArray;
  }

  get allErrors(): { field: string; message: string }[] {
    const errors: { field: string; message: string }[] = [];
    for (const field of this.schema.fields) {
      const ctrl = this.form.get(field.name);
      if (ctrl && ctrl.invalid && (ctrl.touched || this.submitted())) {
        for (const rule of field.validation) {
          const mapping: Record<string, string> = { required: 'required', minLength: 'minlength', maxLength: 'maxlength', pattern: 'pattern' };
          if (ctrl.hasError(mapping[rule.type] || rule.type)) {
            errors.push({ field: field.name, message: rule.message });
          }
        }
      }
    }
    return errors;
  }

  ngOnInit(): void {
    this.buildForm();
  }

  private buildForm(): void {
    const controls: Record<string, FormControl> = {};
    for (const f of this.schema.fields) {
      const vals: ValidatorFn[] = [];
      for (const r of f.validation) {
        switch (r.type) {
          case 'required': vals.push(f.type === 'checkbox' ? Validators.requiredTrue : Validators.required); break;
          case 'minLength': vals.push(Validators.minLength(r.value as number)); break;
          case 'maxLength': vals.push(Validators.maxLength(r.value as number)); break;
          case 'pattern': vals.push(Validators.pattern(r.value as string)); break;
        }
      }
      controls[f.name] = new FormControl(f.defaultValue ?? (f.type === 'checkbox' ? false : ''), vals);
    }
    this.form = new FormGroup({ ...controls, references: new FormArray([]) });
  }

  isFieldVisible(field: FormField): boolean {
    if (!field.condition) return true;
    const dep = this.form.get(field.condition.dependsOn);
    if (!dep) return true;
    return dep.value === field.condition.value;
  }

  addGroup(): void {
    const g: Record<string, FormControl> = {};
    for (const f of this.schema.repeatableGroup.fields) {
      const vals: ValidatorFn[] = [];
      for (const r of f.validation) {
        switch (r.type) {
          case 'required': vals.push(Validators.required); break;
          case 'minLength': vals.push(Validators.minLength(r.value as number)); break;
          case 'maxLength': vals.push(Validators.maxLength(r.value as number)); break;
          case 'pattern': vals.push(Validators.pattern(r.value as string)); break;
        }
      }
      g[f.name] = new FormControl('', vals);
    }
    this.groups.push(new FormGroup(g));
  }

  removeGroup(i: number): void {
    this.groups.removeAt(i);
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.valid) {
      this.submitResult.set(JSON.stringify(this.form.getRawValue(), null, 2));
    } else {
      this.submitResult.set(null);
    }
  }

  onReset(): void {
    this.form.reset();
    this.groups.clear();
    this.submitted.set(false);
    this.submitResult.set(null);
  }
}
