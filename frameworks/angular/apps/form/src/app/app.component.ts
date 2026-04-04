import { Component, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, FormArray, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { FormFieldComponent } from './components/form-field/form-field.component';
import { RepeatableGroupComponent } from './components/repeatable-group/repeatable-group.component';
import { ErrorSummaryComponent } from './components/error-summary/error-summary.component';
import { DebugPanelComponent } from './components/debug-panel/debug-panel.component';
import { formSchema, type FormField, type FormSchema, type FormBenchmarkHooks } from 'shared-data';

declare global {
  interface Window {
    __benchmark?: FormBenchmarkHooks;
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormFieldComponent,
    RepeatableGroupComponent,
    ErrorSummaryComponent,
    DebugPanelComponent,
  ],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  readonly schema: FormSchema = formSchema;
  form!: FormGroup;
  readonly submitted = signal(false);
  readonly submitResult = signal<string | null>(null);
  readonly showDebug = signal(true);
  readonly stressTestResult = signal<{ addTime: number; removeTime: number; totalTime: number } | null>(null);

  get repeatableGroups(): FormArray {
    return this.form.get('references') as FormArray;
  }

  get allErrors(): { field: string; message: string }[] {
    const errors: { field: string; message: string }[] = [];

    for (const field of this.schema.fields) {
      const control = this.form.get(field.name);
      if (control && control.invalid && (control.touched || this.submitted())) {
        const fieldErrors = control.errors;
        if (fieldErrors) {
          for (const key of Object.keys(fieldErrors)) {
            errors.push({
              field: field.name,
              message: this.getErrorMessage(field, key, fieldErrors[key]),
            });
          }
        }
      }
    }

    // Check repeatable group errors
    const groups = this.repeatableGroups;
    for (let i = 0; i < groups.length; i++) {
      const group = groups.at(i) as FormGroup;
      for (const fieldDef of this.schema.repeatableGroup.fields) {
        const control = group.get(fieldDef.name);
        if (control && control.invalid && (control.touched || this.submitted())) {
          const fieldErrors = control.errors;
          if (fieldErrors) {
            for (const key of Object.keys(fieldErrors)) {
              errors.push({
                field: `references.${i}.${fieldDef.name}`,
                message: `Reference ${i + 1} - ${fieldDef.label}: ${this.getValidationMessage(fieldDef.validation, key)}`,
              });
            }
          }
        }
      }
    }

    return errors;
  }

  get formValues(): string {
    return JSON.stringify(this.form.getRawValue(), null, 2);
  }

  ngOnInit(): void {
    this.buildForm();
    this.exposeBenchmarkHooks();
  }

  private buildForm(): void {
    const group: Record<string, FormControl> = {};

    for (const field of this.schema.fields) {
      const validators = this.buildValidators(field);
      const defaultValue = field.defaultValue ?? (field.type === 'checkbox' ? false : '');
      group[field.name] = new FormControl(defaultValue, validators);
    }

    this.form = new FormGroup({
      ...group,
      references: new FormArray([]),
    });
  }

  private buildValidators(field: FormField): ValidatorFn[] {
    const validators: ValidatorFn[] = [];
    for (const rule of field.validation) {
      switch (rule.type) {
        case 'required':
          if (field.type === 'checkbox') {
            validators.push(Validators.requiredTrue);
          } else {
            validators.push(Validators.required);
          }
          break;
        case 'minLength':
          validators.push(Validators.minLength(rule.value as number));
          break;
        case 'maxLength':
          validators.push(Validators.maxLength(rule.value as number));
          break;
        case 'pattern':
          validators.push(Validators.pattern(rule.value as string));
          break;
        case 'custom':
          // Email pattern handled by 'pattern' above
          break;
      }
    }
    return validators;
  }

  isFieldVisible(field: FormField): boolean {
    if (!field.condition) return true;
    const depControl = this.form.get(field.condition.dependsOn);
    if (!depControl) return true;
    const depValue = depControl.value;
    if (typeof field.condition.value === 'boolean') {
      return depValue === field.condition.value;
    }
    return depValue === field.condition.value;
  }

  addRepeatableGroup(): void {
    const group: Record<string, FormControl> = {};
    for (const field of this.schema.repeatableGroup.fields) {
      const validators: ValidatorFn[] = [];
      for (const rule of field.validation) {
        switch (rule.type) {
          case 'required': validators.push(Validators.required); break;
          case 'minLength': validators.push(Validators.minLength(rule.value as number)); break;
          case 'maxLength': validators.push(Validators.maxLength(rule.value as number)); break;
          case 'pattern': validators.push(Validators.pattern(rule.value as string)); break;
        }
      }
      group[field.name] = new FormControl('', validators);
    }
    this.repeatableGroups.push(new FormGroup(group));
  }

  removeRepeatableGroup(index: number): void {
    this.repeatableGroups.removeAt(index);
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.valid) {
      this.submitResult.set(JSON.stringify(this.form.getRawValue(), null, 2));
    } else {
      // Scroll to first error
      const firstError = document.querySelector('.invalid, .error-message');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      this.submitResult.set(null);
    }
  }

  onReset(): void {
    this.form.reset();
    // Reset checkboxes to false
    for (const field of this.schema.fields) {
      if (field.type === 'checkbox') {
        this.form.get(field.name)?.setValue(field.defaultValue ?? false);
      }
    }
    this.repeatableGroups.clear();
    this.submitted.set(false);
    this.submitResult.set(null);
    this.stressTestResult.set(null);
  }

  async stressTest(): Promise<{ addTime: number; removeTime: number; totalTime: number }> {
    const totalStart = performance.now();

    // Add 50 groups
    const addStart = performance.now();
    for (let i = 0; i < 50; i++) {
      this.addRepeatableGroup();
    }
    const addTime = performance.now() - addStart;

    // Remove one by one with 50ms delay
    const removeStart = performance.now();
    const removeOneByOne = async () => {
      for (let i = this.repeatableGroups.length - 1; i >= 0; i--) {
        this.removeRepeatableGroup(i);
        await new Promise((r) => setTimeout(r, 50));
      }
    };
    await removeOneByOne();
    const removeTime = performance.now() - removeStart;

    const totalTime = performance.now() - totalStart;

    const result = {
      addTime: Math.round(addTime * 100) / 100,
      removeTime: Math.round(removeTime * 100) / 100,
      totalTime: Math.round(totalTime * 100) / 100,
    };
    this.stressTestResult.set(result);
    return result;
  }

  private getErrorMessage(field: FormField, errorKey: string, _errorValue: unknown): string {
    const rule = field.validation.find((v) => {
      if (errorKey === 'required' && v.type === 'required') return true;
      if (errorKey === 'requiredTrue' && v.type === 'required') return true;
      if (errorKey === 'minlength' && v.type === 'minLength') return true;
      if (errorKey === 'maxlength' && v.type === 'maxLength') return true;
      if (errorKey === 'pattern' && v.type === 'pattern') return true;
      return false;
    });
    return rule?.message ?? `${field.label}: Validation error`;
  }

  private getValidationMessage(rules: { type: string; message: string }[], errorKey: string): string {
    const mapping: Record<string, string> = {
      required: 'required',
      minlength: 'minLength',
      maxlength: 'maxLength',
      pattern: 'pattern',
    };
    const rule = rules.find((r) => r.type === mapping[errorKey]);
    return rule?.message ?? 'Validation error';
  }

  private exposeBenchmarkHooks(): void {
    const self = this;
    window.__benchmark = {
      async stressTest() {
        return self.stressTest();
      },
    };
  }
}
