import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  template: `
    <div class="page-header">
      <h1>Profile</h1>
      <p>Welcome, {{ authService.user() }}</p>
    </div>
    <div class="widget" style="max-width: 600px; padding: 24px;">
      <div style="margin-bottom: 16px;">
        <strong>Username:</strong> {{ authService.user() }}
      </div>
      <div style="margin-bottom: 16px;">
        <strong>Email:</strong> {{ authService.user() }}&#64;example.com
      </div>
      <div style="margin-bottom: 16px;">
        <strong>Role:</strong> Administrator
      </div>
      <div>
        <strong>Member since:</strong> January 2024
      </div>
    </div>
  `,
})
export class ProfileComponent {
  constructor(public authService: AuthService) {}
}
