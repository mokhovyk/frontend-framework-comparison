import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div class="login-page">
      <div class="login-card">
        <h2>Login</h2>
        <div class="form-group">
          <label for="username">Username</label>
          <input
            type="text"
            id="username"
            [value]="username()"
            (input)="username.set($any($event.target).value)"
            placeholder="Enter username"
          />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input
            type="password"
            id="password"
            [value]="password()"
            (input)="password.set($any($event.target).value)"
            placeholder="Enter password"
          />
        </div>
        @if (error()) {
          <p style="color: var(--color-error); margin-bottom: 12px;">{{ error() }}</p>
        }
        <button
          style="width: 100%; margin-top: 8px;"
          (click)="login()"
        >Login</button>
        <p style="color: var(--color-text-muted); font-size: 12px; margin-top: 12px; text-align: center;">
          Enter any username/password to log in.
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  readonly username = signal('');
  readonly password = signal('');
  readonly error = signal('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  login(): void {
    if (!this.username().trim()) {
      this.error.set('Username is required');
      return;
    }
    this.authService.login(this.username(), this.password());
    this.router.navigate(['/profile']);
  }
}
