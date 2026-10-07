import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  template: `
    <div class="page-header">
      <h1>Settings</h1>
      <p>Application configuration</p>
    </div>
    <div class="form-container" style="padding: 0;">
      <div class="form-group">
        <label>Display Name</label>
        <input type="text" [value]="displayName()" (input)="displayName.set($any($event.target).value)" />
      </div>
      <div class="form-group">
        <label>Email Notifications</label>
        <div class="checkbox-group">
          <label>
            <input type="checkbox" [checked]="emailNotifs()" (change)="emailNotifs.set(!emailNotifs())" />
            Enable email notifications
          </label>
        </div>
      </div>
      <div class="form-group">
        <label>Theme</label>
        <select [value]="theme()" (change)="theme.set($any($event.target).value)">
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>
      <div class="form-group">
        <label>Language</label>
        <select [value]="language()" (change)="language.set($any($event.target).value)">
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
        </select>
      </div>
      <div class="form-actions" style="border-top: none; padding-top: 8px;">
        <button (click)="save()">Save Settings</button>
      </div>
      @if (saved()) {
        <p style="color: var(--color-success); margin-top: 8px;">Settings saved!</p>
      }
    </div>
  `,
})
export class SettingsComponent {
  readonly displayName = signal('Admin User');
  readonly emailNotifs = signal(true);
  readonly theme = signal('dark');
  readonly language = signal('en');
  readonly saved = signal(false);

  save(): void {
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }
}
